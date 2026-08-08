import { uiText } from "./i18n";
import type { AppLanguage, PageContext } from "./types";

interface RuntimeEnvelope<T> {
  ok: boolean;
  result?: T;
  error?: string;
}

export function isExtensionRuntime(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
}

export async function runtimeRequest<T>(
  type: string,
  payload?: Record<string, unknown>,
  language?: AppLanguage
): Promise<T> {
  if (!isExtensionRuntime()) {
    throw new Error(uiText(language, "runtimeUnavailable"));
  }
  const response = (await chrome.runtime.sendMessage({
    type,
    payload
  })) as RuntimeEnvelope<T>;
  if (!response?.ok) {
    throw new Error(response?.error ?? uiText(language, "backgroundNoResponse"));
  }
  return response.result as T;
}

export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  if (!isExtensionRuntime()) {
    return {
      id: 1,
      active: true,
      highlighted: true,
      pinned: false,
      incognito: false,
      index: 0,
      windowId: 1,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      selected: true,
      frozen: false,
      title: uiText(undefined, "previewPageTitle"),
      url: "https://example.com/research"
    } as chrome.tabs.Tab;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

export async function sendToTab<T>(
  tabId: number,
  message: Record<string, unknown>,
  language?: AppLanguage
): Promise<T> {
  if (!isExtensionRuntime()) {
    if (message.type === "page.context") {
      return {
        kind: message.scope === "article" ? "article" : "webpage",
        title: uiText(language, "previewPageTitle"),
        url: "https://example.com/research",
        description: uiText(language, "previewPageDescription"),
        language: "zh-CN",
        siteName: "Example",
        selection: "",
        text: uiText(language, "previewPageBody")
      } as T;
    }
    if (message.type === "page.translation.prepare") return [] as T;
    if (
      message.type === "page.translation.apply" ||
      message.type === "page.reading.apply"
    ) {
      return { count: 0 } as T;
    }
    return { ok: true } as T;
  }
  const response = (await chrome.tabs.sendMessage(
    tabId,
    message
  )) as RuntimeEnvelope<T>;
  if (!response?.ok) {
    throw new Error(response?.error ?? uiText(language, "currentPageUnavailable"));
  }
  return response.result as T;
}

export async function getActivePageContext(
  language?: AppLanguage,
  options: { ignoreSelection?: boolean; scope?: "page" | "article" } = {}
): Promise<{
  tab: chrome.tabs.Tab | null;
  context: PageContext | null;
  error?: string;
}> {
  const tab = await getActiveTab();
  if (!tab?.id) return { tab, context: null, error: uiText(language, "noActiveTab") };
  try {
    const context = await sendToTab<PageContext>(
      tab.id,
      {
        type: "page.context",
        ignoreSelection: Boolean(options.ignoreSelection),
        scope: options.scope ?? "page"
      },
      language
    );
    return { tab, context };
  } catch (error) {
    return {
      tab,
      context: tab.url
        ? {
            kind: tab.url.toLowerCase().includes(".pdf") ? "pdf" : "webpage",
            title: tab.title ?? uiText(language, "currentPage"),
            url: tab.url,
            text: ""
          }
        : null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function requestOriginPermission(url: string): Promise<boolean> {
  if (!isExtensionRuntime()) return true;
  const parsed = new URL(url);
  if (!["http:", "https:", "file:"].includes(parsed.protocol)) return false;
  const origin =
    parsed.protocol === "file:" ? "file:///*" : `${parsed.origin}/*`;
  const contains = await chrome.permissions.contains({ origins: [origin] });
  if (contains) return true;
  return chrome.permissions.request({ origins: [origin] });
}

export async function openOptions(): Promise<void> {
  if (!isExtensionRuntime()) return;
  await chrome.runtime.openOptionsPage();
}
