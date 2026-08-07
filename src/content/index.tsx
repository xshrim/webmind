import { Readability } from "@mozilla/readability";
import {
  BotMessageSquare,
  Check,
  ChevronDown,
  Clipboard,
  BookOpen,
  Code2,
  Copy,
  FileText,
  Globe2,
  ImagePlus,
  Languages,
  Lightbulb,
  ListChecks,
  Maximize2,
  MessageSquareText,
  Minimize2,
  MessageSquareReply,
  PanelRightOpen,
  PenLine,
  Presentation,
  Reply,
  RotateCcw,
  ScanText,
  Search,
  Send,
  Sparkles,
  TextSelect,
  Wand2,
  WandSparkles,
  X
} from "lucide-react";
import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect
} from "react";
import { createRoot } from "react-dom/client";
import { resolveLanguage, uiText, type UiTextKey } from "../shared/i18n";
import { englishLemmaCandidates } from "../shared/englishInflections";
import {
  searchParamNamesFromUrl,
  searchQueryFromUrl
} from "../shared/searchEngines";
import { loadCustomTools, loadSettings, saveSettings } from "../shared/storage";
import { allTools, toolInstruction } from "../shared/tools";
import { profileForPurpose } from "../shared/models";
import {
  immersiveReadingInstruction,
} from "../shared/prompts";
import type {
  AppSettings,
  CustomTool,
  ImageAttachment,
  ImmersiveReadingMode,
  ImmersiveTranslationDisplayStyle,
  ImmersiveTranslationTextEffect,
  PageContext,
  PageTextBlock,
  PageTranslation,
  PageTranslationMode,
  PendingAction,
  ToolDefinition,
  WebSearchResult
} from "../shared/types";
import {
  alignPageTranslations,
  buildPageTranslationSystemPrompt,
  buildPageTranslationUserPrompt,
  chunkItems,
  createMessage,
  errorMessage,
  extractPageTranslationEntries,
  isPointInsideAnyRect,
  mapWithConcurrency,
  protectTranslationText,
  restoreTranslationText,
  truncateText
} from "../shared/utils";
import { Markdown } from "../ui/Markdown";
import { PAGE_STYLES, SHADOW_STYLES } from "./styles";

const IMMERSIVE_READING_BATCH_SIZE = 20;
const IMMERSIVE_TRANSLATION_BATCH_SIZE = 10;
const IMMERSIVE_TRANSLATION_CONCURRENCY = 3;

interface EditableSnapshot {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  start?: number;
  end?: number;
  range?: Range;
}

interface AutoReplyTarget {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
  singleLine: boolean;
  text: string;
}

interface ImageTextTarget {
  element: HTMLImageElement;
  rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
  src: string;
  alt: string;
}

interface SelectionSnapshot {
  text: string;
  rect: DOMRect;
  range?: Range;
  editable?: EditableSnapshot;
}

interface RuntimeEnvelope<T> {
  ok: boolean;
  result?: T;
  error?: string;
}

interface TranslationProgressState {
  active: boolean;
  title: string;
  label: string;
  percent: number;
  error?: boolean;
}

interface PreservedCitation {
  token: string;
  marker: string;
  node: HTMLElement;
}

interface TranslationSourceRecord {
  element: HTMLElement;
  originalText: string;
  citations: PreservedCitation[];
  selection: boolean;
}

interface SearchAnswerState {
  text: string;
  error: string;
  busy: boolean;
  results: WebSearchResult[];
}

interface HoverDefinitionDictionary {
  source: string;
  version: number;
  zh: Record<string, string>;
  en: Record<string, string>;
}

interface HoverDefinitionCandidate {
  text: string;
  candidates: string[];
  rects: DOMRect[];
  ranges: Range[];
  language: "zh" | "en";
  rect: DOMRect;
  key: string;
}

interface HoverPointerPosition {
  clientX: number;
  clientY: number;
}

let settings: AppSettings | null = null;
let showSelection: ((snapshot: SelectionSnapshot | null) => void) | null = null;
let showTranslationProgress:
  | ((progress: TranslationProgressState | null) => void)
  | null = null;
let translationSequence = 0;
let lastPointerTarget: EventTarget | null = null;
let assistantHost: HTMLElement | null = null;
const translationSources = new Map<string, TranslationSourceRecord>();
let selectionReportTimer: number | null = null;
let selectionOverlayTimer: number | null = null;
let lastSelectionReportKey = "";
let hoverDefinitionDictionaryPromise: Promise<HoverDefinitionDictionary> | null =
  null;
const HOVER_DEFINITION_HIGHLIGHT_NAME = "webmind-hover-definition";

function contentText(key: UiTextKey): string {
  return uiText(settings?.interfaceLanguage, key);
}

const TRANSLATION_DISPLAY_STYLES = new Set<ImmersiveTranslationDisplayStyle>([
  "default",
  "highlight",
  "divider",
  "quote",
  "blur",
  "transparent"
]);
const TRANSLATION_TEXT_EFFECTS = new Set<ImmersiveTranslationTextEffect>([
  "underline",
  "dashed-underline",
  "large",
  "small",
  "bold",
  "italic",
  "emphasis",
  "light"
]);
const IMAGE_TEXT_EXTRACTION_TOOL_ID = "image-text-extraction";

const TRANSLATABLE_BLOCK_SELECTOR =
  "h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, td, dt, dd, [role='heading'], [role='paragraph']";
const TRANSLATABLE_PAGE_SELECTOR = TRANSLATABLE_BLOCK_SELECTOR;

const TOOL_ICONS = {
  BookOpen,
  Code2,
  FileText,
  Globe2,
  ImagePlus,
  Languages,
  Lightbulb,
  ListChecks,
  Maximize2,
  MessageSquareText,
  Minimize2,
  MessageSquareReply,
  PanelRightOpen,
  PenLine,
  Presentation,
  Reply,
  RotateCcw,
  Search,
  ScanText,
  Sparkles,
  TextSelect,
  Wand2,
  WandSparkles
};

function ToolIcon({ name }: { name: string }) {
  const Icon = TOOL_ICONS[name as keyof typeof TOOL_ICONS] ?? Sparkles;
  return <Icon />;
}

function normalizePattern(value: string): string {
  return value.trim().toLowerCase();
}

function wildcardMatch(value: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i").test(value);
}

function urlMatchesRule(url: string, rule: string): boolean {
  const pattern = normalizePattern(rule);
  if (!pattern) return false;
  const current = new URL(url);
  const href = current.href.toLowerCase();
  const host = current.hostname.toLowerCase();
  if (pattern.includes("://") || pattern.includes("/") || pattern.includes("*")) {
    return wildcardMatch(href, pattern) || href.includes(pattern.replace(/\*/g, ""));
  }
  return host === pattern || host.endsWith(`.${pattern}`);
}

function urlMatchesBlacklist(url: string, rules: string[] = []): boolean {
  return rules.some((rule) => {
    try {
      return urlMatchesRule(url, rule);
    } catch {
      return false;
    }
  });
}

function urlMatchesWhitelist(url: string, rules: string[] = []): boolean {
  return rules.some((rule) => {
    try {
      return urlMatchesRule(url, rule);
    } catch {
      return false;
    }
  });
}

function imageDataUrlToAttachment(
  dataUrl: string,
  fallbackName: string
): ImageAttachment | null {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/i);
  if (!match) return null;
  return {
    id: crypto.randomUUID(),
    kind: "image",
    name: fallbackName,
    mimeType: match[1],
    dataUrl
  };
}

async function imageElementToDataUrl(
  image: HTMLImageElement
): Promise<string | null> {
  try {
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
      return null;
    }
    const canvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      2048 / Math.max(image.naturalWidth || 1, image.naturalHeight || 1)
    );
    canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

async function cropImageFromVisibleCapture(
  image: HTMLImageElement,
  captureDataUrl: string
): Promise<ImageAttachment | null> {
  const screenshot = new Image();
  screenshot.src = captureDataUrl;
  try {
    await screenshot.decode();
  } catch {
    return null;
  }
  const rect = image.getBoundingClientRect();
  const left = Math.max(0, Math.min(window.innerWidth, rect.left));
  const top = Math.max(0, Math.min(window.innerHeight, rect.top));
  const right = Math.max(0, Math.min(window.innerWidth, rect.right));
  const bottom = Math.max(0, Math.min(window.innerHeight, rect.bottom));
  if (right - left < 2 || bottom - top < 2) return null;
  const scaleX = screenshot.naturalWidth / Math.max(1, window.innerWidth);
  const scaleY = screenshot.naturalHeight / Math.max(1, window.innerHeight);
  const sourceX = Math.max(0, Math.round(left * scaleX));
  const sourceY = Math.max(0, Math.round(top * scaleY));
  const sourceWidth = Math.min(
    screenshot.naturalWidth - sourceX,
    Math.max(1, Math.round((right - left) * scaleX))
  );
  const sourceHeight = Math.min(
    screenshot.naturalHeight - sourceY,
    Math.max(1, Math.round((bottom - top) * scaleY))
  );
  if (sourceWidth < 2 || sourceHeight < 2) return null;
  const maxSide = 2048;
  const outputScale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * outputScale));
  canvas.height = Math.max(1, Math.round(sourceHeight * outputScale));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(
    screenshot,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  const dataUrl = canvas.toDataURL("image/png");
  return imageDataUrlToAttachment(dataUrl, imageTextName(image));
}

function imageHoverRect(image: HTMLImageElement) {
  const rect = image.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height
  };
}

function imageTextName(image: HTMLImageElement): string {
  const explicit = image.alt.trim() || image.title.trim();
  if (explicit) return explicit;
  try {
    return decodeURIComponent(
      new URL(image.currentSrc || image.src, location.href).pathname.split("/").pop() ||
        "image"
    );
  } catch {
    return "image";
  }
}

async function imageElementToAttachment(
  image: HTMLImageElement,
  capturePromise?: Promise<{ dataUrl: string } | null>
): Promise<ImageAttachment> {
  const dataUrl = await imageElementToDataUrl(image);
  if (dataUrl) {
    const attachment = imageDataUrlToAttachment(dataUrl, imageTextName(image));
    if (attachment) return attachment;
  }
  const src = image.currentSrc || image.src;
  let fetchError: unknown = new Error(contentText("readImageUrlFailed"));
  if (src) {
    try {
      return await runtimeRequest<ImageAttachment>("image.fetchDataUrl", {
        url: src
      });
    } catch (requestError) {
      fetchError = requestError;
    }
  }
  const capture = await capturePromise?.catch(() => null);
  if (capture?.dataUrl) {
    const attachment = await cropImageFromVisibleCapture(image, capture.dataUrl);
    if (attachment) return attachment;
  }
  throw fetchError;
}

function isFocusOutside(
  container: HTMLElement,
  nextTarget: EventTarget | null
): boolean {
  return !(nextTarget instanceof Node) || !container.contains(nextTarget);
}

function isAssistantEvent(event: Event): boolean {
  return Boolean(assistantHost && event.composedPath().includes(assistantHost));
}

function isModifierKey(event: KeyboardEvent, key: "alt" | "ctrl"): boolean {
  const lowerKey = event.key.toLowerCase();
  if (key === "alt") {
    return (
      lowerKey === "alt" ||
      lowerKey === "altgraph" ||
      event.code === "AltLeft" ||
      event.code === "AltRight"
    );
  }
  return (
    lowerKey === "control" ||
    event.code === "ControlLeft" ||
    event.code === "ControlRight"
  );
}

function isAltOnlyShortcutEvent(event: KeyboardEvent): boolean {
  return (
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    (event.altKey || isModifierKey(event, "alt"))
  );
}

function isCtrlAltShortcutEvent(event: KeyboardEvent): boolean {
  const altPressed =
    event.altKey ||
    event.getModifierState("AltGraph") ||
    isModifierKey(event, "alt");
  const ctrlPressed =
    event.ctrlKey ||
    event.getModifierState("AltGraph") ||
    isModifierKey(event, "ctrl");
  return altPressed && ctrlPressed && !event.metaKey && !event.shiftKey;
}

