import { uiText } from "./i18n";
import {
  autoTranslateInstruction,
  dictionaryTranslationInstruction,
  htmlFormattingInstruction,
  isDictionaryTranslationInput,
  translationDirectionInstruction,
  translationFormatInstruction,
  type PromptConfigSource
} from "./prompts";
import type {
  AppLanguage,
  ChatMessage,
  PageTextBlock,
  PageTranslation
} from "./types";

export interface ProtectedTranslationText {
  text: string;
  citations: string[];
  links: ProtectedTranslationLink[];
  formats: ProtectedTranslationFormat[];
  htmlTags: string[];
  paragraphBreaks: string[];
}

interface ProtectedTranslationLink {
  href: string;
  text: string;
}

interface ProtectedTranslationFormat {
  tag: "sup" | "sub";
  text: string;
}

export function chunkItems<T>(items: T[], size: number): T[][] {
  const chunkSize = Math.max(1, Math.round(size));
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const concurrency = Math.max(1, Math.min(items.length, Math.round(limit)));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index], index);
      }
    })
  );
  return results;
}

const TRANSLATION_CITATION_PATTERN =
  /\[\s*\d+(?:\s*[-,–—]\s*\d+)*\s*\]|[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function protectedTokenPattern(
  kind:
    | "CITATION"
    | "PARAGRAPH_BREAK"
    | "LINK_START"
    | "LINK_END"
    | "FORMAT_START"
    | "FORMAT_END"
    | "HTML_TAG",
  index: number
) {
  return new RegExp(
    protectedTokenSource(kind, index),
    "gi"
  );
}

function protectedTokenSource(
  kind:
    | "CITATION"
    | "PARAGRAPH_BREAK"
    | "LINK_START"
    | "LINK_END"
    | "FORMAT_START"
    | "FORMAT_END"
    | "HTML_TAG",
  index: number
): string {
  const token = `WEBMIND_${kind}_${index}(?!\\d)`;
  return `\`?(?:\\{\\{\\s*${token}\\s*\\}\\}|\\[\\s*${token}\\s*\\]|${token})\`?`;
}

function visibleTextFromHtmlFragment(value: string): string {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BRACKET_CITATION_MARKER_SOURCE =
  "\\[\\s*\\d+(?:\\s*[-,–—]\\s*\\d+)*\\s*\\]";

const CITATION_EXPLANATION_BEFORE_MARKER_PATTERN = new RegExp(
  [
    "(^|[\\s([{（【「『“‘\\]])",
    "(?:\\*\\*\\s*)?",
    "(?:",
    "\\d+\\s+(?:citations?|references?)\\s+(?:from\\s+)?(?:multiple|several|various|many)\\s+(?:sources?|references?|outlets?)",
    "|(?:citations?|references?|sources?)\\s+\\d+\\s+(?:from|based\\s+on)\\s+[^\\[\\]\\n*]{1,80}?",
    ")",
    "(?:\\s*\\*\\*)?",
    "\\s*",
    `(${BRACKET_CITATION_MARKER_SOURCE})`
  ].join(""),
  "gi"
);

export function cleanCitationExplanationText(text: string): string {
  let cleaned = text;
  let previous = "";
  while (cleaned !== previous) {
    previous = cleaned;
    cleaned = cleaned.replace(
      CITATION_EXPLANATION_BEFORE_MARKER_PATTERN,
      "$1$2"
    );
  }
  return cleaned;
}

function stripTranslationTaskPreface(text: string): string {
  let cleaned = text;
  const prefacePattern =
    /^\s*(?:(?:这是(?:一个|一项)?翻译任务[。.!！]?\s*)?(?:以下是(?:根据您提供的内容进行的)?翻译|翻译(?:如下|结果)|译文如下|以下为译文)[：:。.!！]?\s*)+/i;
  while (prefacePattern.test(cleaned)) {
    cleaned = cleaned.replace(prefacePattern, "");
  }
  return cleaned.trimStart();
}

function stripCitationExplanationNoise(
  text: string,
  citationCount: number
): string {
  let cleaned = text;
  for (let index = 1; index <= citationCount; index += 1) {
    const token = protectedTokenSource("CITATION", index);
    const beforeToken = new RegExp(
      [
        "(?:[（(]\\s*)?",
        "(?:(?:该|此|本)?(?:信息|内容|內容|资料|資料|句子|段落)?\\s*)?",
        "(?:(?:来自|來自|源自|based\\s+on|from)\\s*)?",
        "(?:多方|多个|多個|若干|上方|以上|前述|multiple|several)?\\s*",
        "(?:来源|來源|资料来源|資料來源|source|sources)\\s*",
        "(?:的|之)?\\s*",
        "(?:\\d+|[一二三四五六七八九十]+)?\\s*",
        "(?:条|條|处|處|个|個)?\\s*",
        "(?:引用|引文|参考|參考|citation|citations|reference|references)?\\s*",
        "(?:[）)]\\s*)?",
        `(${token})`
      ].join(""),
      "gi"
    );
    const afterToken = new RegExp(
      [
        `(${token})`,
        "\\s*(?:[（(]\\s*)?",
        "(?:(?:该|此|本)?(?:信息|内容|內容|资料|資料)?\\s*)?",
        "(?:来自|來自|源自|来源于|來源於|based\\s+on|from)\\s*",
        "[^。.!?\\n]{0,50}",
        "(?:引用|引文|参考|參考|来源|來源|source|sources|citation|citations|reference|references)",
        "[^。.!?\\n]{0,20}",
        "(?:[）)]\\s*)?"
      ].join(""),
      "gi"
    );
    cleaned = cleaned.replace(beforeToken, "$1").replace(afterToken, "$1");
  }
  return cleaned;
}

function stripCitationMarkerExplanationNoise(
  text: string,
  markers: string[]
): string {
  let cleaned = text;
  markers.forEach((marker, index) => {
    if (!marker) return;
    const markerSource = escapeRegExp(marker);
    const citationNumber = String(index + 1);
    const beforeMarker = new RegExp(
      [
        "(?:\\s|^)",
        "(?:citation|citations|reference|references|source|sources|引用|引文|来源|來源|参考|參考)",
        "\\s*",
        `(?:${citationNumber}|\\d+)?`,
        "\\s*",
        "(?:from|based\\s+on|来自|來自|源自|来源于|來源於|：|:)?",
        "\\s*",
        "[^\\[\\]{}\\n]{0,80}?",
        `(${markerSource})`
      ].join(""),
      "gi"
    );
    const afterMarker = new RegExp(
      [
        `(${markerSource})`,
        "\\s*",
        "(?:citation|citations|reference|references|source|sources|引用|引文|来源|來源|参考|參考)",
        "\\s*",
        `(?:${citationNumber}|\\d+)?`,
        "\\s*",
        "(?:from|based\\s+on|来自|來自|源自|来源于|來源於|：|:)?",
        "\\s*",
        "[^\\[\\]{}\\n]{0,80}"
      ].join(""),
      "gi"
    );
    cleaned = cleaned
      .replace(beforeMarker, "$1")
      .replace(afterMarker, "$1");
  });
  return cleaned;
}

function stripBrokenTranslationPlaceholderFragments(text: string): string {
  return text
    .replace(/\{+\s*WEBMIND_[A-Z0-9_]+\s*\}+/gi, "")
    .replace(/\[\s*WEBMIND_[A-Z0-9_]+\s*\]/gi, "")
    .replace(/WEBMIND_[A-Z0-9_]+/gi, "")
    .replace(/\{+\s*\d+\s*\}+/g, "")
    .replace(/\{+[ \t]*(?=$|[\r\n])/g, "")
    .replace(/(^|[\r\n])[ \t]*\}+/g, "$1")
    .replace(/\[\s*\d+\s*\]/g, (match) => match.trim())
    .replace(/[ \t]{2,}/g, " ");
}

export function protectTranslationText(text: string): ProtectedTranslationText {
  const citations: string[] = [];
  const links: ProtectedTranslationLink[] = [];
  const formats: ProtectedTranslationFormat[] = [];
  const htmlTags: string[] = [];
  const paragraphBreaks: string[] = [];
  const protectFormat = (tag: "sup" | "sub", value: string) => {
    const visibleText = visibleTextFromHtmlFragment(value);
    if (!visibleText) return "";
    formats.push({ tag, text: visibleText });
    const index = formats.length;
    return `{{WEBMIND_FORMAT_START_${index}}}${visibleText}{{WEBMIND_FORMAT_END_${index}}}`;
  };
  const withFormats = text.replace(
    /<(sup|sub)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, value: string) =>
      protectFormat(tag.toLowerCase() as "sup" | "sub", value)
  );
  const protectLink = (href: string, linkText: string) => {
    const visibleText = visibleTextFromHtmlFragment(linkText);
    if (!href.trim() || !visibleText) return visibleText;
    links.push({ href: href.trim(), text: visibleText });
    const index = links.length;
    return `{{WEBMIND_LINK_START_${index}}}${visibleText}{{WEBMIND_LINK_END_${index}}}`;
  };
  const withHtmlLinks = withFormats.replace(
    /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi,
    (
      _match,
      doubleHref: string | undefined,
      singleHref: string | undefined,
      bareHref: string | undefined,
      label: string
    ) => protectLink(doubleHref ?? singleHref ?? bareHref ?? "", label)
  );
  const withMarkdownLinks = withHtmlLinks.replace(
    /(^|[^!])\[([^\]\n]{1,500})\]\(\s*(?:<([^>\n]+)>|([^\s)]+))(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?\s*\)/g,
    (
      _match,
      prefix: string,
      label: string,
      angleHref: string | undefined,
      plainHref: string | undefined
    ) => `${prefix}${protectLink(angleHref ?? plainHref ?? "", label)}`
  );
  const withCitations = withMarkdownLinks.replace(TRANSLATION_CITATION_PATTERN, (marker) => {
    citations.push(marker);
    return `{{WEBMIND_CITATION_${citations.length}}}`;
  });
  const withHtmlTags = withCitations.replace(
    /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s+[^<>]*?)?\s*\/?>/g,
    (tag) => {
      htmlTags.push(tag);
      return `{{WEBMIND_HTML_TAG_${htmlTags.length}}}`;
    }
  );
  const protectedText = withHtmlTags
    .replace(/\r\n?/g, "\n")
    .replace(/\n[\t ]*\n+/g, (separator) => {
      paragraphBreaks.push(separator);
      return `{{WEBMIND_PARAGRAPH_BREAK_${paragraphBreaks.length}}}`;
    });
  return { text: protectedText, citations, links, formats, htmlTags, paragraphBreaks };
}

