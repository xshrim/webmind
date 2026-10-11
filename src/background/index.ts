import { fetchYouTubeTranscript } from "./context";
import { completeModel, listProviderModels, streamModel } from "./providers";
import { listMcpTools } from "./mcpClient";
import { runMcpAgent } from "./mcpAgent";
import {
  fillPrompt,
  isDictionaryTranslationInput,
  quickActionPrompt
} from "../shared/prompts";
import { requestOriginPermission } from "../shared/browser";
import {
  consumePendingAction,
  createStoredTodo,
  deleteStoredTodo,
  clearAllTodos,
  clearCompletedTodos,
  loadTodos,
  loadCustomTools,
  loadSettings,
  setPendingAction,
  splitStoredTodo,
  updateStoredTodo
} from "../shared/storage";
import type {
  AppLanguage,
  AppLogLevel,
  ImageAttachment,
  McpServerConfig,
  McpToolApprovalDecision,
  ChatRunRequest,
  PendingAction,
  ProviderProfile,
  QuickActionId
} from "../shared/types";
import { allTools, findTool, toolPromptWithContext } from "../shared/tools";
import { modelPurposeForToolId } from "../shared/models";
import {
  buildProtectedTranslationPrompt,
  createMessage,
  errorMessage,
  normalizeDictionaryTranslationMarkdown,
  protectTranslationText,
  restoreTranslationText
} from "../shared/utils";
import { searchWeb } from "../shared/webSearch";
import { selectionSearchUrl } from "../shared/searchEngines";
import { uiText, type UiTextKey } from "../shared/i18n";
import type { CreateTodoInput, TodoSource, UpdateTodoInput } from "../shared/types";

type MenuContext =
  | "selection"
  | "image"
  | "editable"
  | "page"
  | "link"
  | "video"
  | "audio";

function downloadFileName(value: string): string | undefined {
  const normalized = value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || undefined;
}

type CapturedMediaRequest = {
  url: string;
  frameId: number;
  kind: "manifest" | "audio" | "video";
  mimeType?: string;
  bytes?: number;
  time: number;
};

const MEDIA_CAPTURE_KEY = "webmind.mediaCaptures";
const YOUTUBE_PO_BODY_KEY = "webmind.youtubePoBodies";
const MEDIA_DOWNLOAD_TRACK_KEY = "webmind.mediaDownloadTracks";
const MEDIA_HEADER_RULE_ID = 80_001;
// Keep manifests and separate audio tracks available after a long HLS session
// has generated many short video-segment requests.
const MAX_MEDIA_CAPTURE = 256;
let mediaCaptureWrite = Promise.resolve();
let youtubePoWrite = Promise.resolve();
let offscreenReady = false;
type ActiveMediaDownload = {
  resourceId: string;
  jobId?: string;
  expectedBytes?: number;
  localOutput?: boolean;
  phase?: "processing" | "downloading";
};
const activeMediaDownloads = new Map<number, ActiveMediaDownload>();
const activeMediaJobs = new Map<string, ActiveMediaDownload>();
const lastMediaDownloadUpdates = new Map<number, number>();
const mediaDownloadSamples = new Map<number, { bytes: number; time: number }>();

function storedMediaDownloads(): Record<string, ActiveMediaDownload> {
  return Object.fromEntries(activeMediaDownloads);
}

function persistMediaDownloads(): void {
  void chrome.storage.session.set({ [MEDIA_DOWNLOAD_TRACK_KEY]: storedMediaDownloads() });
}

async function restoreMediaDownloads(): Promise<void> {
  const { [MEDIA_DOWNLOAD_TRACK_KEY]: stored = {} } = await chrome.storage.session.get(MEDIA_DOWNLOAD_TRACK_KEY);
  const active = stored as Record<string, ActiveMediaDownload>;
  const items = await chrome.downloads.search({ state: "in_progress" });
  const ids = new Set(items.map((item) => item.id));
  Object.entries(active).forEach(([id, tracked]) => {
    const downloadId = Number(id);
    if (Number.isInteger(downloadId) && ids.has(downloadId) && tracked?.resourceId) {
      activeMediaDownloads.set(downloadId, tracked);
      void updateMediaDownload(downloadId);
    }
  });
  persistMediaDownloads();
}

void restoreMediaDownloads().catch(() => undefined);

function reportMediaDownload(
  resourceId: string,
  phase: "processing" | "downloading",
  progress?: number,
  done = false,
  error?: string,
  speed?: number,
  paused?: boolean
): void {
  void chrome.runtime.sendMessage({
    type: "media.download.progress",
    payload: { resourceId, phase, progress, done, error, speed, paused }
  });
}

async function releaseMediaStream(jobId: string | undefined): Promise<void> {
  if (!jobId) return;
  activeMediaJobs.delete(jobId);
  try {
    await chrome.runtime.sendMessage({
      target: "webmind.offscreen",
      type: "media.offscreen.release",
      jobId
    });
  } catch {
    // The offscreen document can already be closed after the download settles.
  }
}

async function updateMediaDownload(downloadId: number, state?: string, error?: string): Promise<void> {
  const tracked = activeMediaDownloads.get(downloadId);
  if (!tracked) return;
  const terminal = state === "complete" || state === "interrupted";
  const now = Date.now();
  if (!terminal && now - (lastMediaDownloadUpdates.get(downloadId) ?? 0) < 250) return;
  lastMediaDownloadUpdates.set(downloadId, now);
  try {
    const [item] = await chrome.downloads.search({ id: downloadId });
    if (item) {
      if (tracked.localOutput) {
        state ||= item.state;
        error ||= item.error;
        reportMediaDownload(tracked.resourceId, "downloading", 1, false, undefined, 0, item.paused);
      } else {
      const total = item.totalBytes > 0 ? item.totalBytes : tracked.expectedBytes;
      const previousSample = mediaDownloadSamples.get(downloadId);
      const elapsed = now - (previousSample?.time ?? now);
      const speed = previousSample && elapsed > 0 && item.bytesReceived >= previousSample.bytes
        ? (item.bytesReceived - previousSample.bytes) * 1000 / elapsed
        : undefined;
      mediaDownloadSamples.set(downloadId, { bytes: item.bytesReceived, time: now });
      reportMediaDownload(
        tracked.resourceId,
        "downloading",
        total ? item.bytesReceived / total : undefined,
        false,
        undefined,
        speed,
        item.paused
      );
      state ||= item.state;
      error ||= item.error;
      }
    }
    if (state === "complete") {
      reportMediaDownload(tracked.resourceId, "downloading", 1, true);
    } else if (state === "interrupted") {
      reportMediaDownload(tracked.resourceId, "downloading", undefined, true, error || "Download interrupted");
    } else {
      return;
    }
    activeMediaDownloads.delete(downloadId);
    persistMediaDownloads();
    lastMediaDownloadUpdates.delete(downloadId);
    mediaDownloadSamples.delete(downloadId);
    await releaseMediaStream(tracked.jobId);
  } catch {
    // Download progress is best-effort; the download API remains authoritative.
  }
}

