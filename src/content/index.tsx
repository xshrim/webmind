import {
  BotMessageSquare,
  Check,
  ChevronDown,
  Clipboard,
  BookOpen,
  Copy,
  FileText,
  PanelRightOpen,
  RotateCcw,
  ScanText,
  Send,
  Sparkles,
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
  buildLocalReadingPlan,
  buildReadingFallbackPrompt,
  finalizeLocalReadingPlan,
  parseReadingFallbackTranslations,
  type EnglishWordFrequencyIndex,
  type HoverDefinitionDictionary,
  type ReadingFallbackTerm,
  type ReadingFallbackTranslation,
  type ReadingLocalPlan,
  type ReadingPlanBlock
} from "../shared/immersiveReading";
import { loadCustomTools, loadSettings, saveSettings } from "../shared/storage";
import { allTools, toolInstruction } from "../shared/tools";
import { profileForPurpose } from "../shared/models";
import {
  immersiveReadingInstruction,
} from "../shared/prompts";
import { applyImmersiveReading as applyImmersiveReadingDom } from "./immersiveReadingDom";
import {
  applyTranslations as applyTranslationsDom,
  restorePage as restorePageDom,
  toggleImmersiveTranslationDisplayMode as toggleImmersiveTranslationDisplayModeDom,
  type TranslationSourceRecord
} from "./translationDom";
import {
  findTranslationSource as findTranslationSourcePrepared,
  prepareParagraphTranslationBlocks as prepareParagraphTranslationBlocksPrepared,
  prepareTranslationBlocks as prepareTranslationBlocksPrepared,
  type TranslationBlockOptions,
  type TranslationPreparationDependencies
} from "./translationPreparation";
import {
  isModifierShortcutKey,
  modifierShortcutFromEvent,
  shortcutWeight
} from "./shortcuts";
import {
  urlMatchesBlacklist,
  urlMatchesWhitelist
} from "./urlRules";
import {
  imageElementToAttachment,
  imageHoverRect
} from "./imageAttachments";
import {
  autoReplyTargetFromEvent,
  currentSelection,
  editableText,
  pageSelectionText,
  replaceSelection,
  setEditableText,
  textFromElement,
  type AutoReplyTarget,
  type SelectionSnapshot
} from "./selection";
import {
  extractPageContext,
  linkCitationMarkers,
  searchQuery,
  searchResultsContext,
  restoreAutomaticArticleSelection,
  startManualArticleSelection
} from "./pageContext";
import { ToolIcon } from "./toolIcons";
import type {
  AppSettings,
  CustomTool,
  ImageAttachment,
  ImmersiveReadingBackgroundStyle,
  ImmersiveReadingMode,
  ImmersiveShortcut,
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
  createMessage,
  errorMessage,
  extractPageTranslationEntries,
  isPointInsideAnyRect,
  truncateText
} from "../shared/utils";
import {
  orderTranslationsByBlocks,
  runImmersiveReadingModelPageWorkflow,
  runImmersiveTranslationWorkflow
} from "../shared/immersiveWorkflow";
import { Markdown } from "../ui/Markdown";
import { PAGE_STYLES, SHADOW_STYLES } from "./styles";

const IMMERSIVE_READING_BATCH_SIZE = 20;
const IMMERSIVE_TRANSLATION_BATCH_SIZE = 10;
const IMMERSIVE_TRANSLATION_CONCURRENCY = 3;

type ImmersiveContentScope = "page" | "article";
type ImmersiveShortcutContextScope = "none" | "page" | "article" | "selection";
type ImmersiveTranslationRunScope =
  | ImmersiveContentScope
  | "selection"
  | "paragraph";
type ImmersiveReadingRunScope = ImmersiveTranslationRunScope;

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

