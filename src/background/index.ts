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
  loadCustomTools,
  loadSettings,
  setPendingAction
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
import { findTool, toolPromptWithContext } from "../shared/tools";
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
import { uiText, type UiTextKey } from "../shared/i18n";

type MenuContext =
  | "selection"
  | "image"
  | "editable"
  | "page"
  | "link"
  | "video"
  | "audio";

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

const MENU_ITEMS: Array<{
  id: string;
  titleKey: UiTextKey;
  action: QuickActionId;
  contexts: MenuContext[];
}> = [
  {
    id: "webmind-ask",
    titleKey: "contextMenuAsk",
    action: "ask",
    contexts: ["selection"]
  },
  {
    id: "webmind-summarize",
    titleKey: "contextMenuSummarize",
    action: "summarize",
    contexts: ["selection"]
  },
  {
    id: "webmind-explain",
    titleKey: "contextMenuExplain",
    action: "explain",
    contexts: ["selection"]
  },
  {
    id: "webmind-translate",
    titleKey: "contextMenuTranslate",
    action: "translate",
    contexts: ["selection"]
  },
  {
    id: "webmind-rewrite",
    titleKey: "contextMenuRewrite",
    action: "rewrite",
    contexts: ["selection", "editable"]
  },
  {
    id: "webmind-reply",
    titleKey: "contextMenuReply",
    action: "reply",
    contexts: ["selection", "editable"]
  },
  {
    id: "webmind-image",
    titleKey: "contextMenuAnalyzeImage",
    action: "ask",
    contexts: ["image"]
  }
];

const menuActions = new Map(
  MENU_ITEMS.map((item) => [item.id, item.action])
);
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
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await chrome.contextMenus.removeAll();
  for (const item of MENU_ITEMS) {
    chrome.contextMenus.create({
      id: item.id,
      title: uiText(settings.interfaceLanguage, item.titleKey),
      contexts: item.contexts as [
        MenuContext,
        ...MenuContext[]
      ]
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void setupExtension();
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
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
  const action = menuActions.get(String(info.menuItemId));
  if (!action || !tab?.id) return;
  const pending: PendingAction = {
    id: crypto.randomUUID(),
    action,
    createdAt: Date.now(),
    text: info.selectionText,
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
