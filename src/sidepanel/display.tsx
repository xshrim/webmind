import {
  Check,
  Copy,
  FileText,
  ImagePlus,
  MessageSquareText,
  Newspaper,
  PanelTop,
  Presentation,
  Search,
  Square,
  TextSelect
} from "lucide-react";
import { useState } from "react";
import {
  resolveLanguage,
  uiText,
  type UiTextKey
} from "../shared/i18n";
import type {
  AppLanguage,
  AppLogLevel,
  ImageAttachment,
  PageContext,
  ToolInvocation
} from "../shared/types";
import { ToolIcon } from "./toolIcons";

export const LOG_LEVEL_OPTIONS: AppLogLevel[] = [
  "debug",
  "info",
  "success",
  "warning",
  "error"
];

export function formatTime(value: number, language?: AppLanguage): string {
  return new Intl.DateTimeFormat(resolveLanguage(language), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

export function formatLogTime(value: number, language?: AppLanguage): string {
  return new Intl.DateTimeFormat(resolveLanguage(language), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(value);
}

export function logLevelTextKey(level: AppLogLevel): UiTextKey {
  switch (level) {
    case "debug":
      return "logLevelDebug";
    case "success":
      return "logLevelSuccess";
    case "warning":
      return "logLevelWarning";
    case "error":
      return "logLevelError";
    case "info":
    default:
      return "logLevelInfo";
  }
}

export function logLevelWeight(level: AppLogLevel): number {
  switch (level) {
    case "debug":
      return 10;
    case "info":
      return 20;
    case "success":
      return 30;
    case "warning":
      return 40;
    case "error":
      return 50;
  }
}

export function contextIcon(context: PageContext | null) {
  if (context?.kind === "selection") return TextSelect;
  if (context?.kind === "article") return Newspaper;
  if (context?.kind === "pdf") return FileText;
  if (context?.kind === "youtube") return Presentation;
  if (context?.kind === "search") return Search;
  if (context?.kind === "image") return ImagePlus;
  return PanelTop;
}

export function attachmentText(
  attachments: ImageAttachment[],
  language?: AppLanguage
): string {
  const textItems = attachments.filter(
    (attachment) => (attachment.kind ?? "image") !== "image"
  );
  if (!textItems.length) return "";
  return textItems
    .map((attachment, index) =>
      [
        `[${uiText(language, "attachmentLabel")} ${index + 1}] ${attachment.kind === "url" ? "URL" : uiText(language, "documentAttachment")}：${attachment.name}`,
        attachment.url ? `${uiText(language, "addressLabel")}：${attachment.url}` : "",
        attachment.mimeType ? `${uiText(language, "typeLabel")}：${attachment.mimeType}` : "",
        `${uiText(language, "contentLabel")}：`,
        attachment.text || uiText(language, "noExtractedText")
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function PageFavicon({ url }: { url?: string }) {
  const [failed, setFailed] = useState(!url);
  if (failed) return <PanelTop />;
  return (
    <img
      className="tool-invocation-favicon"
      src={url}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

function toolInvocationExcerpt(text?: string): string | undefined {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  if (normalized.length <= 180) return normalized;
  return `${normalized.slice(0, 177)}...`;
}

export function ToolInvocationBubble({
  invocation,
  language
}: {
  invocation: ToolInvocation;
  language?: AppLanguage;
}) {
  const [copiedContext, setCopiedContext] = useState<"url" | "content" | null>(
    null
  );
  const context = invocation.context;
  const contextLabel =
    context.kind === "page"
      ? uiText(language, "currentPage")
      : context.kind === "article"
        ? uiText(language, "currentBody")
        : context.kind === "selection"
          ? uiText(language, "currentSelection")
          : context.kind === "answer"
            ? uiText(language, "currentAnswer")
            : uiText(language, "noneContext");
  const contextValue =
    context.kind === "page" || context.kind === "article"
      ? context.title || context.url || contextLabel
      : context.kind === "selection" || context.kind === "answer"
        ? context.text || contextLabel
        : contextLabel;
  const ContextIcon =
    context.kind === "selection"
      ? TextSelect
      : context.kind === "article"
        ? Newspaper
        : context.kind === "answer"
          ? MessageSquareText
          : context.kind === "none"
            ? Square
            : null;
  const contextDisplayText = toolInvocationExcerpt(context.text);
  const snapshotLines =
    context.kind === "page" || context.kind === "article"
      ? [context.title, contextDisplayText].filter(Boolean)
      : [];
  const copyValue =
    context.kind === "page"
      ? context.url
      : context.kind === "article" ||
          context.kind === "selection" ||
          context.kind === "answer"
        ? context.text
        : undefined;
  const copyKind = context.kind === "page" ? "url" : "content";
  const copyLabelKey: UiTextKey =
    context.kind === "page"
      ? "copyUrl"
      : context.kind === "article"
        ? "copyCurrentBody"
        : context.kind === "selection"
          ? "copySelection"
          : "copyContent";
  const copyContext = async (value: string, kind: "url" | "content") => {
    await navigator.clipboard.writeText(value);
    setCopiedContext(kind);
    window.setTimeout(() => setCopiedContext(null), 1400);
  };

  return (
    <div className="tool-invocation-bubble">
      <div className="tool-invocation-row">
        <span className="tool-invocation-tool-icon">
          <ToolIcon name={invocation.icon} />
        </span>
        <div className="tool-invocation-copy">
          <span className="tool-invocation-label">
            {uiText(language, "usedTool")}
          </span>
          <strong
            className="tool-invocation-tool-title"
            title={invocation.title}
          >
            {invocation.title}
          </strong>
        </div>
      </div>
      <div className="tool-invocation-row tool-invocation-context">
        <span className="tool-invocation-context-icon">
          {context.kind === "page" || context.kind === "article" ? (
            <PageFavicon url={context.faviconUrl} />
          ) : ContextIcon ? (
            <ContextIcon />
          ) : (
            <TextSelect />
          )}
        </span>
        <div className="tool-invocation-copy">
          <span className="tool-invocation-label">
            {uiText(language, "questionContext")}
          </span>
          {context.kind === "page" || context.kind === "article" ? (
            <span className="tool-invocation-page-snapshot">
              {snapshotLines.map((line, index) => (
                <span
                  className="tool-invocation-tooltip-anchor"
                  data-tooltip={line}
                  key={`${index}-${line}`}
                >
                  <span
                    className={
                      index === 0
                        ? "tool-invocation-page-title"
                        : "tool-invocation-page-excerpt"
                    }
                  >
                    {line}
                  </span>
                </span>
              ))}
            </span>
          ) : (
            <span
              className="tool-invocation-tooltip-anchor"
              data-tooltip={contextDisplayText ?? contextValue}
            >
              <span className="tool-invocation-context-value">
                {contextDisplayText ?? contextValue}
              </span>
            </span>
          )}
        </div>
        {copyValue && (
          <button
            className="tool-invocation-copy-button"
            type="button"
            title={
              copiedContext === copyKind
                ? uiText(language, "copied")
                : uiText(language, copyLabelKey)
            }
            aria-label={uiText(language, copyLabelKey)}
            onClick={() => void copyContext(copyValue, copyKind)}
          >
            {copiedContext === copyKind ? <Check /> : <Copy />}
          </button>
        )}
      </div>
    </div>
  );
}