interface SearchAnswerState {
  text: string;
  error: string;
  busy: boolean;
  results: WebSearchResult[];
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
let immersiveShortcutContextScope: ImmersiveShortcutContextScope | null = null;
let lastPointerTarget: EventTarget | null = null;
let assistantHost: HTMLElement | null = null;
const translationSources = new Map<string, TranslationSourceRecord>();
let selectionReportTimer: number | null = null;
let selectionOverlayTimer: number | null = null;
let selectionOverlayShortcutPressed = false;
let lastSelectionReportKey = "";
let hoverDefinitionDictionaryPromise: Promise<HoverDefinitionDictionary> | null =
  null;
let englishWordFrequencyPromise: Promise<EnglishWordFrequencyIndex> | null = null;
const HOVER_DEFINITION_HIGHLIGHT_NAME = "webmind-hover-definition";

function contentText(key: UiTextKey): string {
  return uiText(settings?.interfaceLanguage, key);
}

function nextTranslationBlockId(): string {
  return `md-${Date.now()}-${translationSequence++}`;
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

function isFocusOutside(
  container: HTMLElement,
  nextTarget: EventTarget | null
): boolean {
  return !(nextTarget instanceof Node) || !container.contains(nextTarget);
}

function isAssistantEvent(event: Event): boolean {
  return Boolean(assistantHost && event.composedPath().includes(assistantHost));
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

function loadEnglishWordFrequency(): Promise<EnglishWordFrequencyIndex> {
  if (!englishWordFrequencyPromise) {
    englishWordFrequencyPromise = fetch(
      chrome.runtime.getURL("dictionary/wordfreq-en-25000.json")
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Word frequency request failed: ${response.status}`);
        }
        const entries = (await response.json()) as unknown;
        if (!Array.isArray(entries)) {
          throw new Error("Invalid word frequency table");
        }
        const index: EnglishWordFrequencyIndex = new Map();
        for (const [rank, entry] of entries.entries()) {
          if (!Array.isArray(entry)) continue;
          const word = String(entry[0] ?? "").trim().toLowerCase();
          if (word) {
            index.set(word, rank + 1);
          }
        }
        return index;
      })
      .catch((error) => {
        emitDebugLog(
          `[workflow] immersive reading word frequency load failed: ${errorMessage(error)}`
        );
        return new Map();
      });
  }
  return englishWordFrequencyPromise;
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
  try {
    const [dictionary, frequencies] = await Promise.all([
      loadHoverDefinitionDictionary(),
      loadEnglishWordFrequency()
    ]);
    const plan = buildLocalReadingPlan(
      blocks,
      currentSettings,
      dictionary,
      frequencies
    );
    emitDebugLog(
      `[workflow] immersive reading local plan done planBlocks=${plan.blocks.length} fallbackTerms=${plan.fallbackTerms.length}`
    );
    return plan;
  } catch {
    emitDebugLog(
      "[workflow] immersive reading local plan dictionary load failed"
    );
    return { blocks: [], fallbackTerms: [] };
  }
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

function viewportPriority(element: HTMLElement, order: number): number {
  const rects = Array.from(element.getClientRects()).filter(
    (rect) => rect.width > 0 && rect.height > 0
  );
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight || 0;
  if (!rects.length || !viewportWidth || !viewportHeight) return order;
  const viewportCenterY = viewportHeight / 2;
  let bestDistance = Number.POSITIVE_INFINITY;
  let intersectsViewport = false;
  for (const rect of rects) {
    const horizontalOverlap = rect.right > 0 && rect.left < viewportWidth;
    const verticalOverlap = rect.bottom > 0 && rect.top < viewportHeight;
    if (horizontalOverlap && verticalOverlap) {
      intersectsViewport = true;
    }
    if (rect.top <= viewportCenterY && rect.bottom >= viewportCenterY) {
      bestDistance = 0;
    } else {
      bestDistance = Math.min(
        bestDistance,
        Math.abs(rect.top - viewportCenterY),
        Math.abs(rect.bottom - viewportCenterY)
      );
    }
  }
  const visibilityBucket = intersectsViewport ? 0 : 1;
  return visibilityBucket * 1_000_000_000 + bestDistance * 10_000 + order;
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

function normalizedBlockText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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

function readingBackgroundStyle(
  value: unknown
): ImmersiveReadingBackgroundStyle {
  return value === "uniform" || value === "leveled"
    ? value
    : settings?.immersiveReadingBackgroundStyle ?? "none";
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

function translationPreparationDependencies(): TranslationPreparationDependencies {
  return {
    sources: translationSources,
    installStyles: installPageStyles,
    isVisible,
    viewportPriority,
    textNodes,
    currentSelection,
    translatableElementFromTarget,
    lastPointerTarget: () => lastPointerTarget,
    nextBlockId: nextTranslationBlockId
  };
}

function prepareTranslationBlocks(
  scope: "page" | "article" | "selection" = "page",
  textFallback = "",
  options: TranslationBlockOptions = {}
): PageTextBlock[] {
  return prepareTranslationBlocksPrepared(
    scope,
    textFallback,
    options,
    translationPreparationDependencies()
  );
}

function prepareParagraphTranslationBlocks(
  target: EventTarget | null,
  textFallback = "",
  options: TranslationBlockOptions = {}
): PageTextBlock[] {
  return prepareParagraphTranslationBlocksPrepared(
    target,
    textFallback,
    options,
    translationPreparationDependencies()
  );
}

function findTranslationSource(id: string): HTMLElement | null {
  return findTranslationSourcePrepared(id, translationPreparationDependencies());
}

function applyImmersiveReading(
  translations: PageTranslation[],
  mode: ImmersiveReadingMode,
  backgroundStyle: ImmersiveReadingBackgroundStyle,
  outerEffects: ImmersiveTranslationTextEffect[],
  innerEffects: ImmersiveTranslationTextEffect[]
): number {
  return applyImmersiveReadingDom(
    translations,
    mode,
    backgroundStyle,
    outerEffects,
    innerEffects,
    {
      sources: translationSources,
      findSource: findTranslationSource,
      installStyles: installPageStyles,
      log: emitDebugLog
    }
  );
}

function translationWriteFailed(id: string, source: HTMLElement | null): void {
  const record = translationSources.get(id);
  showPageTooltip(
    contentText("translationWriteFailed"),
    source
      ? source.getBoundingClientRect()
      : record?.element.isConnected
        ? record.element.getBoundingClientRect()
        : null
  );
}

function applyTranslations(
  translations: PageTranslation[],
  mode: PageTranslationMode = "bilingual",
  displayStyle: ImmersiveTranslationDisplayStyle = "default",
  effects: ImmersiveTranslationTextEffect[] = []
): number {
  return applyTranslationsDom(
    translations,
    mode,
    displayStyle,
    effects,
    {
      sources: translationSources,
      findSource: findTranslationSource,
      installStyles: installPageStyles,
      classNames: translationClassNames,
      displayStyle: translationDisplayStyle,
      textEffects: translationTextEffects,
      writeFailed: translationWriteFailed,
      clearSources: () => translationSources.clear()
    }
  );
}

function toggleImmersiveTranslationDisplayMode(): boolean {
  return toggleImmersiveTranslationDisplayModeDom({
    sources: translationSources,
    findSource: findTranslationSource,
    installStyles: installPageStyles,
    classNames: translationClassNames,
    displayStyle: translationDisplayStyle,
    textEffects: translationTextEffects,
    writeFailed: translationWriteFailed,
    clearSources: () => translationSources.clear()
  });
}

function restorePage(): void {
  restorePageDom({
    sources: translationSources,
    findSource: findTranslationSource,
    installStyles: installPageStyles,
    classNames: translationClassNames,
    displayStyle: translationDisplayStyle,
    textEffects: translationTextEffects,
    writeFailed: translationWriteFailed,
    clearSources: () => translationSources.clear()
  });
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
  const activeToolRef = useRef<ToolDefinition | null>(null);
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
  const runEdgeImmersiveTranslateRef = useRef<
    (
      scope?: ImmersiveTranslationRunScope,
      options?: { ignoreBusy?: boolean }
    ) => Promise<void>
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
      if (activeToolRef.current) return;
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
    activeToolRef.current = activeTool;
  }, [activeTool]);

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
  const defaultImmersiveContentScope = (): ImmersiveContentScope =>
    activeSettings?.defaultContextScope === "page" ? "page" : "article";
  const shortcutContextRunScope = (): ImmersiveTranslationRunScope | null => {
    if (immersiveShortcutContextScope === "none") return null;
    return immersiveShortcutContextScope ?? defaultImmersiveContentScope();
  };
  const immersiveCollectingLabel = (scope: ImmersiveTranslationRunScope) =>
    scope === "paragraph" || scope === "selection"
      ? t("collectingSelection")
      : scope === "article"
        ? t("collectingCurrentBody")
        : t("collectingPageBody");
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
    activeSettings?.inputAutoReplyEnabled ?? false;
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
  const edgeQuickToolsEnabled = activeSettings?.edgeQuickToolsEnabled ?? false;
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
	        (hoverDefinitionShortcut !== "off" &&
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
	      if (hoverDefinitionShortcut !== "off") {
	        hoverDefinitionShortcutPressedRef.current =
	          modifierShortcutFromEvent(event) === hoverDefinitionShortcut;
	      }
	      const pointer = { clientX: event.clientX, clientY: event.clientY };
	      hoverDefinitionPointerRef.current = pointer;
	      schedule(pointer);
	    };
	    const handleKeyDown = (event: KeyboardEvent) => {
	      if (hoverDefinitionShortcut === "off" || !isModifierShortcutKey(event)) {
	        return;
	      }
	      hoverDefinitionShortcutPressedRef.current =
	        modifierShortcutFromEvent(event) === hoverDefinitionShortcut;
	      if (!hoverDefinitionShortcutPressedRef.current) {
	        hide();
	        return;
	      }
	      if (hoverDefinitionPointerRef.current) {
	        schedule(hoverDefinitionPointerRef.current);
	      }
	    };
	    const handleKeyUp = (event: KeyboardEvent) => {
	      if (hoverDefinitionShortcut === "off" || !isModifierShortcutKey(event)) {
	        return;
	      }
	      hoverDefinitionShortcutPressedRef.current =
	        modifierShortcutFromEvent(event) === hoverDefinitionShortcut;
	      if (!hoverDefinitionShortcutPressedRef.current) hide();
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
      wrapper.dataset.webmindBlockId = nextTranslationBlockId();
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
          contextScope: "selection",
          text: snapshot.text,
          pageTitle: document.title,
          pageUrl: location.href
        };
        try {
          await runtimeRequest("panel.open", { action: pending });
          setActiveTool(null);
          setResult("");
          setError("");
          setSnapshot(null);
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
    requestedScope?: ImmersiveTranslationRunScope,
    options: { ignoreBusy?: boolean } = {}
  ) => {
    const scope = requestedScope ?? defaultImmersiveContentScope();
    if (edgeBusy && !options.ignoreBusy) return;
    setEdgeBusy(true);
    showEdgeResult("");
    showImmersiveProgress(3, immersiveCollectingLabel(scope));
    try {
      if (!translationProfile) throw new Error(t("modelEngineRequired"));
      const blocks =
        scope === "paragraph"
          ? prepareParagraphTranslationBlocks(lastPointerTarget, "", {
              preserveRichText: true
            })
          : prepareTranslationBlocks(scope, "", {
              preserveRichText: true
            });
      if (!blocks.length) throw new Error(t("noTranslatableBlocks"));
      const { completed } = await runImmersiveTranslationWorkflow({
        blocks,
        batchSize: IMMERSIVE_TRANSLATION_BATCH_SIZE,
        concurrency:
          scope === "paragraph" ? 1 : IMMERSIVE_TRANSLATION_CONCURRENCY,
        requestTranslations: async (requestBlocks) => {
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
        },
        applyTranslations: (translations) =>
          applyTranslations(
            translations,
            activeSettings?.immersiveTranslationStyle ?? "bilingual",
            activeSettings?.immersiveTranslationDisplayStyle ?? "default",
            activeSettings?.immersiveTranslationTextEffects ?? []
          ),
        invalidTranslationsError: () => new Error(contentText("jsonArrayInvalid")),
        applyCountMismatchError: () => new Error(t("translationWriteFailed")),
        onBatchStart: ({ batch, processedBefore }) => {
          showImmersiveProgress(
            (processedBefore / blocks.length) * 92 + 5,
            `${t("translatingPageProgress")} ${Math.min(processedBefore + batch.length, blocks.length)}/${blocks.length}`
          );
        },
        onBatchApplied: ({ completed }) => {
          showImmersiveProgress(
            (Math.min(completed, blocks.length) / blocks.length) * 92 + 5,
            `${t("translationWritten")} ${completed}`
          );
        }
      });
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
    requestedScope?: ImmersiveReadingRunScope,
    options: { ignoreBusy?: boolean } = {}
  ) => {
    const scope = requestedScope ?? defaultImmersiveContentScope();
    if (edgeBusy && !options.ignoreBusy) return;
    setEdgeBusy(true);
    emitDebugLog(`[workflow] immersive reading edge start scope=${scope}`);
    showEdgeResult("");
    showImmersiveProgress(
      3,
      immersiveCollectingLabel(scope),
      true,
      false,
      t("immersiveReading")
    );
    try {
      if (!activeSettings) throw new Error(t("modelEngineRequired"));
      emitDebugLog("[workflow] immersive reading edge collect text blocks");
      const blocks =
        scope === "paragraph"
          ? prepareParagraphTranslationBlocks(lastPointerTarget, "", {
              preserveRichText: false,
              maxVisibleTextLength: 2400
            })
          : prepareTranslationBlocks(scope, "", {
              preserveRichText: false,
              maxVisibleTextLength: 2400
            });
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
      let appliedDuringProcessing: number | null = null;
      if (useModelPage) {
        const result = await runImmersiveReadingModelPageWorkflow({
          blocks,
          batchSize: IMMERSIVE_TRANSLATION_BATCH_SIZE,
          concurrency: IMMERSIVE_TRANSLATION_CONCURRENCY,
          requestTranslations: requestModelReading,
          applyTranslations: (orderedTranslations) =>
            applyImmersiveReading(
              orderedTranslations,
              activeSettings.immersiveReadingMode,
              activeSettings.immersiveReadingBackgroundStyle,
              activeSettings.immersiveReadingOuterTextEffects,
              activeSettings.immersiveReadingInnerTextEffects
            ),
          onBatchApplied: ({ batch, processedBefore, appliedCount }) => {
            showImmersiveProgress(
              (Math.min(processedBefore + batch.length, blocks.length) /
                blocks.length) *
                92 +
                5,
              `${t("immersiveReadingApplied")} ${appliedCount}`,
              true,
              false,
              t("immersiveReading")
            );
          }
        });
        translations = result.translations;
        appliedDuringProcessing = result.appliedCount;
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
      let completed = appliedDuringProcessing ?? 0;
      if (appliedDuringProcessing === null) {
        translations = orderTranslationsByBlocks(translations, blocks);
        completed = applyImmersiveReading(
          translations,
          activeSettings.immersiveReadingMode,
          activeSettings.immersiveReadingBackgroundStyle,
          activeSettings.immersiveReadingOuterTextEffects,
          activeSettings.immersiveReadingInnerTextEffects
        );
      }
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
          await runEdgeImmersiveTranslate(undefined, { ignoreBusy: true });
        }
        if (shouldRead) {
          await runEdgeImmersiveReading(undefined, { ignoreBusy: true });
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
	    type ImmersiveShortcutAction = {
	      shortcut: ImmersiveShortcut;
	      run: () => void;
	    };
	    const preventShortcut = (event: KeyboardEvent) => {
	      event.preventDefault();
	      event.stopPropagation();
    };
    const triggerShortcut = (scope?: ImmersiveTranslationRunScope) => {
      const now = Date.now();
      if (now < immersiveShortcutCooldownRef.current) return;
	      immersiveShortcutCooldownRef.current = now + 700;
	      void runEdgeImmersiveTranslateRef.current(scope);
	    };
	    const triggerTranslationContextShortcut = () => {
	      const scope = shortcutContextRunScope();
	      if (!scope) return;
	      triggerShortcut(scope);
	    };
	    const triggerModeToggleShortcut = () => {
	      if (translationProgress?.active) return;
      const now = Date.now();
      if (now < immersiveShortcutCooldownRef.current) return;
	      if (!toggleImmersiveTranslationDisplayMode()) return;
	      immersiveShortcutCooldownRef.current = now + 700;
	    };
	    const triggerReadingShortcut = (scope: ImmersiveReadingRunScope) => {
	      const now = Date.now();
	      if (now < immersiveShortcutCooldownRef.current) return;
	      immersiveShortcutCooldownRef.current = now + 700;
	      void runEdgeImmersiveReading(scope);
	    };
	    const triggerReadingContextShortcut = () => {
	      const scope = shortcutContextRunScope();
	      if (!scope) return;
	      triggerReadingShortcut(scope);
	    };
	    const actions: ImmersiveShortcutAction[] = [
	      {
	        shortcut: activeSettings.immersiveTranslationParagraphShortcut,
	        run: () => triggerShortcut("paragraph")
	      },
	      {
	        shortcut: activeSettings.immersiveTranslationPageShortcut,
	        run: triggerTranslationContextShortcut
	      },
	      {
	        shortcut: activeSettings.immersiveTranslationModeToggleShortcut,
	        run: triggerModeToggleShortcut
	      },
	      {
	        shortcut: activeSettings.immersiveReadingParagraphShortcut,
	        run: () => triggerReadingShortcut("paragraph")
	      },
	      {
	        shortcut: activeSettings.immersiveReadingContextShortcut,
	        run: triggerReadingContextShortcut
	      }
	    ].filter((action) => action.shortcut !== "off");
	    if (!actions.length) return;
	    let shortcutTimer: number | null = null;
	    let scheduledAction: ImmersiveShortcutAction | null = null;
	    const clearShortcutTimer = () => {
	      if (shortcutTimer !== null) {
	        window.clearTimeout(shortcutTimer);
	        shortcutTimer = null;
	      }
	    };
	    const actionForShortcut = (
	      shortcut: Exclude<ImmersiveShortcut, "off">
	    ): ImmersiveShortcutAction | null =>
	      actions
	        .filter((action) => action.shortcut === shortcut)
	        .sort(
	          (left, right) =>
	            shortcutWeight(right.shortcut) - shortcutWeight(left.shortcut)
	        )[0] ?? null;
	    const runScheduledAction = () => {
	      const action = scheduledAction;
	      scheduledAction = null;
	      clearShortcutTimer();
	      action?.run();
	    };
	    const scheduleAction = (
	      action: ImmersiveShortcutAction,
	      event: KeyboardEvent
	    ) => {
	      preventShortcut(event);
	      scheduledAction = action;
	      clearShortcutTimer();
	      shortcutTimer = window.setTimeout(runScheduledAction, 160);
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
	      if (!isModifierShortcutKey(event)) {
	        if (event.type === "keydown") {
	          clearShortcutTimer();
	          scheduledAction = null;
	        }
	        return;
	      }
	      if (event.type === "keyup") {
	        if (scheduledAction) {
	          preventShortcut(event);
	          runScheduledAction();
	        } else {
	          clearShortcutTimer();
	        }
	        return;
	      }
	      const shortcut = modifierShortcutFromEvent(event);
	      if (!shortcut) {
	        clearShortcutTimer();
	        scheduledAction = null;
	        return;
	      }
	      const action = actionForShortcut(shortcut);
	      if (!action) {
	        clearShortcutTimer();
	        scheduledAction = null;
	        return;
	      }
	      scheduleAction(action, event);
	    };
	    window.addEventListener("keydown", handleShortcut, true);
	    window.addEventListener("keyup", handleShortcut, true);
	    return () => {
	      window.removeEventListener("keydown", handleShortcut, true);
	      window.removeEventListener("keyup", handleShortcut, true);
	      clearShortcutTimer();
	      scheduledAction = null;
	    };
	  }, [activeSettings, translationProgress?.active]);

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
        capturePromise,
        contentText("readImageUrlFailed")
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
              edgeError || <Markdown content={edgeResult} />
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
            {resultBusy ? (
              <div className="md-spinner" />
            ) : error ? (
              error
            ) : (
              <Markdown content={result} />
            )}
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
  const selectionOverlayShortcutActive = (
    event?: KeyboardEvent | MouseEvent | PointerEvent
  ) => {
    const shortcut = settings?.selectionOverlayShortcut ?? "off";
    if (shortcut === "off") return true;
    if (event) return modifierShortcutFromEvent(event) === shortcut;
    return selectionOverlayShortcutPressed;
  };
  const scheduleSelectionOverlayRefresh = (target: EventTarget | null) => {
    if (selectionOverlayTimer !== null) {
      window.clearTimeout(selectionOverlayTimer);
    }
    selectionOverlayTimer = window.setTimeout(() => {
      selectionOverlayTimer = null;
      if (!selectionOverlayEnabled() || !selectionOverlayShortcutActive()) {
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
    const shortcutEvent =
      event instanceof KeyboardEvent ||
      event instanceof MouseEvent ||
      event instanceof PointerEvent
        ? event
        : undefined;
    if (
      settings &&
      settings.selectionOverlayShortcut !== "off" &&
      shortcutEvent
    ) {
      selectionOverlayShortcutPressed =
        selectionOverlayShortcutActive(shortcutEvent);
    }
    if (
      !selectionOverlayEnabled() ||
      !selectionOverlayShortcutActive(shortcutEvent)
    ) {
      showSelection?.(null);
      return;
    }
    scheduleSelectionOverlayRefresh(event.target);
  };

  document.addEventListener("selectionchange", () => {
    scheduleSelectionContextReport();
    if (selectionOverlayEnabled() && selectionOverlayShortcutActive()) {
      scheduleSelectionOverlayRefresh(lastPointerTarget);
    } else {
      showSelection?.(null);
    }
  });
  window.addEventListener(
    "keydown",
    (event) => {
      if (
        !settings ||
        settings.selectionOverlayShortcut === "off" ||
        !isModifierShortcutKey(event)
      ) {
        return;
      }
      selectionOverlayShortcutPressed = selectionOverlayShortcutActive(event);
      if (selectionOverlayShortcutPressed && selectionOverlayEnabled()) {
        scheduleSelectionOverlayRefresh(lastPointerTarget);
      } else {
        showSelection?.(null);
      }
    },
    true
  );
  window.addEventListener(
    "keyup",
    (event) => {
      if (
        !settings ||
        settings.selectionOverlayShortcut === "off" ||
        !isModifierShortcutKey(event)
      ) {
        return;
      }
      selectionOverlayShortcutPressed = selectionOverlayShortcutActive(event);
      if (!selectionOverlayShortcutPressed) showSelection?.(null);
    },
    true
  );
  window.addEventListener("blur", () => {
    selectionOverlayShortcutPressed = false;
    if (settings && settings.selectionOverlayShortcut !== "off") {
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
    if (!selectionOverlayEnabled() || !selectionOverlayShortcutActive()) {
      showSelection?.(null);
    } else {
      scheduleSelectionOverlayRefresh(lastPointerTarget);
    }
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const run = async () => {
    if (message.type === "immersive.contextScope.set") {
      immersiveShortcutContextScope =
        message.scope === "none" ||
        message.scope === "page" ||
        message.scope === "article" ||
        message.scope === "selection"
          ? message.scope
          : null;
      return { ok: true };
    }
    if (message.type === "page.context") {
      return extractPageContext(
        Boolean(message.ignoreSelection),
        settings?.interfaceLanguage,
        message.scope === "article" ? "article" : "page"
      );
    }
    if (message.type === "page.article.pick") {
      return startManualArticleSelection(settings?.interfaceLanguage);
    }
    if (message.type === "page.article.restore") {
      return restoreAutomaticArticleSelection(settings?.interfaceLanguage);
    }
    if (message.type === "page.translation.prepare") {
      return prepareTranslationBlocks(
        message.scope === "selection"
          ? "selection"
          : message.scope === "article"
            ? "article"
            : "page",
        String(message.text ?? ""),
        {
          preserveRichText: message.purpose === "translation" ? true : false,
          maxVisibleTextLength: message.purpose === "reading" ? 2400 : 900
        }
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
          readingBackgroundStyle(message.backgroundStyle),
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