export function restoreTranslationText(
  text: string,
  protection: Pick<ProtectedTranslationText, "citations" | "paragraphBreaks"> &
    Partial<Pick<ProtectedTranslationText, "links" | "formats" | "htmlTags">>
): string {
  let restored = stripCitationExplanationNoise(
    text,
    protection.citations.length
  );
  protection.citations.forEach((marker, index) => {
    restored = restored.replace(
      protectedTokenPattern("CITATION", index + 1),
      marker
    );
  });
  protection.paragraphBreaks.forEach((separator, index) => {
    restored = restored.replace(
      protectedTokenPattern("PARAGRAPH_BREAK", index + 1),
      separator.includes("\n\n") ? "\n\n" : separator
    );
  });
  (protection.links ?? []).forEach((link, index) => {
    const linkPattern = new RegExp(
      [
        protectedTokenSource("LINK_START", index + 1),
        "([\\s\\S]*?)",
        protectedTokenSource("LINK_END", index + 1)
      ].join(""),
      "gi"
    );
    restored = restored.replace(linkPattern, (_match, label: string) => {
      const visibleText = label.replace(/\s+/g, " ").trim() || link.text;
      return `[${visibleText.replace(/([\\\]])/g, "\\$1")}](<${link.href}>)`;
    });
    restored = restored
      .replace(protectedTokenPattern("LINK_START", index + 1), "")
      .replace(protectedTokenPattern("LINK_END", index + 1), "");
  });
  (protection.formats ?? []).forEach((format, index) => {
    const formatPattern = new RegExp(
      [
        protectedTokenSource("FORMAT_START", index + 1),
        "([\\s\\S]*?)",
        protectedTokenSource("FORMAT_END", index + 1)
      ].join(""),
      "gi"
    );
    restored = restored.replace(formatPattern, (_match, value: string) => {
      const visibleText = value.replace(/\s+/g, " ").trim() || format.text;
      return `<${format.tag}>${visibleText}</${format.tag}>`;
    });
    restored = restored
      .replace(protectedTokenPattern("FORMAT_START", index + 1), "")
      .replace(protectedTokenPattern("FORMAT_END", index + 1), "");
  });
  (protection.htmlTags ?? []).forEach((tag, index) => {
    restored = restored.replace(
      protectedTokenPattern("HTML_TAG", index + 1),
      tag
    );
  });
  const missingCitations = protection.citations.filter(
    (marker) => marker && !restored.includes(marker)
  );
  if (missingCitations.length) {
    restored = `${restored.trimEnd()} ${missingCitations.join(" ")}`;
  }
  restored = stripCitationMarkerExplanationNoise(restored, protection.citations);
  restored = stripBrokenTranslationPlaceholderFragments(restored);
  restored = stripTranslationTaskPreface(restored);
  return restored.replace(/\n[\t ]*\n(?:[\t ]*\n)+/g, "\n\n");
}

