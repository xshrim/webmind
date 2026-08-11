import { uiText } from "../shared/i18n";
import type {
  AppLanguage,
  AppSettings,
  ChatMessage,
  PageContext,
  ProviderProfile,
  WebSearchResult
} from "../shared/types";
import {
  createMessage,
  truncateText
} from "../shared/utils";

export type ContextMode = "none" | "page" | "article" | "selection";

type TabContextIdentity = Pick<chrome.tabs.Tab, "id" | "url">;

export function defaultContextMode(settings: AppSettings | null): Extract<
  ContextMode,
  "page" | "article"
> {
  return settings?.defaultContextScope === "page" ? "page" : "article";
}

export function contextModeAfterTabSwitch(
  currentMode: ContextMode,
  fallbackMode: Extract<ContextMode, "page" | "article">,
  nextContext: PageContext | null
): ContextMode {
  if (currentMode !== "selection") return currentMode;
  return nextContext?.kind === "selection" ? "selection" : fallbackMode;
}

export function sameTabIdentity(
  currentTab: TabContextIdentity | null | undefined,
  cachedTab: TabContextIdentity | null | undefined
): boolean {
  if (!currentTab?.id || !cachedTab?.id || currentTab.id !== cachedTab.id) {
    return false;
  }
  if (currentTab.url && cachedTab.url && currentTab.url !== cachedTab.url) {
    return false;
  }
  return true;
}

export function contextMatchesTab(
  context: PageContext | null | undefined,
  tab: Pick<chrome.tabs.Tab, "url"> | null | undefined
): context is PageContext {
  if (!context) return false;
  return !tab?.url || !context.url || context.url === tab.url;
}

function isPdfUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname.endsWith("youtube.com") &&
        parsed.pathname === "/watch") ||
      parsed.hostname === "youtu.be"
    );
  } catch {
    return false;
  }
}

export function contextLabel(
  context: PageContext | null,
  language?: AppLanguage
): string {
  return uiText(
    language,
    context?.kind === "selection"
      ? "currentSelection"
      : context?.kind === "article"
        ? "currentBody"
        : "currentPage"
  );
}

export function contextSnapshotExcerpt(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 180) return normalized;
  return `${normalized.slice(0, 177)}...`;
}

export function contextTranslationSourceText(context: PageContext | null): string {
  if (context?.kind === "article" && context.articlePreview?.length) {
    return context.articlePreview
      .map((block) => block.markdown ?? block.sourceText ?? block.text)
      .map((block) => block.trim())
      .filter(Boolean)
      .join("\n\n");
  }
  return context?.markdown?.trim() || context?.text?.trim() || "";
}

export function normalizePageContext(
  context: PageContext | null
): PageContext | null {
  if (!context) return null;
  if (isPdfUrl(context.url)) return { ...context, kind: "pdf" };
  if (isYouTubeUrl(context.url)) return { ...context, kind: "youtube" };
  return context;
}

export function buildSystemMessage(
  context: PageContext | null,
  searchResults: WebSearchResult[],
  profile: ProviderProfile,
  interfaceLanguage: AppLanguage | undefined
): ChatMessage {
  const contextBody = context?.markdown?.trim() || context?.text?.trim() || "";
  const sections = [
    uiText(interfaceLanguage, "assistantSystem"),
    uiText(interfaceLanguage, "assistantGuard")
  ];
  if (context && contextBody) {
    sections.push(
      [
        context.kind === "selection"
          ? uiText(interfaceLanguage, "selectionContextIntro")
          : context.kind === "article"
            ? uiText(interfaceLanguage, "articleContextIntro")
            : uiText(interfaceLanguage, "pageContextIntro"),
        `${uiText(interfaceLanguage, "title")}：${context.title}`,
        `${uiText(interfaceLanguage, "url")}：${context.url}`,
        context.description
          ? `${uiText(interfaceLanguage, "description")}：${context.description}`
          : "",
        uiText(interfaceLanguage, "body"),
        truncateText(contextBody, profile.maxContextChars, interfaceLanguage)
      ]
        .filter(Boolean)
        .join("\n")
    );
    sections.push(
      context.kind === "selection"
        ? uiText(interfaceLanguage, "selectionOnly")
        : context.kind === "pdf"
          ? uiText(interfaceLanguage, "pdfCitation")
          : context.kind === "youtube"
            ? uiText(interfaceLanguage, "youtubeCitation")
            : uiText(interfaceLanguage, "pageCitation")
    );
  }
  if (searchResults.length) {
    sections.push(
      [
        uiText(interfaceLanguage, "searchSummaryIntro"),
        ...searchResults.map(
          (result, index) =>
            `[${uiText(interfaceLanguage, "searchSourceMarker")} ${index + 1}] ${result.title}\n${result.url}\n${result.snippet}`
        )
      ].join("\n\n")
    );
  }
  return createMessage("system", sections.join("\n\n"));
}