function isCtrlDefinitionShortcut(event: {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  return (
    event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function loadHoverDefinitionDictionary(): Promise<HoverDefinitionDictionary> {
  if (!hoverDefinitionDictionaryPromise) {
    hoverDefinitionDictionaryPromise = fetch(
      chrome.runtime.getURL("dictionary/cc-cedict.json")
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Dictionary request failed: ${response.status}`);
      }
      const dictionary = (await response.json()) as Partial<HoverDefinitionDictionary>;
      if (!dictionary.zh || !dictionary.en) {
        throw new Error("Invalid dictionary");
      }
      return {
        source: dictionary.source ?? "CC-CEDICT",
        version: Number(dictionary.version ?? 1),
        zh: dictionary.zh,
        en: dictionary.en
      };
    });
  }
  return hoverDefinitionDictionaryPromise;
}

type ReadingFamily = "zh" | "en";

interface ReadingSpan {
  start: number;
  end: number;
  source: string;
  translation?: string;
  score: number;
}

interface ReadingPlanBlock {
  id: string;
  text: string;
  family: ReadingFamily;
  targetFamily: ReadingFamily;
  spans: ReadingSpan[];
}

interface ReadingFallbackTerm {
  key: string;
  source: string;
  context: string;
  family: ReadingFamily;
  targetFamily: ReadingFamily;
}

interface ReadingLocalPlan {
  blocks: ReadingPlanBlock[];
  fallbackTerms: ReadingFallbackTerm[];
}

interface ReadingFallbackTranslation {
  key?: string;
  source?: string;
  translation?: string;
}

const ENGLISH_BASIC_WORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "also",
  "am",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "done",
  "each",
  "for",
  "from",
  "get",
  "go",
  "had",
  "has",
  "have",
  "he",
  "her",
  "here",
  "him",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "me",
  "more",
  "most",
  "my",
  "no",
  "not",
  "of",
  "on",
  "one",
  "or",
  "our",
  "out",
  "over",
  "she",
  "so",
  "some",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "to",
  "too",
  "up",
  "us",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "will",
  "with",
  "would",
  "you",
  "your"
]);

const CHINESE_BASIC_WORDS = new Set([
  "的",
  "了",
  "和",
  "是",
  "在",
  "有",
  "不",
  "就",
  "人",
  "都",
  "一",
  "也",
  "很",
  "與",
  "与",
  "及",
  "我",
  "你",
  "他",
  "她",
  "它",
  "我们",
  "你们",
  "他们",
  "她们",
  "這",
  "这",
  "那",
  "哪",
  "为",
  "為",
  "對",
  "对"
]);

function detectReadingFamily(text: string): ReadingFamily | null {
  const source = text.replace(/<[^>]*>/g, " ");
  const latinCount = source.match(/[A-Za-z]/g)?.length ?? 0;
  const hanCount = source.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
  if (hanCount >= 2 && hanCount >= latinCount) return "zh";
  if (latinCount >= 2) return "en";
  return null;
}

function settingReadingFamily(
  language: AppSettings["interfaceLanguage"] | AppSettings["translationLanguage"] | string | undefined,
  fallback = false
): ReadingFamily | null {
  if (!language) return null;
  const resolved = language === "auto" ? (fallback ? resolveLanguage("auto") : null) : language;
  if (resolved === "zh-CN" || resolved === "zh-TW") return "zh";
  if (resolved === "en") return "en";
  return null;
}

function targetReadingFamily(
  settings: AppSettings,
  sourceFamily: ReadingFamily
): ReadingFamily | null {
  const interfaceFamily = settingReadingFamily(
    settings.interfaceLanguage === "auto"
      ? resolveLanguage("auto")
      : settings.interfaceLanguage
  );
  const manualTarget =
    settings.translationLanguage === "auto"
      ? null
      : settingReadingFamily(settings.translationLanguage);
  if (manualTarget) return manualTarget !== sourceFamily ? manualTarget : null;
  if (!interfaceFamily) return null;
  return sourceFamily === interfaceFamily ? "en" : interfaceFamily;
}

function simplifyGloss(value: string): string {
  const cleaned = value
    .replace(/\([^)]*\)/g, " ")
    .replace(/（[^）]*）/g, " ")
    .replace(/[\[\]{}]/g, " ")
    .split(/[;/，,、|]/)[0]
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

function englishReadingScore(word: string): number {
  if (word.length < 4) return 0;
  const lower = word.toLowerCase();
  if (ENGLISH_BASIC_WORDS.has(lower)) return 0;
  let score = 1;
  if (word.length >= 8) score += 1;
  if (word.length >= 10) score += 0.5;
  if (/(tion|sion|ment|ness|ity|ive|ous|al|ary|ship|hood|ence|ance|ism|logy|graphy|ize|ise|ate|ify)$/i.test(lower)) {
    score += 1;
  }
  if (/[A-Z]/.test(word.slice(1))) score += 0.25;
  return score;
}

function chineseReadingScore(word: string): number {
  if (word.length < 2) return 0;
  if (CHINESE_BASIC_WORDS.has(word)) return 0;
  let score = 1 + Math.min(1.5, (word.length - 1) * 0.5);
  if (word.length >= 4) score += 0.75;
  return score;
}

function readingTargetCount(
  text: string,
  candidateCount: number,
  difficulty: number,
  family: ReadingFamily
): number {
  const units =
    family === "en"
      ? text.match(/[A-Za-z][A-Za-z'’\-]*/g)?.length ?? 0
      : text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
  const divisor = [8, 11, 15, 21, 30][Math.max(1, Math.min(5, difficulty)) - 1];
  const maxPerBlock = family === "en" ? 18 : 16;
  return Math.max(1, Math.min(candidateCount, maxPerBlock, Math.ceil(units / divisor)));
}

function readingSpanKey(span: ReadingSpan, family: ReadingFamily): string {
  return family === "en"
    ? span.source.toLowerCase().replace(/[’']/g, "'")
    : span.source;
}

function containsWebMindPlaceholder(value: string): boolean {
  return /WEBMIND_[A-Z_]+(?:_\d+)?/i.test(value);
}

function sanitizeReadingMarkerValue(value: string): string {
  return value
    .replace(/`?\{\{\s*WEBMIND_[A-Z_]+(?:_\d+)?\s*\}\}`?/gi, " ")
    .replace(/\[\s*WEBMIND_[A-Z_]+(?:_\d+)?\s*\]/gi, " ")
    .replace(/WEBMIND_[A-Z_]+(?:_\d+)?/gi, " ")
    .replace(/\[\[|\]\]|\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isReadingTranslationLanguageValid(
  translation: string,
  targetFamily: ReadingFamily
): boolean {
  if (targetFamily === "en") return /[A-Za-z]/.test(translation);
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(translation);
}

function selectEnglishReadingSpans(
  text: string,
  dictionary: HoverDefinitionDictionary,
  difficulty: number
): ReadingSpan[] {
  const spans: ReadingSpan[] = [];
  const matches = Array.from(
    text.matchAll(/[A-Za-z][A-Za-z'’\-]*/g)
  );
  for (const match of matches) {
    const original = match[0];
    const candidates = englishLemmaCandidates(original);
    const lemma = candidates.find((candidate) => Boolean(dictionary.en[candidate.toLowerCase()]));
    const score = englishReadingScore(original);
    if (score < [1.5, 1.8, 2.1, 2.6, 3.1][Math.max(1, Math.min(5, difficulty)) - 1]) {
      continue;
    }
    const translation = lemma
      ? simplifyGloss(dictionary.en[lemma.toLowerCase()])
      : "";
    spans.push({
      start: match.index ?? 0,
      end: (match.index ?? 0) + original.length,
      source: original,
      translation: translation
        ? cleanReadingTranslation(original, translation)
        : undefined,
      score
    });
  }
  return spans;
}

function selectChineseReadingSpans(
  text: string,
  dictionary: HoverDefinitionDictionary,
  difficulty: number
): ReadingSpan[] {
  const spans: ReadingSpan[] = [];
  const maxLength = [2, 2, 3, 4, 5][Math.max(1, Math.min(5, difficulty)) - 1];
  const threshold = [1.1, 1.25, 1.45, 1.9, 2.3][Math.max(1, Math.min(5, difficulty)) - 1];
  const regex = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g;
  let match = regex.exec(text);
  while (match) {
    const run = match[0];
    let index = 0;
    while (index < run.length) {
      let best: ReadingSpan | null = null;
      const max = Math.min(maxLength, run.length - index);
      for (let length = max; length >= 2; length -= 1) {
        const source = run.slice(index, index + length);
        if (containsWebMindPlaceholder(source)) continue;
        const meaning = dictionary.zh[source];
        const score = chineseReadingScore(source);
        if (score < threshold) continue;
        const translation = meaning
          ? cleanReadingTranslation(source, simplifyGloss(meaning))
          : "";
        best = {
          start: (match.index ?? 0) + index,
          end: (match.index ?? 0) + index + length,
          source,
          translation: translation || undefined,
          score
        };
        break;
      }
      if (best) {
        spans.push(best);
        index = best.end - (match.index ?? 0);
      } else {
        index += 1;
      }
    }
    match = regex.exec(text);
  }
  return spans;
}

function selectReadingSpans(
  text: string,
  spans: ReadingSpan[],
  difficulty: number,
  family: ReadingFamily
): ReadingSpan[] {
  const targetCount = readingTargetCount(text, spans.length, difficulty, family);
  const seenSources = new Set<string>();
  return spans
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .filter((span) => {
      const key = readingSpanKey(span, family);
      if (seenSources.has(key)) return false;
      seenSources.add(key);
      return true;
    })
    .sort((left, right) =>
      Number(Boolean(right.translation)) - Number(Boolean(left.translation)) ||
      right.score - left.score ||
      left.start - right.start ||
      left.end - right.end
    )
    .slice(0, targetCount)
    .sort((left, right) => left.start - right.start || left.end - right.end);
}

function buildReadingTextFromSelected(
  text: string,
  selected: ReadingSpan[],
  family: ReadingFamily,
  targetFamily?: ReadingFamily,
  fallbackTranslations = new Map<string, string>()
): string | null {
  if (!selected.length) return null;
  const result: string[] = [];
  let cursor = 0;
  for (const span of selected) {
    if (span.start < cursor) continue;
    const key = readingSpanKey(span, family);
    const source = sanitizeReadingMarkerValue(span.source);
    if (!source || containsWebMindPlaceholder(source)) continue;
    const translation = sanitizeReadingMarkerValue(
      span.translation ?? fallbackTranslations.get(key) ?? ""
    );
    const cleanedTranslation = translation
      ? cleanReadingTranslation(span.source, translation)
      : "";
    if (!cleanedTranslation) continue;
    if (
      targetFamily &&
      !isReadingTranslationLanguageValid(cleanedTranslation, targetFamily)
    ) {
      continue;
    }
    result.push(text.slice(cursor, span.start));
    result.push(`[[WEBMIND_READING|${source}|${cleanedTranslation}]]`);
    cursor = span.end;
  }
  result.push(text.slice(cursor));
  const next = result.join("");
  return next === text ? null : next;
}

function buildReadingText(
  text: string,
  spans: ReadingSpan[],
  difficulty: number,
  family: ReadingFamily
): string | null {
  return buildReadingTextFromSelected(
    text,
    selectReadingSpans(text, spans, difficulty, family),
    family
  );
}

async function localReadingTranslations(
  blocks: PageTextBlock[],
  currentSettings: AppSettings
): Promise<PageTranslation[]> {
  const plan = await localReadingPlan(blocks, currentSettings);
  return finalizeLocalReadingPlan(plan.blocks, []);
}

async function localReadingPlan(
  blocks: PageTextBlock[],
  currentSettings: AppSettings
): Promise<ReadingLocalPlan> {
  emitDebugLog(
    `[workflow] immersive reading local plan start blocks=${blocks.length}`
  );
  let dictionary: HoverDefinitionDictionary;
  try {
    dictionary = await loadHoverDefinitionDictionary();
  } catch {
    emitDebugLog(
      "[workflow] immersive reading local plan dictionary load failed"
    );
    return { blocks: [], fallbackTerms: [] };
  }
  const difficulty = Math.max(
    1,
    Math.min(5, Math.round(currentSettings.immersiveReadingDifficulty || 3))
  );
  const planBlocks: ReadingPlanBlock[] = [];
  const fallbackTerms = new Map<string, ReadingFallbackTerm>();
  for (const block of blocks) {
    const family = detectReadingFamily(block.text);
    const targetFamily = family ? targetReadingFamily(currentSettings, family) : null;
    if (!family || !targetFamily || targetFamily === family) continue;
    const spans =
      family === "en"
        ? selectEnglishReadingSpans(block.text, dictionary, difficulty)
        : selectChineseReadingSpans(block.text, dictionary, difficulty);
    const selected = selectReadingSpans(block.text, spans, difficulty, family);
    if (!selected.length) continue;
    planBlocks.push({
      id: block.id,
      text: block.text,
      family,
      targetFamily,
      spans: selected
    });
    for (const span of selected) {
      if (span.translation) continue;
      const key = readingSpanKey(span, family);
      if (fallbackTerms.has(key)) continue;
      fallbackTerms.set(key, {
        key,
        source: span.source,
        context: block.text.slice(
          Math.max(0, span.start - 80),
          Math.min(block.text.length, span.end + 80)
        ),
        family,
        targetFamily
      });
    }
  }
  const fallbackTermList = Array.from(fallbackTerms.values());
  emitDebugLog(
    `[workflow] immersive reading local plan done planBlocks=${planBlocks.length} fallbackTerms=${fallbackTermList.length}`
  );
  return {
    blocks: planBlocks,
    fallbackTerms: fallbackTermList
  };
}

function finalizeLocalReadingPlan(
  blocks: ReadingPlanBlock[],
  fallbackTranslations: ReadingFallbackTranslation[]
): PageTranslation[] {
  const fallbackMap = new Map<string, string>();
  for (const item of fallbackTranslations) {
    const key = String(item.key ?? item.source ?? "").trim();
    const translation = String(item.translation ?? "").trim();
    if (key && translation) fallbackMap.set(key, translation);
  }
  return blocks.flatMap((block) => {
    const text = buildReadingTextFromSelected(
      block.text,
      block.spans,
      block.family,
      block.targetFamily,
      fallbackMap
    );
    return text ? [{ id: block.id, text }] : [];
  });
}

function extractJsonArrayText(value: string): string {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? value;
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  return start >= 0 && end > start ? source.slice(start, end + 1) : source;
}

function parseReadingFallbackTranslations(
  value: string
): ReadingFallbackTranslation[] {
  const parsed = JSON.parse(extractJsonArrayText(value)) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const key = String(record.key ?? record.source ?? "").trim();
    const translation = sanitizeReadingMarkerValue(
      String(record.translation ?? record.text ?? "")
    );
    return key && translation ? [{ key, translation }] : [];
  });
}

function buildReadingFallbackPrompt(terms: ReadingFallbackTerm[]): string {
  return [
    "Translate only the listed immersive-reading terms. Do not choose new terms and do not rewrite the context.",
    "targetFamily=en means translate the source term into concise natural English. targetFamily=zh means translate it into concise natural Chinese.",
    "Never translate, modify, copy, or output WEBMIND_* placeholders. If a placeholder appears in context, ignore it.",
    "For targetFamily=en, every translation must contain English letters. For targetFamily=zh, every translation must contain Chinese characters.",
    "Use the context only to disambiguate. Return only a JSON array, no code fence, in this format: [{\"key\":\"same key\",\"translation\":\"short translation\"}].",
    "<terms>",
    JSON.stringify(
      terms.map((term) => ({
        key: term.key,
        source: term.source,
        sourceFamily: term.family,
        targetFamily: term.targetFamily,
        context: sanitizeReadingMarkerValue(term.context)
      }))
    ),
    "</terms>"
  ].join("\n");
}

async function requestReadingFallbackTranslations(
  terms: ReadingFallbackTerm[],
  profileId: string
): Promise<ReadingFallbackTranslation[]> {
  if (!terms.length) return [];
  emitDebugLog(
    `[workflow] immersive reading fallback term translation start terms=${terms.length}`
  );
  const response = await runtimeRequest<{ text: string }>("model.complete", {
    profileId,
    purpose: "translation",
    temperature: 0,
    messages: [
      createMessage(
        "system",
        "You are WebMind's local-first immersive-reading term translator. Translate only the supplied terms."
      ),
      createMessage("user", buildReadingFallbackPrompt(terms))
    ]
  });
  const translations = parseReadingFallbackTranslations(response.text);
  emitDebugLog(
    `[workflow] immersive reading fallback term translation done translations=${translations.length}`
  );
  return translations;
}

function textNodeAtPoint(
  clientX: number,
  clientY: number
): { node: Text; offset: number } | null {
  const documentWithCaret = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node; offset: number } | null;
  };
  const range = documentWithCaret.caretRangeFromPoint?.(clientX, clientY);
  if (range?.startContainer instanceof Text) {
    return { node: range.startContainer, offset: range.startOffset };
  }
  const position = documentWithCaret.caretPositionFromPoint?.(clientX, clientY);
  if (position?.offsetNode instanceof Text) {
    return { node: position.offsetNode, offset: position.offset };
  }
  return null;
}

function isChineseDefinitionCharacter(value: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(value);
}

function isEnglishDefinitionCharacter(value: string): boolean {
  return /[A-Za-z'\u2019-]/u.test(value);
}

function textRangeDetails(
  node: Text,
  start: number,
  end: number,
  clientX: number,
  clientY: number
): { range: Range; rect: DOMRect } {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const rect = range.getBoundingClientRect();
  return {
    range,
    rect: rect.width || rect.height ? rect : new DOMRect(clientX, clientY, 1, 1)
  };
}

function rangeContainsPoint(
  range: Range,
  clientX: number,
  clientY: number
): boolean {
  return isPointInsideAnyRect(range.getClientRects(), clientX, clientY);
}

function setHoverDefinitionHighlight(range: Range | null): void {
  const registry = (CSS as unknown as {
    highlights?: {
      set: (name: string, highlight: unknown) => void;
      delete: (name: string) => void;
    };
  }).highlights;
  registry?.delete(HOVER_DEFINITION_HIGHLIGHT_NAME);
  if (!range || !registry) return;
  const HighlightConstructor = (globalThis as unknown as {
    Highlight?: new (...ranges: Range[]) => unknown;
  }).Highlight;
  if (!HighlightConstructor) return;
  installPageStyles();
  registry.set(
    HOVER_DEFINITION_HIGHLIGHT_NAME,
    new HighlightConstructor(range)
  );
}

function definitionCandidateAtPoint(
  clientX: number,
  clientY: number
): HoverDefinitionCandidate | null {
  const point = textNodeAtPoint(clientX, clientY);
  if (!point || point.node.getRootNode() !== document) return null;
  const parent = point.node.parentElement;
  if (
    !parent ||
    parent.closest(
      "input, textarea, select, button, [contenteditable='true'], [aria-hidden='true']"
    ) ||
    (assistantHost && parent.closest("#webmind-root"))
  ) {
    return null;
  }
  const text = point.node.data;
  if (!text.trim()) return null;
  let index = Math.min(Math.max(point.offset, 0), text.length - 1);
  if (!isChineseDefinitionCharacter(text[index]) && !isEnglishDefinitionCharacter(text[index])) {
    index -= 1;
  }
  if (index < 0) return null;

  if (isChineseDefinitionCharacter(text[index])) {
    let start = index;
    let end = index + 1;
    while (start > 0 && isChineseDefinitionCharacter(text[start - 1])) start -= 1;
    while (end < text.length && isChineseDefinitionCharacter(text[end])) end += 1;
    const candidates: string[] = [];
    const rects: DOMRect[] = [];
    const ranges: Range[] = [];
    for (let length = Math.min(4, end - start); length >= 1; length -= 1) {
      const first = Math.max(start, index - length + 1);
      const last = Math.min(index, end - length);
      for (let candidateStart = first; candidateStart <= last; candidateStart += 1) {
        const candidate = text.slice(candidateStart, candidateStart + length);
        if (!candidates.includes(candidate)) {
          candidates.push(candidate);
          const details = textRangeDetails(
            point.node,
            candidateStart,
            candidateStart + length,
            clientX,
            clientY
          );
          if (!rangeContainsPoint(details.range, clientX, clientY)) continue;
          rects.push(details.rect);
          ranges.push(details.range);
        }
      }
    }
    if (!candidates.length) return null;
    return {
      text: candidates[0],
      candidates,
      rects,
      ranges,
      language: "zh",
      rect: rects[0],
      key: `zh:${candidates.join("|")}`
    };
  }

  let start = index;
  let end = index + 1;
  while (start > 0 && isEnglishDefinitionCharacter(text[start - 1])) start -= 1;
  while (end < text.length && isEnglishDefinitionCharacter(text[end])) end += 1;
  const word = text.slice(start, end).replace(/^[-'\u2019]+|[-'\u2019]+$/g, "");
  if (!word || !/[A-Za-z]/u.test(word)) return null;
  const details = textRangeDetails(point.node, start, end, clientX, clientY);
  if (!rangeContainsPoint(details.range, clientX, clientY)) return null;
  return {
    text: word,
    candidates: [word],
    rects: [details.rect],
    ranges: [details.range],
    language: "en",
    rect: details.rect,
    key: `en:${word.toLowerCase()}`
  };
}

async function runtimeRequest<T>(
  type: string,
  payload?: Record<string, unknown>
): Promise<T> {
  const response = (await chrome.runtime.sendMessage({
    type,
    payload
  })) as RuntimeEnvelope<T>;
  if (!response?.ok) {
    throw new Error(response?.error ?? contentText("backgroundNoResponse"));
  }
  return response.result as T;
}

function emitDebugLog(message: string): void {
  if (
    typeof chrome === "undefined" ||
    !chrome.runtime?.sendMessage ||
    !message.trim()
  ) {
    return;
  }
  chrome.runtime
    .sendMessage({
      type: "operation.log",
      payload: {
        level: "debug",
        message
      }
    })
    .catch(() => undefined);
}

function installPageStyles(): void {
  if (document.getElementById("webmind-page-styles")) return;
  const style = document.createElement("style");
  style.id = "webmind-page-styles";
  style.textContent = PAGE_STYLES;
  (document.head ?? document.documentElement).append(style);
}

function showPageTooltip(message: string, anchor?: DOMRect | null): void {
  installPageStyles();
  document.getElementById("webmind-page-tooltip")?.remove();
  const tooltip = document.createElement("div");
  tooltip.id = "webmind-page-tooltip";
  tooltip.className = "webmind-page-tooltip";
  tooltip.textContent = message;
  document.documentElement.append(tooltip);
  const rect = tooltip.getBoundingClientRect();
  const reference = anchor ?? (
    lastPointerTarget instanceof Element
      ? lastPointerTarget.getBoundingClientRect()
      : null
  );
  const left = reference
    ? Math.max(
        8,
        Math.min(window.innerWidth - rect.width - 8, reference.left)
      )
    : Math.max(8, window.innerWidth - rect.width - 18);
  const top = reference
    ? Math.max(
        8,
        Math.min(window.innerHeight - rect.height - 8, reference.bottom + 8)
      )
    : Math.max(8, window.innerHeight - rect.height - 18);
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
  window.setTimeout(() => tooltip.remove(), 5000);
}

function textFromElement(element: Element | null): string {
  if (!element) return "";
  const parts: string[] = [];
  let citationIndex = 0;
  const visit = (node: Node) => {
    if (node instanceof Text) {
      parts.push(node.textContent ?? "");
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.matches("script, style, noscript, template, svg")) return;
    const citationAnchor = node.matches("a[href]")
      ? (node as HTMLAnchorElement)
      : node.querySelector<HTMLAnchorElement>("a[href]");
    if (
      citationAnchor &&
      (node.tagName === "SUP" || isCitationAnchor(citationAnchor))
    ) {
      citationIndex += 1;
      const marker = (node.innerText || node.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
      parts.push(
        CITATION_MARKER_PATTERN.test(marker)
          ? marker
          : /^\d+(?:\s*[-,–—]\s*\d+)*$/.test(marker)
            ? `[${marker}]`
            : marker || `[${citationIndex}]`
      );
      return;
    }
    if (node.tagName === "BR") {
      parts.push("\n");
      return;
    }
    for (const child of Array.from(node.childNodes)) visit(child);
    if (/^(?:ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DIV|FIGCAPTION|H[1-6]|LI|P|PRE|SECTION|TR)$/.test(node.tagName)) {
      parts.push("\n\n");
    } else if (/^(?:TD|TH)$/.test(node.tagName)) {
      parts.push("\t");
    }
  };
  for (const child of Array.from(element.childNodes)) visit(child);
  return parts
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function selectionTextWithLayout(selection: Selection | null): string {
  if (!selection?.rangeCount) return "";
  try {
    const container = document.createElement("div");
    container.append(selection.getRangeAt(0).cloneContents());
    const structured = textFromElement(container);
    if (structured) return structured;
  } catch {
    // Fall back to the browser's plain-text selection below.
  }
  return selection
    .toString()
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pageSelectionText(): string {
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement
  ) {
    const start = active.selectionStart ?? 0;
    const end = active.selectionEnd ?? start;
    const selected = active.value.slice(start, end).trim();
    if (selected) return selected;
  }
  return selectionTextWithLayout(window.getSelection());
}

function scheduleSelectionContextReport(): void {
  if (selectionReportTimer !== null) {
    window.clearTimeout(selectionReportTimer);
  }
  selectionReportTimer = window.setTimeout(() => {
    selectionReportTimer = null;
    const text = pageSelectionText().trim().slice(0, 12000);
    const reportKey = `${location.href}\n${text}`;
    if (reportKey === lastSelectionReportKey) return;
    lastSelectionReportKey = reportKey;
    try {
      chrome.runtime.sendMessage(
        {
          type: "page.selection.changed",
          payload: {
            hasSelection: Boolean(text),
            text,
            title: document.title || location.hostname,
            url: location.href
          }
        },
        () => void chrome.runtime.lastError
      );
    } catch {
      // The extension may have been reloaded while this page stayed open.
    }
  }, 100);
}

function selectedInputText(
  target: EventTarget | null
): SelectionSnapshot | null {
  if (
    !(target instanceof HTMLInputElement) &&
    !(target instanceof HTMLTextAreaElement)
  ) {
    return null;
  }
  const start = target.selectionStart ?? 0;
  const end = target.selectionEnd ?? start;
  const text = target.value.slice(start, end).trim();
  if (!text) return null;
  return {
    text,
    rect: target.getBoundingClientRect(),
    editable: { element: target, start, end }
  };
}

function selectedCharacterCount(text: string): number {
  return Array.from(text).length;
}

function currentSelection(
  target: EventTarget | null,
  minimumLength = 1
): SelectionSnapshot | null {
  const inputSelection = selectedInputText(target);
  if (
    inputSelection &&
    selectedCharacterCount(inputSelection.text) >= minimumLength
  ) {
    return inputSelection;
  }
  const selection = window.getSelection();
  const text = selectionTextWithLayout(selection);
  if (
    !selection ||
    selection.rangeCount === 0 ||
    selectedCharacterCount(text) < Math.max(1, minimumLength)
  ) {
    return null;
  }
  const range = selection.getRangeAt(0).cloneRange();
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) return null;
  const container =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  const editableElement = container?.closest<HTMLElement>("[contenteditable='true']");
  return {
    text: text.slice(0, 12000),
    rect,
    range,
    editable: editableElement
      ? { element: editableElement, range }
      : undefined
  };
}

function translatableElementFromTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const hasUsableText = (element: HTMLElement | null): boolean => {
    if (!element || !isVisible(element)) return false;
    if (
      element.closest(
        "input, textarea, select, button, [contenteditable='true'], [aria-hidden='true']"
      )
    ) {
      return false;
    }
    const text = normalizedBlockText(element.innerText || element.textContent || "");
    return text.length >= 3 && text.length <= 900;
  };
  const block = target.closest<HTMLElement>(TRANSLATABLE_BLOCK_SELECTOR);
  if (hasUsableText(block)) return block;

  const link = target.closest<HTMLAnchorElement>("a");
  if (hasUsableText(link)) return link;

  let container = target.closest<HTMLElement>("div");
  while (container && container !== document.body) {
    if (hasUsableText(container)) return container;
    container = container.parentElement?.closest<HTMLElement>("div") ?? null;
  }

  const inline = target.closest<HTMLElement>("span");
  return hasUsableText(inline) ? inline : null;
}

function replaceSelection(
  snapshot: SelectionSnapshot,
  replacement: string
): void {
  const editable = snapshot.editable;
  if (!editable) return;
  if (
    editable.element instanceof HTMLInputElement ||
    editable.element instanceof HTMLTextAreaElement
  ) {
    editable.element.focus();
    editable.element.setRangeText(
      replacement,
      editable.start ?? 0,
      editable.end ?? editable.start ?? 0,
      "end"
    );
    editable.element.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertText", data: replacement })
    );
    return;
  }
  if (!editable.range) return;
  editable.element.focus();
  editable.range.deleteContents();
  const node = document.createTextNode(replacement);
  editable.range.insertNode(node);
  editable.range.setStartAfter(node);
  editable.range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(editable.range);
  editable.element.dispatchEvent(
    new InputEvent("input", { bubbles: true, inputType: "insertText", data: replacement })
  );
}

function editableText(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLElement
): string {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return element.value;
  }
  return element.innerText || element.textContent || "";
}

function setEditableText(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLElement,
  text: string
): void {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    element.focus();
    element.value = text;
    const end = text.length;
    try {
      element.setSelectionRange(end, end);
    } catch {
      // Some input types do not support selection ranges.
    }
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertReplacementText",
        data: text
      })
    );
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  element.focus();
  element.textContent = text;
  element.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      inputType: "insertReplacementText",
      data: text
    })
  );
}

function supportedSingleLineInput(element: HTMLInputElement): boolean {
  const type = (element.getAttribute("type") || "text").toLowerCase();
  return ["", "text", "search", "email", "url", "tel"].includes(type);
}

function isSearchInputElement(element: HTMLElement): boolean {
  const searchParamNames = searchParamNamesFromUrl(location.href);
  if (!searchParamNames.length) return false;
  const normalizedParams = new Set(
    searchParamNames.map((param) => param.toLowerCase())
  );
  if (
    !(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    )
  ) {
    return false;
  }
  const controlNames = [
    element.name,
    element.id,
    element.getAttribute("aria-label") ?? "",
    element.getAttribute("placeholder") ?? "",
    element.getAttribute("title") ?? ""
  ].map((value) => value.trim().toLowerCase());
  if (controlNames.some((value) => normalizedParams.has(value))) return true;
  const inputType =
    element instanceof HTMLInputElement
      ? (element.getAttribute("type") || "text").toLowerCase()
      : "";
  return Boolean(
    inputType === "search" ||
      element.closest("[role='search'], form[action*='search']")
  );
}

function autoReplyTargetFromEvent(
  target: EventTarget | null,
  disableSingleLine: boolean
): AutoReplyTarget | null {
  if (!(target instanceof HTMLElement)) return null;
  let element: HTMLInputElement | HTMLTextAreaElement | HTMLElement | null = null;
  let singleLine = false;
  if (target instanceof HTMLInputElement) {
    if (
      target.disabled ||
      target.readOnly ||
      !supportedSingleLineInput(target)
    ) {
      return null;
    }
    singleLine = true;
    if (disableSingleLine) return null;
    element = target;
  } else if (target instanceof HTMLTextAreaElement) {
    if (target.disabled || target.readOnly) return null;
    element = target;
  } else {
    const editable = target.closest<HTMLElement>("[contenteditable]");
    if (
      editable &&
      editable.isContentEditable &&
      editable.tagName !== "BODY"
    ) {
      element = editable;
    }
  }
  if (!element) return null;
  if (isSearchInputElement(element)) return null;
  const rect = element.getBoundingClientRect();
  if (
    rect.width < 80 ||
    rect.height < 24 ||
    rect.bottom < 0 ||
    rect.top > window.innerHeight ||
    rect.right < 0 ||
    rect.left > window.innerWidth
  ) {
    return null;
  }
  return {
    element,
    singleLine,
    text: editableText(element),
    rect: {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    }
  };
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error(contentText("copyFailed"));
  }
}

function searchQuery(): string | null {
  return searchQueryFromUrl(location.href);
}

function searchResultsContext(
  results: WebSearchResult[],
  language?: AppSettings["interfaceLanguage"]
): string {
  return results
    .map((result, index) =>
      [
        `${index + 1}. ${result.title}`,
        result.url,
        result.snippet
          ? `${uiText(language, "searchResultSnippet")}：${result.snippet}`
          : ""
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function markdownUrl(url: string): string {
  return url.replace(/\s/g, "%20").replace(/\)/g, "%29");
}

function linkCitationMarkers(
  content: string,
  results: WebSearchResult[]
): string {
  return content.replace(
    /\[((?:搜索|搜尋|Search|search|検索|검색)\s*(\d+)|(\d+))\]/g,
    (match, label: string, namedIndex: string | undefined, bareIndex: string | undefined, offset: number, source: string) => {
      if (source[offset + match.length] === "(") return match;
      const index = Number(namedIndex ?? bareIndex) - 1;
      const result = results[index];
      if (!result?.url) return match;
      return `[${label}](${markdownUrl(result.url)})`;
    }
  );
}

function SearchAnswerMarkdown({
  content,
  results
}: {
  content: string;
  results: WebSearchResult[];
}) {
  return (
    <div className="md-search-answer-markdown">
      <Markdown content={linkCitationMarkers(content, results)} />
    </div>
  );
}

function extractPageContext(
  ignoreSelection = false,
  language?: AppSettings["interfaceLanguage"]
): PageContext {
  const selection = ignoreSelection ? undefined : pageSelectionText() || undefined;
  const description =
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ??
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content;
  const siteName =
    document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content ??
    location.hostname;
  if (selection) {
    return {
      kind: "selection",
      title: document.title || location.hostname,
      url: location.href,
      text: truncateText(selection, 20000, language),
      selection,
      description: uiText(language, "selectionDescription").replace(
        "{count}",
        String(selection.length)
      ),
      language: document.documentElement.lang || navigator.language,
      siteName
    };
  }
  let text = "";
  try {
    const clone = document.cloneNode(true) as Document;
    const article = new Readability(clone, { charThreshold: 300 }).parse();
    if (article?.content) {
      const container = document.createElement("div");
      container.innerHTML = article.content;
      text = textFromElement(container);
    }
    if (!text) text = article?.textContent ?? "";
  } catch {
    // Dynamic applications often do not form a valid Readability document.
  }
  if (text.trim().length < 500) {
    text =
      textFromElement(document.querySelector("main")) ||
      textFromElement(document.querySelector('[role="main"]')) ||
      textFromElement(document.body) ||
      "";
  }
  const query = searchQuery();
  return {
    kind: query ? "search" : "webpage",
    title: document.title || location.hostname,
    url: location.href,
    text: truncateText(text, 100000, language),
    description,
    language: document.documentElement.lang || navigator.language,
    siteName
  };
}

function isVisible(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number(style.opacity) === 0
  ) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function textNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    if (node.textContent?.trim()) nodes.push(node as Text);
    node = walker.nextNode();
  }
  return nodes;
}

const CITATION_MARKER_PATTERN = /^(?:\[\s*\d+(?:\s*[-,–]\s*\d+)*\s*\]|[（(【]?\s*\d+(?:\s*[-,–]\s*\d+)*\s*[)）】]?|[¹²³⁴⁵⁶⁷⁸⁹⁰]+)$/;
const CITATION_TOKEN_PATTERN = /(?:`?\{\{\s*WEBMIND_CITATION_(\d+)\s*\}\}`?|\[\s*WEBMIND_CITATION_(\d+)\s*\]|WEBMIND_CITATION_(\d+))/gi;
const IMMERSIVE_READING_TOKEN_PATTERN =
  /\[\[WEBMIND_READING\|([^|\]\n]{1,160})\|([^|\]\n]{1,160})\]\]/g;
const IMMERSIVE_READING_OR_CITATION_PATTERN =
  /\[\[WEBMIND_READING\|([^|\]\n]{1,160})\|([^|\]\n]{1,160})\]\]|(?:`?\{\{\s*WEBMIND_CITATION_(\d+)\s*\}\}`?|\[\s*WEBMIND_CITATION_(\d+)\s*\]|WEBMIND_CITATION_(\d+))/gi;

function normalizedBlockText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isCitationAnchor(anchor: HTMLAnchorElement): boolean {
  const marker = normalizedBlockText(anchor.innerText || anchor.textContent || "");
  const metadata = [
    anchor.id,
    anchor.className,
    anchor.getAttribute("role"),
    anchor.getAttribute("rel"),
    anchor.getAttribute("aria-label"),
    anchor.getAttribute("title"),
    anchor.getAttribute("href"),
    ...Array.from(anchor.attributes).flatMap((attribute) =>
      attribute.name.startsWith("data-")
        ? [`${attribute.name} ${attribute.value}`]
        : []
    )
  ]
    .filter(Boolean)
    .join(" ");
  return Boolean(
    anchor.closest("sup") ||
      anchor.matches("[role='doc-noteref']") ||
      CITATION_MARKER_PATTERN.test(marker) ||
      /cite|citation|reference|footnote|source|\bref[-_:#]|引用|引文|来源|來源|參考|参考|出典|출처|참고/i.test(
        metadata
      ) ||
      ((!marker || marker.length <= 8) &&
        Boolean(anchor.querySelector("svg, img")) &&
        anchor.getBoundingClientRect().width <= 64) ||
      (!marker &&
        anchor.getBoundingClientRect().width > 0 &&
        anchor.getBoundingClientRect().width <= 64 &&
        anchor.getBoundingClientRect().height <= 40)
  );
}

function citationMarker(node: HTMLElement, index: number): string {
  return (
    normalizedBlockText(node.innerText || node.textContent || "") ||
    `[${index + 1}]`
  );
}

function plainCitationElement(marker: string): HTMLElement {
  const element = document.createElement("sup");
  element.className = "webmind-translation-citation";
  element.textContent = marker;
  return element;
}

function citationElements(root: HTMLElement): HTMLElement[] {
  const descendants = Array.from(
    root.querySelectorAll<HTMLElement>("sup, a[href], [role='doc-noteref']")
  );
  const nodes = root.matches("sup, a[href], [role='doc-noteref']")
    ? [root, ...descendants]
    : descendants;
  const candidates = nodes.filter((node) => {
    const anchor = node.matches("a[href]")
      ? (node as HTMLAnchorElement)
      : node.querySelector<HTMLAnchorElement>("a[href]");
    return Boolean(anchor && isCitationAnchor(anchor));
  });
  return candidates.filter(
    (node) =>
      !candidates.some(
        (possibleParent) =>
          possibleParent !== node && possibleParent.contains(node)
      )
  );
}

function isVisuallyHiddenTranslationElement(element: HTMLElement): boolean {
  if (
    element.matches(
      "script, style, noscript, template, svg, [hidden], [aria-hidden='true'], .webmind-translation"
    )
  ) {
    return true;
  }
  const style = getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.contentVisibility === "hidden" ||
    Number(style.opacity) === 0
  ) {
    return true;
  }
  const rect = element.getBoundingClientRect();
  return Boolean(
    rect.width <= 2 &&
      rect.height <= 2 &&
      ["absolute", "fixed"].includes(style.position) &&
      (style.overflow === "hidden" ||
        style.clip !== "auto" ||
        style.clipPath !== "none")
  );
}

function translationTextFromElement(
  root: HTMLElement,
  citationNodes: HTMLElement[]
): string {
  const citationTokens = new Map(
    citationNodes.map((node, index) => [
      node,
      `{{WEBMIND_CITATION_${index + 1}}}`
    ])
  );
  const parts: string[] = [];
  const visit = (node: Node) => {
    if (node instanceof Text) {
      parts.push(node.textContent ?? "");
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const citationToken = citationTokens.get(node);
    if (citationToken) {
      parts.push(citationToken);
      return;
    }
    if (isVisuallyHiddenTranslationElement(node)) return;
    if (node.tagName === "BR") parts.push(" ");
    for (const child of Array.from(node.childNodes)) visit(child);
    if (/^(?:ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DIV|FIGCAPTION|H[1-6]|LI|P|TD)$/.test(node.tagName)) {
      parts.push(" ");
    }
  };
  for (const child of Array.from(root.childNodes)) visit(child);
  return normalizedBlockText(parts.join(""));
}

function prepareTranslationBlock(
  element: HTMLElement,
  id: string,
  selection = false
): PageTextBlock | null {
  const citationNodes = citationElements(element);
  let text = translationTextFromElement(element, citationNodes);
  if (text.length < 3 || text.length > 900) return null;
  const citations = citationNodes.map((node, index) => ({
    token: `{{WEBMIND_CITATION_${index + 1}}}`,
    marker: citationMarker(node, index),
    node: node.cloneNode(true) as HTMLElement
  }));
  const inlineProtection = protectTranslationText(text);
  if (inlineProtection.citations.length) {
    const offset = citations.length;
    text = inlineProtection.text.replace(
      /WEBMIND_CITATION_(\d+)/g,
      (_match, rawIndex: string) =>
        `WEBMIND_CITATION_${offset + Number(rawIndex)}`
    );
    citations.push(
      ...inlineProtection.citations.map((marker, index) => ({
        token: `{{WEBMIND_CITATION_${offset + index + 1}}}`,
        marker,
        node: plainCitationElement(marker)
      }))
    );
  }
  const originalText = citations.reduce(
    (value, citation) => value.replace(citation.token, citation.marker),
    text
  );
  translationSources.set(id, {
    element,
    originalText: normalizedBlockText(originalText),
    citations,
    selection
  });
  return { id, text };
}

function wrapCurrentSelection(textFallback = ""): HTMLElement | null {
  const selection = window.getSelection();
  const selectedText = selection?.toString().replace(/\s+/g, " ").trim();
  if (selection && selection.rangeCount && selectedText) {
    const range = selection.getRangeAt(0).cloneRange();
    const wrapper = document.createElement("span");
    wrapper.className = "webmind-immersive-source";
    wrapper.dataset.webmindBlockId = `md-${Date.now()}-${translationSequence++}`;
    try {
      wrapper.append(range.extractContents());
      range.insertNode(wrapper);
      selection.removeAllRanges();
      return wrapper;
    } catch {
      return null;
    }
  }
  const targetText = textFallback.replace(/\s+/g, " ").trim();
  if (!targetText) return null;
  const exact = textNodes(document.body).find((node) =>
    node.textContent?.includes(textFallback)
  );
  if (!exact || !exact.textContent) return null;
  const index = exact.textContent.indexOf(textFallback);
  if (index < 0) return null;
  const range = document.createRange();
  range.setStart(exact, index);
  range.setEnd(exact, index + textFallback.length);
  const wrapper = document.createElement("span");
  wrapper.className = "webmind-immersive-source";
  wrapper.dataset.webmindBlockId = `md-${Date.now()}-${translationSequence++}`;
  wrapper.append(range.extractContents());
  range.insertNode(wrapper);
  return wrapper;
}

function prepareTranslationBlocks(
  scope: "page" | "selection" = "page",
  textFallback = ""
): PageTextBlock[] {
  installPageStyles();
  if (scope === "selection") {
    const wrapper = wrapCurrentSelection(textFallback);
    if (!wrapper) return [];
    const id = wrapper.dataset.webmindBlockId ?? "";
    const block = prepareTranslationBlock(wrapper, id, true);
    return block ? [block] : [];
  }
  const root =
    document.querySelector("article") ??
    document.querySelector("main") ??
    document.querySelector('[role="main"]') ??
    document.body;
  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>(TRANSLATABLE_PAGE_SELECTOR)
  );
  const seen = new Set<string>();
  const blocks: PageTextBlock[] = [];
  for (const element of candidates) {
    if (blocks.length >= 160 || !isVisible(element)) continue;
    if (element.closest(".webmind-translation, .webmind-immersive-reading-token")) {
      continue;
    }
    if (element.closest("nav, footer, aside, [aria-hidden='true']")) continue;
    const id =
      element.dataset.webmindBlockId ??
      `md-${Date.now()}-${translationSequence++}`;
    element.dataset.webmindBlockId = id;
    const block = prepareTranslationBlock(element, id);
    if (!block || seen.has(block.text)) continue;
    seen.add(block.text);
    blocks.push(block);
  }
  return blocks;
}

function prepareParagraphTranslationBlocks(
  target: EventTarget | null,
  textFallback = ""
): PageTextBlock[] {
  installPageStyles();
  const selection = currentSelection(target);
  if (selection?.text) {
    return prepareTranslationBlocks("selection", selection.text);
  }
  const element =
    translatableElementFromTarget(target) ??
    translatableElementFromTarget(lastPointerTarget) ??
    translatableElementFromTarget(document.activeElement);
  if (!element || !isVisible(element)) return [];
  const id =
    element.dataset.webmindBlockId ??
    `md-${Date.now()}-${translationSequence++}`;
  element.dataset.webmindBlockId = id;
  const block = prepareTranslationBlock(element, id);
  if (block) return [block];
  const fallback = normalizedBlockText(textFallback);
  if (fallback.length < 3 || fallback.length > 900) return [];
  translationSources.set(id, {
    element,
    originalText: fallback,
    citations: [],
    selection: false
  });
  return [{ id, text: fallback }];
}

function translationDisplayStyle(
  value: unknown
): ImmersiveTranslationDisplayStyle {
  return TRANSLATION_DISPLAY_STYLES.has(value as ImmersiveTranslationDisplayStyle)
    ? (value as ImmersiveTranslationDisplayStyle)
    : settings?.immersiveTranslationDisplayStyle ?? "default";
}

function translationTextEffects(
  value: unknown
): ImmersiveTranslationTextEffect[] {
  const incoming = Array.isArray(value)
    ? value
    : settings?.immersiveTranslationTextEffects ?? [];
  return incoming.filter((effect): effect is ImmersiveTranslationTextEffect =>
    TRANSLATION_TEXT_EFFECTS.has(effect as ImmersiveTranslationTextEffect)
  );
}

function readingTextEffects(
  value: unknown,
  fallback: ImmersiveTranslationTextEffect[]
): ImmersiveTranslationTextEffect[] {
  const incoming = Array.isArray(value) ? value : fallback;
  return incoming.filter((effect): effect is ImmersiveTranslationTextEffect =>
    TRANSLATION_TEXT_EFFECTS.has(effect as ImmersiveTranslationTextEffect)
  );
}

function translationClassNames(
  displayStyle: ImmersiveTranslationDisplayStyle,
  effects: ImmersiveTranslationTextEffect[]
): string[] {
  return [
    "webmind-translation-text",
    `webmind-translation-${displayStyle}`,
    ...effects.map((effect) => `webmind-translation-effect-${effect}`)
  ];
}

function comparableTranslationText(element: HTMLElement): string {
  const nodes = citationElements(element);
  const protectedText = translationTextFromElement(element, nodes);
  return nodes.reduce(
    (value, node, index) =>
      value.replace(
        `{{WEBMIND_CITATION_${index + 1}}}`,
        citationMarker(node, index)
      ),
    protectedText
  );
}

function findTranslationSource(id: string): HTMLElement | null {
  const record = translationSources.get(id);
  const byId = document.querySelector<HTMLElement>(
    `[data-webmind-block-id="${CSS.escape(id)}"]`
  );
  if (byId) {
    if (record) record.element = byId;
    return byId;
  }
  if (record?.element.isConnected) {
    record.element.dataset.webmindBlockId = id;
    return record.element;
  }
  if (!record?.originalText) return null;

  if (record.selection) {
    const wrapper = wrapCurrentSelection(record.originalText);
    if (wrapper) {
      wrapper.dataset.webmindBlockId = id;
      prepareTranslationBlock(wrapper, id, true);
      return wrapper;
    }
  }

  const sourceTag = record.element.tagName.toLowerCase();
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(sourceTag)
  ).filter(
    (element) =>
      isVisible(element) && !element.closest(".webmind-translation")
  );
  const exact = candidates.find(
    (element) => comparableTranslationText(element) === record.originalText
  );
  const fallback = exact ?? candidates
    .filter((element) =>
      comparableTranslationText(element).includes(record.originalText)
    )
    .sort(
      (left, right) =>
        comparableTranslationText(left).length -
        comparableTranslationText(right).length
    )[0];
  if (!fallback) return null;
  fallback.dataset.webmindBlockId = id;
  record.element = fallback;
  return fallback;
}

function citationTokenIndex(match: RegExpExecArray): number {
  return Number(match[1] ?? match[2] ?? match[3]);
}

function textWithCitationFallbacks(
  text: string,
  citations: PreservedCitation[]
): string {
  let value = text.trim();
  const protectedIndexes = new Set<number>();
  CITATION_TOKEN_PATTERN.lastIndex = 0;
  let tokenMatch = CITATION_TOKEN_PATTERN.exec(value);
  while (tokenMatch) {
    protectedIndexes.add(citationTokenIndex(tokenMatch));
    tokenMatch = CITATION_TOKEN_PATTERN.exec(value);
  }
  citations.forEach((citation, index) => {
    const citationIndex = index + 1;
    if (
      protectedIndexes.has(citationIndex) ||
      !citation.marker ||
      !CITATION_MARKER_PATTERN.test(citation.marker)
    ) {
      return;
    }
    const markerPosition = value.indexOf(citation.marker);
    if (markerPosition < 0) return;
    value = `${value.slice(0, markerPosition)}${citation.token}${value.slice(
      markerPosition + citation.marker.length
    )}`;
  });
  return value;
}

function cloneCitation(citation: PreservedCitation): HTMLElement {
  const clone = citation.node.cloneNode(true) as HTMLElement;
  const descendants = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
  for (const element of descendants) {
    element.removeAttribute("id");
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.toLowerCase().startsWith("on")) {
        element.removeAttribute(attribute.name);
      }
    }
  }
  clone.querySelectorAll("script, style, iframe, object, embed").forEach((node) =>
    node.remove()
  );
  const link = clone.matches("a[href]")
    ? (clone as HTMLAnchorElement)
    : clone.querySelector<HTMLAnchorElement>("a[href]");
  if (
    link &&
    !normalizedBlockText(link.innerText || link.textContent || "") &&
    !link.querySelector("svg, img")
  ) {
    link.textContent = citation.marker;
  }
  clone.classList.add("webmind-translation-citation");
  if (!clone.matches("a[href]")) return clone;
  const wrapper = document.createElement("sup");
  wrapper.className = "webmind-translation-citation";
  wrapper.append(clone);
  return wrapper;
}

function translatedContent(id: string, text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const citations = translationSources.get(id)?.citations ?? [];
  const restoredText = restoreTranslationText(text, {
    citations: citations.map((citation) => citation.marker),
    paragraphBreaks: []
  });
  const protectedText = textWithCitationFallbacks(restoredText, citations);
  const inserted = new Set<number>();
  let offset = 0;
  CITATION_TOKEN_PATTERN.lastIndex = 0;
  let match = CITATION_TOKEN_PATTERN.exec(protectedText);
  while (match) {
    if (match.index > offset) {
      fragment.append(document.createTextNode(protectedText.slice(offset, match.index)));
    }
    const index = citationTokenIndex(match);
    const citation = citations[index - 1];
    if (citation && !inserted.has(index)) {
      fragment.append(cloneCitation(citation));
      inserted.add(index);
    }
    offset = match.index + match[0].length;
    match = CITATION_TOKEN_PATTERN.exec(protectedText);
  }
  if (offset < protectedText.length) {
    fragment.append(document.createTextNode(protectedText.slice(offset)));
  }
  citations.forEach((citation, index) => {
    if (inserted.has(index + 1)) return;
    if (fragment.childNodes.length) fragment.append(document.createTextNode(" "));
    fragment.append(cloneCitation(citation));
  });
  return fragment;
}

function readingEffectClassNames(
  scope: "outer" | "inner",
  effects: ImmersiveTranslationTextEffect[]
): string[] {
  return [
    `webmind-immersive-reading-${scope}`,
    ...effects.map((effect) => `webmind-translation-effect-${effect}`)
  ];
}

function createReadingToken(
  original: string,
  translation: string,
  mode: ImmersiveReadingMode,
  outerEffects: ImmersiveTranslationTextEffect[],
  innerEffects: ImmersiveTranslationTextEffect[]
): HTMLSpanElement {
  const token = document.createElement("span");
  token.className = "webmind-immersive-reading-token";
  const outer = document.createElement("span");
  outer.className = readingEffectClassNames("outer", outerEffects).join(" ");
  outer.textContent =
    mode === "original-translation" ? original : translation;
  token.append(outer);
  if (mode !== "translation") {
    const inner = document.createElement("span");
    inner.className = readingEffectClassNames("inner", innerEffects).join(" ");
    inner.textContent = `(${
      mode === "original-translation" ? translation : original
    })`;
    token.append(inner);
  }
  return token;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanReadingTranslation(original: string, translation: string): string {
  const source = original.trim();
  const fallback = translation.trim();
  if (!source || !fallback) return fallback;
  const sourcePattern = escapeRegExp(source);
  let value = fallback;
  const originalWrappedTranslation = value.match(
    new RegExp(`^${sourcePattern}\\s*[（(]\\s*(.+?)\\s*[)）]$`, "i")
  );
  if (originalWrappedTranslation?.[1]) {
    value = originalWrappedTranslation[1].trim();
  }
  value = value
    .replace(new RegExp(`\\s*[（(]\\s*${sourcePattern}\\s*[)）]\\s*`, "gi"), " ")
    .replace(new RegExp(`^${sourcePattern}\\s+`, "i"), "")
    .replace(new RegExp(`\\s+${sourcePattern}$`, "i"), "")
    .replace(/\s+/g, " ")
    .trim();
  return value || fallback;
}

function readingNodeContaining(source: HTMLElement, text: string): Text | null {
  if (!text) return null;
  return (
    textNodes(source).find((candidate) => {
      const parent = candidate.parentElement;
      return (
        candidate.data.includes(text) &&
        !parent?.closest(
          ".webmind-immersive-reading-token, .webmind-translation-citation, script, style, noscript"
        )
      );
    }) ?? null
  );
}

function readingContent(
  id: string,
  text: string,
  mode: ImmersiveReadingMode,
  outerEffects: ImmersiveTranslationTextEffect[],
  innerEffects: ImmersiveTranslationTextEffect[]
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const citations = translationSources.get(id)?.citations ?? [];
  const insertedCitations = new Set<number>();
  let offset = 0;
  IMMERSIVE_READING_OR_CITATION_PATTERN.lastIndex = 0;
  let match = IMMERSIVE_READING_OR_CITATION_PATTERN.exec(text);
  while (match) {
    if (match.index > offset) {
      fragment.append(document.createTextNode(text.slice(offset, match.index)));
    }
    if (match[1] !== undefined && match[2] !== undefined) {
      if (
        !containsWebMindPlaceholder(match[1]) &&
        !containsWebMindPlaceholder(match[2])
      ) {
        const original = sanitizeReadingMarkerValue(match[1]);
        const translation = sanitizeReadingMarkerValue(match[2]);
        if (original && translation) {
          fragment.append(
            createReadingToken(
              original,
              translation,
              mode,
              outerEffects,
              innerEffects
            )
          );
        }
      }
    } else {
      const citationIndex = Number(match[3] ?? match[4] ?? match[5]);
      const citation = citations[citationIndex - 1];
      if (citation && !insertedCitations.has(citationIndex)) {
        fragment.append(cloneCitation(citation));
        insertedCitations.add(citationIndex);
      }
    }
    offset = match.index + match[0].length;
    match = IMMERSIVE_READING_OR_CITATION_PATTERN.exec(text);
  }
  if (offset < text.length) {
    fragment.append(document.createTextNode(text.slice(offset)));
  }
  citations.forEach((citation, index) => {
    if (insertedCitations.has(index + 1)) return;
    if (fragment.childNodes.length) fragment.append(document.createTextNode(" "));
    fragment.append(cloneCitation(citation));
  });
  return fragment;
}

function applyReadingTokensInPlace(
  source: HTMLElement,
  text: string,
  mode: ImmersiveReadingMode,
  outerEffects: ImmersiveTranslationTextEffect[],
  innerEffects: ImmersiveTranslationTextEffect[]
): number {
  const pairs: Array<{ original: string; translation: string }> = [];
  IMMERSIVE_READING_TOKEN_PATTERN.lastIndex = 0;
  let match = IMMERSIVE_READING_TOKEN_PATTERN.exec(text);
  while (match) {
    pairs.push({
      original: match[1].trim(),
      translation: match[2].trim()
    });
    match = IMMERSIVE_READING_TOKEN_PATTERN.exec(text);
  }
  let replaced = 0;
  for (const pair of pairs) {
    if (
      containsWebMindPlaceholder(pair.original) ||
      containsWebMindPlaceholder(pair.translation)
    ) {
      continue;
    }
    let sourceText = pair.original;
    let translatedText = cleanReadingTranslation(
      pair.original,
      sanitizeReadingMarkerValue(pair.translation)
    );
    let node = readingNodeContaining(source, sourceText);
    if (!node && pair.translation !== pair.original) {
      const reversedNode = readingNodeContaining(source, pair.translation);
      if (reversedNode) {
        node = reversedNode;
        sourceText = pair.translation;
        translatedText = cleanReadingTranslation(pair.translation, pair.original);
      }
    }
    if (!node) continue;
    const index = node.data.indexOf(sourceText);
    if (index < 0) continue;
    const matched = node.splitText(index);
    matched.splitText(sourceText.length);
    matched.replaceWith(
      createReadingToken(
        sourceText,
        translatedText,
        mode,
        outerEffects,
        innerEffects
      )
    );
    replaced += 1;
  }
  return replaced;
}

function markerStrippedReadingText(text: string): string {
  IMMERSIVE_READING_OR_CITATION_PATTERN.lastIndex = 0;
  return text.replace(
    IMMERSIVE_READING_OR_CITATION_PATTERN,
    (match, original, _translation, citationA, citationB, citationC) => {
      if (original !== undefined) return String(original);
      const citationIndex = citationA ?? citationB ?? citationC;
      return citationIndex ? `[${citationIndex}]` : match;
    }
  );
}

function isWholeBlockReadingFallbackSafe(
  source: HTMLElement,
  text: string
): boolean {
  if (containsWebMindPlaceholder(text)) return false;
  const sourceText = normalizedBlockText(source.innerText || source.textContent || "");
  const generatedText = normalizedBlockText(markerStrippedReadingText(text));
  if (!sourceText || !generatedText) return false;
  if (generatedText.length > sourceText.length * 1.45 + 20) return false;
  const sourceIndex = generatedText.indexOf(sourceText);
  if (sourceIndex >= 0 && generatedText.indexOf(sourceText, sourceIndex + 1) >= 0) {
    return false;
  }
  return true;
}

function applyImmersiveReading(
  translations: PageTranslation[],
  mode: ImmersiveReadingMode,
  outerEffects: ImmersiveTranslationTextEffect[],
  innerEffects: ImmersiveTranslationTextEffect[]
): number {
  installPageStyles();
  emitDebugLog(
    `[workflow] immersive reading apply start translations=${translations.length} mode=${mode}`
  );
  let count = 0;
  let replacedTotal = 0;
  let wholeBlockFallbacks = 0;
  let unsafeFallbackSkips = 0;
  for (const translation of translations) {
    IMMERSIVE_READING_TOKEN_PATTERN.lastIndex = 0;
    if (!IMMERSIVE_READING_TOKEN_PATTERN.test(translation.text)) continue;
    const source = findTranslationSource(translation.id);
    if (!source) continue;
    source.dataset.webmindOriginalHtml =
      source.dataset.webmindOriginalHtml ?? source.innerHTML;
    source.innerHTML = source.dataset.webmindOriginalHtml;
    const replaced = applyReadingTokensInPlace(
      source,
      translation.text,
      mode,
      outerEffects,
      innerEffects
    );
    replacedTotal += replaced;
    source.classList.add("webmind-immersive-reading-source");
    if (!replaced && isWholeBlockReadingFallbackSafe(source, translation.text)) {
      source.replaceChildren(
        readingContent(
          translation.id,
          translation.text,
          mode,
          outerEffects,
          innerEffects
        )
      );
      wholeBlockFallbacks += 1;
    } else if (!replaced) {
      unsafeFallbackSkips += 1;
    }
    count += 1;
  }
  emitDebugLog(
    `[workflow] immersive reading apply done appliedBlocks=${count} replacedTokens=${replacedTotal} wholeBlockFallbacks=${wholeBlockFallbacks} unsafeFallbackSkips=${unsafeFallbackSkips}`
  );
  return count;
}

function applyTranslations(
  translations: PageTranslation[],
  mode: PageTranslationMode = "bilingual",
  displayStyle: ImmersiveTranslationDisplayStyle = "default",
  effects: ImmersiveTranslationTextEffect[] = []
): number {
  installPageStyles();
  let count = 0;
  const classNames = translationClassNames(displayStyle, effects);
  for (const translation of translations) {
    const source = findTranslationSource(translation.id);
    if (!source || !translation.text.trim()) {
      const record = translationSources.get(translation.id);
      showPageTooltip(
        contentText("translationWriteFailed"),
        record?.element.isConnected
          ? record.element.getBoundingClientRect()
          : null
      );
      continue;
    }
    document
      .querySelectorAll(
        `[data-webmind-for="${CSS.escape(translation.id)}"]`
      )
      .forEach((element) => element.remove());
    if (mode === "translation-only") {
      source.dataset.webmindOriginalHtml =
        source.dataset.webmindOriginalHtml ?? source.innerHTML;
      source.classList.add("webmind-translated-only", ...classNames);
      source.replaceChildren(translatedContent(translation.id, translation.text));
      count += 1;
      continue;
    }
    const translated = document.createElement(
      source.matches("span, a") ? "span" : "div"
    );
    translated.className = ["webmind-translation", ...classNames].join(" ");
    translated.dataset.webmindFor = translation.id;
    translated.append(translatedContent(translation.id, translation.text));
    if (source.matches("li, td")) {
      source.append(translated);
    } else {
      source.insertAdjacentElement("afterend", translated);
    }
    if (!translated.isConnected) {
      showPageTooltip(
        contentText("translationWriteFailed"),
        source.getBoundingClientRect()
      );
      continue;
    }
    count += 1;
  }
  return count;
}

function restorePage(): void {
  document
    .querySelectorAll(".webmind-translation")
    .forEach((element) => element.remove());
  document
    .querySelectorAll<HTMLElement>("[data-webmind-original-html]")
    .forEach((element) => {
      element.innerHTML = element.dataset.webmindOriginalHtml ?? element.innerHTML;
      delete element.dataset.webmindOriginalHtml;
      element.classList.remove(
        "webmind-translated-only",
        "webmind-immersive-reading-source"
      );
      element.classList.remove(
        ...translationClassNames("default", []),
        ...Array.from(TRANSLATION_DISPLAY_STYLES).map(
          (style) => `webmind-translation-${style}`
        ),
        ...Array.from(TRANSLATION_TEXT_EFFECTS).map(
          (effect) => `webmind-translation-effect-${effect}`
        )
      );
    });
  document
    .querySelectorAll<HTMLElement>(".webmind-immersive-source")
    .forEach((element) => {
      element.replaceWith(...Array.from(element.childNodes));
    });
  document
    .querySelectorAll<HTMLElement>("[data-webmind-block-id]")
    .forEach((element) => delete element.dataset.webmindBlockId);
  translationSources.clear();
}

function SelectionAssistant({ query }: { query: string | null }) {
  const [snapshot, setSnapshot] = useState<SelectionSnapshot | null>(null);
  const [activeTool, setActiveTool] = useState<ToolDefinition | null>(null);
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(settings);
  const [currentHref, setCurrentHref] = useState(location.href);
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [resultBusy, setResultBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectionCopied, setSelectionCopied] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [hoverDefinition, setHoverDefinition] = useState<{
    text: string;
    meaning: string;
    left: number;
    top: number;
  } | null>(null);
  const [selectedResultToolId, setSelectedResultToolId] = useState("");
  const [resultToolMenuOpen, setResultToolMenuOpen] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [edgeResultTitle, setEdgeResultTitle] = useState("");
  const [edgeResult, setEdgeResult] = useState("");
  const [edgeError, setEdgeError] = useState("");
  const [edgeBusy, setEdgeBusy] = useState(false);
  const [edgeDismissed, setEdgeDismissed] = useState(false);
  const [edgeBottomOverride, setEdgeBottomOverride] = useState<number | null>(
    null
  );
  const [autoReplyTarget, setAutoReplyTarget] =
    useState<AutoReplyTarget | null>(null);
  const [autoReplyBusy, setAutoReplyBusy] = useState(false);
  const [autoReplyError, setAutoReplyError] = useState("");
  const [imageTextTarget, setImageTextTarget] =
    useState<ImageTextTarget | null>(null);
  const [imageTextVisible, setImageTextVisible] = useState(false);
  const [imageTextBusy, setImageTextBusy] = useState(false);
  const [resultPositionOverride, setResultPositionOverride] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [searchAnswer, setSearchAnswer] = useState<SearchAnswerState>({
    text: "",
    error: "",
    busy: false,
    results: []
  });
  const [searchAnswerPosition, setSearchAnswerPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [searchAnswerDismissed, setSearchAnswerDismissed] = useState(false);
  const [searchAnswerRefreshToken, setSearchAnswerRefreshToken] = useState(0);
  const [translationProgress, setTranslationProgress] =
    useState<TranslationProgressState | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const hoverDefinitionTimerRef = useRef<number | null>(null);
  const hoverDefinitionCandidateRef = useRef<HoverDefinitionCandidate | null>(
    null
  );
  const hoverDefinitionPointerRef = useRef<HoverPointerPosition | null>(null);
  const hoverDefinitionShortcutPressedRef = useRef(false);
  const imageHoverTimeoutRef = useRef<number | null>(null);
  const imageHoverHideTimeoutRef = useRef<number | null>(null);
  const imageHoverCandidateRef = useRef<HTMLImageElement | null>(null);
  const imageTextRunRef = useRef("");
  const searchAnswerKeyRef = useRef("");
  const autoImmersiveRunKeyRef = useRef("");
  const searchAnswerDragRef = useRef({
    active: false,
    pointerId: 0,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    width: 360,
    height: 420
  });
  const resultPanelDragRef = useRef({
    active: false,
    pointerId: 0,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    width: 420,
    height: 360
  });
  const edgeDragRef = useRef({
    active: false,
    pointerId: 0,
    startY: 0,
    startBottom: 36,
    moved: false
  });
  const immersiveShortcutCooldownRef = useRef(0);
  const immersiveAltShortcutTimerRef = useRef<number | null>(null);
  const immersiveAltShortcutPartnerRef = useRef(false);
  const runEdgeImmersiveTranslateRef = useRef<
    (scope?: "page" | "paragraph", options?: { ignoreBusy?: boolean }) => Promise<void>
  >(async () => {});

  useEffect(() => {
    showTranslationProgress = setTranslationProgress;
    return () => {
      showTranslationProgress = null;
    };
  }, []);

  useEffect(() => {
    const panel = resultRef.current;
    if (!panel || !activeTool || !snapshot) return;
    const handleWheel = (event: WheelEvent) => {
      const target = event.target;
      const menu =
        target instanceof Element
          ? target.closest<HTMLElement>(".md-tool-menu-list")
          : null;
      const scrollTarget =
        menu ?? panel.querySelector<HTMLElement>(".md-result-body");
      if (!scrollTarget) return;

      event.preventDefault();
      event.stopPropagation();
      const scale =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? scrollTarget.clientHeight
            : 1;
      scrollTarget.scrollTop += event.deltaY * scale;
    };
    panel.addEventListener("wheel", handleWheel, { passive: false });
    return () => panel.removeEventListener("wheel", handleWheel);
  }, [activeTool, snapshot]);

  useEffect(() => {
    if (!translationProgress || translationProgress.active) return;
    const timer = window.setTimeout(() => setTranslationProgress(null), 1800);
    return () => window.clearTimeout(timer);
  }, [translationProgress]);

  useEffect(() => {
    let lastHref = location.href;
    const refreshHref = () => {
      if (location.href === lastHref) return;
      lastHref = location.href;
      setCurrentHref(location.href);
    };
    const timer = window.setInterval(refreshHref, 1000);
    window.addEventListener("popstate", refreshHref);
    window.addEventListener("hashchange", refreshHref);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("popstate", refreshHref);
      window.removeEventListener("hashchange", refreshHref);
    };
  }, []);

  useEffect(() => {
    setSearchAnswerDismissed(false);
    setSearchAnswerPosition(null);
    searchAnswerKeyRef.current = "";
  }, [query]);

  useLayoutEffect(() => {
    showSelection = (next) => {
      imageTextRunRef.current = "";
      setImageTextBusy(false);
      setActiveTool(null);
      setResult("");
      setError("");
      setResultBusy(false);
      setCopied(false);
      setSelectionCopied(false);
      setHoverOpen(false);
      setSelectedResultToolId("");
      setResultToolMenuOpen(false);
      setFollowUpQuestion("");
      setResultPositionOverride(null);
      setSnapshot(next);
    };
    return () => {
      showSelection = null;
    };
  }, []);

  useEffect(() => {
    void Promise.all([loadSettings(), loadCustomTools()]).then(
      ([nextSettings, nextTools]) => {
        setLocalSettings(nextSettings);
        setCustomTools(nextTools);
      }
    );
    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      const listener = (
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: string
      ) => {
        if (areaName === "local" && changes["webmind.settings"]) {
          void loadSettings().then(setLocalSettings);
        }
        if (areaName === "local" && changes["webmind.customTools"]) {
          void loadCustomTools().then(setCustomTools);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  const activeSettings = localSettings ?? settings;
  const t = (key: UiTextKey) => uiText(activeSettings?.interfaceLanguage, key);
  const activeProfile = useMemo(
    () =>
      activeSettings?.profiles.find(
        (profile) => profile.id === activeSettings.activeProfileId
      ) ?? null,
    [activeSettings]
  );
  const translationProfile = useMemo(
    () =>
      activeSettings
        ? profileForPurpose(activeSettings, "translation")
        : null,
    [activeSettings]
  );
  const visionProfile = useMemo(
    () =>
      activeSettings ? profileForPurpose(activeSettings, "vision") : null,
    [activeSettings]
  );
  const searchAnswerEnabled = activeSettings?.searchAnswerEnabled ?? false;
  const inputAutoReplyEnabled =
    activeSettings?.inputAutoReplyEnabled ?? true;
  const inputAutoReplyDisableSingleLine =
    activeSettings?.inputAutoReplyDisableSingleLine ?? true;
  const selectionOverlayBlocked = urlMatchesBlacklist(
    currentHref,
    activeSettings?.selectionOverlayUrlBlacklist ?? []
  );
  const edgeToolsBlocked = urlMatchesBlacklist(
    currentHref,
    activeSettings?.edgeQuickToolUrlBlacklist ?? []
  );
  const autoReplyBlocked = urlMatchesBlacklist(
    currentHref,
    activeSettings?.edgeQuickToolUrlBlacklist ?? []
  );
  const imageTextExtractionEnabled =
    activeSettings?.imageTextExtractionEnabled ?? false;
  const imageTextExtractionBlocked = urlMatchesBlacklist(
    currentHref,
    activeSettings?.edgeQuickToolUrlBlacklist ?? []
  );
  const edgeQuickToolsEnabled = activeSettings?.edgeQuickToolsEnabled ?? true;
  const edgeBottom =
    edgeBottomOverride ?? activeSettings?.edgeQuickToolBottom ?? 36;

  const hoverDefinitionMode = activeSettings?.hoverDefinitionMode ?? "off";
  const hoverDefinitionShortcut =
    activeSettings?.hoverDefinitionShortcut ?? "off";
  const hoverDefinitionBlocked = urlMatchesBlacklist(
    currentHref,
    activeSettings?.hoverDefinitionUrlBlacklist ?? []
  );

  useEffect(() => {
    const clearTimer = () => {
      if (hoverDefinitionTimerRef.current !== null) {
        window.clearTimeout(hoverDefinitionTimerRef.current);
        hoverDefinitionTimerRef.current = null;
      }
    };
    const hide = () => {
      clearTimer();
      hoverDefinitionCandidateRef.current = null;
      setHoverDefinition(null);
      setHoverDefinitionHighlight(null);
    };
    if (hoverDefinitionMode === "off" || hoverDefinitionBlocked) {
      hide();
      return;
    }

    const modeAllows = (language: "zh" | "en") =>
      hoverDefinitionMode === "both" || hoverDefinitionMode === language;
    const tooltipPosition = (rect: DOMRect) => {
      const width = Math.min(360, Math.max(120, window.innerWidth - 20));
      const center = rect.left + rect.width / 2;
      const left = Math.max(
        width / 2 + 8,
        Math.min(window.innerWidth - width / 2 - 8, center)
      );
      return {
        left: Math.round(left),
        top: Math.max(8, Math.round(rect.top - 35))
      };
    };
    const schedule = ({ clientX, clientY }: HoverPointerPosition) => {
      const candidate = definitionCandidateAtPoint(clientX, clientY);
      if (
        !candidate ||
        !modeAllows(candidate.language) ||
        (hoverDefinitionShortcut === "ctrl" &&
          !hoverDefinitionShortcutPressedRef.current)
      ) {
        hide();
        return;
      }
      const previous = hoverDefinitionCandidateRef.current;
      hoverDefinitionCandidateRef.current = candidate;
      if (previous?.key === candidate.key) {
        setHoverDefinition((current) => {
          if (!current) return current;
          const currentIndex = Math.max(
            0,
            candidate.candidates.indexOf(current.text)
          );
          return {
            ...current,
            ...tooltipPosition(candidate.rects[currentIndex] ?? candidate.rect)
          };
        });
        return;
      }
      clearTimer();
      setHoverDefinition(null);
      setHoverDefinitionHighlight(null);
      hoverDefinitionTimerRef.current = window.setTimeout(() => {
        hoverDefinitionTimerRef.current = null;
        void loadHoverDefinitionDictionary()
          .then((dictionary) => {
            const dictionaryWords =
              candidate.language === "zh"
                ? candidate.candidates
                : candidate.candidates.flatMap(englishLemmaCandidates);
            const matchedWord = dictionaryWords.find((word) =>
              candidate.language === "zh"
                ? Boolean(dictionary.zh[word])
                : Boolean(dictionary.en[word.toLowerCase()])
            );
            const meaning = matchedWord
              ? candidate.language === "zh"
                ? dictionary.zh[matchedWord]
                : dictionary.en[matchedWord.toLowerCase()]
              : undefined;
            if (
              !meaning ||
              hoverDefinitionCandidateRef.current?.key !== candidate.key
            ) {
              return;
            }
            const matchedIndex =
              candidate.language === "zh"
                ? candidate.candidates.indexOf(matchedWord ?? candidate.text)
                : 0;
            setHoverDefinition({
              text: candidate.language === "zh"
                ? matchedWord ?? candidate.text
                : candidate.text,
              meaning,
              ...tooltipPosition(candidate.rects[matchedIndex] ?? candidate.rect)
            });
            setHoverDefinitionHighlight(
              candidate.ranges[matchedIndex] ?? candidate.ranges[0] ?? null
            );
          })
          .catch(() => {
            // The dictionary is optional at runtime; a failed load stays quiet.
          });
      }, 560);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (isAssistantEvent(event)) {
        hide();
        return;
      }
      if (hoverDefinitionShortcut === "ctrl") {
        hoverDefinitionShortcutPressedRef.current =
          isCtrlDefinitionShortcut(event);
      }
      const pointer = { clientX: event.clientX, clientY: event.clientY };
      hoverDefinitionPointerRef.current = pointer;
      schedule(pointer);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        hoverDefinitionShortcut !== "ctrl" ||
        !isCtrlDefinitionShortcut(event)
      ) {
        if (
          hoverDefinitionShortcut === "ctrl" &&
          (event.altKey || event.shiftKey || event.metaKey)
        ) {
          hoverDefinitionShortcutPressedRef.current = false;
          hide();
        }
        return;
      }
      hoverDefinitionShortcutPressedRef.current = true;
      if (hoverDefinitionPointerRef.current) {
        schedule(hoverDefinitionPointerRef.current);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (
        hoverDefinitionShortcut !== "ctrl" ||
        !["Control", "Alt", "Shift", "Meta"].includes(event.key)
      ) {
        return;
      }
      hoverDefinitionShortcutPressedRef.current = false;
      hide();
    };
    const handleBlur = () => {
      hoverDefinitionShortcutPressedRef.current = false;
      hide();
    };
    document.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleBlur);
      hide();
    };
  }, [hoverDefinitionBlocked, hoverDefinitionMode, hoverDefinitionShortcut]);

  useEffect(() => {
    if (!inputAutoReplyEnabled || autoReplyBlocked) {
      setAutoReplyTarget(null);
      return;
    }
    const resolveTarget = (target: EventTarget | null) =>
      autoReplyTargetFromEvent(target, inputAutoReplyDisableSingleLine);
    const refreshFromActive = () => {
      setAutoReplyTarget((current) => {
        const target = current?.element ?? document.activeElement;
        return resolveTarget(target);
      });
    };
    const handleFocusIn = (event: FocusEvent) => {
      setAutoReplyError("");
      setAutoReplyTarget(resolveTarget(event.target));
    };
    const handleFocusOut = () => {
      window.setTimeout(() => {
        setAutoReplyTarget((current) => {
          if (!current) return null;
          return document.activeElement === current.element ? current : null;
        });
      }, 160);
    };
    const handleInput = (event: Event) => {
      setAutoReplyTarget((current) => {
        if (!current || event.target !== current.element) return current;
        return resolveTarget(current.element);
      });
    };
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    document.addEventListener("input", handleInput, true);
    window.addEventListener("scroll", refreshFromActive, true);
    window.addEventListener("resize", refreshFromActive);
    refreshFromActive();
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      document.removeEventListener("input", handleInput, true);
      window.removeEventListener("scroll", refreshFromActive, true);
      window.removeEventListener("resize", refreshFromActive);
    };
  }, [
    autoReplyBlocked,
    inputAutoReplyDisableSingleLine,
    inputAutoReplyEnabled
  ]);

  const clearImageHoverTimers = useCallback(() => {
    if (imageHoverTimeoutRef.current !== null) {
      window.clearTimeout(imageHoverTimeoutRef.current);
      imageHoverTimeoutRef.current = null;
    }
    if (imageHoverHideTimeoutRef.current !== null) {
      window.clearTimeout(imageHoverHideTimeoutRef.current);
      imageHoverHideTimeoutRef.current = null;
    }
  }, []);

  const imageTextTargetFromImage = useCallback(
    (image: HTMLImageElement): ImageTextTarget | null => {
      if (!imageTextExtractionEnabled || imageTextExtractionBlocked) {
        return null;
      }
      const src = image.currentSrc || image.src;
      if (!src || !image.isConnected) return null;
      const rect = imageHoverRect(image);
      const minSize = Math.max(
        24,
        activeSettings?.imageTextExtractionMinSize ?? 160
      );
      if (
        rect.width < minSize ||
        rect.height < minSize ||
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      ) {
        return null;
      }
      return {
        element: image,
        rect,
        src,
        alt: image.alt.trim()
      };
    },
    [
      activeSettings?.imageTextExtractionMinSize,
      imageTextExtractionBlocked,
      imageTextExtractionEnabled
    ]
  );

  useEffect(() => {
    if (!imageTextExtractionEnabled || imageTextExtractionBlocked) {
      clearImageHoverTimers();
      imageHoverCandidateRef.current = null;
      setImageTextVisible(false);
      setImageTextTarget(null);
      return;
    }
    const hideHoverButton = () => {
      if (imageHoverHideTimeoutRef.current !== null) {
        window.clearTimeout(imageHoverHideTimeoutRef.current);
      }
      imageHoverHideTimeoutRef.current = window.setTimeout(() => {
        imageHoverCandidateRef.current = null;
        setImageTextVisible(false);
      }, 160);
    };
    const handleMouseOver = (event: MouseEvent) => {
      const image =
        event.target instanceof Element
          ? event.target.closest<HTMLImageElement>("img")
          : null;
      if (!image) return;
      const target = imageTextTargetFromImage(image);
      if (!target) return;
      if (imageHoverHideTimeoutRef.current !== null) {
        window.clearTimeout(imageHoverHideTimeoutRef.current);
        imageHoverHideTimeoutRef.current = null;
      }
      if (imageHoverTimeoutRef.current !== null) {
        window.clearTimeout(imageHoverTimeoutRef.current);
      }
      imageHoverCandidateRef.current = image;
      imageHoverTimeoutRef.current = window.setTimeout(() => {
        if (imageHoverCandidateRef.current !== image) return;
        const next = imageTextTargetFromImage(image);
        if (!next) {
          setImageTextVisible(false);
          return;
        }
        setImageTextTarget(next);
        setImageTextVisible(true);
      }, 320);
    };
    const handleMouseOut = (event: MouseEvent) => {
      const image =
        event.target instanceof Element
          ? event.target.closest<HTMLImageElement>("img")
          : null;
      if (!image) return;
      if (
        event.relatedTarget instanceof Node &&
        image.contains(event.relatedTarget)
      ) {
        return;
      }
      if (imageHoverTimeoutRef.current !== null) {
        window.clearTimeout(imageHoverTimeoutRef.current);
        imageHoverTimeoutRef.current = null;
      }
      hideHoverButton();
    };
    const handleViewportChange = () => {
      clearImageHoverTimers();
      imageHoverCandidateRef.current = null;
      setImageTextVisible(false);
    };
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    return () => {
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("mouseout", handleMouseOut, true);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
      clearImageHoverTimers();
    };
  }, [
    clearImageHoverTimers,
    imageTextExtractionBlocked,
    imageTextExtractionEnabled,
    imageTextTargetFromImage
  ]);

  const availableTools = useMemo(
    () => allTools(customTools, activeSettings ?? undefined),
    [customTools, activeSettings]
  );
  const askSelectionTool = useMemo(
    () =>
      availableTools.find((tool) => tool.id === "ask-selection") ?? {
        id: "ask-selection",
        title: uiText(activeSettings?.interfaceLanguage, "askSelectionTitle"),
        description: uiText(
          activeSettings?.interfaceLanguage,
          "askSelectionDescription"
        ),
        icon: "PanelRightOpen",
        builtin: true,
        template: ""
      },
    [activeSettings?.interfaceLanguage, availableTools]
  );
  const imageTextExtractionTool = useMemo<ToolDefinition>(
    () => ({
      id: IMAGE_TEXT_EXTRACTION_TOOL_ID,
      title: uiText(
        activeSettings?.interfaceLanguage,
        "imageTextExtractionResult"
      ),
      description: uiText(
        activeSettings?.interfaceLanguage,
        "extractImageText"
      ),
      icon: "ScanText",
      builtin: true,
      template: ""
    }),
    [activeSettings?.interfaceLanguage]
  );
  const selectionTools = useMemo(() => {
    const ids =
      activeSettings?.enabledToolIds?.selection ??
      availableTools.map((tool) => tool.id);
    return ids
      .map((id) => availableTools.find((tool) => tool.id === id))
      .filter(
        (tool): tool is ToolDefinition =>
          Boolean(tool) && tool?.id !== "ask-selection"
      );
  }, [activeSettings, availableTools]);
  const edgeToolIds =
    activeSettings?.enabledToolIds?.edge ?? ["summary"];
  const edgeTools = useMemo(
    () =>
      edgeToolIds
        .map((id) => availableTools.find((tool) => tool.id === id))
        .filter(
          (tool): tool is ToolDefinition =>
            Boolean(tool) && tool?.id !== "ask-selection"
        ),
    [availableTools, edgeToolIds]
  );

  useEffect(() => {
    if (!query || !searchAnswerEnabled || searchAnswerDismissed) {
      setSearchAnswer({ text: "", error: "", busy: false, results: [] });
      return;
    }
    const key = `${query}\n${activeSettings?.activeProfileId ?? ""}\n${searchAnswerRefreshToken}`;
    if (searchAnswerKeyRef.current === key) return;
    searchAnswerKeyRef.current = key;
    let cancelled = false;
    const run = async () => {
      setSearchAnswer({ text: "", error: "", busy: true, results: [] });
      try {
        const search = await runtimeRequest<{ results: WebSearchResult[] }>(
          "search.web",
          {
            query,
            limit: 6
          }
        );
        const results = search.results;
        const context = searchResultsContext(
          results,
          activeSettings?.interfaceLanguage
        );
        const response = await runtimeRequest<{ text: string }>(
          "model.complete",
          {
            temperature: 0.25,
            messages: [
              createMessage(
                "system",
                uiText(activeSettings?.interfaceLanguage, "searchAnswerSystem")
              ),
              createMessage(
                "user",
                [
                  `${uiText(activeSettings?.interfaceLanguage, "searchQuery")}：${query}`,
                  "",
                  context
                    ? `${uiText(activeSettings?.interfaceLanguage, "duckResults")}：\n${context}`
                    : uiText(activeSettings?.interfaceLanguage, "duckNoResults"),
                  "",
                  uiText(activeSettings?.interfaceLanguage, "searchAnswerRequest"),
                  uiText(
                    activeSettings?.interfaceLanguage,
                    "sourceCitationInstruction"
                  )
                ].join("\n")
              )
            ]
          }
        );
        if (!cancelled) {
          setSearchAnswer({
            text: response.text,
            error: "",
            busy: false,
            results
          });
        }
      } catch (error) {
        if (!cancelled) {
          setSearchAnswer({
            text: "",
            error: errorMessage(error),
            busy: false,
            results: []
          });
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    activeSettings?.activeProfileId,
    query,
    searchAnswerDismissed,
    searchAnswerEnabled,
    searchAnswerRefreshToken
  ]);

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const scheduleHoverClose = () => {
    clearHoverTimeout();
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoverOpen(false);
    }, 220);
  };

  useEffect(() => {
    const hide = () => {
      if (!activeTool) setSnapshot(null);
    };
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [activeTool]);

  const position = useMemo(() => {
    if (!snapshot) return { left: 10, top: 10 };
    const width = Math.min(
      430,
      Math.max(208, (selectionTools.length + 2) * 33 + 18)
    );
    const left = Math.max(
      10,
      Math.min(window.innerWidth - width - 10, snapshot.rect.left)
    );
    const below = snapshot.rect.bottom + 8;
    const top = below + 46 < window.innerHeight
      ? below
      : Math.max(10, snapshot.rect.top - 48);
    return { left, top };
  }, [selectionTools.length, snapshot]);

  const dotPosition = useMemo(() => {
    if (!snapshot) return { left: 10, top: 10 };
    const left = Math.max(
      6,
      Math.min(window.innerWidth - 15, snapshot.rect.right + 6)
    );
    const below = snapshot.rect.bottom + 7;
    const top =
      below + 12 < window.innerHeight
        ? below
        : Math.max(6, snapshot.rect.top - 15);
    return { left, top };
  }, [snapshot]);

  const resultPosition = useMemo(() => {
    const width = Math.min(420, window.innerWidth - 20);
    const left = Math.max(
      10,
      Math.min(window.innerWidth - width - 10, position.left)
    );
    const top = Math.max(
      10,
      Math.min(window.innerHeight - 300, position.top + 46)
    );
    return { left, top };
  }, [position]);

  const applyImmersiveSelection = (
    target: SelectionSnapshot,
    translation: string,
    mode: PageTranslationMode,
    displayStyle: ImmersiveTranslationDisplayStyle,
    effects: ImmersiveTranslationTextEffect[]
  ): boolean => {
    installPageStyles();
    if (target.range) {
      const wrapper = document.createElement("span");
      wrapper.className = "webmind-immersive-source";
      wrapper.dataset.webmindBlockId = `md-${Date.now()}-${translationSequence++}`;
      try {
        wrapper.append(target.range.extractContents());
        target.range.insertNode(wrapper);
        applyTranslations(
          [{ id: wrapper.dataset.webmindBlockId ?? "", text: translation }],
          mode,
          displayStyle,
          effects
        );
        return true;
      } catch {
        return false;
      }
    }
    if (target.editable && mode === "translation-only") {
      replaceSelection(target, translation);
      return true;
    }
    return false;
  };

  const runTool = useCallback(
    async (tool: ToolDefinition) => {
      if (!snapshot) return;
      if (tool.id === "ask-selection") {
        const targetRect = snapshot.rect;
        const pending: PendingAction = {
          id: crypto.randomUUID(),
          action: "ask",
          createdAt: Date.now(),
          text: snapshot.text,
          pageTitle: document.title,
          pageUrl: location.href
        };
        setActiveTool(null);
        setResult("");
        setError("");
        setSnapshot(null);
        try {
          await runtimeRequest("panel.open", { action: pending });
        } catch (requestError) {
          showPageTooltip(
            requestError instanceof Error
              ? requestError.message
              : String(requestError),
            targetRect
          );
        }
        return;
      }
      setActiveTool(tool);
      setSelectedResultToolId(tool.id);
      setResult("");
      setError("");
      setResultBusy(true);
      setCopied(false);
      try {
        const response = await runtimeRequest<{ text: string }>(
          "model.tool",
          { toolId: tool.id, text: snapshot.text }
        );
        setResult(response.text);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : String(requestError)
        );
      } finally {
        setResultBusy(false);
      }
    },
    [activeSettings, snapshot]
  );

  const resultTools = useMemo(() => {
    const tools = selectionTools.filter((tool) => tool.id !== "ask-selection");
    if (
      activeTool &&
      activeTool.id !== IMAGE_TEXT_EXTRACTION_TOOL_ID &&
      !tools.some((tool) => tool.id === activeTool.id)
    ) {
      return [activeTool, ...tools];
    }
    return tools;
  }, [activeTool, selectionTools]);

  const selectedResultTool =
    resultTools.find((tool) => tool.id === selectedResultToolId) ??
    (activeTool?.id === IMAGE_TEXT_EXTRACTION_TOOL_ID ? null : activeTool);
  const isImageTextResult = activeTool?.id === IMAGE_TEXT_EXTRACTION_TOOL_ID;

  const rerunResultTool = async (continueFromResult: boolean) => {
    if (!snapshot || !selectedResultTool || resultBusy) return;
    const previousResult = result.trim();
    const contextText = continueFromResult && previousResult
      ? [
          `${t("originalSelectedContent")}：`,
          snapshot.text,
          "",
          `${t("previousResult")}：`,
          previousResult,
          "",
          t("continueToolInstruction")
        ].join("\n")
      : snapshot.text;
    await runToolOnText(selectedResultTool, contextText);
  };

  const runToolOnText = async (tool: ToolDefinition, text: string) => {
    setActiveTool(tool);
    setSelectedResultToolId(tool.id);
    setResult("");
    setError("");
    setCopied(false);
    setResultBusy(true);
    try {
      const response = await runtimeRequest<{ text: string }>("model.tool", {
        toolId: tool.id,
        text
      });
      setResult(response.text);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : String(requestError)
      );
    } finally {
      setResultBusy(false);
    }
  };

  const askFollowUp = async () => {
    if (!snapshot || !followUpQuestion.trim() || resultBusy) return;
    const question = followUpQuestion.trim();
    const previousResult = result.trim();
    setResult("");
    setError("");
    setCopied(false);
    setResultBusy(true);
    try {
      const response = await runtimeRequest<{ text: string }>("model.complete", {
        messages: [
          createMessage(
            "system",
            t("selectionAssistantSystem")
          ),
          createMessage(
            "user",
            [
              `${t("userQuestionLabel")}：`,
              question,
              "",
              `${t("originalSelectedContent")}：`,
              snapshot.text,
              previousResult ? `\n${t("currentResultLabel")}：` : "",
              previousResult
            ].join("\n")
          )
        ]
      });
      setResult(response.text);
      setFollowUpQuestion("");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : String(requestError)
      );
    } finally {
      setResultBusy(false);
    }
  };

  const openSearch = async () => {
    if (!query) return;
    const pending: PendingAction = {
      id: crypto.randomUUID(),
      action: "ask",
      createdAt: Date.now(),
      text: `${t("researchSearchPrefix")}：${query}`,
      pageTitle: document.title,
      pageUrl: location.href
    };
    await runtimeRequest("panel.open", { action: pending });
  };

  const showEdgeResult = (title: string, text = "", error = "") => {
    setEdgeResultTitle(title);
    setEdgeResult(text);
    setEdgeError(error);
  };

  const showImmersiveProgress = (
    percent: number,
    label: string,
    active = true,
    error = false,
    title = t("immersiveTranslation")
  ) => {
    setTranslationProgress({
      active,
      title,
      label,
      percent: Math.max(0, Math.min(100, Math.round(percent))),
      error
    });
  };

  const openSidePanel = async () => {
    setEdgeBusy(true);
    showEdgeResult(t("openSidebar"), t("openSidebarOpening"));
    try {
      await runtimeRequest("panel.open");
      showEdgeResult(t("openSidebar"), t("openSidebarOpened"));
    } catch (requestError) {
      showEdgeResult(t("openSidebar"), "", errorMessage(requestError));
    } finally {
      setEdgeBusy(false);
    }
  };

  const runEdgeTool = async (tool: ToolDefinition) => {
    setEdgeBusy(true);
    showEdgeResult(tool.title, t("readCurrentPage"));
    try {
      const context = extractPageContext(true, activeSettings?.interfaceLanguage);
      if (!context.text.trim()) throw new Error(t("noProcessablePageBody"));
      showEdgeResult(tool.title, t("executingTool"));
      const response = await runtimeRequest<{ text: string }>("model.tool", {
        toolId: tool.id,
        text: truncateText(
          context.text,
          60000,
          activeSettings?.interfaceLanguage
        )
      });
      showEdgeResult(tool.title, response.text);
    } catch (requestError) {
      showEdgeResult(tool.title, "", errorMessage(requestError));
    } finally {
      setEdgeBusy(false);
    }
  };

  const runEdgeImmersiveTranslate = async (
    scope: "page" | "paragraph" = "page",
    options: { ignoreBusy?: boolean } = {}
  ) => {
    if (edgeBusy && !options.ignoreBusy) return;
    setEdgeBusy(true);
    showEdgeResult("");
    showImmersiveProgress(
      3,
      scope === "page" ? t("collectingPageBody") : t("collectingSelection")
    );
    try {
      if (!translationProfile) throw new Error(t("modelEngineRequired"));
      const blocks =
        scope === "page"
          ? prepareTranslationBlocks("page")
          : prepareParagraphTranslationBlocks(lastPointerTarget);
      if (!blocks.length) throw new Error(t("noTranslatableBlocks"));
      let completed = 0;
      const batches = chunkItems(blocks, IMMERSIVE_TRANSLATION_BATCH_SIZE);
      const requestTranslations = async (requestBlocks: PageTextBlock[]) => {
        const sourceText = requestBlocks.map((block) => block.text).join("\n");
        const response = await runtimeRequest<{ text: string }>(
          "model.complete",
          {
            profileId: translationProfile.id,
            purpose: "translation",
            temperature: 0,
            messages: [
              createMessage(
                "system",
                buildPageTranslationSystemPrompt(
                  activeSettings ?? undefined,
                  sourceText
                )
              ),
              createMessage(
                "user",
                buildPageTranslationUserPrompt(requestBlocks)
              )
            ]
          }
        );
        return alignPageTranslations(
          requestBlocks,
          extractPageTranslationEntries(
            response.text,
            requestBlocks.length,
            activeSettings?.interfaceLanguage
          )
        );
      };
      await mapWithConcurrency(
        batches,
        scope === "page" ? IMMERSIVE_TRANSLATION_CONCURRENCY : 1,
        async (batch, batchIndex) => {
          const processedBefore = batchIndex * IMMERSIVE_TRANSLATION_BATCH_SIZE;
          showImmersiveProgress(
            (processedBefore / blocks.length) * 92 + 5,
            `${t("translatingPageProgress")} ${Math.min(processedBefore + batch.length, blocks.length)}/${blocks.length}`
          );
          let translations: PageTranslation[] = [];
          try {
            translations = await requestTranslations(batch);
          } catch (requestError) {
            if (batch.length === 1) throw requestError;
          }
          const translatedIds = new Set(
            translations.map((translation) => translation.id)
          );
          const missingBlocks = batch.filter(
            (block) => !translatedIds.has(block.id)
          );
          if (missingBlocks.length) {
            const retry = await requestTranslations(missingBlocks);
            for (const translation of retry) {
              translations.push(translation);
              translatedIds.add(translation.id);
            }
          }
          if (translations.length !== batch.length) {
            throw new Error(contentText("jsonArrayInvalid"));
          }
          const translationById = new Map(
            translations.map((translation) => [translation.id, translation])
          );
          translations = batch.flatMap((block) => {
            const translation = translationById.get(block.id);
            return translation ? [translation] : [];
          });
          const applied = applyTranslations(
            translations,
            activeSettings?.immersiveTranslationStyle ?? "bilingual",
            activeSettings?.immersiveTranslationDisplayStyle ?? "default",
            activeSettings?.immersiveTranslationTextEffects ?? []
          );
          if (applied !== translations.length) {
            throw new Error(t("translationWriteFailed"));
          }
          completed += applied;
          showImmersiveProgress(
            (Math.min(completed, blocks.length) / blocks.length) * 92 + 5,
            `${t("translationWritten")} ${completed}`
          );
        }
      );
      showImmersiveProgress(
        100,
        `${t("translationComplete")}, ${t("translationApplied")} ${completed}`,
        false
      );
    } catch (requestError) {
      showImmersiveProgress(100, errorMessage(requestError), false, true);
    } finally {
      setEdgeBusy(false);
    }
  };
  runEdgeImmersiveTranslateRef.current = runEdgeImmersiveTranslate;

  const runEdgeImmersiveReading = async (
    options: { ignoreBusy?: boolean } = {}
  ) => {
    if (edgeBusy && !options.ignoreBusy) return;
    setEdgeBusy(true);
    emitDebugLog("[workflow] immersive reading edge start scope=page");
    showEdgeResult("");
    showImmersiveProgress(
      3,
      t("collectingPageBody"),
      true,
      false,
      t("immersiveReading")
    );
    try {
      if (!activeSettings) throw new Error(t("modelEngineRequired"));
      emitDebugLog("[workflow] immersive reading edge collect text blocks");
      const blocks = prepareTranslationBlocks("page");
      if (!blocks.length) throw new Error(t("noTranslatableBlocks"));
      emitDebugLog(
        `[workflow] immersive reading edge collected blocks=${blocks.length}`
      );
      const pageLanguageSample = blocks
        .map((block) => block.text)
        .join("\n")
        .slice(0, 8000);
      const useModelPage =
        activeSettings.immersiveReadingStrategy === "model-page";
      emitDebugLog(
        `[workflow] immersive reading edge strategy=${
          useModelPage ? "model-page" : "local-first"
        } difficulty=${activeSettings.immersiveReadingDifficulty}`
      );
      showImmersiveProgress(
        8,
        `${t("immersiveReading")} ${blocks.length}/${blocks.length}`,
        true,
        false,
        t("immersiveReading")
      );
      const requestModelReading = async (requestBlocks: PageTextBlock[]) => {
        if (!translationProfile) {
          throw new Error(t("modelEngineRequired"));
        }
        emitDebugLog(
          `[workflow] immersive reading edge model-page request blocks=${requestBlocks.length} model=${translationProfile.name}/${translationProfile.model}`
        );
        const response = await runtimeRequest<{ text: string }>(
          "model.complete",
          {
            profileId: translationProfile.id,
            purpose: "translation",
            temperature: 0,
            messages: [
              createMessage(
                "system",
                immersiveReadingInstruction(activeSettings)
              ),
              createMessage(
                "user",
                [
                  "<page-language-sample>",
                  pageLanguageSample,
                  "</page-language-sample>",
                  "<reading-input>",
                  JSON.stringify(requestBlocks),
                  "</reading-input>"
                ].join("\n")
              )
            ]
          }
        );
        return alignPageTranslations(
          requestBlocks,
          extractPageTranslationEntries(
            response.text,
            requestBlocks.length,
            activeSettings.interfaceLanguage
          )
        );
      };
      let translations: PageTranslation[] = [];
      if (useModelPage) {
        translations = await requestModelReading(blocks);
        emitDebugLog(
          `[workflow] immersive reading edge model-page aligned translations=${translations.length}`
        );
      } else {
        emitDebugLog(
          "[workflow] immersive reading edge local-first build local plan"
        );
        const plan = await localReadingPlan(blocks, activeSettings);
        emitDebugLog(
          `[workflow] immersive reading edge local-first plan blocks=${plan.blocks.length} fallbackTerms=${plan.fallbackTerms.length}`
        );
        let fallbackTranslations: ReadingFallbackTranslation[] = [];
        if (plan.fallbackTerms.length && translationProfile) {
          try {
            emitDebugLog(
              `[workflow] immersive reading edge local-first fallback request terms=${plan.fallbackTerms.length} model=${translationProfile.name}/${translationProfile.model}`
            );
            fallbackTranslations = await requestReadingFallbackTranslations(
              plan.fallbackTerms,
              translationProfile.id
            );
            emitDebugLog(
              `[workflow] immersive reading edge local-first fallback translations=${fallbackTranslations.length}`
            );
          } catch {
            emitDebugLog(
              "[workflow] immersive reading edge local-first fallback failed, continue with local dictionary results"
            );
            // Local-first mode treats model fallback as best-effort.
          }
        } else {
          emitDebugLog(
            `[workflow] immersive reading edge local-first fallback skipped terms=${plan.fallbackTerms.length}`
          );
        }
        translations = finalizeLocalReadingPlan(
          plan.blocks,
          fallbackTranslations
        );
        emitDebugLog(
          `[workflow] immersive reading edge local-first finalized translations=${translations.length}`
        );
      }
      const translationById = new Map(
        translations.map((translation) => [translation.id, translation])
      );
      translations = blocks.flatMap((block) => {
        const translation = translationById.get(block.id);
        return translation ? [translation] : [];
      });
      const completed = applyImmersiveReading(
        translations,
        activeSettings.immersiveReadingMode,
        activeSettings.immersiveReadingOuterTextEffects,
        activeSettings.immersiveReadingInnerTextEffects
      );
      emitDebugLog(
        `[workflow] immersive reading edge applied blocks=${completed}/${translations.length}`
      );
      showImmersiveProgress(
        100,
        `${t("immersiveReadingApplied")} ${completed}`,
        false,
        false,
        t("immersiveReading")
      );
    } catch (requestError) {
      showImmersiveProgress(
        100,
        errorMessage(requestError),
        false,
        true,
        t("immersiveReading")
      );
    } finally {
      setEdgeBusy(false);
    }
  };

  const runEdgeRestore = () => {
    restorePage();
    showEdgeResult(t("restorePage"), t("pageRestored"));
  };

  useEffect(() => {
    if (!activeSettings || !translationProfile) return;
    const translationRules =
      activeSettings.immersiveTranslationAutoWhitelist ?? [];
    const readingRules = activeSettings.immersiveReadingAutoWhitelist ?? [];
    const shouldTranslate = urlMatchesWhitelist(currentHref, translationRules);
    const shouldRead = urlMatchesWhitelist(currentHref, readingRules);
    if (!shouldTranslate && !shouldRead) {
      autoImmersiveRunKeyRef.current = "";
      return;
    }
    const runKey = [
      currentHref,
      shouldTranslate ? `translate:${translationRules.join("\n")}` : "",
      shouldRead ? `read:${readingRules.join("\n")}` : ""
    ].join("|");
    if (autoImmersiveRunKeyRef.current === runKey) return;
    autoImmersiveRunKeyRef.current = runKey;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (shouldTranslate) {
          await runEdgeImmersiveTranslate("page", { ignoreBusy: true });
        }
        if (shouldRead) {
          await runEdgeImmersiveReading({ ignoreBusy: true });
        }
      })();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [
    activeSettings,
    currentHref,
    translationProfile,
    runEdgeImmersiveTranslate,
    runEdgeImmersiveReading
  ]);

  useEffect(() => {
    if (!activeSettings) return;
    const paragraphShortcut = activeSettings.immersiveTranslationParagraphShortcut;
    const pageShortcut = activeSettings.immersiveTranslationPageShortcut;
    if (paragraphShortcut === "off" && pageShortcut === "off") return;

    const clearAltShortcutTimer = () => {
      if (immersiveAltShortcutTimerRef.current === null) return;
      window.clearTimeout(immersiveAltShortcutTimerRef.current);
      immersiveAltShortcutTimerRef.current = null;
    };
    const preventShortcut = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const triggerShortcut = (scope: "page" | "paragraph") => {
      const now = Date.now();
      if (now < immersiveShortcutCooldownRef.current) return;
      immersiveShortcutCooldownRef.current = now + 700;
      void runEdgeImmersiveTranslateRef.current(scope);
    };
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.repeat || isAssistantEvent(event)) {
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName))
      ) {
        return;
      }

      if (isCtrlAltShortcutEvent(event)) {
        immersiveAltShortcutPartnerRef.current = true;
        clearAltShortcutTimer();
        if (pageShortcut === "ctrl-alt") {
          preventShortcut(event);
          triggerShortcut("page");
        }
        return;
      }

      const isAltOnly =
        isModifierKey(event, "alt") && isAltOnlyShortcutEvent(event);
      if (event.type === "keydown") {
        if (
          event.altKey &&
          (event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            isModifierKey(event, "ctrl"))
        ) {
          immersiveAltShortcutPartnerRef.current = true;
          clearAltShortcutTimer();
          return;
        }
        if (paragraphShortcut === "alt" && isAltOnly) {
          preventShortcut(event);
          immersiveAltShortcutPartnerRef.current = false;
          clearAltShortcutTimer();
          immersiveAltShortcutTimerRef.current = window.setTimeout(() => {
            immersiveAltShortcutTimerRef.current = null;
            if (!immersiveAltShortcutPartnerRef.current) {
              triggerShortcut("paragraph");
            }
          }, 160);
        }
        return;
      }

      if (paragraphShortcut === "alt" && isAltOnly) {
        preventShortcut(event);
        const hadPartner = immersiveAltShortcutPartnerRef.current;
        clearAltShortcutTimer();
        immersiveAltShortcutPartnerRef.current = false;
        if (!hadPartner) triggerShortcut("paragraph");
      }
    };
    window.addEventListener("keydown", handleShortcut, true);
    window.addEventListener("keyup", handleShortcut, true);
    return () => {
      window.removeEventListener("keydown", handleShortcut, true);
      window.removeEventListener("keyup", handleShortcut, true);
      clearAltShortcutTimer();
      immersiveAltShortcutPartnerRef.current = false;
    };
  }, [activeSettings]);

  const clampEdgeBottom = (value: number) =>
    Math.max(18, Math.min(window.innerHeight - 104, Math.round(value)));

  const persistEdgeBottom = async (value: number) => {
    const current = await loadSettings();
    const next = { ...current, edgeQuickToolBottom: value };
    setLocalSettings(next);
    await saveSettings(next);
  };

  const startEdgeDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    edgeDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      startBottom: edgeBottom,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveEdgeDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = edgeDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    const delta = event.clientY - drag.startY;
    if (Math.abs(delta) > 3) drag.moved = true;
    if (!drag.moved) return;
    event.preventDefault();
    setEdgeBottomOverride(clampEdgeBottom(drag.startBottom - delta));
  };

  const endEdgeDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = edgeDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    const nextBottom = clampEdgeBottom(drag.startBottom - (event.clientY - drag.startY));
    drag.active = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
    if (drag.moved) {
      setEdgeBottomOverride(nextBottom);
      void persistEdgeBottom(nextBottom);
      window.setTimeout(() => {
        edgeDragRef.current.moved = false;
      }, 0);
    }
  };

  const handleEdgeTriggerClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (edgeDragRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    void openSidePanel();
  };

  const clampSearchAnswerPosition = (
    left: number,
    top: number,
    width: number,
    height: number
  ) => ({
    left: Math.max(8, Math.min(window.innerWidth - width - 8, Math.round(left))),
    top: Math.max(8, Math.min(window.innerHeight - height - 8, Math.round(top)))
  });

  const startSearchAnswerDrag = (
    event: ReactPointerEvent<HTMLElement>
  ) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button,a")) return;
    const panel = event.currentTarget.closest(
      ".md-search-answer"
    ) as HTMLElement | null;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    searchAnswerDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      width: rect.width,
      height: rect.height
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveSearchAnswerDrag = (
    event: ReactPointerEvent<HTMLElement>
  ) => {
    const drag = searchAnswerDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    setSearchAnswerPosition(
      clampSearchAnswerPosition(
        drag.startLeft + event.clientX - drag.startX,
        drag.startTop + event.clientY - drag.startY,
        drag.width,
        drag.height
      )
    );
  };

  const endSearchAnswerDrag = (
    event: ReactPointerEvent<HTMLElement>
  ) => {
    const drag = searchAnswerDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    drag.active = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  };

  const clampFloatingPanelPosition = (
    left: number,
    top: number,
    width: number,
    height: number
  ) => ({
    left: Math.max(
      8,
      Math.min(Math.max(8, window.innerWidth - width - 8), Math.round(left))
    ),
    top: Math.max(
      8,
      Math.min(Math.max(8, window.innerHeight - height - 8), Math.round(top))
    )
  });

  const startFloatingPanelDrag = (
    event: ReactPointerEvent<HTMLElement>
  ) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button,a")) {
      return;
    }
    const panel = event.currentTarget.closest(".md-result") as HTMLElement | null;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const drag = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      width: rect.width,
      height: rect.height
    };
    resultPanelDragRef.current = drag;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveFloatingPanelDrag = (
    event: ReactPointerEvent<HTMLElement>
  ) => {
    const drag = resultPanelDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = clampFloatingPanelPosition(
      drag.startLeft + event.clientX - drag.startX,
      drag.startTop + event.clientY - drag.startY,
      drag.width,
      drag.height
    );
    setResultPositionOverride(next);
  };

  const endFloatingPanelDrag = (
    event: ReactPointerEvent<HTMLElement>
  ) => {
    const drag = resultPanelDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    drag.active = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
  };

  const autoReplyPosition = autoReplyTarget
    ? {
        left: Math.max(
          8,
          Math.min(window.innerWidth - 20, autoReplyTarget.rect.right - 18)
        ),
        top: Math.max(
          8,
          Math.min(window.innerHeight - 20, autoReplyTarget.rect.top + 2)
        )
      }
    : null;

  const imageTextButtonPosition = imageTextTarget
    ? {
        left: Math.max(
          8,
          Math.min(window.innerWidth - 20, imageTextTarget.rect.right - 18)
        ),
        top: Math.max(
          8,
          Math.min(window.innerHeight - 20, imageTextTarget.rect.top + 2)
        )
      }
    : null;

  const imageResultPosition = useMemo(() => {
    if (activeTool?.id !== IMAGE_TEXT_EXTRACTION_TOOL_ID || !imageTextButtonPosition) {
      return null;
    }
    const width = Math.min(420, window.innerWidth - 20);
    const left = Math.max(
      10,
      Math.min(window.innerWidth - width - 10, imageTextButtonPosition.left + 16 - width)
    );
    const top = Math.max(
      10,
      Math.min(window.innerHeight - 300, imageTextButtonPosition.top + 24)
    );
    return { left, top };
  }, [activeTool?.id, imageTextButtonPosition]);

  const runImageTextExtraction = async (triggerButton?: HTMLButtonElement) => {
    const target = imageTextTarget;
    if (!target || imageTextBusy || !target.element.isConnected) return;
    const runId = crypto.randomUUID();
    imageTextRunRef.current = runId;
    if (triggerButton) triggerButton.style.visibility = "hidden";
    const capturePromise = runtimeRequest<{ dataUrl: string }>(
      "image.captureVisible"
    ).catch(() => null);
    const targetRect = target.element.getBoundingClientRect();
    setSnapshot({ text: "", rect: targetRect });
    setActiveTool(imageTextExtractionTool);
    setSelectedResultToolId("");
    setResultPositionOverride(null);
    setImageTextVisible(false);
    setImageTextBusy(true);
    setResultBusy(true);
    setResult("");
    setError("");
    setCopied(false);
    setFollowUpQuestion("");
    setResultToolMenuOpen(false);
    try {
      if (!visionProfile) {
        throw new Error(t("modelEngineRequired"));
      }
      if (!visionProfile.supportsVision) {
        throw new Error(
          t("profileVisionDisabled").replace("{name}", visionProfile.name)
        );
      }
      const attachment = await imageElementToAttachment(
        target.element,
        capturePromise
      );
      const response = await runtimeRequest<{ text: string }>(
        "model.complete",
        {
          profileId: visionProfile.id,
          purpose: "vision",
          temperature: 0,
          maxTokens: Math.min(visionProfile.maxTokens, 4096),
          messages: [
            createMessage("system", t("imageTextExtractionPrompt")),
            createMessage("user", t("extractImageText"), {
              attachments: [attachment]
            })
          ]
        }
      );
      const text = response.text.trim();
      if (!text) throw new Error(t("noImageTextFound"));
      if (imageTextRunRef.current !== runId) return;
      setResult(text);
      setSnapshot((current) =>
        current ? { ...current, text } : { text, rect: targetRect }
      );
    } catch (requestError) {
      if (imageTextRunRef.current === runId) {
        setError(errorMessage(requestError));
      }
    } finally {
      if (triggerButton?.isConnected) triggerButton.style.visibility = "";
      if (imageTextRunRef.current === runId) {
        setImageTextBusy(false);
        setResultBusy(false);
      }
    }
  };

  const runAutoReply = async () => {
    const target = autoReplyTarget;
    if (!target || autoReplyBusy || !target.element.isConnected) return;
    setAutoReplyBusy(true);
    setAutoReplyError("");
    try {
      const context = extractPageContext(true, activeSettings?.interfaceLanguage);
      const draft = editableText(target.element).trim();
      const response = await runtimeRequest<{ text: string }>(
        "model.complete",
        {
          temperature: 0.35,
          maxTokens: 220,
          messages: [
            createMessage(
              "system",
              t("autoReplySystem")
            ),
            createMessage(
              "user",
              [
                `${t("autoReplyPageTitle")}：${context.title}`,
                `${t("autoReplyPageUrl")}：${context.url}`,
                context.description
                  ? `${t("autoReplyPageDescription")}：${context.description}`
                  : "",
                "",
                `${t("autoReplyPageContent")}：`,
                truncateText(context.text, 30000, activeSettings?.interfaceLanguage),
                "",
                draft
                  ? `${t("autoReplyDraft")}：\n${truncateText(draft, 4000, activeSettings?.interfaceLanguage)}`
                  : t("autoReplyEmpty"),
                "",
                t("autoReplyRequest")
              ]
                .filter(Boolean)
                .join("\n")
            )
          ]
        }
      );
      const reply = response.text.trim().replace(/^["“]|["”]$/g, "");
      if (!reply) throw new Error(t("modelNoUsableReply"));
      setEditableText(target.element, reply);
      const next = autoReplyTargetFromEvent(
        target.element,
        inputAutoReplyDisableSingleLine
      );
      setAutoReplyTarget(next);
    } catch (requestError) {
      setAutoReplyError(errorMessage(requestError));
    } finally {
      setAutoReplyBusy(false);
    }
  };

  const closeResult = () => {
    imageTextRunRef.current = "";
    setImageTextBusy(false);
    setActiveTool(null);
    setResult("");
    setError("");
    setResultBusy(false);
    setResultToolMenuOpen(false);
    setFollowUpQuestion("");
    setResultPositionOverride(null);
    setSnapshot(null);
  };

  const visibleToolbar =
    snapshot &&
    !selectionOverlayBlocked &&
    activeSettings?.selectionOverlayMode !== "off" &&
    !activeTool &&
    (activeSettings?.selectionOverlayMode === "always" || hoverOpen);
  const selectionToolButton = (tool: ToolDefinition) => (
    <button
      key={tool.id}
      className="md-icon-button"
      type="button"
      title={tool.title}
      onClick={() => void runTool(tool)}
    >
      <ToolIcon name={tool.icon} />
    </button>
  );

  return (
    <>
      {autoReplyPosition && inputAutoReplyEnabled && !autoReplyBlocked && (
        <button
          className={`md-auto-reply-button ${
            autoReplyBusy ? "busy" : ""
          } ${autoReplyError ? "error" : ""}`}
          type="button"
          title={autoReplyError || t("generateShortAutoReply")}
          aria-label={t("generateShortAutoReply")}
          disabled={autoReplyBusy}
          style={{
            left: autoReplyPosition.left,
            top: autoReplyPosition.top
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onMouseUp={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void runAutoReply();
          }}
        >
          {autoReplyBusy ? (
            <span className="md-mini-spinner" />
          ) : (
            <BotMessageSquare />
          )}
        </button>
      )}
      {hoverDefinition && (
        <div
          className="md-definition-tooltip"
          style={{ left: hoverDefinition.left, top: hoverDefinition.top }}
          role="tooltip"
        >
          {hoverDefinition.meaning}
        </div>
      )}
      {imageTextButtonPosition &&
        imageTextVisible &&
        imageTextExtractionEnabled &&
        !imageTextExtractionBlocked && (
          <button
            className={`md-auto-reply-button md-image-text-button ${
              imageTextBusy ? "busy" : ""
            }`}
            type="button"
            title={t("extractImageText")}
            aria-label={t("extractImageText")}
            disabled={imageTextBusy}
            style={{
              left: imageTextButtonPosition.left,
              top: imageTextButtonPosition.top
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onMouseEnter={() => {
              if (imageHoverHideTimeoutRef.current !== null) {
                window.clearTimeout(imageHoverHideTimeoutRef.current);
                imageHoverHideTimeoutRef.current = null;
              }
              setImageTextVisible(true);
            }}
            onMouseLeave={() => {
              if (imageHoverHideTimeoutRef.current !== null) {
                window.clearTimeout(imageHoverHideTimeoutRef.current);
              }
              imageHoverHideTimeoutRef.current = window.setTimeout(() => {
                setImageTextVisible(false);
              }, 160);
            }}
            onMouseUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void runImageTextExtraction(event.currentTarget);
            }}
          >
            <ScanText />
          </button>
        )}
      {edgeQuickToolsEnabled && !edgeToolsBlocked && !edgeDismissed && (
        <div
          className="md-edge-tools"
          style={
            {
              "--md-edge-bottom": `${edgeBottom}px`
            } as CSSProperties
          }
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => event.stopPropagation()}
        >
          <button
            className="md-edge-close"
            type="button"
            title={t("closeQuickTools")}
            aria-label={t("closeQuickTools")}
            onClick={() => setEdgeDismissed(true)}
          >
            <X />
          </button>
          <div className="md-edge-menu">
            <button
              type="button"
              title={t("immersiveTranslation")}
              aria-label={t("immersiveTranslation")}
              disabled={edgeBusy}
              onClick={() => void runEdgeImmersiveTranslate()}
            >
              <ScanText />
            </button>
            <button
              type="button"
              title={t("immersiveReading")}
              aria-label={t("immersiveReading")}
              disabled={edgeBusy}
              onClick={() => void runEdgeImmersiveReading()}
            >
              <BookOpen />
            </button>
            {edgeTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                title={tool.title}
                aria-label={tool.title}
                disabled={edgeBusy}
                onClick={() => void runEdgeTool(tool)}
              >
                <ToolIcon name={tool.icon} />
              </button>
            ))}
            <button
              type="button"
              title={t("restorePage")}
              aria-label={t("restorePage")}
              disabled={edgeBusy}
              onClick={runEdgeRestore}
            >
              <RotateCcw />
            </button>
          </div>
          <button
            className="md-edge-trigger"
            type="button"
            title={t("openSidebar")}
            aria-label={t("openSidebar")}
            onPointerDown={startEdgeDrag}
            onPointerMove={moveEdgeDrag}
            onPointerUp={endEdgeDrag}
            onPointerCancel={endEdgeDrag}
            onClick={handleEdgeTriggerClick}
          >
            <Sparkles />
          </button>
        </div>
      )}
      {edgeResultTitle && (
        <div
          className="md-edge-result"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => event.stopPropagation()}
        >
          <div className="md-edge-result-head">
            <Sparkles />
            <strong>{edgeResultTitle || "WebMind"}</strong>
            <button
              className="md-icon-button"
              type="button"
              title={t("close")}
              onClick={() => showEdgeResult("")}
            >
              <X />
            </button>
          </div>
          <div className={`md-edge-result-body ${edgeError ? "error" : ""}`}>
            {edgeBusy && !edgeResult && !edgeError ? (
              <div className="md-spinner" />
            ) : (
              edgeError || edgeResult
            )}
          </div>
        </div>
      )}
      {query && searchAnswerEnabled && !searchAnswerDismissed && (
        <aside
          className="md-search-answer"
          aria-live="polite"
          style={
            searchAnswerPosition
              ? ({
                  left: `${searchAnswerPosition.left}px`,
                  top: `${searchAnswerPosition.top}px`,
                  right: "auto"
                } as CSSProperties)
              : undefined
          }
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => event.stopPropagation()}
        >
          <header
            className="md-search-answer-head"
            onPointerDown={startSearchAnswerDrag}
            onPointerMove={moveSearchAnswerDrag}
            onPointerUp={endSearchAnswerDrag}
            onPointerCancel={endSearchAnswerDrag}
          >
            <Sparkles />
            <strong>{uiText(activeSettings?.interfaceLanguage, "webmindAnswer")}</strong>
            <button
              className="md-icon-button"
              type="button"
              title={t("retryAnswer")}
              disabled={searchAnswer.busy}
              onClick={() => {
                searchAnswerKeyRef.current = "";
                setSearchAnswer({
                  text: "",
                  error: "",
                  busy: false,
                  results: []
                });
                setSearchAnswerRefreshToken((value) => value + 1);
              }}
            >
              <RotateCcw />
            </button>
            <button
              className="md-icon-button"
              type="button"
              title={t("close")}
              onClick={() => setSearchAnswerDismissed(true)}
            >
              <X />
            </button>
          </header>
          <div
            className={`md-search-answer-body ${
              searchAnswer.error ? "error" : ""
            }`}
          >
            {searchAnswer.busy ? (
              <div className="md-spinner" />
            ) : searchAnswer.error ? (
              searchAnswer.error
            ) : (
              <SearchAnswerMarkdown
                content={searchAnswer.text}
                results={searchAnswer.results}
              />
            )}
          </div>
          {searchAnswer.text && !searchAnswer.busy && (
            <footer className="md-search-answer-actions">
              <button
                className="md-text-button"
                type="button"
                onClick={() => void copyText(searchAnswer.text)}
              >
                <Copy />
                {uiText(activeSettings?.interfaceLanguage, "copy")}
              </button>
              <button
                className="md-text-button"
                type="button"
                onClick={() => void openSearch()}
              >
                <PanelRightOpen />
                {uiText(activeSettings?.interfaceLanguage, "more")}
              </button>
            </footer>
          )}
        </aside>
      )}
      {snapshot &&
        activeSettings?.selectionOverlayMode === "hover" &&
        !activeTool &&
        !selectionOverlayBlocked &&
        !hoverOpen && (
        <button
          className="md-hover-dot"
          type="button"
          title={uiText(activeSettings?.interfaceLanguage, "showTools")}
          aria-label={uiText(activeSettings?.interfaceLanguage, "showTools")}
          style={{ left: dotPosition.left, top: dotPosition.top }}
          onMouseEnter={() => {
            clearHoverTimeout();
            setHoverOpen(true);
          }}
          onMouseLeave={scheduleHoverClose}
        />
      )}
      {visibleToolbar && (
        <div
          className="md-toolbar"
          style={{ left: position.left, top: position.top }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onMouseUp={(event) => event.stopPropagation()}
          onMouseEnter={clearHoverTimeout}
          onMouseLeave={
            activeSettings?.selectionOverlayMode === "hover"
              ? scheduleHoverClose
              : undefined
          }
        >
          {selectionToolButton(askSelectionTool)}
          <button
            className="md-icon-button"
            type="button"
            title={uiText(activeSettings?.interfaceLanguage, "copySelection")}
            onClick={async () => {
              await copyText(snapshot.text);
              setSelectionCopied(true);
              window.setTimeout(() => setSelectionCopied(false), 1200);
            }}
          >
            {selectionCopied ? <Check /> : <Copy />}
          </button>
          {selectionTools.map(selectionToolButton)}
        </div>
      )}
      {activeTool && snapshot && (
        <div
          ref={resultRef}
          className="md-result"
          style={{
            left: (
              resultPositionOverride ?? imageResultPosition ?? resultPosition
            ).left,
            top: (
              resultPositionOverride ?? imageResultPosition ?? resultPosition
            ).top
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => event.stopPropagation()}
        >
          <div
            className="md-result-head md-draggable-head"
            onPointerDown={startFloatingPanelDrag}
            onPointerMove={moveFloatingPanelDrag}
            onPointerUp={endFloatingPanelDrag}
            onPointerCancel={endFloatingPanelDrag}
          >
            <ToolIcon name={activeTool.icon} />
            <span className="md-result-title">
              {activeTool.title}
            </span>
            <button
              className="md-icon-button"
              type="button"
              title={t("close")}
              onClick={closeResult}
            >
              <X />
            </button>
          </div>
          <div className={`md-result-body ${error ? "md-result-error" : ""}`}>
            {resultBusy ? <div className="md-spinner" /> : error || result}
          </div>
          {(result || error) && (
            <div className="md-result-actions">
              <div className="md-result-tools">
                <div
                  className="md-tool-menu"
                  onBlur={(event) => {
                    if (
                      isFocusOutside(event.currentTarget, event.relatedTarget)
                    ) {
                      setResultToolMenuOpen(false);
                    }
                  }}
                >
                  <button
                    className="md-tool-select"
                    type="button"
                    disabled={resultBusy || !resultTools.length}
                    onClick={() => setResultToolMenuOpen((open) => !open)}
                    title={t("chooseTool")}
                  >
                    {selectedResultTool && (
                      <ToolIcon name={selectedResultTool.icon} />
                    )}
                    <span>{selectedResultTool?.title ?? t("chooseTool")}</span>
                    <ChevronDown className="md-menu-chevron" />
                  </button>
                  {resultToolMenuOpen && (
                    <div
                      className="md-tool-menu-list"
                      role="menu"
                      onWheel={(event) => event.stopPropagation()}
                    >
                      {resultTools.map((tool) => (
                        <button
                          key={tool.id}
                          type="button"
                          role="menuitem"
                          className={
                            tool.id === selectedResultTool?.id ? "active" : ""
                          }
                          onClick={() => {
                            setSelectedResultToolId(tool.id);
                            setResultToolMenuOpen(false);
                          }}
                        >
                          <ToolIcon name={tool.icon} />
                          <span>{tool.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="md-text-button"
                  type="button"
                  disabled={
                    resultBusy || (!isImageTextResult && !selectedResultTool)
                  }
                  onClick={() =>
                    void (isImageTextResult
                      ? runImageTextExtraction()
                      : rerunResultTool(false))
                  }
                >
                  {isImageTextResult
                    ? t("reextractImageText")
                    : t("rerunExecution")}
                </button>
                <button
                  className="md-text-button"
                  type="button"
                  disabled={!selectedResultTool || !result || resultBusy}
                  onClick={() =>
                    void (isImageTextResult && selectedResultTool
                      ? runToolOnText(selectedResultTool, result.trim())
                      : rerunResultTool(true))
                  }
                >
                  {isImageTextResult
                    ? t("runSelectedTool")
                    : t("continueExecution")}
                </button>
              </div>
              {result && (
                <button
                  className="md-text-button"
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(result);
                    setCopied(true);
                  }}
                >
                  {copied ? <Check /> : <Copy />}
                  {copied ? t("copied") : t("copy")}
                </button>
              )}
              {result && snapshot.editable && (
                <button
                  className="md-text-button"
                  type="button"
                  onClick={() => {
                    replaceSelection(snapshot, result);
                    closeResult();
                  }}
                >
                  <Clipboard />
                  {t("replace")}
                </button>
              )}
            </div>
          )}
          {snapshot && (
            <div className="md-followup">
              <textarea
                rows={2}
                value={followUpQuestion}
                placeholder={t("continueQuestionPlaceholder")}
                disabled={resultBusy}
                onChange={(event) => setFollowUpQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void askFollowUp();
                  }
                }}
              />
              <button
                type="button"
                title={t("send")}
                disabled={!followUpQuestion.trim() || resultBusy}
                onClick={() => void askFollowUp()}
              >
                <Send />
              </button>
            </div>
          )}
        </div>
      )}
      {translationProgress && (
        <div
          className={`md-progress-orb ${
            translationProgress.error ? "error" : ""
          }`}
          style={
            {
              "--md-progress": `${translationProgress.percent}%`
            } as CSSProperties
          }
          role="status"
          aria-live="polite"
        >
          <div className="md-progress-fill" />
          <div className="md-progress-content">
            <strong>{translationProgress.percent}%</strong>
            <span>
              {translationProgress.error
                ? translationProgress.label
                : translationProgress.active
                  ? t("translatingShort")
                  : t("translationComplete")}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

async function initialize(): Promise<void> {
  settings = await loadSettings();
  const host = document.createElement("div");
  host.id = "webmind-root";
  assistantHost = host;
  document.documentElement.append(host);
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = SHADOW_STYLES;
  const mount = document.createElement("div");
  shadow.append(style, mount);
  createRoot(mount).render(<SelectionAssistant query={searchQuery()} />);

  document.addEventListener(
    "pointerover",
    (event) => {
      if (isAssistantEvent(event)) return;
      lastPointerTarget = event.target;
    },
    true
  );

  const selectionOverlayEnabled = () =>
    Boolean(
      settings &&
        settings.selectionOverlayMode !== "off" &&
        !urlMatchesBlacklist(
          location.href,
          settings.selectionOverlayUrlBlacklist ?? []
        )
    );
  const scheduleSelectionOverlayRefresh = (target: EventTarget | null) => {
    if (selectionOverlayTimer !== null) {
      window.clearTimeout(selectionOverlayTimer);
    }
    selectionOverlayTimer = window.setTimeout(() => {
      selectionOverlayTimer = null;
      if (!selectionOverlayEnabled()) {
        showSelection?.(null);
        return;
      }
      showSelection?.(
        currentSelection(target, settings?.selectionOverlayMinChars ?? 2)
      );
      scheduleSelectionContextReport();
    }, 36);
  };
  const handleSelectionEnd = (event: Event) => {
    if (isAssistantEvent(event)) return;
    if (!selectionOverlayEnabled()) {
      showSelection?.(null);
      return;
    }
    scheduleSelectionOverlayRefresh(event.target);
  };

  document.addEventListener("selectionchange", () => {
    scheduleSelectionContextReport();
    if (selectionOverlayEnabled()) {
      scheduleSelectionOverlayRefresh(lastPointerTarget);
    } else {
      showSelection?.(null);
    }
  });
  document.addEventListener("mouseup", handleSelectionEnd);
  document.addEventListener("pointerup", handleSelectionEnd, true);
  document.addEventListener("keyup", handleSelectionEnd);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes["webmind.settings"]) return;
    settings = {
      ...settings,
      ...(changes["webmind.settings"].newValue as AppSettings)
    } as AppSettings;
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const run = async () => {
    if (message.type === "page.context") {
      return extractPageContext(
        Boolean(message.ignoreSelection),
        settings?.interfaceLanguage
      );
    }
    if (message.type === "page.translation.prepare") {
      return prepareTranslationBlocks(
        message.scope === "selection" ? "selection" : "page",
        String(message.text ?? "")
      );
    }
    if (message.type === "page.reading.translate") {
      const blocks = Array.isArray(message.blocks)
        ? (message.blocks as PageTextBlock[])
        : [];
      if (!blocks.length || !settings) return [];
      return localReadingTranslations(blocks, settings);
    }
    if (message.type === "page.reading.plan") {
      const blocks = Array.isArray(message.blocks)
        ? (message.blocks as PageTextBlock[])
        : [];
      if (!blocks.length || !settings) {
        return { blocks: [], fallbackTerms: [] } satisfies ReadingLocalPlan;
      }
      return localReadingPlan(blocks, settings);
    }
    if (message.type === "page.reading.finalize") {
      const blocks = Array.isArray(message.blocks)
        ? (message.blocks as ReadingPlanBlock[])
        : [];
      const fallbackTranslations = Array.isArray(message.fallbackTranslations)
        ? (message.fallbackTranslations as ReadingFallbackTranslation[])
        : [];
      return finalizeLocalReadingPlan(blocks, fallbackTranslations);
    }
    if (message.type === "page.translation.apply") {
      return {
        count: applyTranslations(
          message.translations as PageTranslation[],
          message.mode === "translation-only" ? "translation-only" : "bilingual",
          translationDisplayStyle(message.displayStyle),
          translationTextEffects(message.effects)
        )
      };
    }
    if (message.type === "page.reading.apply") {
      const mode: ImmersiveReadingMode =
        message.mode === "translation" ||
        message.mode === "translation-original"
          ? message.mode
          : "original-translation";
      return {
        count: applyImmersiveReading(
          message.translations as PageTranslation[],
          mode,
          readingTextEffects(
            message.outerEffects,
            settings?.immersiveReadingOuterTextEffects ?? []
          ),
          readingTextEffects(
            message.innerEffects,
            settings?.immersiveReadingInnerTextEffects ?? []
          )
        )
      };
    }
    if (message.type === "page.translation.progress") {
      const percent = Number(message.percent ?? 0);
      showTranslationProgress?.({
        active: Boolean(message.active ?? true),
        title: String(message.title ?? contentText("immersiveTranslation")),
        label: String(message.label ?? ""),
        percent: Math.max(0, Math.min(100, Math.round(percent))),
        error: Boolean(message.error)
      });
      return { ok: true };
    }
    if (message.type === "page.translation.restore") {
      restorePage();
      showTranslationProgress?.(null);
      return { ok: true };
    }
    if (message.type === "youtube.seek") {
      const video = document.querySelector<HTMLVideoElement>("video");
      if (!video) throw new Error(contentText("youtubeVideoNotFound"));
      video.currentTime = Number(message.seconds ?? 0);
      await video.play();
      return { ok: true };
    }
    return undefined;
  };
  void run()
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      })
    );
  return true;
});

void initialize();