export function buildProtectedTranslationPrompt(
  config: PromptConfigSource | undefined,
  sourceText: string,
  protectedText: string,
  options: { dictionaryForShortInput?: boolean } = {}
): string {
  return [
    buildProtectedTranslationInstruction(config, sourceText, options),
    buildProtectedTranslationInput(protectedText)
  ].filter(Boolean).join("\n");
}

export function buildProtectedTranslationInstruction(
  config: PromptConfigSource | undefined,
  sourceText: string,
  options: { dictionaryForShortInput?: boolean } = {}
): string {
  const dictionaryMode =
    options.dictionaryForShortInput && isDictionaryTranslationInput(sourceText);
  return [
    dictionaryMode
      ? dictionaryTranslationInstruction(config, sourceText)
      : autoTranslateInstruction(config, sourceText),
    translationDirectionInstruction(config, sourceText),
    dictionaryMode ? "" : translationFormatInstruction(config),
    dictionaryMode ? "" : htmlFormattingInstruction(config),
    dictionaryMode
      ? ""
      : uiText(
          typeof config === "object" ? config?.interfaceLanguage : config,
          "translationOutputOnlyInstruction"
        )
  ].filter(Boolean).join("\n");
}

export function buildProtectedTranslationInput(protectedText: string): string {
  return [
    "<translation-input>",
    protectedText,
    "</translation-input>"
  ].filter(Boolean).join("\n");
}