function trackMediaDownload(downloadId: number, tracked: ActiveMediaDownload): void {
  activeMediaDownloads.set(downloadId, tracked);
  persistMediaDownloads();
  lastMediaDownloadUpdates.delete(downloadId);
  mediaDownloadSamples.delete(downloadId);
  reportMediaDownload(tracked.resourceId, "downloading", tracked.localOutput ? 1 : 0);
  // Blob downloads can settle before downloads.download() resolves, so catch an
  // already-complete or interrupted item that emitted no observable change event.
  void updateMediaDownload(downloadId);
}

chrome.downloads.onChanged.addListener((delta) => {
  void updateMediaDownload(delta.id, delta.state?.current, delta.error?.current);
});

function responseHeader(details: chrome.webRequest.OnHeadersReceivedDetails, name: string) {
  return details.responseHeaders?.find((header) => header.name.toLowerCase() === name)?.value;
}

function mediaCaptureFromRequest(details: chrome.webRequest.OnHeadersReceivedDetails): CapturedMediaRequest | null {
  if (details.tabId < 0 || details.statusCode >= 400) return null;
  const mimeType = responseHeader(details, "content-type")?.split(";", 1)[0].toLowerCase();
  const pathname = new URL(details.url).pathname.toLowerCase();
  const contentDisposition = responseHeader(details, "content-disposition")?.toLowerCase() ?? "";
  const audioExtension = /\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav)(?:[?#;]|$)/;
  const manifest = /\.m3u8$/.test(pathname) || /mpegurl/.test(mimeType ?? "")
    ? "hls"
    : /\.mpd$/.test(pathname) || /dash\+xml/.test(mimeType ?? "")
      ? "dash"
      : null;
  const audioFile = audioExtension.test(pathname) ||
    audioExtension.test(details.url.toLowerCase()) ||
    audioExtension.test(contentDisposition);
  const kind = manifest
    ? "manifest"
    : audioFile || mimeType?.startsWith("audio/")
      ? "audio"
      : mimeType?.startsWith("video/") || /\.(?:mp4|m4v|m4s|webm|mov|mkv)$/.test(pathname)
        ? "video"
        : null;
  if (!kind) return null;
  const bytes = Number(responseHeader(details, "content-range")?.split("/")[1]) ||
    Number(responseHeader(details, "content-length")) || undefined;
  return { url: details.url, frameId: details.frameId, kind, mimeType, bytes, time: details.timeStamp };
}

function storeMediaCapture(tabId: number, capture: CapturedMediaRequest): void {
  mediaCaptureWrite = mediaCaptureWrite.then(async () => {
    const { [MEDIA_CAPTURE_KEY]: byTab = {} } = await chrome.storage.session.get(MEDIA_CAPTURE_KEY);
    const list = (byTab[String(tabId)] ??= []) as CapturedMediaRequest[];
    const existing = list.find((item) => item.frameId === capture.frameId && item.url === capture.url);
    if (existing) Object.assign(existing, capture);
    else list.unshift(capture);
    byTab[String(tabId)] = list.slice(0, MAX_MEDIA_CAPTURE);
    await chrome.storage.session.set({ [MEDIA_CAPTURE_KEY]: byTab });
  }).catch(() => undefined);
}

function clearMediaCaptures(tabId: number): void {
  mediaCaptureWrite = mediaCaptureWrite.then(async () => {
    const { [MEDIA_CAPTURE_KEY]: byTab = {} } = await chrome.storage.session.get(MEDIA_CAPTURE_KEY);
    delete byTab[String(tabId)];
    await chrome.storage.session.set({ [MEDIA_CAPTURE_KEY]: byTab });
  }).catch(() => undefined);
}

function isYouTubePage(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
  } catch {
    return false;
  }
}

function base64FromBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function clearYouTubePoBodies(tabId: number): void {
  youtubePoWrite = youtubePoWrite.then(async () => {
    const { [YOUTUBE_PO_BODY_KEY]: byTab = {} } = await chrome.storage.session.get(YOUTUBE_PO_BODY_KEY);
    delete byTab[String(tabId)];
    await chrome.storage.session.set({ [YOUTUBE_PO_BODY_KEY]: byTab });
  }).catch(() => undefined);
}

function storeYouTubePoBody(tabId: number, pageUrl: string, body: string): void {
  youtubePoWrite = youtubePoWrite.then(async () => {
    const { [YOUTUBE_PO_BODY_KEY]: byTab = {} } = await chrome.storage.session.get(YOUTUBE_PO_BODY_KEY);
    const list = ((byTab[String(tabId)] ?? []) as Array<{ pageUrl: string; body: string }>)
      .filter((entry) => entry.pageUrl === pageUrl && entry.body !== body);
    list.push({ pageUrl, body });
    byTab[String(tabId)] = list.slice(-4);
    await chrome.storage.session.set({ [YOUTUBE_PO_BODY_KEY]: byTab });
  }).catch(() => undefined);
}

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const capture = mediaCaptureFromRequest(details);
    if (capture) storeMediaCapture(details.tabId, capture);
    return undefined;
  },
  { urls: ["http://*/*", "https://*/*"], types: ["xmlhttprequest", "media", "other"] },
  ["responseHeaders"]
);

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId >= 0 && details.type === "main_frame") {
      clearMediaCaptures(details.tabId);
      clearYouTubePoBodies(details.tabId);
    }
    return undefined;
  },
  { urls: ["http://*/*", "https://*/*"], types: ["main_frame"] }
);

// YouTube's player sends its PO token inside its own SABR POST requests. Keep
// only a few small current-page bodies; the offscreen task decodes the token.
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const raw = details.requestBody?.raw?.[0]?.bytes;
    if (details.tabId < 0 || details.method !== "POST" || !raw || raw.byteLength > 65_536) return undefined;
    const body = base64FromBuffer(raw);
    void chrome.tabs.get(details.tabId).then((tab) => {
      if (tab.url && isYouTubePage(tab.url)) storeYouTubePoBody(details.tabId, tab.url, body);
    }).catch(() => undefined);
    return undefined;
  },
  { urls: ["https://*.googlevideo.com/videoplayback*"] },
  ["requestBody"]
);