export function buildPageTranslationSystemPrompt(
  config: PromptConfigSource | undefined,
  sourceText: string
): string {
  return [
    autoTranslateInstruction(config, sourceText),
    translationDirectionInstruction(config, sourceText),
    translationFormatInstruction(config),
    htmlFormattingInstruction(config),
    uiText(
      typeof config === "object" ? config?.interfaceLanguage : config,
      "jsonArrayTranslationInstruction"
    ),
    uiText(
      typeof config === "object" ? config?.interfaceLanguage : config,
      "citationPlaceholderInstruction"
    ),
    uiText(
      typeof config === "object" ? config?.interfaceLanguage : config,
      "jsonArrayReturnInstruction"
    )
  ].filter(Boolean).join("\n");
}

export function buildPageTranslationUserPrompt(
  blocks: PageTextBlock[]
): string {
  return `<translation-input>\n${JSON.stringify(blocks)}\n</translation-input>`;
}

export function createMessage(
  role: ChatMessage["role"],
  content: string,
  partial: Partial<ChatMessage> = {}
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: Date.now(),
    ...partial
  };
}

export function toModelMessage(message: ChatMessage): ChatMessage {
  const { modelContent, ...visibleMessage } = message;
  return modelContent
    ? { ...visibleMessage, content: modelContent }
    : visibleMessage;
}

export function truncateText(
  text: string,
  maxChars: number,
  language?: AppLanguage
): string {
  const normalized = text.replace(/\u0000/g, "").trim();
  if (normalized.length <= maxChars) return normalized;
  const head = Math.floor(maxChars * 0.72);
  const tail = maxChars - head;
  return `${normalized.slice(0, head)}\n\n[...${uiText(language, "contentTruncated")}...]\n\n${normalized.slice(-tail)}`;
}

export function isPointInsideAnyRect(
  rects: ArrayLike<
    Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width" | "height">
  >,
  clientX: number,
  clientY: number
): boolean {
  return Array.from(rects).some(
    (rect) =>
      rect.width !== 0 &&
      rect.height !== 0 &&
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
  );
}

export function cleanBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function endpointUrl(baseUrl: string, suffix: string): string {
  const base = cleanBaseUrl(baseUrl);
  if (base.endsWith(suffix)) return base;
  return `${base}${suffix}`;
}

export function originPattern(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return `${parsed.origin}/*`;
  } catch {
    return null;
  }
}

export function parseCustomHeaders(
  raw: string,
  language?: AppLanguage
): Record<string, string> {
  if (!raw.trim()) return {};
  const value: unknown = JSON.parse(raw);
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error(uiText(language, "customHeadersJsonObject"));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, String(entry)])
  );
}

export function extractJsonArray<T = unknown>(
  text: string,
  language?: AppLanguage
): T[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced ?? text;
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  if (start < 0 || end <= start) {
    throw new Error(uiText(language, "jsonArrayMissing"));
  }
  const parsed: unknown = JSON.parse(source.slice(start, end + 1));
  if (!Array.isArray(parsed)) {
    throw new Error(uiText(language, "jsonArrayInvalid"));
  }
  return parsed as T[];
}