chrome.tabs.onRemoved.addListener((tabId) => {
  clearMediaCaptures(tabId);
  clearYouTubePoBodies(tabId);
});

async function ensureMediaOffscreen(): Promise<void> {
  if (offscreenReady) return;
  const contexts = typeof chrome.runtime.getContexts === "function"
    ? await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT] })
    : [];
  if (!contexts.length) {
    try {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["BLOBS"],
        justification: "Process browser media streams and write the result to a local download"
      });
    } catch (error) {
      if (!/already exists|single offscreen/i.test(errorMessage(error))) throw error;
    }
  }
  offscreenReady = true;
}

async function clearMediaDownloadCache(): Promise<void> {
  await ensureMediaOffscreen();
  await chrome.runtime.sendMessage({
    target: "webmind.offscreen",
    type: "media.offscreen.cleanup"
  });
}

// `onSuspend` is best-effort during browser shutdown. The offscreen document
// also removes stale OPFS stream files when it is created on the next startup.
chrome.runtime.onStartup.addListener(() => {
  void clearMediaDownloadCache().catch(() => undefined);
});
chrome.runtime.onSuspend.addListener(() => {
  void clearMediaDownloadCache().catch(() => undefined);
});

function mediaUrls(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const resource = value as {
    url?: unknown;
    manifestUrl?: unknown;
    audioUrl?: unknown;
    variants?: Array<{ url?: unknown; audioUrl?: unknown; requestUrls?: unknown[] }>;
    capturedTracks?: Array<{ url?: unknown }>;
    subtitles?: Array<{ url?: unknown }>;
    requestUrls?: unknown[];
  };
  return [resource.url, resource.manifestUrl, resource.audioUrl,
    ...(resource.variants ?? []).flatMap((variant) => [variant.url, variant.audioUrl, ...(variant.requestUrls ?? [])]),
    ...(resource.capturedTracks ?? []).map((track) => track.url),
    ...(resource.requestUrls ?? []),
    ...(resource.subtitles ?? []).map((track) => track.url)]
    .filter((url): url is string => typeof url === "string" && /^https?:/i.test(url));
}

async function setMediaRequestContext(pageUrl: string, urls: string[], tabId?: number): Promise<void> {
  const ruleIds = [MEDIA_HEADER_RULE_ID, MEDIA_HEADER_RULE_ID + 1];
  let page: URL;
  try {
    page = new URL(pageUrl);
  } catch {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds });
    return;
  }
  const requestDomains = [...new Set(urls.filter((url) => /^https?:/i.test(url)).flatMap((url) => {
    try { return [new URL(url).hostname]; } catch { return []; }
  }))].slice(0, 100);
  const makeRule = (id: number, tabIds: number[]) => ({
    id,
    priority: 1,
    action: {
      type: "modifyHeaders" as const,
      requestHeaders: [
        { header: "Referer", operation: "set" as const, value: page.href },
        { header: "Origin", operation: "remove" as const }
      ]
    },
    condition: {
      initiatorDomains: [chrome.runtime.id],
      tabIds,
      requestDomains,
      resourceTypes: ["xmlhttprequest", "media", "other"] as chrome.declarativeNetRequest.ResourceType[]
    }
  });
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: ruleIds,
    addRules: requestDomains.length ? [
      makeRule(MEDIA_HEADER_RULE_ID, [chrome.tabs.TAB_ID_NONE]),
      ...(Number.isInteger(tabId) ? [makeRule(MEDIA_HEADER_RULE_ID + 1, [tabId!])] : [])
    ] : []
  });
}

function mediaFormatFromMime(mimeType: string | undefined, kind: string): string | undefined {
  const subtype = mimeType?.split("/", 2)[1]?.split(";", 1)[0].trim().toLowerCase();
  if (!subtype) return undefined;
  if (["octet-stream", "binary", "x-download"].includes(subtype)) return undefined;
  const aliases: Record<string, string> = {
    jpeg: "jpg",
    "svg+xml": "svg",
    mpeg: kind === "audio" ? "mp3" : "mpeg",
    mp4: kind === "audio" ? "m4a" : "mp4",
    quicktime: "mov",
    "x-matroska": "mkv",
    "x-msvideo": "avi",
    "x-mpegurl": "m3u8",
    "vnd.apple.mpegurl": "m3u8",
    "dash+xml": "mpd"
  };
  return aliases[subtype] || subtype;
}

function filenameFromDisposition(value: string | null): string | undefined {
  if (!value) return undefined;
  const encoded = value.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.replace(/^"|"$/g, ""));
    } catch {
      return encoded.replace(/^"|"$/g, "");
    }
  }
  return value.match(/filename\s*=\s*"([^"]+)"/i)?.[1] ||
    value.match(/filename\s*=\s*([^;]+)/i)?.[1]?.trim();
}

function extensionFromFilename(value: string | undefined): string | undefined {
  return value?.match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase();
}

async function probeMediaUrl(
  url: string,
  kind: "image" | "audio" | "video"
): Promise<{ mimeType?: string; format?: string; name?: string; bytes?: number } | null> {
  if (!/^https?:/i.test(url)) return null;
  let response = await fetch(url, {
    method: "HEAD",
    credentials: "include",
    redirect: "follow"
  });
  if (!response.ok || !response.headers.get("content-type")) {
    response = await fetch(url, {
      headers: { Range: "bytes=0-0" },
      credentials: "include",
      redirect: "follow"
    });
  }
  const mimeType = response.headers.get("content-type")?.split(";", 1)[0] || undefined;
  const name = filenameFromDisposition(response.headers.get("content-disposition"));
  const bytes = Number(response.headers.get("content-range")?.split("/")[1]) ||
    Number(response.headers.get("content-length")) || undefined;
  return {
    mimeType,
    format: extensionFromFilename(name) || mediaFormatFromMime(mimeType, kind),
    name,
    bytes
  };
}

function broadcastOperationLog(
  message: string,
  level: AppLogLevel = "info"
): void {
  if (!message.trim()) return;
  chrome.runtime
    .sendMessage({
      type: "webmind.operationLog",
      payload: {
        time: Date.now(),
        level,
        message
      }
    })
    .catch(() => {
      // No visible receiver is fine; the sidepanel may be closed.
    });
}

const menuActions = new Map<
  string,
  { action: QuickActionId; toolId: string } | { action: "todo" }
>();
const activeControllers = new Map<string, AbortController>();
const MCP_APPROVAL_TIMEOUT_MS = 30_000;
const pendingMcpApprovals = new Map<
  string,
  {
    requestId: string;
    resolve: (decision: McpToolApprovalDecision) => void;
  }