function extractLooseObjectChunks(source: string): string[] {
  const chunks: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (start < 0) {
      if (char === "{") {
        start = index;
        depth = 1;
        inString = false;
        escaped = false;
      }
      continue;
    }
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        chunks.push(source.slice(start, index + 1));
        start = -1;
      }
    }
  }
  return chunks;
}

function parseLooseTranslationChunk(chunk: string): unknown | null {
  try {
    return JSON.parse(chunk);
  } catch {
    const fields = ["id", "text", "translation", "translatedText", "content"];
    const record: Record<string, unknown> = {};
    for (const field of fields) {
      const match = chunk.match(
        new RegExp(
          `"(?:${field})"\\s*:\\s*"((?:\\\\.|[^"])*)"`,
          "i"
        )
      );
      if (match?.[1]) {
        try {
          record[field] = JSON.parse(`"${match[1]}"`);
        } catch {
          record[field] = match[1];
        }
      }
    }
    return Object.keys(record).length ? record : null;
  }
}

export function extractPageTranslationEntries(
  text: string,
  expectedCount: number,
  language?: AppLanguage
): unknown[] {
  try {
    return extractJsonArray(text, language);
  } catch (arrayError) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    const source = (fenced ?? text).trim();
    try {
      const parsed = JSON.parse(source) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>;
        for (const key of ["translations", "items", "results", "data"]) {
          if (Array.isArray(record[key])) return record[key] as unknown[];
        }
        if (expectedCount === 1) return [record];
      }
    } catch {
      // A single translated paragraph may legitimately be returned as plain text.
    }
    const looseChunks = extractLooseObjectChunks(source)
      .map((chunk) => parseLooseTranslationChunk(chunk))
      .filter((entry): entry is object => Boolean(entry));
    if (looseChunks.length) return looseChunks;
    if (expectedCount === 1 && source && !/^[\[{]/.test(source)) {
      return [{ text: source }];
    }
    throw arrayError;
  }
}

/**
 * Models occasionally rewrite opaque block IDs or return a different field
 * name for the translated text. Keep the page's request order as the final
 * fallback so a valid translation is not discarded during DOM write-back.
 */
export function alignPageTranslations(
  blocks: PageTextBlock[],
  entries: unknown[]
): PageTranslation[] {
  const candidates = entries.flatMap((entry) => {
    if (typeof entry === "string" && entry.trim()) {
      return [{ id: "", text: entry.trim() }];
    }
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const text = [record.text, record.translation, record.translatedText, record.content]
      .find(
        (value): value is string =>
          Boolean(typeof value === "string" && value.trim())
      );
    if (!text) return [];
    return [{
      id: typeof record.id === "string" ? record.id : "",
      text: text.trim()
    }];
  });
  const used = new Set<number>();
  const alignedByBlockId = new Map<string, PageTranslation>();

  for (const block of blocks) {
    const candidateIndex = candidates.findIndex(
      (candidate, entryIndex) =>
        !used.has(entryIndex) && candidate.id.trim() === block.id
    );
    if (candidateIndex < 0) continue;
    used.add(candidateIndex);
    alignedByBlockId.set(block.id, {
      id: block.id,
      text: candidates[candidateIndex].text
    });
  }

  for (const [index, block] of blocks.entries()) {
    if (alignedByBlockId.has(block.id)) continue;
    let candidateIndex = -1;
    if (candidateIndex < 0 && !used.has(index) && candidates[index]) {
      candidateIndex = index;
    }
    if (candidateIndex < 0) {
      candidateIndex = candidates.findIndex((_, entryIndex) => !used.has(entryIndex));
    }
    if (candidateIndex < 0) continue;
    used.add(candidateIndex);
    alignedByBlockId.set(block.id, {
      id: block.id,
      text: candidates[candidateIndex].text
    });
  }
  return blocks.flatMap((block) => {
    const translation = alignedByBlockId.get(block.id);
    return translation ? [translation] : [];
  });
}

export function dataUrlParts(dataUrl: string, language?: AppLanguage): {
  mimeType: string;
  base64: string;
} {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error(uiText(language, "invalidImageData"));
  return { mimeType: match[1], base64: match[2] };
}

export function shortTitle(text: string, max = 42): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  return singleLine.length <= max
    ? singleLine
    : `${singleLine.slice(0, max - 1)}…`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