>();

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function fetchImageAsAttachment(
  rawUrl: string,
  language: AppLanguage
): Promise<ImageAttachment> {
  const url = new URL(rawUrl).toString();
  const allowed = await requestOriginPermission(url);
  if (!allowed) {
    throw new Error(uiText(language, "readImageUrlFailed"));
  }
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(
      `${uiText(language, "readImageUrlFailed")} (${response.status})`
    );
  }
  const blob = await response.blob();
  const mimeType =
    blob.type ||
    response.headers.get("content-type")?.split(";")[0] ||
    "image/png";
  if (!mimeType.startsWith("image/")) {
    throw new Error(uiText(language, "readImageUrlFailed"));
  }
  const buffer = await blob.arrayBuffer();
  const name = decodeURIComponent(
    new URL(url).pathname.split("/").pop() || "image"
  );
  return {
    id: crypto.randomUUID(),
    kind: "image",
    name,
    mimeType,
    dataUrl: `data:${mimeType};base64,${arrayBufferToBase64(buffer)}`
  };
}

async function setupExtension(): Promise<void> {
  const settings = await loadSettings();
  const customTools = await loadCustomTools();
  const tools = allTools(customTools, settings);
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await chrome.contextMenus.removeAll();
  menuActions.clear();
  chrome.contextMenus.create({
    id: "webmind-root",
    title: uiText(settings.interfaceLanguage, "webmindContextMenu"),
    contexts: ["selection", "editable"]
  });
  const askId = "webmind-tool-ask-selection";
  chrome.contextMenus.create({
    id: askId,
    parentId: "webmind-root",
    title: uiText(settings.interfaceLanguage, "contextMenuAsk"),
    contexts: ["selection", "editable"]
  });
  menuActions.set(askId, { action: "ask", toolId: "ask-selection" });
  const todoId = "webmind-todo-create";
  chrome.contextMenus.create({
    id: todoId,
    parentId: "webmind-root",
    title: uiText(settings.interfaceLanguage, "addSelectionToTodo"),
    contexts: ["selection"]
  });
  menuActions.set(todoId, { action: "todo" });
  const selectedIds = settings.enabledToolIds["context-menu"] ?? [];
  for (const toolId of selectedIds) {
    const tool = tools.find((item) => item.id === toolId);
    if (!tool || tool.id === "ask-selection") continue;
    const id = `webmind-tool-${tool.id}`;
    chrome.contextMenus.create({
      id,
      parentId: "webmind-root",
      title: tool.title,
      contexts: ["selection", "editable"]
    });
    menuActions.set(id, { action: "ask", toolId: tool.id });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void setupExtension();
});

chrome.runtime.onStartup.addListener(() => {
  void setupExtension();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes["webmind.settings"]) {
    void setupExtension();
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-side-panel") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const menuAction = menuActions.get(String(info.menuItemId));
  if (!menuAction || !tab?.id) return;
  if (menuAction.action === "todo") {
    const text = String(info.selectionText ?? "").trim();
    if (!text) return;
    const source: TodoSource = {
      kind: "selection",
      url: info.pageUrl ?? tab.url,
      pageTitle: tab.title,
      selectedText: text
    };
    await createStoredTodo({ source, content: text });
    return;
  }
  const pending: PendingAction = {
    id: crypto.randomUUID(),
    action: menuAction.action,
    toolId: menuAction.toolId,
    createdAt: Date.now(),
    contextScope: info.selectionText ? "selection" : undefined,
    text: info.selectionText,
    copyText: info.selectionText,
    imageUrl: info.srcUrl,
    pageTitle: tab.title,
    pageUrl: info.pageUrl ?? tab.url
  };
  // Invoke sidePanel.open before awaiting storage so the user gesture remains
  // valid. The write is started first, which also minimizes the consume race.
  const pendingWrite = setPendingAction(pending);
  const panelOpen = chrome.sidePanel.open({ tabId: tab.id });
  await panelOpen;
  await pendingWrite;
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "webmind-stream") return;
  const requests = new Set<string>();
  let disconnected = false;
  const postToPort = (message: Record<string, unknown>): boolean => {
    if (disconnected) return false;
    try {
      port.postMessage(message);
      return true;
    } catch {
      disconnected = true;
      for (const requestId of requests) {
        activeControllers.get(requestId)?.abort();
        activeControllers.delete(requestId);
      }
      return false;
    }
  };
  port.onMessage.addListener((message: {
    type: string;
    payload?: ChatRunRequest;
    requestId?: string;
    approvalId?: string;
    decision?: McpToolApprovalDecision;
  }) => {
    if (
      message.type === "mcp.approval" &&
      message.requestId &&
      message.approvalId &&
      message.decision
    ) {
      const pending = pendingMcpApprovals.get(message.approvalId);
      if (!pending || pending.requestId !== message.requestId) return;
      pendingMcpApprovals.delete(message.approvalId);
      pending.resolve(message.decision);
      return;
    }
    if (message.type === "chat.cancel" && message.requestId) {
      activeControllers.get(message.requestId)?.abort();
      return;
    }
    if (message.type !== "chat.start" || !message.payload) return;
    const request = message.payload;
    const controller = new AbortController();
    activeControllers.set(request.requestId, controller);
    requests.add(request.requestId);
    const execute = async () => {
      if (request.mcpTools?.some((item) => item.toolNames.length)) {
        const text = await runMcpAgent(
          request,
          controller.signal,
          (approval) =>
            new Promise<McpToolApprovalDecision>((resolve, reject) => {
              if (controller.signal.aborted) {
                reject(controller.signal.reason);
                return;
              }
              let settled = false;
              let timeout: ReturnType<typeof setTimeout> | undefined;
              const settle = (decision: McpToolApprovalDecision) => {
                if (settled) return;
                settled = true;
                if (timeout !== undefined) clearTimeout(timeout);
                controller.signal.removeEventListener("abort", abort);
                resolve(decision);
              };
              const abort = () => {
                pendingMcpApprovals.delete(approval.approvalId);
                if (timeout !== undefined) clearTimeout(timeout);
                reject(controller.signal.reason);
              };
              controller.signal.addEventListener("abort", abort, { once: true });
              pendingMcpApprovals.set(approval.approvalId, {
                requestId: request.requestId,
                resolve: (decision) => {
                  settle(decision);
                }
              });
              timeout = setTimeout(() => {
                const pending = pendingMcpApprovals.get(approval.approvalId);
                if (!pending || pending.requestId !== request.requestId) return;
                pendingMcpApprovals.delete(approval.approvalId);
                pending.resolve("deny-timeout");
              }, MCP_APPROVAL_TIMEOUT_MS);
              const posted = postToPort({
                type: "mcp.approval.required",
                requestId: request.requestId,
                approval
              });
              if (!posted) {
                controller.abort(new Error("MCP approval channel closed"));
              }
            }),
          (event) => {
            postToPort({
              type: "mcp.tool.status",
              requestId: request.requestId,
              event
            });
          }
        );
        if (text) {
          postToPort({
            type: "chat.delta",
            requestId: request.requestId,
            delta: text
          });
        }
        return;
      }
      await streamModel(
        {
          profileId: request.profileId,
          purpose: request.purpose,
          messages: request.messages,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          reasoningEnabled: request.reasoningEnabled
        },
        (delta) => {
          postToPort({
            type: "chat.delta",
            requestId: request.requestId,
            delta
          });
        },
        controller.signal
      );
    };
    void execute()
      .then(() => {
        if (controller.signal.aborted) return;
        postToPort({
          type: "chat.done",
          requestId: request.requestId
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          postToPort({
            type: "chat.cancelled",
            requestId: request.requestId
          });
          return;
        }
        postToPort({
          type: "chat.error",
          requestId: request.requestId,
          error: errorMessage(error)
        });
      })
      .finally(() => {
        activeControllers.delete(request.requestId);
        requests.delete(request.requestId);
      });
  });
  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError;
    disconnected = true;
    for (const requestId of requests) {
      activeControllers.get(requestId)?.abort();
      activeControllers.delete(requestId);
    }
  });
});

chrome.runtime.onMessage.addListener(
  (
    message: {
      type?: string;
      payload?: Record<string, unknown>;
    },
    sender,
    sendResponse
  ) => {
    const run = async () => {
      if (message.type === "operation.log") {
        const payload = message.payload ?? {};
        broadcastOperationLog(
          String(payload.message ?? ""),
          (payload.level as AppLogLevel | undefined) ?? "info"
        );
        return { ok: true };
      }
      if (
        message.type &&
        message.type !== "webmind.operationLog" &&
        message.type !== "cookies.current"
      ) {
        void loadSettings()
          .then((settings) => {
            broadcastOperationLog(
              `${uiText(settings.interfaceLanguage, "logRuntimeRequest")}: ${message.type}`,
              "debug"
            );
          })
          .catch(() => undefined);
      }
      if (message.type === "pending.consume") {
        return consumePendingAction();
      }
      if (message.type === "todo.create") {
        const input = (message.payload ?? {}) as unknown as CreateTodoInput;
        const todo = await createStoredTodo(input);
        const settings = await loadSettings();
        broadcastOperationLog(
          uiText(settings.interfaceLanguage, "logTodoCreated"),
          "success"
        );
        return todo;
      }
      if (message.type === "todo.list") {
        return loadTodos();
      }
      if (message.type === "todo.update") {
        const id = String(message.payload?.id ?? "");
        const patch = (message.payload?.patch ?? {}) as UpdateTodoInput;
        const todo = await updateStoredTodo(id, patch);
        if (todo) {
          const settings = await loadSettings();
          broadcastOperationLog(
            todo.status === "completed"
              ? uiText(settings.interfaceLanguage, "logTodoCompleted")
              : patch.status === "open"
                ? uiText(settings.interfaceLanguage, "logTodoReopened")
                : uiText(settings.interfaceLanguage, "logTodoUpdated"),
            "success"
          );
        }
        return todo;
      }
      if (message.type === "todo.split") {
        const id = String(message.payload?.id ?? "");
        const contents = Array.isArray(message.payload?.contents)
          ? message.payload.contents.filter(
              (content): content is string => typeof content === "string"
            )
          : [];
        const splitTodos = await splitStoredTodo(id, contents);
        if (!splitTodos.length) return [];
        const settings = await loadSettings();
        broadcastOperationLog(
          uiText(settings.interfaceLanguage, "logTodoSplit"),
          "success"
        );
        return splitTodos;
      }
      if (message.type === "todo.delete") {
        await deleteStoredTodo(String(message.payload?.id ?? ""));
        const settings = await loadSettings();
        broadcastOperationLog(uiText(settings.interfaceLanguage, "logTodoDeleted"), "warning");
        return { ok: true };
      }
      if (message.type === "todo.clearCompleted") {
        await clearCompletedTodos();
        const settings = await loadSettings();
        broadcastOperationLog(uiText(settings.interfaceLanguage, "logTodoCleared"), "warning");
        return { ok: true };
      }
      if (message.type === "todo.clearAll") {
        await clearAllTodos();
        const settings = await loadSettings();
        broadcastOperationLog(uiText(settings.interfaceLanguage, "logTodoAllCleared"), "warning");
        return { ok: true };
      }
      if (message.type === "panel.open") {
        const payload = message.payload ?? {};
        if (!sender.tab?.id) {
          const settings = await loadSettings();
          throw new Error(uiText(settings.interfaceLanguage, "cannotDetermineTab"));
        }
        const pendingWrite = payload.action
          ? setPendingAction(payload.action as PendingAction)
          : Promise.resolve();
        const panelOpen = chrome.sidePanel.open({ tabId: sender.tab.id });
        await panelOpen;
        await pendingWrite;
        return { ok: true };
      }
      if (message.type === "context.youtube") {
        const settings = await loadSettings();
        const pageUrl = String(message.payload?.pageUrl ?? "");
        const language = String(message.payload?.language ?? "");
        return fetchYouTubeTranscript(
          pageUrl,
          language,
          settings.interfaceLanguage
        );
      }
      if (message.type === "search.web") {
        const settings = await loadSettings();
        const query = String(message.payload?.query ?? "").trim();
        const limit = Number(message.payload?.limit ?? 6);
        if (!query) throw new Error(uiText(settings.interfaceLanguage, "provideSearchQuery"));
        return {
          results: await searchWeb(query, limit, settings.interfaceLanguage)
        };
      }
      if (message.type === "selection.search") {
        const settings = await loadSettings();
        const query = String(message.payload?.query ?? "").trim();
        if (!query) throw new Error(uiText(settings.interfaceLanguage, "provideSearchQuery"));
        const url = selectionSearchUrl(
          settings.selectionSearchEngine,
          query,
          settings.selectionSearchCustomUrl
        );
        if (settings.selectionSearchOpenMode === "current") {
          if (!sender.tab?.id) {
            throw new Error(uiText(settings.interfaceLanguage, "cannotDetermineTab"));
          }
          await chrome.tabs.update(sender.tab.id, { url });
        } else {
          await chrome.tabs.create({
            url,
            active: true,
            openerTabId: sender.tab?.id
          });
        }
        return { ok: true };
      }
      if (message.type === "model.complete") {
        return {
          text: await completeModel(
            message.payload as unknown as Parameters<typeof completeModel>[0]
          )
        };
      }
      if (message.type === "provider.test") {
        const profileId = String(message.payload?.profileId ?? "");
        const text = await completeModel({
          profileId,
          maxTokens: 16,
          temperature: 0,
          messages: [
            createMessage(
              "user",
              "Reply with exactly: OK"
            )
          ]
        });
        return { ok: /^ok[.!]?$/i.test(text.trim()), text };
      }
      if (message.type === "provider.models") {
        const settings = await loadSettings();
        const profile = message.payload?.profile as ProviderProfile | undefined;
        const secret = String(message.payload?.secret ?? "");
        if (!profile?.kind || !profile.baseUrl) {
          throw new Error(uiText(settings.interfaceLanguage, "providerBaseUrlRequired"));
        }
        return {
          models: await listProviderModels(
            profile,
            secret,
            settings.interfaceLanguage
          )
        };
      }
      if (message.type === "model.quickAction") {
        const action = String(message.payload?.action ?? "") as QuickActionId;
        const text = String(message.payload?.text ?? "");
        const settings = await loadSettings();
        if (action === "ask") {
          return { text: "" };
        }
        const template = quickActionPrompt(action, settings);
        if (!template) {
          throw new Error(
            uiText(settings.interfaceLanguage, "unsupportedQuickAction")
          );
        }
        const isTranslationAction = action === "translate";
        const dictionaryMode =
          isTranslationAction && isDictionaryTranslationInput(text);
        const protectedText = isTranslationAction
          ? protectTranslationText(text)
          : null;
        const prompt = protectedText
          ? buildProtectedTranslationPrompt(settings, text, protectedText.text, {
              dictionaryForShortInput: true
            })
          : fillPrompt(template, { text });
        const result = await completeModel({
          purpose: isTranslationAction ? "translation" : "default",
          temperature: isTranslationAction ? 0 : undefined,
          messages: [
            createMessage(
              "system",
              uiText(settings.interfaceLanguage, "browserAssistantSystem")
            ),
            createMessage("user", prompt)
          ]
        });
        const restoredResult = protectedText
          ? restoreTranslationText(result, protectedText)
          : result;
        return {
          text: dictionaryMode
            ? normalizeDictionaryTranslationMarkdown(restoredResult)
            : restoredResult
        };
      }
      if (message.type === "model.tool") {
        const toolId = String(message.payload?.toolId ?? "");
        const customTools = await loadCustomTools();
        const settings = await loadSettings();
        const tool = findTool(toolId, customTools, settings);
        if (!tool) throw new Error(uiText(settings.interfaceLanguage, "toolNotFound"));
        if (tool.id === "ask-selection") {
          return { text: "" };
        }
        const contextMarkdown = String(message.payload?.markdown ?? "").trim();
        const contextText =
          contextMarkdown || String(message.payload?.text ?? "");
        const isTranslationTool =
          tool.id === "translate-text" || tool.id === "translate-document";
        const dictionaryMode =
          tool.id === "translate-text" &&
          isDictionaryTranslationInput(contextText);
        const protectedText = isTranslationTool
          ? protectTranslationText(contextText)
          : null;
        const userPrompt = isTranslationTool
          ? buildProtectedTranslationPrompt(
              settings,
              contextText,
              protectedText?.text ?? contextText,
              { dictionaryForShortInput: tool.id === "translate-text" }
            )
          : toolPromptWithContext(
              tool,
              settings,
              contextText,
              "",
              undefined,
              String(message.payload?.language ?? "") || undefined
            );
        const result = await completeModel({
          profileId: String(message.payload?.profileId ?? "") || undefined,
          purpose: modelPurposeForToolId(tool.id),
          temperature: isTranslationTool ? 0 : undefined,
          messages: [
            createMessage(
              "system",
              uiText(settings.interfaceLanguage, "modelToolSystem")
            ),
            createMessage(
              "user",
              userPrompt
            )
          ]
        });
        const restoredResult = protectedText
          ? restoreTranslationText(result, protectedText)
          : result;
        return {
          text: dictionaryMode
            ? normalizeDictionaryTranslationMarkdown(restoredResult)
            : restoredResult
        };
      }
      if (message.type === "image.fetchDataUrl") {
        const settings = await loadSettings();
        const rawUrl = String(message.payload?.url ?? "").trim();
        if (!rawUrl) {
          throw new Error(uiText(settings.interfaceLanguage, "readImageUrlFailed"));
        }
        return fetchImageAsAttachment(rawUrl, settings.interfaceLanguage);
      }
      if (message.type === "image.captureVisible") {
        const settings = await loadSettings();
        const requestedTabId = Number(message.payload?.tabId);
        const tabId = Number.isInteger(requestedTabId)
          ? requestedTabId
          : sender.tab?.id;
        if (tabId === undefined) {
          throw new Error(uiText(settings.interfaceLanguage, "readImageUrlFailed"));
        }
        const tab = await chrome.tabs.get(tabId);
        if (!tab.active || tab.windowId === undefined) {
          throw new Error(uiText(settings.interfaceLanguage, "readImageUrlFailed"));
        }
        return {
          dataUrl: await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: "png"
          })
        };
      }
      if (message.type === "media.download") {
        const url = String(message.payload?.url ?? "").trim();
        if (!/^(?:https?:|data:)/i.test(url)) {
          throw new Error("Only HTTP(S) or data media URLs can be downloaded here");
        }
        const resourceId = String(message.payload?.resourceId ?? "");
        const tracked: ActiveMediaDownload = {
          resourceId,
          expectedBytes: Number.isFinite(Number(message.payload?.expectedBytes)) && Number(message.payload?.expectedBytes) > 0
            ? Number(message.payload?.expectedBytes)
            : undefined
        };
        if (/^data:/i.test(url)) {
          const downloadId = await chrome.downloads.download({
            url,
            filename: downloadFileName(String(message.payload?.name ?? "")),
            saveAs: false
          });
          if (resourceId) trackMediaDownload(downloadId, tracked);
          return { downloadId };
        }
        const pageUrl = String(message.payload?.pageUrl ?? "");
        if (!resourceId || !/^https?:/i.test(pageUrl)) {
          throw new Error("A source page is required for an extension media download");
        }
        const jobId = `media-job-${crypto.randomUUID()}`;
        await setMediaRequestContext(pageUrl, [url]);
        await ensureMediaOffscreen();
        activeMediaJobs.set(jobId, { ...tracked, jobId, phase: "downloading" });
        reportMediaDownload(resourceId, "downloading", 0);
        await chrome.runtime.sendMessage({
          target: "webmind.offscreen",
          type: "media.offscreen.file",
          jobId,
          url,
          name: downloadFileName(String(message.payload?.name ?? "")) || "media",
          resourceId,
          expectedBytes: tracked.expectedBytes,
          format: String(message.payload?.format ?? ""),
          mimeType: String(message.payload?.mimeType ?? "")
        });
        return { jobId };
      }
      if (message.type === "media.download.status") {
        const resourceIds = new Set(
          Array.isArray(message.payload?.resourceIds)
            ? message.payload.resourceIds.filter((id): id is string => typeof id === "string")
            : []
        );
        await Promise.all([...activeMediaDownloads.entries()]
          .filter(([, tracked]) => resourceIds.has(tracked.resourceId))
          .map(([downloadId]) => updateMediaDownload(downloadId)));
        return { refreshed: true };
      }
      if (message.type === "media.capture.list") {
        const tabId = Number(message.payload?.tabId);
        if (!Number.isInteger(tabId)) return [];
        await mediaCaptureWrite;
        const { [MEDIA_CAPTURE_KEY]: byTab = {} } = await chrome.storage.session.get(MEDIA_CAPTURE_KEY);
        return (byTab[String(tabId)] ?? []) as CapturedMediaRequest[];
      }
      if (message.type === "media.context") {
        await setMediaRequestContext(
          String(message.payload?.pageUrl ?? ""),
          Array.isArray(message.payload?.urls)
            ? message.payload.urls.filter((url): url is string => typeof url === "string")
            : [],
          Number.isInteger(message.payload?.tabId) ? Number(message.payload?.tabId) : undefined
        );
        return { configured: true };
      }
      if (message.type === "media.stream.start") {
        const jobId = String(message.payload?.jobId ?? "");
        const resource = message.payload?.resource;
        const referer = String(message.payload?.referer ?? "");
        const resourceId = String(message.payload?.resourceId ?? "");
        if (!jobId || !resource || typeof resource !== "object") {
          throw new Error("Invalid media download request");
        }
        const urls = mediaUrls(resource);
        if (!urls.length) throw new Error("No playable media URL was found");
        await setMediaRequestContext(
          referer,
          urls,
          Number.isInteger(message.payload?.tabId) ? Number(message.payload?.tabId) : undefined
        );
        await ensureMediaOffscreen();
        if (resourceId) {
          activeMediaJobs.set(jobId, { resourceId, jobId });
          reportMediaDownload(resourceId, "processing", 0);
        }
        await chrome.runtime.sendMessage({
          target: "webmind.offscreen",
          type: "media.offscreen.start",
          jobId,
          resource,
          name: String(message.payload?.name ?? "media"),
          referer,
          resourceId
        });
        return { jobId };
      }
      if (message.type === "media.youtube.start") {
        const jobId = String(message.payload?.jobId ?? "");
        const pageUrl = String(message.payload?.pageUrl ?? "");
        const resourceId = String(message.payload?.resourceId ?? "");
        const tabId = Number(message.payload?.tabId);
        if (!jobId || !resourceId || !isYouTubePage(pageUrl)) {
          throw new Error("Invalid YouTube download request");
        }
        await setMediaRequestContext(pageUrl, ["https://www.youtube.com/", "https://googlevideo.com/"], tabId);
        await youtubePoWrite;
        const { [YOUTUBE_PO_BODY_KEY]: byTab = {} } = await chrome.storage.session.get(YOUTUBE_PO_BODY_KEY);
        const stored = Number.isInteger(tabId)
          ? (byTab[String(tabId)] ?? []) as Array<{ pageUrl?: string; body?: string }>
          : [];
        const poBodies = stored
          .filter((entry) => entry.pageUrl === pageUrl || !entry.pageUrl)
          .map((entry) => entry.body)
          .filter((body): body is string => typeof body === "string");
        await ensureMediaOffscreen();
        activeMediaJobs.set(jobId, { resourceId, jobId });
        reportMediaDownload(resourceId, "processing", 0);
        await chrome.runtime.sendMessage({
          target: "webmind.offscreen",
          type: "media.offscreen.youtube",
          jobId,
          pageUrl,
          name: String(message.payload?.name ?? "YouTube video"),
          resourceId,
          poBodies
        });
        return { jobId };
      }
      if (message.type === "media.stream.stop") {
        await ensureMediaOffscreen();
        await chrome.runtime.sendMessage({
          target: "webmind.offscreen",
          type: "media.offscreen.stop",
          jobId: String(message.payload?.jobId ?? "")
        });
        return { stopping: true };
      }
      if (message.type === "media.download.control") {
        const resourceId = String(message.payload?.resourceId ?? "");
        const action = String(message.payload?.action ?? "");
        const download = [...activeMediaDownloads.entries()].find(([, tracked]) =>
          tracked.resourceId === resourceId
        );
        if (download) {
          const [downloadId, tracked] = download;
          if (action === "pause") {
            await chrome.downloads.pause(downloadId);
            reportMediaDownload(resourceId, "downloading", undefined, false, undefined, undefined, true);
          } else if (action === "resume") {
            await chrome.downloads.resume(downloadId);
            reportMediaDownload(resourceId, "downloading", undefined, false, undefined, undefined, false);
          } else if (action === "cancel") {
            activeMediaDownloads.delete(downloadId);
            persistMediaDownloads();
            lastMediaDownloadUpdates.delete(downloadId);
            mediaDownloadSamples.delete(downloadId);
            await chrome.downloads.cancel(downloadId).catch(() => undefined);
            await releaseMediaStream(tracked.jobId);
          } else {
            throw new Error("Unsupported media download control");
          }
          return { action };
        }
        const job = [...activeMediaJobs.entries()].find(([, tracked]) =>
          tracked.resourceId === resourceId
        );
        if (!job) return { action: "none" };
        const [jobId, tracked] = job;
        if (!["pause", "resume", "cancel"].includes(action)) {
          throw new Error("Unsupported media download control");
        }
        await ensureMediaOffscreen();
        await chrome.runtime.sendMessage({
          target: "webmind.offscreen",
          type: `media.offscreen.${action}`,
          jobId
        });
        if (action === "cancel") {
          activeMediaJobs.delete(jobId);
        } else {
          reportMediaDownload(
            resourceId,
            tracked.phase ?? "processing",
            undefined,
            false,
            undefined,
            undefined,
            action === "pause"
          );
        }
        return { action, resourceId: tracked.resourceId };
      }
      if (message.type === "media.stream.finished") {
        const jobId = String(message.payload?.jobId ?? "");
        const resourceId = String(message.payload?.resourceId ?? "");
        const url = String(message.payload?.url ?? "");
        const filename = downloadFileName(String(message.payload?.filename ?? "media.mp4"));
        const localOnly = Boolean(message.payload?.localOnly);
        if (!jobId || !/^blob:/i.test(url) || !filename) {
          throw new Error("Media processing returned an invalid download");
        }
        try {
          const downloadId = await chrome.downloads.download({
            url,
            filename,
            conflictAction: "uniquify",
            saveAs: false
          });
          const tracked = activeMediaJobs.get(jobId) ?? (resourceId ? { resourceId, jobId } : undefined);
          if (tracked) {
            trackMediaDownload(downloadId, { ...tracked, localOutput: localOnly });
          }
          await chrome.runtime.sendMessage({ type: "media.stream.result", jobId, downloadId });
        } catch (error) {
          const tracked = activeMediaJobs.get(jobId);
          if (tracked) {
            reportMediaDownload(tracked.resourceId, "downloading", undefined, true, errorMessage(error));
          }
          await releaseMediaStream(jobId);
          await chrome.runtime.sendMessage({
            type: "media.stream.result",
            jobId,
            error: errorMessage(error)
          });
        }
        return { accepted: true };
      }
      if (message.type === "media.stream.failed") {
        const jobId = String(message.payload?.jobId ?? "");
        const tracked = activeMediaJobs.get(jobId);
        if (tracked) {
          reportMediaDownload(
            tracked.resourceId,
            "processing",
            undefined,
            true,
            String(message.payload?.error ?? "Media processing failed")
          );
        }
        await chrome.runtime.sendMessage({
          type: "media.stream.result",
          jobId,
          error: String(message.payload?.error ?? "Media processing failed")
        });
        activeMediaJobs.delete(jobId);
        return { accepted: true };
      }
      if (message.type === "media.stream.progress") {
        const resourceId = String(message.payload?.resourceId ?? "");
        if (resourceId) {
          reportMediaDownload(
            resourceId,
            message.payload?.phase === "downloading" ? "downloading" : "processing",
            typeof message.payload?.progress === "number" ? message.payload.progress : undefined,
            false,
            undefined,
            typeof message.payload?.speed === "number" ? message.payload.speed : undefined
          );
        }
        return { accepted: true };
      }
      if (message.type === "media.probe") {
        return probeMediaUrl(
          String(message.payload?.url ?? "").trim(),
          message.payload?.kind === "audio" || message.payload?.kind === "video"
            ? message.payload.kind
            : "image"
        );
      }
      if (message.type === "media.bilibili") {
        const tabId = Number(message.payload?.tabId);
        if (!Number.isInteger(tabId)) return null;
        const [injection] = await chrome.scripting.executeScript({
          target: { tabId },
          world: "MAIN",
          func: () => {
            const page = window as typeof window & {
              __playinfo__?: unknown;
            };
            let info = page.__playinfo__;
            if (!info) {
              const embedded = document.querySelector("#__playinfo__")?.textContent;
              if (embedded) {
                try {
                  info = JSON.parse(embedded);
                } catch {
                  info = undefined;
                }
              }
            }
            if (!info) {
              for (const script of Array.from(document.scripts)) {
                const text = script.textContent ?? "";
                const match = text.match(/(?:window\.)?__playinfo__\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
                if (!match) continue;
                try {
                  info = JSON.parse(match[1]);
                  break;
                } catch {
                  // The page may contain an incomplete player bootstrap script.
                }
              }
            }
            const root = info as {
              data?: { dash?: Record<string, unknown> };
              dash?: Record<string, unknown>;
            } | null;
            const dash = root?.data?.dash ?? root?.dash;
            if (!dash || !Array.isArray(dash.video) || !Array.isArray(dash.audio)) {
              return null;
            }
            const video = dash.video.flatMap((entry) => {
              const track = entry as Record<string, unknown>;
              const url = String(track.baseUrl ?? track.base_url ?? "");
              if (!url) return [];
              const timing = performance.getEntriesByName(url).find(
                (item): item is PerformanceResourceTiming => "transferSize" in item
              );
              return [{
                url,
                format: "mp4",
                width: Number(track.width) || undefined,
                height: Number(track.height) || undefined,
                bitrate: Number(track.bandwidth) || undefined,
                quality: String(track.id ?? "") || undefined,
                mimeType: String(track.mimeType ?? track.mime_type ?? "video/mp4"),
                bytes: timing?.encodedBodySize || timing?.decodedBodySize || timing?.transferSize || undefined
              }];
            });
            const audio = (dash.audio as Array<Record<string, unknown>>).flatMap((track) => {
              const url = String(track.baseUrl ?? track.base_url ?? "");
              if (!url) return [];
              const timing = performance.getEntriesByName(url).find(
                (item): item is PerformanceResourceTiming => "transferSize" in item
              );
              return [{
                url,
                format: "m4a",
                mimeType: String(track.mimeType ?? track.mime_type ?? "audio/mp4"),
                bitrate: Number(track.bandwidth) || undefined,
                bytes: timing?.encodedBodySize || timing?.decodedBodySize || timing?.transferSize || undefined
              }];
            });
            if (!video.length || !audio.length) return null;
            return {
              title: document.title.replace(/\s*[-_]\s*哔哩哔哩.*$/, "").trim(),
              duration:
                Number(dash.duration) ||
                (Number((root?.data as { timelength?: unknown } | undefined)?.timelength) || 0) / 1000 ||
              undefined,
              video,
              audio
            };
          }
        });
        return injection?.result ?? null;
      }
      if (message.type === "cookies.current") {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });
        if (!tab?.url || !/^https?:/i.test(tab.url)) {
          const settings = await loadSettings();
          throw new Error(uiText(settings.interfaceLanguage, "currentPageUnavailable"));
        }
        const cookieStores = await chrome.cookies.getAllCookieStores();
        const cookieStore = cookieStores.find((store) =>
          store.tabIds.includes(tab.id ?? -1)
        );
        return {
          url: tab.url,
          cookies: await chrome.cookies.getAll({
            url: tab.url,
            ...(cookieStore ? { storeId: cookieStore.id } : {})
          })
        };
      }
      if (message.type === "mcp.tools.list") {
        const server = message.payload?.server as McpServerConfig | undefined;
        if (!server) throw new Error("MCP server is required");
        return listMcpTools(server);
      }
      return undefined;
    };
    void run()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) =>
        sendResponse({ ok: false, error: errorMessage(error) })
      );
    return true;
  }
);
