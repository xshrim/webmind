import { uiText } from "../shared/i18n";
import { searchQueryFromUrl } from "../shared/searchEngines";
import type {
  AppSettings,
  ArticleExtractionRule,
  ArticlePreviewBlock,
  ArticleScoreMetrics,
  ArticleSource,
  ArticleSummary,
  PageContext,
  WebSearchResult
} from "../shared/types";
import { cleanCitationExplanationText, truncateText } from "../shared/utils";
import {
  markdownFromElement,
  pageSelectionMarkdown,
  pageSelectionText,
  textFromElement
} from "./selection";
import { urlMatchesWhitelist } from "./urlRules";
import {
  createArticleExtractionRunner,
  throwIfArticleExtractionAborted
} from "./articleExtractionRunner";
import {
  ArticleRootCache,
  type ArticleRootCacheStatus,
  articleExtractionRuleSignature
} from "./articleRootCache";

export function searchQuery(): string | null {
  return searchQueryFromUrl(location.href);
}

export function searchResultsContext(
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

export function linkCitationMarkers(
  content: string,
  results: WebSearchResult[]
): string {
  return content.replace(
    /\[((?:搜索|搜尋|Search|search|検索|검색)\s*(\d+)|(\d+))\]/g,
    (
      match,
      label: string,
      namedIndex: string | undefined,
      bareIndex: string | undefined,
      offset: number,
      source: string
    ) => {
      if (source[offset + match.length] === "(") return match;
      const index = Number(namedIndex ?? bareIndex) - 1;
      const result = results[index];
      if (!result?.url) return match;
      return `[${label}](${markdownUrl(result.url)})`;
    }
  );
}

interface ArticlePreviewSourceBlock {
  text: string;
  markdown?: string;
  element: HTMLElement;
  exclusionElement?: HTMLElement;
}

interface ArticleRootSelection {
  element: HTMLElement;
  source: ArticleSource;
  selector?: string;
}

interface ArticleSnapshot {
  title?: string;
  text: string;
  markdown?: string;
  description?: string;
  summary?: ArticleSummary;
  preview?: ArticlePreviewBlock[];
}

interface ArticleSelectionPerformance {
  candidateCount: number;
  rootCache: ArticleRootCacheStatus;
}

interface ArticleExtractionCache {
  visible: WeakMap<HTMLElement, boolean>;
  text: WeakMap<HTMLElement, string>;
  readableCompactDescendantWithNoise: WeakMap<HTMLElement, boolean>;
  readableCompactDescendantWithoutNoise: WeakMap<HTMLElement, boolean>;
}

export interface ArticleExtractionOptions {
  replaceable?: boolean;
  onPerformance?: (message: string) => void;
}

let manualArticleRoot: HTMLElement | null = null;
let editedArticleRoot: HTMLElement | null = null;
let articlePickerSession: Promise<PageContext | null> | null = null;
let cancelArticlePickerSession: (() => void) | null = null;
let articlePreviewIdCounter = 0;
let activeArticleExtractionCache: ArticleExtractionCache | null = null;
let retainedPageSelectionTextValue = "";
const articleExtractionRunner = createArticleExtractionRunner();
let automaticArticleRootObserver: MutationObserver | null = null;
const automaticArticleRootCache = new ArticleRootCache<ArticleRootSelection>(
  () => {
    automaticArticleRootObserver?.disconnect();
    automaticArticleRootObserver = null;
  }
);

const articlePreviewTargets = new Map<string, HTMLElement>();
const articlePreviewExclusionTargets = new Map<string, HTMLElement>();
const removedArticleBlockTextKeys = new Set<string>();

export function setRetainedPageSelectionText(text: string): void {
  retainedPageSelectionTextValue = text.trim();
}

function retainedPageSelectionText(): string | undefined {
  return retainedPageSelectionTextValue || undefined;
}

const ARTICLE_ROOT_SELECTOR = [
  "article",
  "main",
  "[role='main']",
  "[itemprop='articleBody']",
  "[data-testid*='article' i]",
  "[data-testid*='content' i]",
  "[data-testid*='post' i]",
  "[data-testid*='story' i]",
  "[data-testid*='readme' i]",
  "[class*='article' i]",
  "[class*='content' i]",
  "[class*='post' i]",
  "[class*='story' i]",
  "[class*='entry' i]",
  "[class*='readme' i]",
  "[class*='markdown' i]",
  "[id*='article' i]",
  "[id*='content' i]",
  "[id*='post' i]",
  "[id*='story' i]",
  "[id*='readme' i]",
  "[id*='markdown' i]"
].join(", ");
const ARTICLE_BLOCK_SELECTOR = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "blockquote",
  "pre",
  "table",
  "ul",
  "ol",
  "dl",
  "figure",
  "figcaption",
  "details",
  "[role='heading']",
  "[role='paragraph']"
].join(", ");
const ARTICLE_HEADING_SELECTOR =
  "h1, h2, [role='heading'][aria-level='1'], [role='heading'][aria-level='2']";
const ARTICLE_CONTAINER_FALLBACK_SELECTOR =
  "article, main, section, div, td, th, [role='main'], [role='article']";
const ARTICLE_TEXT_IGNORED_SELECTOR =
  "script, style, noscript, template, svg, canvas, [hidden], [aria-hidden='true'], .webmind-root, .webmind-translation, .webmind-reading, .webmind-immersive-reading-token, .webmind-article-picker-ui";
const ARTICLE_NOISE_SELECTOR =
  "nav, header, footer, aside, form, dialog, menu";
const ARTICLE_PREVIEW_HIGHLIGHT_STYLE_ID =
  "webmind-article-preview-highlight-style";
const ARTICLE_ROOT_CANDIDATE_LIMIT = 80;
const ARTICLE_BLOCK_CANDIDATE_LIMIT = 420;
const SHADOW_HOST_SCAN_LIMIT = 800;
const MANUAL_ARTICLE_MIN_CHARS = 1;
const AUTO_ARTICLE_MIN_CHARS = 40;

function waitForPageIdle(timeout = 140): Promise<void> {
  return new Promise((resolve) => {
    const requestIdle = window.requestIdleCallback?.bind(window);
    if (requestIdle) {
      requestIdle(() => resolve(), { timeout });
      return;
    }
    window.setTimeout(resolve, 0);
  });
}

type ArticleExtractionCheckpoint = (force?: boolean) => Promise<void>;

function createArticleExtractionCheckpoint(
  signal?: AbortSignal,
  budgetMs = 6
): ArticleExtractionCheckpoint {
  let sliceStarted = performance.now();
  return async (force = false) => {
    if (signal) throwIfArticleExtractionAborted(signal);
    if (!force && performance.now() - sliceStarted < budgetMs) return;
    const scheduler = (
      globalThis as typeof globalThis & {
        scheduler?: { yield?: () => Promise<void> };
      }
    ).scheduler;
    if (scheduler?.yield) {
      await scheduler.yield();
    } else {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
    if (signal) throwIfArticleExtractionAborted(signal);
    sliceStarted = performance.now();
  };
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function preserveArticleBlockText(value: string): string {
  return cleanCitationExplanationText(value)
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function normalizedText(value: string): string {
  return preserveArticleBlockText(value).replace(/\s+/g, " ").trim();
}

function articleBlockTextKey(value: string): string {
  return normalizedText(value).toLowerCase();
}

function textLength(value: string): number {
  return value.replace(/\s+/g, "").length;
}

function articleTextFromBlocks(blocks: ArticlePreviewSourceBlock[]): string {
  return blocks
    .map((block) => preserveArticleBlockText(block.text))
    .filter((text) => textLength(text) > 0)
    .join("\n\n");
}

function withArticleExtractionCache<T>(callback: () => T): T {
  if (activeArticleExtractionCache) return callback();
  activeArticleExtractionCache = {
    visible: new WeakMap(),
    text: new WeakMap(),
    readableCompactDescendantWithNoise: new WeakMap(),
    readableCompactDescendantWithoutNoise: new WeakMap()
  };
  try {
    return callback();
  } finally {
    activeArticleExtractionCache = null;
  }
}

async function withArticleExtractionCacheAsync<T>(
  callback: () => Promise<T>
): Promise<T> {
  if (activeArticleExtractionCache) return callback();
  activeArticleExtractionCache = {
    visible: new WeakMap(),
    text: new WeakMap(),
    readableCompactDescendantWithNoise: new WeakMap(),
    readableCompactDescendantWithoutNoise: new WeakMap()
  };
  try {
    return await callback();
  } finally {
    activeArticleExtractionCache = null;
  }
}

function isElementVisible(element: HTMLElement): boolean {
  const cached = activeArticleExtractionCache?.visible.get(element);
  if (typeof cached === "boolean") return cached;
  const setCached = (value: boolean) => {
    activeArticleExtractionCache?.visible.set(element, value);
    return value;
  };
  if (element.closest(ARTICLE_TEXT_IGNORED_SELECTOR)) return setCached(false);
  const style = getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number(style.opacity) === 0
  ) {
    return setCached(false);
  }
  return setCached(element.getClientRects().length > 0);
}

function visibleTextFromElement(element: HTMLElement): string {
  const cached = activeArticleExtractionCache?.text.get(element);
  if (typeof cached === "string") return cached;

  const parts: string[] = [];
  const visit = (node: Node) => {
    if (node instanceof Text) {
      const parent = node.parentElement;
      if (!parent || !isElementVisible(parent)) return;
      parts.push(node.textContent ?? "");
      return;
    }
    if (!(node instanceof HTMLElement) || !isElementVisible(node)) return;
    if (node.tagName === "BR") {
      parts.push("\n");
      return;
    }
    if (node.tagName === "PRE") {
      parts.push(node.innerText || node.textContent || "");
      parts.push("\n");
      return;
    }
    for (const child of Array.from(node.childNodes)) visit(child);
    if (/^(?:ADDRESS|ARTICLE|BLOCKQUOTE|DETAILS|DIV|FIGCAPTION|FIGURE|H[1-6]|LI|MAIN|P|SECTION)$/.test(node.tagName)) {
      parts.push("\n");
    } else if (node.tagName === "TR") {
      parts.push("\n");
    } else if (/^(?:DD|DT)$/.test(node.tagName)) {
      parts.push("\n");
    } else if (/^(?:TD|TH)$/.test(node.tagName)) {
      parts.push("\t");
    }
  };

  visit(element);
  const text = preserveArticleBlockText(parts.join(""));
  activeArticleExtractionCache?.text.set(element, text);
  return text;
}

async function visibleTextFromElementAsync(
  element: HTMLElement,
  checkpoint: ArticleExtractionCheckpoint
): Promise<string> {
  const cached = activeArticleExtractionCache?.text.get(element);
  if (typeof cached === "string") return cached;
  const parts: string[] = [];
  const stack: Array<{ node: Node; exit: boolean }> = [
    { node: element, exit: false }
  ];
  while (stack.length) {
    const current = stack.pop();
    if (!current) break;
    const { node, exit } = current;
    if (node instanceof Text) {
      const parent = node.parentElement;
      if (parent && isElementVisible(parent)) {
        parts.push(node.textContent ?? "");
      }
      await checkpoint();
      continue;
    }
    if (!(node instanceof HTMLElement) || !isElementVisible(node)) {
      await checkpoint();
      continue;
    }
    if (exit) {
      if (/^(?:ADDRESS|ARTICLE|BLOCKQUOTE|DETAILS|DIV|FIGCAPTION|FIGURE|H[1-6]|LI|MAIN|P|SECTION)$/.test(node.tagName)) {
        parts.push("\n");
      } else if (node.tagName === "TR" || /^(?:DD|DT)$/.test(node.tagName)) {
        parts.push("\n");
      } else if (/^(?:TD|TH)$/.test(node.tagName)) {
        parts.push("\t");
      }
      await checkpoint();
      continue;
    }
    if (node.tagName === "BR") {
      parts.push("\n");
      await checkpoint();
      continue;
    }
    if (node.tagName === "PRE") {
      parts.push(node.innerText || node.textContent || "", "\n");
      await checkpoint();
      continue;
    }
    stack.push({ node, exit: true });
    const children = Array.from(node.childNodes);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: children[index], exit: false });
    }
    await checkpoint();
  }
  const text = preserveArticleBlockText(parts.join(""));
  activeArticleExtractionCache?.text.set(element, text);
  return text;
}

function cssEscapeIdentifier(value: string): string {
  return globalThis.CSS?.escape
    ? globalThis.CSS.escape(value)
    : value.replace(/(^-?\d)|[^a-zA-Z0-9_-]/g, (match) => `\\${match}`);
}

function selectorSegment(element: HTMLElement): {
  segment: string;
  terminal: boolean;
} {
  const tag = element.tagName.toLowerCase();
  if (element.id) {
    return {
      segment: `${tag}#${cssEscapeIdentifier(element.id)}`,
      terminal: true
    };
  }
  const className = Array.from(element.classList)
    .filter((item) => !item.startsWith("webmind-"))
    .slice(0, 3)
    .map((item) => `.${cssEscapeIdentifier(item)}`)
    .join("");
  const siblings = element.parentElement
    ? Array.from(element.parentElement.children).filter(
        (item) => item.tagName === element.tagName
      )
    : [];
  const nth =
    siblings.length > 1
      ? `:nth-of-type(${siblings.indexOf(element) + 1})`
      : "";
  return {
    segment: `${tag}${className}${nth}`,
    terminal: tag === "body"
  };
}

function selectorHint(element?: HTMLElement): string | undefined {
  if (!element) return undefined;
  const segments: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== document.documentElement) {
    const { segment, terminal } = selectorSegment(current);
    segments.unshift(segment);
    if (terminal) break;
    current = current.parentElement;
  }
  return segments.join(" > ");
}

function sameOriginIframeBodies(): HTMLElement[] {
  const bodies: HTMLElement[] = [];
  document.querySelectorAll("iframe").forEach((iframe) => {
    try {
      const body = iframe.contentDocument?.body;
      if (body) bodies.push(body);
    } catch {
      // Cross-origin frames are outside the content script boundary.
    }
  });
  return bodies;
}

function queryOpenShadowSelector(selector: string): HTMLElement | null {
  const hosts = Array.from(document.querySelectorAll<HTMLElement>("*")).slice(
    0,
    SHADOW_HOST_SCAN_LIMIT
  );
  for (const host of hosts) {
    const match = host.shadowRoot?.querySelector<HTMLElement>(selector);
    if (match) return match;
  }
  return null;
}

function collectOpenShadowElements(root: ParentNode): HTMLElement[] {
  const elements: HTMLElement[] = [];
  Array.from(root.querySelectorAll<HTMLElement>("*"))
    .slice(0, SHADOW_HOST_SCAN_LIMIT)
    .forEach((element) => {
      if (!element.shadowRoot) return;
      elements.push(
        ...Array.from(
          element.shadowRoot.querySelectorAll<HTMLElement>(ARTICLE_ROOT_SELECTOR)
        )
      );
      elements.push(...collectOpenShadowElements(element.shadowRoot));
    });
  return elements;
}

function hasOpenShadowRoot(): boolean {
  const walker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
  let scanned = 0;
  let node = walker.nextNode();
  while (node && scanned < SHADOW_HOST_SCAN_LIMIT) {
    if (node instanceof HTMLElement && node.shadowRoot) return true;
    scanned += 1;
    node = walker.nextNode();
  }
  return false;
}

function isWebMindOwnedElement(element: Element): boolean {
  return Boolean(
    element.closest(
      "#webmind-root, .webmind-root, .webmind-translation, .webmind-reading, .webmind-immersive-reading-token, .webmind-article-picker-ui"
    )
  );
}

function isWebMindOwnedNode(node: Node): boolean {
  if (node instanceof Element) return isWebMindOwnedElement(node);
  return Boolean(node.parentElement && isWebMindOwnedElement(node.parentElement));
}

function classNamesWithoutWebMind(value: string | null): string[] {
  return (value ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((name) => !name.startsWith("webmind-"))
    .sort();
}

function isRelevantArticleRootMutation(mutation: MutationRecord): boolean {
  if (isWebMindOwnedNode(mutation.target)) return false;
  if (mutation.type === "attributes") {
    if (mutation.attributeName?.startsWith("data-webmind-")) return false;
    if (mutation.attributeName === "class") {
      const before = classNamesWithoutWebMind(mutation.oldValue);
      const after = classNamesWithoutWebMind(
        (mutation.target as Element).getAttribute("class")
      );
      return before.join("\n") !== after.join("\n");
    }
    return true;
  }
  if (mutation.type === "childList") {
    return [...mutation.addedNodes, ...mutation.removedNodes].some(
      (node) => !isWebMindOwnedNode(node)
    );
  }
  return true;
}

function observeAutomaticArticleRoot(): void {
  automaticArticleRootObserver?.disconnect();
  const body = document.body;
  if (!body) return;
  automaticArticleRootObserver = new MutationObserver((mutations) => {
    if (!mutations.some(isRelevantArticleRootMutation)) return;
    automaticArticleRootCache.invalidate();
  });
  automaticArticleRootObserver.observe(body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeOldValue: true
  });
}

function invalidateAutomaticArticleRootForPendingMutations(): void {
  const mutations = automaticArticleRootObserver?.takeRecords() ?? [];
  if (mutations.some(isRelevantArticleRootMutation)) {
    automaticArticleRootCache.invalidate();
  }
}

function elementForArticleRuleSelector(selector: string): HTMLElement | null {
  try {
    const element =
      document.querySelector<HTMLElement>(selector) ??
      queryOpenShadowSelector(selector);
    if (element instanceof HTMLIFrameElement) {
      return element.contentDocument?.body ?? null;
    }
    if (element) return element;
    for (const body of sameOriginIframeBodies()) {
      const frameMatch = body.querySelector<HTMLElement>(selector);
      if (frameMatch) return frameMatch;
    }
  } catch {
    return null;
  }
  return null;
}

function isArticleNoiseElement(element: HTMLElement): boolean {
  if (element.closest(ARTICLE_TEXT_IGNORED_SELECTOR)) return true;
  if (element.closest(ARTICLE_NOISE_SELECTOR)) return true;
  const metadata = [
    element.id,
    element.className,
    element.getAttribute("role"),
    element.getAttribute("aria-label"),
    ...Array.from(element.attributes).flatMap((attribute) =>
      attribute.name.startsWith("data-")
        ? [`${attribute.name} ${attribute.value}`]
        : []
    )
  ]
    .filter(Boolean)
    .join(" ");
  return /(^|\b)(ad|ads|advert|banner|cookie|footer|header|login|menu|modal|nav|newsletter|paywall|promo|recommend|related|share|sidebar|sponsor|subscribe|toolbar)(\b|[-_])/i.test(
    metadata
  );
}

function linkRatio(element: HTMLElement | undefined, text: string): number {
  const total = textLength(text);
  if (!total || !element) return 0;
  const linkText = Array.from(element.querySelectorAll("a"))
    .map((anchor) => anchor.textContent ?? "")
    .join(" ");
  return clamp(textLength(linkText) / total);
}

function linkRatioFromArticleBlocks(
  blocks: ArticlePreviewSourceBlock[],
  text: string
): number {
  const total = textLength(text);
  if (!total) return 0;
  const anchors = new Set<HTMLAnchorElement>();
  blocks.forEach((block) => {
    if (block.element instanceof HTMLAnchorElement) anchors.add(block.element);
    block.element
      .querySelectorAll<HTMLAnchorElement>("a")
      .forEach((anchor) => anchors.add(anchor));
  });
  const linkText = Array.from(anchors)
    .map((anchor) => anchor.textContent ?? "")
    .join(" ");
  return clamp(textLength(linkText) / total);
}

function elementMetadataText(element?: HTMLElement): string {
  if (!element) return "";
  return [
    element.id,
    element.className,
    element.getAttribute("role"),
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    ...Array.from(element.attributes).flatMap((attribute) =>
      attribute.name.startsWith("data-")
        ? [`${attribute.name} ${attribute.value}`]
        : []
    )
  ]
    .filter(Boolean)
    .join(" ");
}

function isStrongArticleContainer(element: HTMLElement): boolean {
  const metadata = elementMetadataText(element);
  return Boolean(
    element.matches("article, [itemprop='articleBody']") ||
      /(^|\b|[-_])(article|article-body|entry-content|markdown|markdown-body|post|post-body|prose|readme|story)(\b|[-_]|$)/i.test(
        metadata
      )
  );
}

function isGenericArticleContainer(element: HTMLElement): boolean {
  const metadata = elementMetadataText(element);
  return Boolean(
    isStrongArticleContainer(element) ||
      element.matches("main, [role='main']") ||
      /(^|\b|[-_])(body|content|doc|document|main|page-content)(\b|[-_]|$)/i.test(
        metadata
      )
  );
}

function embeddedNonArticleNoiseCount(element: HTMLElement): number {
  return element.querySelectorAll(
    [
      "aside",
      "nav",
      "footer",
      "header",
      "[role='complementary']",
      "[role='navigation']",
      "[class*='comment' i]",
      "[id*='comment' i]",
      "[class*='reply' i]",
      "[id*='reply' i]",
      "[class*='related' i]",
      "[id*='related' i]",
      "[class*='recommend' i]",
      "[id*='recommend' i]"
    ].join(", ")
  ).length;
}

function articleBlockNoiseCount(blocks: ArticlePreviewSourceBlock[]): number {
  return Array.from(new Set(blocks.map((block) => block.element))).filter(
    isArticleNoiseElement
  ).length;
}

function articleBlocksContainHeading(
  blocks: ArticlePreviewSourceBlock[]
): boolean {
  return blocks.some((block) => {
    const heading = block.element.matches(ARTICLE_HEADING_SELECTOR)
      ? block.element
      : block.element.querySelector<HTMLElement>(ARTICLE_HEADING_SELECTOR);
    return Boolean(
      heading &&
        isElementVisible(heading) &&
        textLength(block.text) >= 4
    );
  });
}

function articleHeadingInElement(element: HTMLElement): HTMLElement | null {
  const heading = element.matches(ARTICLE_HEADING_SELECTOR)
    ? element
    : element.querySelector<HTMLElement>(ARTICLE_HEADING_SELECTOR);
  if (
    heading &&
    !isArticleNoiseElement(heading) &&
    isElementVisible(heading) &&
    textLength(visibleTextFromElement(heading)) >= 4
  ) {
    return heading;
  }
  return null;
}

function precedingArticleHeading(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element;
  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    let sibling = current.previousElementSibling as HTMLElement | null;
    let inspectedSiblings = 0;
    while (sibling && inspectedSiblings < 6) {
      const heading = sibling.matches(ARTICLE_HEADING_SELECTOR)
        ? sibling
        : sibling.querySelector<HTMLElement>(ARTICLE_HEADING_SELECTOR);
      if (
        heading &&
        !isArticleNoiseElement(heading) &&
        isElementVisible(heading) &&
        textLength(visibleTextFromElement(heading)) >= 4
      ) {
        return heading;
      }
      sibling = sibling.previousElementSibling as HTMLElement | null;
      inspectedSiblings += 1;
    }
    current = current.parentElement;
  }
  return null;
}

function promoteRootToIncludeTitle(root: HTMLElement): HTMLElement {
  if (articleHeadingInElement(root)) return root;
  const heading = precedingArticleHeading(root);
  if (!heading) return root;
  let promoted = root.parentElement;
  while (
    promoted &&
    promoted !== document.body &&
    promoted !== document.documentElement &&
    !promoted.contains(heading)
  ) {
    promoted = promoted.parentElement;
  }
  if (!promoted || isArticleNoiseElement(promoted)) return root;

  const rootLength = textLength(visibleTextFromElement(root));
  const promotedLength = textLength(visibleTextFromElement(promoted));
  const headingLength = textLength(visibleTextFromElement(heading));
  const maxPromotedLength = Math.max(
    rootLength * 1.65,
    rootLength + headingLength + 320
  );
  const rootBlockCount = Math.max(
    1,
    articleSourceBlocks(root, SCORING_ARTICLE_BLOCK_OPTIONS).length
  );
  if (promotedLength > maxPromotedLength) return root;
  if (promoted.childElementCount > Math.max(10, rootBlockCount * 3)) return root;
  return promoted;
}

function configuredArticleRoot(
  rules: ArticleExtractionRule[] = []
): ArticleRootSelection | null {
  for (const rule of rules) {
    if (
      !rule.urlPattern ||
      !rule.selector ||
      !urlMatchesWhitelist(location.href, [rule.urlPattern])
    ) {
      continue;
    }
    const element = elementForArticleRuleSelector(rule.selector);
    if (!element || !isElementVisible(element)) continue;
    if (textLength(visibleTextFromElement(element)) < AUTO_ARTICLE_MIN_CHARS) {
      continue;
    }
    return {
      element,
      source: "rule",
      selector: rule.selector
    };
  }
  return null;
}

async function configuredArticleRootAsync(
  rules: ArticleExtractionRule[],
  checkpoint: ArticleExtractionCheckpoint
): Promise<ArticleRootSelection | null> {
  for (const rule of rules) {
    if (
      !rule.urlPattern ||
      !rule.selector ||
      !urlMatchesWhitelist(location.href, [rule.urlPattern])
    ) {
      continue;
    }
    const element = elementForArticleRuleSelector(rule.selector);
    if (!element || !isElementVisible(element)) continue;
    if (
      textLength(await visibleTextFromElementAsync(element, checkpoint)) <
      AUTO_ARTICLE_MIN_CHARS
    ) {
      continue;
    }
    return { element, source: "rule", selector: rule.selector };
  }
  return null;
}

interface ArticleBlockCollectionOptions {
  includeArticleNoise: boolean;
  includeMarkdown: boolean;
}

const SELECTED_ARTICLE_BLOCK_OPTIONS: ArticleBlockCollectionOptions = {
  includeArticleNoise: true,
  includeMarkdown: true
};
const SCORING_ARTICLE_BLOCK_OPTIONS: ArticleBlockCollectionOptions = {
  includeArticleNoise: false,
  includeMarkdown: false
};

function readableCompactDescendantCache(
  options: ArticleBlockCollectionOptions
): WeakMap<HTMLElement, boolean> | null {
  if (!activeArticleExtractionCache) return null;
  return options.includeArticleNoise
    ? activeArticleExtractionCache.readableCompactDescendantWithNoise
    : activeArticleExtractionCache.readableCompactDescendantWithoutNoise;
}

function isCompactArticleBlock(element: HTMLElement): boolean {
  return element.matches(ARTICLE_BLOCK_SELECTOR);
}

function shouldSkipArticleBlockElement(
  element: HTMLElement,
  options: ArticleBlockCollectionOptions
): boolean {
  if (!isElementVisible(element)) return true;
  if (isEditedArticleBlockExcluded(element)) return true;
  return !options.includeArticleNoise && isArticleNoiseElement(element);
}

function hasReadableCompactDescendant(
  element: HTMLElement,
  options: ArticleBlockCollectionOptions
): boolean {
  const cache = readableCompactDescendantCache(options);
  const cached = cache?.get(element);
  if (typeof cached === "boolean") return cached;
  const result = Array.from(element.querySelectorAll<HTMLElement>(ARTICLE_BLOCK_SELECTOR))
    .filter((child) => child !== element)
    .some(
      (child) =>
        !shouldSkipArticleBlockElement(child, options) &&
        textLength(visibleTextFromElement(child)) > 0
    );
  cache?.set(element, result);
  return result;
}

function shouldUseWholeElementAsBlock(
  element: HTMLElement,
  root: HTMLElement,
  options: ArticleBlockCollectionOptions
): boolean {
  const text = visibleTextFromElement(element);
  if (!text || textLength(text) === 0) return false;
  if (shouldSkipArticleBlockElement(element, options)) return false;
  if (isCompactArticleBlock(element)) return true;
  const hasCompactDescendant = hasReadableCompactDescendant(element, options);
  if (element === root && !hasCompactDescendant) return true;
  return (
    element.matches(ARTICLE_CONTAINER_FALLBACK_SELECTOR) &&
    !hasCompactDescendant
  );
}

function sourceBlockFromElement(
  element: HTMLElement,
  options: ArticleBlockCollectionOptions
): ArticlePreviewSourceBlock | null {
  const text = preserveArticleBlockText(visibleTextFromElement(element));
  if (textLength(text) === 0) return null;
  const block = {
    text,
    markdown: options.includeMarkdown ? markdownFromElement(element) : undefined,
    element,
    exclusionElement: element
  };
  return isArticleTextBlockExcluded(block) ? null : block;
}

function inlineSourceBlock(
  text: string,
  element: HTMLElement,
  options: ArticleBlockCollectionOptions
): ArticlePreviewSourceBlock | null {
  const normalized = preserveArticleBlockText(text);
  if (textLength(normalized) === 0) return null;
  const block = {
    text: normalized,
    markdown: options.includeMarkdown ? markdownFromElement(element) : undefined,
    element
  };
  return isArticleTextBlockExcluded(block) ? null : block;
}

function articleSourceBlocks(
  root: HTMLElement,
  options: ArticleBlockCollectionOptions = SELECTED_ARTICLE_BLOCK_OPTIONS
): ArticlePreviewSourceBlock[] {
  if (shouldSkipArticleBlockElement(root, options)) return [];
  if (shouldUseWholeElementAsBlock(root, root, options)) {
    const rootBlock = sourceBlockFromElement(root, options);
    return rootBlock ? [rootBlock] : [];
  }

  const blocks: ArticlePreviewSourceBlock[] = [];
  const appendBlock = (block: ArticlePreviewSourceBlock | null) => {
    if (block) blocks.push(block);
  };

  const visitContainer = (element: HTMLElement) => {
    if (shouldSkipArticleBlockElement(element, options)) return;

    let inlineParts: string[] = [];
    let inlineElement: HTMLElement = element;
    const flushInline = () => {
      appendBlock(inlineSourceBlock(inlineParts.join(""), inlineElement, options));
      inlineParts = [];
      inlineElement = element;
    };

    Array.from(element.childNodes).forEach((node) => {
      if (node instanceof Text) {
        const parent = node.parentElement;
        if (!parent || shouldSkipArticleBlockElement(parent, options)) return;
        if (!inlineParts.length) inlineElement = parent;
        inlineParts.push(node.textContent ?? "");
        return;
      }
      if (!(node instanceof HTMLElement)) return;
      if (node.tagName === "BR") {
        inlineParts.push("\n");
        return;
      }
      if (shouldSkipArticleBlockElement(node, options)) return;
      if (shouldUseWholeElementAsBlock(node, root, options)) {
        flushInline();
        appendBlock(sourceBlockFromElement(node, options));
        return;
      }
      if (hasReadableCompactDescendant(node, options)) {
        flushInline();
        visitContainer(node);
        return;
      }
      const text = visibleTextFromElement(node);
      if (textLength(text) > 0) {
        if (!inlineParts.length) inlineElement = node;
        inlineParts.push(text);
      }
    });
    flushInline();
  };

  visitContainer(root);
  return blocks;
}

async function hasReadableCompactDescendantAsync(
  element: HTMLElement,
  options: ArticleBlockCollectionOptions,
  checkpoint: ArticleExtractionCheckpoint
): Promise<boolean> {
  const cache = readableCompactDescendantCache(options);
  const cached = cache?.get(element);
  if (typeof cached === "boolean") return cached;
  const descendants = Array.from(
    element.querySelectorAll<HTMLElement>(ARTICLE_BLOCK_SELECTOR)
  );
  for (const child of descendants) {
    if (child === element || shouldSkipArticleBlockElement(child, options)) {
      await checkpoint();
      continue;
    }
    if (textLength(await visibleTextFromElementAsync(child, checkpoint)) > 0) {
      cache?.set(element, true);
      return true;
    }
  }
  cache?.set(element, false);
  return false;
}

async function shouldUseWholeElementAsBlockAsync(
  element: HTMLElement,
  root: HTMLElement,
  options: ArticleBlockCollectionOptions,
  checkpoint: ArticleExtractionCheckpoint
): Promise<boolean> {
  const text = await visibleTextFromElementAsync(element, checkpoint);
  if (!text || textLength(text) === 0) return false;
  if (shouldSkipArticleBlockElement(element, options)) return false;
  if (isCompactArticleBlock(element)) return true;
  const hasCompactDescendant = await hasReadableCompactDescendantAsync(
    element,
    options,
    checkpoint
  );
  if (element === root && !hasCompactDescendant) return true;
  return (
    element.matches(ARTICLE_CONTAINER_FALLBACK_SELECTOR) &&
    !hasCompactDescendant
  );
}

async function sourceBlockFromElementAsync(
  element: HTMLElement,
  options: ArticleBlockCollectionOptions,
  checkpoint: ArticleExtractionCheckpoint
): Promise<ArticlePreviewSourceBlock | null> {
  const text = preserveArticleBlockText(
    await visibleTextFromElementAsync(element, checkpoint)
  );
  if (textLength(text) === 0) return null;
  await checkpoint();
  const block = {
    text,
    markdown: options.includeMarkdown ? markdownFromElement(element) : undefined,
    element,
    exclusionElement: element
  };
  await checkpoint();
  return isArticleTextBlockExcluded(block) ? null : block;
}

async function articleSourceBlocksAsync(
  root: HTMLElement,
  options: ArticleBlockCollectionOptions,
  checkpoint: ArticleExtractionCheckpoint
): Promise<ArticlePreviewSourceBlock[]> {
  if (shouldSkipArticleBlockElement(root, options)) return [];
  if (
    await shouldUseWholeElementAsBlockAsync(root, root, options, checkpoint)
  ) {
    const rootBlock = await sourceBlockFromElementAsync(root, options, checkpoint);
    return rootBlock ? [rootBlock] : [];
  }

  const blocks: ArticlePreviewSourceBlock[] = [];
  const visitContainer = async (element: HTMLElement): Promise<void> => {
    if (shouldSkipArticleBlockElement(element, options)) return;
    let inlineParts: string[] = [];
    let inlineElement: HTMLElement = element;
    const flushInline = async () => {
      const text = preserveArticleBlockText(inlineParts.join(""));
      if (textLength(text) > 0) {
        await checkpoint();
        const block = {
          text,
          markdown: options.includeMarkdown
            ? markdownFromElement(inlineElement)
            : undefined,
          element: inlineElement
        };
        if (!isArticleTextBlockExcluded(block)) blocks.push(block);
      }
      inlineParts = [];
      inlineElement = element;
      await checkpoint();
    };

    for (const node of Array.from(element.childNodes)) {
      if (node instanceof Text) {
        const parent = node.parentElement;
        if (parent && !shouldSkipArticleBlockElement(parent, options)) {
          if (!inlineParts.length) inlineElement = parent;
          inlineParts.push(node.textContent ?? "");
        }
        await checkpoint();
        continue;
      }
      if (!(node instanceof HTMLElement)) continue;
      if (node.tagName === "BR") {
        inlineParts.push("\n");
        continue;
      }
      if (shouldSkipArticleBlockElement(node, options)) continue;
      if (
        await shouldUseWholeElementAsBlockAsync(
          node,
          root,
          options,
          checkpoint
        )
      ) {
        await flushInline();
        const block = await sourceBlockFromElementAsync(node, options, checkpoint);
        if (block) blocks.push(block);
        continue;
      }
      if (
        await hasReadableCompactDescendantAsync(node, options, checkpoint)
      ) {
        await flushInline();
        await visitContainer(node);
        continue;
      }
      const text = await visibleTextFromElementAsync(node, checkpoint);
      if (textLength(text) > 0) {
        if (!inlineParts.length) inlineElement = node;
        inlineParts.push(text);
      }
      await checkpoint();
    }
    await flushInline();
  };

  await visitContainer(root);
  return blocks;
}

function articleBlockElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    new Set(articleSourceBlocks(root).map((block) => block.element))
  );
}

function articleRootElements(root: ParentNode = document): HTMLElement[] {
  const roots = [
    ...Array.from(root.querySelectorAll<HTMLElement>(ARTICLE_ROOT_SELECTOR)),
    ...collectOpenShadowElements(root)
  ];
  return Array.from(new Set(roots))
    .filter((element) => !isArticleNoiseElement(element))
    .filter((element) => isElementVisible(element))
    .filter(
      (element) => textLength(visibleTextFromElement(element)) >= AUTO_ARTICLE_MIN_CHARS
    )
    .slice(0, ARTICLE_ROOT_CANDIDATE_LIMIT);
}

function continuousRootCandidates(root: ParentNode = document): HTMLElement[] {
  const blockEntries = Array.from(
    root.querySelectorAll<HTMLElement>(ARTICLE_BLOCK_SELECTOR)
  )
    .filter((element) => !isArticleNoiseElement(element))
    .filter((element) => isElementVisible(element))
    .map((element, order) => ({
      element,
      order,
      text: normalizedText(visibleTextFromElement(element))
    }))
    .filter((entry) => textLength(entry.text) >= 8)
    .slice(0, ARTICLE_BLOCK_CANDIDATE_LIMIT);

  const summaries = new Map<
    HTMLElement,
    { blocks: number; textLength: number; first: number; last: number }
  >();
  blockEntries.forEach((entry) => {
    let ancestor = entry.element.parentElement;
    let depth = 0;
    while (
      ancestor &&
      ancestor !== document.body &&
      ancestor !== document.documentElement &&
      depth < 7
    ) {
      if (!isArticleNoiseElement(ancestor) && isElementVisible(ancestor)) {
        const summary = summaries.get(ancestor) ?? {
          blocks: 0,
          textLength: 0,
          first: entry.order,
          last: entry.order
        };
        summary.blocks += 1;
        summary.textLength += textLength(entry.text);
        summary.first = Math.min(summary.first, entry.order);
        summary.last = Math.max(summary.last, entry.order);
        summaries.set(ancestor, summary);
      }
      ancestor = ancestor.parentElement;
      depth += 1;
    }
  });

  return Array.from(summaries.entries())
    .filter(([, summary]) => summary.blocks >= 2 && summary.textLength >= 80)
    .sort((left, right) => {
      const score = (summary: (typeof left)[1]) =>
        summary.textLength +
        summary.blocks * 60 +
        (summary.blocks / Math.max(1, summary.last - summary.first + 1)) * 240;
      return score(right[1]) - score(left[1]);
    })
    .slice(0, 16)
    .map(([element]) => element);
}

async function articleRootElementsAsync(
  root: ParentNode,
  checkpoint: ArticleExtractionCheckpoint
): Promise<HTMLElement[]> {
  const roots = Array.from(
    new Set([
      ...Array.from(root.querySelectorAll<HTMLElement>(ARTICLE_ROOT_SELECTOR)),
      ...collectOpenShadowElements(root)
    ])
  );
  const candidates: HTMLElement[] = [];
  for (const element of roots) {
    if (
      !isArticleNoiseElement(element) &&
      isElementVisible(element) &&
      textLength(await visibleTextFromElementAsync(element, checkpoint)) >=
        AUTO_ARTICLE_MIN_CHARS
    ) {
      candidates.push(element);
      if (candidates.length >= ARTICLE_ROOT_CANDIDATE_LIMIT) break;
    }
    await checkpoint();
  }
  return candidates;
}

async function continuousRootCandidatesAsync(
  root: ParentNode,
  checkpoint: ArticleExtractionCheckpoint
): Promise<HTMLElement[]> {
  const elements = Array.from(
    root.querySelectorAll<HTMLElement>(ARTICLE_BLOCK_SELECTOR)
  );
  const blockEntries: Array<{
    element: HTMLElement;
    order: number;
    text: string;
  }> = [];
  for (let order = 0; order < elements.length; order += 1) {
    const element = elements[order];
    if (!isArticleNoiseElement(element) && isElementVisible(element)) {
      const text = normalizedText(
        await visibleTextFromElementAsync(element, checkpoint)
      );
      if (textLength(text) >= 8) {
        blockEntries.push({ element, order, text });
        if (blockEntries.length >= ARTICLE_BLOCK_CANDIDATE_LIMIT) break;
      }
    }
    await checkpoint();
  }

  const summaries = new Map<
    HTMLElement,
    { blocks: number; textLength: number; first: number; last: number }
  >();
  for (const entry of blockEntries) {
    let ancestor = entry.element.parentElement;
    let depth = 0;
    while (
      ancestor &&
      ancestor !== document.body &&
      ancestor !== document.documentElement &&
      depth < 7
    ) {
      if (!isArticleNoiseElement(ancestor) && isElementVisible(ancestor)) {
        const summary = summaries.get(ancestor) ?? {
          blocks: 0,
          textLength: 0,
          first: entry.order,
          last: entry.order
        };
        summary.blocks += 1;
        summary.textLength += textLength(entry.text);
        summary.first = Math.min(summary.first, entry.order);
        summary.last = Math.max(summary.last, entry.order);
        summaries.set(ancestor, summary);
      }
      ancestor = ancestor.parentElement;
      depth += 1;
    }
    await checkpoint();
  }
  return Array.from(summaries.entries())
    .filter(([, summary]) => summary.blocks >= 2 && summary.textLength >= 80)
    .sort((left, right) => {
      const score = (summary: (typeof left)[1]) =>
        summary.textLength +
        summary.blocks * 60 +
        (summary.blocks / Math.max(1, summary.last - summary.first + 1)) * 240;
      return score(right[1]) - score(left[1]);
    })
    .slice(0, 16)
    .map(([element]) => element);
}

interface ArticleScoreResult {
  score: number;
  rawScore: number;
  metrics: ArticleScoreMetrics;
}

function articleMetric(value: number): number {
  return Math.round(clamp(value) * 100);
}

function scoreArticleRoot(
  element: HTMLElement,
  options: ArticleBlockCollectionOptions = SCORING_ARTICLE_BLOCK_OPTIONS,
  knownBlocks?: ArticlePreviewSourceBlock[],
  knownText?: string
): ArticleScoreResult {
  const usesKnownBlocks = knownBlocks !== undefined;
  const blocks = knownBlocks ?? articleSourceBlocks(element, options);
  const text = knownText ?? (articleTextFromBlocks(blocks) || visibleTextFromElement(element));
  const length = textLength(text);
  if (length === 0 || (!usesKnownBlocks && length < AUTO_ARTICLE_MIN_CHARS)) {
    return {
      score: 0,
      rawScore: -Infinity,
      metrics: {
        length: 0,
        structure: 0,
        heading: 0,
        semantics: 0,
        density: 0,
        linkPurity: 0,
        focus: 0,
        cleanliness: 0
      }
    };
  }

  const blockCount = Math.max(1, blocks.length);
  const effectiveChildCount = usesKnownBlocks
    ? new Set(blocks.map((block) => block.element)).size
    : element.childElementCount;
  const strongContainer = isStrongArticleContainer(element);
  const genericContainer = isGenericArticleContainer(element);
  const hasHeading = usesKnownBlocks
    ? articleBlocksContainHeading(blocks)
    : Boolean(articleHeadingInElement(element));
  const hasNearbyHeading = !hasHeading && Boolean(precedingArticleHeading(element));
  const longFormContainer = strongContainer || (genericContainer && hasHeading);
  const linkScore =
    1 -
    (usesKnownBlocks
      ? linkRatioFromArticleBlocks(blocks, text)
      : linkRatio(element, text)) * (longFormContainer ? 0.95 : 1.25);
  const childLimit = longFormContainer
    ? Math.max(80, blockCount * 5)
    : Math.max(14, blockCount * 4);
  const childBulk = Math.max(0, effectiveChildCount - childLimit);
  const embeddedNoise = usesKnownBlocks
    ? articleBlockNoiseCount(blocks)
    : embeddedNonArticleNoiseCount(element);
  const lengthIdeal = longFormContainer ? 1600 : 900;
  const lengthOverflow = longFormContainer ? 60000 : 12000;
  const lengthMetric =
    length <= lengthOverflow
      ? Math.min(1, length / lengthIdeal)
      : Math.max(0.45, 1 - (length - lengthOverflow) / lengthOverflow);
  const structureMetric = Math.min(1, blockCount / (longFormContainer ? 12 : 6));
  const headingMetric = hasHeading ? 1 : hasNearbyHeading ? 0.72 : 0.34;
  const semanticsMetric = strongContainer
    ? 1
    : genericContainer
      ? 0.78
      : element.matches("main, [role='main']")
        ? 0.68
        : 0.42;
  const densityMetric = Math.min(
    1,
    length / Math.max(280, effectiveChildCount * (longFormContainer ? 45 : 70))
  );
  const focusMetric = Math.max(
    0,
    1 -
      (element === document.body || element === document.documentElement ? 0.24 : 0) -
      Math.min(0.32, childBulk / Math.max(12, childLimit) * 0.32) -
      Math.min(0.24, Math.max(0, blockCount - (longFormContainer ? 120 : 32)) / 180) -
      Math.min(0.68, (embeddedNoise / Math.max(2, blockCount)) * 0.34)
  );
  const cleanlinessMetric = Math.max(
    0,
    1 -
      Math.min(0.82, embeddedNoise / Math.max(3, blockCount) * 0.72) -
      (isArticleNoiseElement(element) ? 0.26 : 0)
  );
  const metrics: ArticleScoreMetrics = {
    length: articleMetric(lengthMetric),
    structure: articleMetric(structureMetric),
    heading: articleMetric(headingMetric),
    semantics: articleMetric(semanticsMetric),
    density: articleMetric(densityMetric),
    linkPurity: articleMetric(linkScore),
    focus: articleMetric(focusMetric),
    cleanliness: articleMetric(cleanlinessMetric)
  };
  const score = Math.round(
    metrics.length * 0.14 +
      metrics.structure * 0.13 +
      metrics.heading * 0.11 +
      metrics.semantics * 0.15 +
      metrics.density * 0.13 +
      metrics.linkPurity * 0.13 +
      metrics.focus * 0.11 +
      metrics.cleanliness * 0.1
  );
  const rawScore =
    score +
    Math.min(1, length / lengthIdeal) * 0.01 +
    Math.min(1, blockCount / (longFormContainer ? 12 : 6)) * 0.001;
  return {
    score,
    rawScore,
    metrics
  };
}

function invalidateDisconnectedArticleState(): void {
  if (manualArticleRoot && !manualArticleRoot.isConnected) {
    manualArticleRoot = null;
  }
  if (editedArticleRoot && !editedArticleRoot.isConnected) {
    editedArticleRoot = null;
    removedArticleBlockTextKeys.clear();
  }
}

function hasArticleBlockEdits(): boolean {
  return Boolean(
    editedArticleRoot?.isConnected ||
      removedArticleBlockTextKeys.size > 0 ||
      document.querySelector("[data-webmind-article-excluded='true']")
  );
}

function articleSourceAfterEdits(source: ArticleSource): ArticleSource {
  return hasArticleBlockEdits() ? "edited" : source;
}

function selectArticleRoot(
  articleExtractionRules: ArticleExtractionRule[] = []
): ArticleRootSelection | null {
  invalidateDisconnectedArticleState();
  if (manualArticleRoot?.isConnected) {
    return {
      element: manualArticleRoot,
      source: "manual",
      selector: selectorHint(manualArticleRoot)
    };
  }
  if (editedArticleRoot?.isConnected) {
    return {
      element: editedArticleRoot,
      source: "edited",
      selector: selectorHint(editedArticleRoot)
    };
  }

  const configured = configuredArticleRoot(articleExtractionRules);
  if (configured) return configured;

  const rootScopes: ParentNode[] = [document, ...sameOriginIframeBodies()];
  const candidates = Array.from(
    new Set(
      rootScopes.flatMap((root) => [
        ...(root instanceof HTMLElement ? [root] : []),
        ...articleRootElements(root),
        ...continuousRootCandidates(root)
      ])
    )
  )
    .map((element, order) => ({
      element,
      order,
      score: scoreArticleRoot(element).rawScore
    }))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return left.order - right.order;
    });
  const best = candidates[0]?.element;
  if (best) {
    const promoted = promoteRootToIncludeTitle(best);
    return {
      element: promoted,
      source: "dom",
      selector: selectorHint(promoted)
    };
  }

  const fallback =
    document.querySelector<HTMLElement>("article") ??
    document.querySelector<HTMLElement>("main") ??
    document.querySelector<HTMLElement>("[role='main']") ??
    document.body;
  return fallback
    ? {
        element: fallback,
        source: "dom",
        selector: selectorHint(fallback)
      }
    : null;
}

async function promoteRootToIncludeTitleAsync(
  root: HTMLElement,
  checkpoint: ArticleExtractionCheckpoint
): Promise<HTMLElement> {
  if (articleHeadingInElement(root)) return root;
  const heading = precedingArticleHeading(root);
  if (!heading) return root;
  let promoted = root.parentElement;
  while (
    promoted &&
    promoted !== document.body &&
    promoted !== document.documentElement &&
    !promoted.contains(heading)
  ) {
    promoted = promoted.parentElement;
  }
  if (!promoted || isArticleNoiseElement(promoted)) return root;
  const rootLength = textLength(
    await visibleTextFromElementAsync(root, checkpoint)
  );
  const promotedLength = textLength(
    await visibleTextFromElementAsync(promoted, checkpoint)
  );
  const headingLength = textLength(
    await visibleTextFromElementAsync(heading, checkpoint)
  );
  const maxPromotedLength = Math.max(
    rootLength * 1.65,
    rootLength + headingLength + 320
  );
  if (promotedLength > maxPromotedLength) return root;
  const rootBlocks = await articleSourceBlocksAsync(
    root,
    SCORING_ARTICLE_BLOCK_OPTIONS,
    checkpoint
  );
  if (promoted.childElementCount > Math.max(10, rootBlocks.length * 3)) {
    return root;
  }
  return promoted;
}

async function selectArticleRootAsync(
  articleExtractionRules: ArticleExtractionRule[],
  checkpoint: ArticleExtractionCheckpoint,
  performance?: ArticleSelectionPerformance
): Promise<ArticleRootSelection | null> {
  invalidateDisconnectedArticleState();
  const url = location.href;
  const ruleSignature = articleExtractionRuleSignature(articleExtractionRules);
  automaticArticleRootCache.synchronizeContext(url, ruleSignature);
  if (manualArticleRoot?.isConnected) {
    return {
      element: manualArticleRoot,
      source: "manual",
      selector: selectorHint(manualArticleRoot)
    };
  }
  if (editedArticleRoot?.isConnected) {
    return {
      element: editedArticleRoot,
      source: "edited",
      selector: selectorHint(editedArticleRoot)
    };
  }
  const configured = await configuredArticleRootAsync(
    articleExtractionRules,
    checkpoint
  );
  if (configured) {
    return configured;
  }

  invalidateAutomaticArticleRootForPendingMutations();
  const cached = automaticArticleRootCache.lookup({
    url,
    ruleSignature,
    bypass: false,
    isConnected: (selection) => selection.element.isConnected
  });
  if (performance) performance.rootCache = cached.status;
  const iframeBodies = sameOriginIframeBodies();
  const bypassCache = iframeBodies.length > 0 || hasOpenShadowRoot();
  if (cached.value && !bypassCache) return cached.value;
  if (cached.value && bypassCache) automaticArticleRootCache.invalidate();
  if (bypassCache && performance) performance.rootCache = "bypass";

  const rootScopes: ParentNode[] = [document, ...iframeBodies];
  const candidateElements: HTMLElement[] = [];
  for (const rootScope of rootScopes) {
    if (rootScope instanceof HTMLElement) candidateElements.push(rootScope);
    candidateElements.push(
      ...(await articleRootElementsAsync(rootScope, checkpoint)),
      ...(await continuousRootCandidatesAsync(rootScope, checkpoint))
    );
    await checkpoint(true);
  }
  const uniqueCandidates = Array.from(new Set(candidateElements));
  if (performance) performance.candidateCount = uniqueCandidates.length;
  const candidates: Array<{
    element: HTMLElement;
    order: number;
    score: number;
  }> = [];
  for (let order = 0; order < uniqueCandidates.length; order += 1) {
    const element = uniqueCandidates[order];
    const blocks = await articleSourceBlocksAsync(
      element,
      SCORING_ARTICLE_BLOCK_OPTIONS,
      checkpoint
    );
    const text = articleTextFromBlocks(blocks);
    candidates.push({
      element,
      order,
      score: scoreArticleRoot(
        element,
        SCORING_ARTICLE_BLOCK_OPTIONS,
        blocks,
        text
      ).rawScore
    });
    await checkpoint(true);
  }
  candidates.sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score;
    return left.order - right.order;
  });
  const best = candidates.find((candidate) =>
    Number.isFinite(candidate.score)
  )?.element;
  if (best) {
    const promoted = await promoteRootToIncludeTitleAsync(best, checkpoint);
    const selection: ArticleRootSelection = {
      element: promoted,
      source: "dom",
      selector: selectorHint(promoted)
    };
    if (!bypassCache && location.href === url) {
      automaticArticleRootCache.store(selection, url, ruleSignature);
      observeAutomaticArticleRoot();
    }
    return selection;
  }
  const fallback =
    document.querySelector<HTMLElement>("article") ??
    document.querySelector<HTMLElement>("main") ??
    document.querySelector<HTMLElement>("[role='main']") ??
    document.body;
  if (!fallback) return null;
  const selection: ArticleRootSelection = {
    element: fallback,
    source: "dom",
    selector: selectorHint(fallback)
  };
  if (!bypassCache && location.href === url) {
    automaticArticleRootCache.store(selection, url, ruleSignature);
    observeAutomaticArticleRoot();
  }
  return selection;
}

export function findBestArticleRoot(
  articleExtractionRules: ArticleExtractionRule[] = []
): HTMLElement | null {
  return withArticleExtractionCache(
    () => selectArticleRoot(articleExtractionRules)?.element ?? null
  );
}

function articlePreviewTargetId(
  block?: ArticlePreviewSourceBlock
): string | undefined {
  if (!block?.element) return undefined;
  articlePreviewIdCounter += 1;
  const id = `article-preview-${articlePreviewIdCounter}`;
  articlePreviewTargets.set(id, block.element);
  if (block.exclusionElement) {
    articlePreviewExclusionTargets.set(id, block.exclusionElement);
  }
  return id;
}

export function articlePreviewElementById(targetId?: string): HTMLElement | null {
  if (!targetId) return null;
  const target = articlePreviewTargets.get(targetId);
  return target?.isConnected ? target : null;
}

function articlePreviewExclusionElementById(
  targetId?: string
): HTMLElement | null {
  if (!targetId) return null;
  const target = articlePreviewExclusionTargets.get(targetId);
  return target?.isConnected ? target : null;
}

export function isEditedArticleBlockExcluded(element: HTMLElement): boolean {
  const text = normalizedText(visibleTextFromElement(element));
  return (
    element.dataset.webmindArticleExcluded === "true" ||
    Boolean(text && removedArticleBlockTextKeys.has(articleBlockTextKey(text)))
  );
}

function isArticleTextBlockExcluded(block: ArticlePreviewSourceBlock): boolean {
  const key = articleBlockTextKey(block.text);
  return (
    Boolean(key && removedArticleBlockTextKeys.has(key)) ||
    block.element.dataset.webmindArticleExcluded === "true"
  );
}

function articlePreview(blocks: ArticlePreviewSourceBlock[]): ArticlePreviewBlock[] {
  return blocks.map((block, index) => ({
    id: `preview-${index + 1}`,
    text: block.text,
    markdown: block.markdown || block.text,
    sourceText: block.text,
    targetId: articlePreviewTargetId(block)
  }));
}

function clearArticleBlockEdits(): void {
  document
    .querySelectorAll<HTMLElement>("[data-webmind-article-excluded='true']")
    .forEach((element) => {
      delete element.dataset.webmindArticleExcluded;
    });
  sameOriginIframeBodies().forEach((body) => {
    body
      .querySelectorAll<HTMLElement>("[data-webmind-article-excluded='true']")
      .forEach((element) => {
        delete element.dataset.webmindArticleExcluded;
      });
  });
  editedArticleRoot = null;
  removedArticleBlockTextKeys.clear();
}

function readableArticleText(
  articleExtractionRules: ArticleExtractionRule[] = []
): ArticleSnapshot {
  return withArticleExtractionCache(() => {
    articlePreviewTargets.clear();
    articlePreviewExclusionTargets.clear();
    articlePreviewIdCounter = 0;

    const selection = selectArticleRoot(articleExtractionRules);
    if (!selection) {
      return {
        title: document.title || location.hostname,
        text: "",
        markdown: "",
        description: "",
        preview: [],
        summary: {
          source: "dom",
          blockCount: 0,
          charCount: 0
        }
      };
    }

    const blocks = articleSourceBlocks(selection.element);
    const text = articleTextFromBlocks(blocks);
    const markdown = blocks
      .map((block) => block.markdown || block.text)
      .filter(Boolean)
      .join("\n\n");
    const source = articleSourceAfterEdits(selection.source);
    const selector =
      selection.selector ?? selectorHint(selection.element) ?? undefined;
    const score = scoreArticleRoot(
      selection.element,
      SELECTED_ARTICLE_BLOCK_OPTIONS,
      blocks,
      text
    );
    return {
      title: document.title || location.hostname,
      text,
      markdown,
      description: "",
      preview: articlePreview(blocks),
      summary: {
        source,
        selector,
        blockCount: blocks.length,
        charCount: textLength(text),
        score: score.score,
        scoreMetrics: score.metrics
      }
    };
  });
}

async function readableArticleTextAsync(
  articleExtractionRules: ArticleExtractionRule[] = [],
  options: ArticleExtractionOptions = {}
): Promise<ArticleSnapshot> {
  return articleExtractionRunner.run(async (signal) => {
    const startedAt = performance.now();
    const selectionPerformance: ArticleSelectionPerformance = {
      candidateCount: 0,
      rootCache: "bypass"
    };
    return withArticleExtractionCacheAsync(async () => {
      const checkpoint = createArticleExtractionCheckpoint(signal);
      articlePreviewTargets.clear();
      articlePreviewExclusionTargets.clear();
      articlePreviewIdCounter = 0;
      await checkpoint(true);

      const selectionStartedAt = performance.now();
      const selection = await selectArticleRootAsync(
        articleExtractionRules,
        checkpoint,
        selectionPerformance
      );
      const selectionMs = performance.now() - selectionStartedAt;
      if (!selection) {
        return {
          title: document.title || location.hostname,
          text: "",
          markdown: "",
          description: "",
          preview: [],
          summary: {
            source: "dom",
            blockCount: 0,
            charCount: 0
          }
        };
      }
      const blocksStartedAt = performance.now();
      const blocks = await articleSourceBlocksAsync(
        selection.element,
        SELECTED_ARTICLE_BLOCK_OPTIONS,
        checkpoint
      );
      const text = articleTextFromBlocks(blocks);
      await checkpoint(true);
      const markdownParts: string[] = [];
      for (const block of blocks) {
        markdownParts.push(block.markdown || block.text);
        await checkpoint();
      }
      const blocksMs = performance.now() - blocksStartedAt;
      const source = articleSourceAfterEdits(selection.source);
      const selector =
        selection.selector ?? selectorHint(selection.element) ?? undefined;
      const score = scoreArticleRoot(
        selection.element,
        SELECTED_ARTICLE_BLOCK_OPTIONS,
        blocks,
        text
      );
      options.onPerformance?.(
        `[performance] article extraction totalMs=${Math.round(
          performance.now() - startedAt
        )} selectionMs=${Math.round(selectionMs)} blocksMs=${Math.round(
          blocksMs
        )} candidates=${selectionPerformance.candidateCount} blocks=${
          blocks.length
        } chars=${textLength(text)} source=${source} rootCache=${
          selectionPerformance.rootCache
        }`
      );
      return {
        title: document.title || location.hostname,
        text,
        markdown: markdownParts.filter(Boolean).join("\n\n"),
        description: "",
        preview: articlePreview(blocks),
        summary: {
          source,
          selector,
          blockCount: blocks.length,
          charCount: textLength(text),
          score: score.score,
          scoreMetrics: score.metrics
        }
      };
    });
  }, options);
}

function articlePreviewMatchCandidates(root: HTMLElement | null): HTMLElement[] {
  const base = root ?? document.body;
  if (!base) return [];
  return Array.from(new Set([base, ...articleBlockElements(base)])).filter(
    (element) =>
      isElementVisible(element) &&
      textLength(visibleTextFromElement(element)) > 0
  );
}

function articlePreviewTextMatchScore(candidate: string, target: string): number {
  if (candidate === target) return 1000;
  if (candidate.includes(target)) {
    return 700 - Math.abs(candidate.length - target.length);
  }
  if (target.includes(candidate)) {
    return 500 - Math.abs(candidate.length - target.length);
  }
  return -Infinity;
}

function installArticlePreviewHighlightStyle(root: Document | ShadowRoot): void {
  if (root.getElementById(ARTICLE_PREVIEW_HIGHLIGHT_STYLE_ID)) return;
  const doc = root instanceof Document ? root : document;
  const style = doc.createElement("style");
  style.id = ARTICLE_PREVIEW_HIGHLIGHT_STYLE_ID;
  style.textContent = `
    .webmind-article-preview-highlight {
      outline: 2px solid rgba(19, 139, 120, .72) !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 0 5px rgba(19, 139, 120, .18) !important;
      transition: outline-color .18s ease, box-shadow .18s ease !important;
    }
  `;
  if (root instanceof Document) {
    (root.head ?? root.documentElement).append(style);
  } else {
    root.append(style);
  }
}

function clearArticlePreviewHighlights(root: ParentNode): void {
  root
    .querySelectorAll(".webmind-article-preview-highlight")
    .forEach((element) =>
      element.classList.remove("webmind-article-preview-highlight")
    );
  root.querySelectorAll<HTMLElement>("*").forEach((element) => {
    if (element.shadowRoot) {
      clearArticlePreviewHighlights(element.shadowRoot);
    }
  });
}

function applyArticlePreviewHighlight(element: HTMLElement): { ok: boolean } {
  const root = element.getRootNode();
  installArticlePreviewHighlightStyle(
    root instanceof ShadowRoot ? root : element.ownerDocument ?? document
  );
  clearArticlePreviewHighlights(document);
  sameOriginIframeBodies().forEach((body) =>
    clearArticlePreviewHighlights(body.ownerDocument)
  );
  element.classList.add("webmind-article-preview-highlight");
  element.scrollIntoView({ block: "center", behavior: "smooth" });
  window.setTimeout(() => {
    element.classList.remove("webmind-article-preview-highlight");
  }, 2600);
  return { ok: true };
}

export function highlightArticlePreviewBlock(
  text: string,
  targetId?: string
): { ok: boolean } {
  const directMatch = articlePreviewElementById(targetId);
  if (directMatch) {
    return applyArticlePreviewHighlight(directMatch);
  }
  const target = normalizedText(text);
  if (textLength(target) < 4) return { ok: false };
  const root = findBestArticleRoot();
  const candidates = articlePreviewMatchCandidates(root)
    .map((element) => ({
      element,
      text: normalizedText(visibleTextFromElement(element))
    }))
    .map((candidate) => ({
      ...candidate,
      score: articlePreviewTextMatchScore(candidate.text, target)
    }))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score;
      return left.element.childElementCount - right.element.childElementCount;
    });
  const match = candidates[0];
  return match ? applyArticlePreviewHighlight(match.element) : { ok: false };
}

async function setEditedArticleRootFromCurrentAsync(
  articleExtractionRules: ArticleExtractionRule[] = []
): Promise<HTMLElement | null> {
  const current = manualArticleRoot?.isConnected
    ? manualArticleRoot
    : editedArticleRoot?.isConnected
      ? editedArticleRoot
      : null;
  if (current) {
    editedArticleRoot = current;
    return current;
  }
  const root = await articleExtractionRunner.run((signal) =>
    withArticleExtractionCacheAsync(async () =>
      (
        await selectArticleRootAsync(
          articleExtractionRules,
          createArticleExtractionCheckpoint(signal)
        )
      )?.element ?? null
    )
  );
  if (root?.isConnected) editedArticleRoot = root;
  return root;
}

export async function removeArticlePreviewBlock(
  text: string,
  targetId?: string,
  language?: AppSettings["interfaceLanguage"],
  articleExtractionRules: ArticleExtractionRule[] = []
): Promise<PageContext> {
  return removeArticlePreviewBlocks(
    [{ text, targetId }],
    language,
    articleExtractionRules
  );
}

export async function removeArticlePreviewBlocks(
  blocks: Array<Pick<ArticlePreviewBlock, "text" | "sourceText" | "targetId">>,
  language?: AppSettings["interfaceLanguage"],
  articleExtractionRules: ArticleExtractionRule[] = []
): Promise<PageContext> {
  await setEditedArticleRootFromCurrentAsync(articleExtractionRules);
  for (const block of blocks) {
    const target = articlePreviewExclusionElementById(block.targetId);
    if (target) target.dataset.webmindArticleExcluded = "true";
    const normalized = normalizedText(block.sourceText ?? block.text);
    if (normalized) {
      removedArticleBlockTextKeys.add(articleBlockTextKey(normalized));
    }
  }
  return extractPageContextAsync(
    true,
    language,
    "article",
    articleExtractionRules
  );
}

function isLikelyNonArticlePreviewBlock(block: ArticlePreviewBlock): boolean {
  const text = normalizedText(block.sourceText ?? block.text);
  const length = textLength(text);
  if (!text || length <= 2) return true;
  const target = articlePreviewElementById(block.targetId) ?? undefined;
  if (target?.matches("h1, h2, h3, pre, code, table, ul, ol, dl, [role='heading']")) {
    return false;
  }
  if (length >= 90) return false;
  const metadata = elementMetadataText(target);
  const linkHeavy =
    target instanceof HTMLElement &&
    linkRatio(target, visibleTextFromElement(target)) > 0.72 &&
    length < 70;
  const looksLikeMetaElement =
    /(^|\b)(author|avatar|breadcrumb|byline|click|comment|count|date|meta|reply|share|stat|tag|time|toolbar|user|view|vote)(\b|[-_])/i.test(
      metadata
    );
  const looksLikeBreadcrumb =
    length <= 50 &&
    /(?:^|[\s\u00a0])(?:›|>|\/|»|→)(?:[\s\u00a0]|$)/.test(text) &&
    !/[。！？.!?，,；;]/.test(text);
  const looksLikeTime =
    length <= 50 &&
    /(?:\d{1,4}[-/.年]\d{1,2}(?:[-/.月]\d{1,2}日?)?|\d{1,2}:\d{2}|刚刚|分钟前|小时前|天前|yesterday|today|ago|updated|published|posted)/i.test(
      text
    );
  const looksLikeStats =
    length <= 60 &&
    /\d[\d,.\s]*(?:次点击|点击|浏览|阅读|评论|回复|收藏|分享|赞|喜欢|views?|clicks?|comments?|replies|likes?|shares?|stars?|forks?)/i.test(
      text
    );
  const looksLikeShortLabel =
    length <= 18 &&
    !/[。！？.!?，,；;：:]/.test(text) &&
    /^[\p{L}\p{N}_@#.\-\s·]+$/u.test(text);
  return (
    Boolean(target && isArticleNoiseElement(target)) ||
    linkHeavy ||
    looksLikeMetaElement ||
    looksLikeBreadcrumb ||
    looksLikeTime ||
    looksLikeStats ||
    looksLikeShortLabel
  );
}

export async function pruneArticlePreviewBlocks(
  language?: AppSettings["interfaceLanguage"],
  articleExtractionRules: ArticleExtractionRule[] = []
): Promise<PageContext> {
  await setEditedArticleRootFromCurrentAsync(articleExtractionRules);
  const snapshot = await readableArticleTextAsync(articleExtractionRules);
  const preview = snapshot.preview ?? [];
  const removable = preview.filter(isLikelyNonArticlePreviewBlock);
  const removableKeys = new Set(
    removable.map((block) => articleBlockTextKey(block.sourceText ?? block.text))
  );
  const remaining = preview.filter(
    (block) => !removableKeys.has(articleBlockTextKey(block.sourceText ?? block.text))
  );
  const remainingTextLength = textLength(
    remaining.map((block) => block.sourceText ?? block.text).join("\n\n")
  );
  if (remaining.length >= 1 && remainingTextLength >= MANUAL_ARTICLE_MIN_CHARS) {
    removable.forEach((block) => {
      const target = articlePreviewExclusionElementById(block.targetId);
      if (target) target.dataset.webmindArticleExcluded = "true";
      const blockText = normalizedText(block.sourceText ?? block.text);
      if (blockText) removedArticleBlockTextKeys.add(articleBlockTextKey(blockText));
    });
  }
  return extractPageContextAsync(
    true,
    language,
    "article",
    articleExtractionRules
  );
}

function pickerTextLength(element: HTMLElement): number {
  return textLength(visibleTextFromElement(element));
}

function isPickerElement(element: HTMLElement): boolean {
  return Boolean(element.closest(".webmind-article-picker-ui"));
}

function pickerCandidatesFromEvent(event: Event): HTMLElement[] {
  const path = event.composedPath();
  const candidates: HTMLElement[] = [];
  for (const item of path) {
    if (!(item instanceof HTMLElement)) continue;
    if (item === document.documentElement || item === document.body) {
      candidates.push(item);
      continue;
    }
    if (isPickerElement(item) || !isElementVisible(item)) continue;
    if (pickerTextLength(item) < 20) continue;
    candidates.push(item);
  }
  return Array.from(new Set(candidates));
}

function articlePickerLabel(element: HTMLElement, level: number): string {
  const tag = element.tagName.toLowerCase();
  const selector = selectorHint(element) ?? tag;
  return `${tag}·L${level + 1}·${pickerTextLength(element)}·${selector}`;
}

export function startManualArticleSelection(
  language?: AppSettings["interfaceLanguage"]
): Promise<PageContext | null> {
  if (articlePickerSession) return articlePickerSession;
  articlePickerSession = new Promise((resolve) => {
    let candidates: HTMLElement[] = [];
    let level = 0;
    let current: HTMLElement | null = null;
    let settled = false;
    const overlay = document.createElement("div");
    const badge = document.createElement("div");
    overlay.className = "webmind-article-picker-ui";
    badge.className = "webmind-article-picker-ui";
    Object.assign(overlay.style, {
      position: "fixed",
      zIndex: "2147483646",
      pointerEvents: "none",
      border: "2px solid #178f7c",
      background: "rgba(23, 143, 124, 0.08)",
      boxShadow: "0 0 0 9999px rgba(15, 26, 23, 0.08)",
      display: "none"
    });
    Object.assign(badge.style, {
      position: "fixed",
      zIndex: "2147483647",
      maxWidth: "min(620px, calc(100vw - 16px))",
      padding: "7px 9px",
      border: "1px solid #d8ddda",
      borderRadius: "6px",
      color: "#17201e",
      background: "#ffffff",
      boxShadow: "0 10px 28px rgba(15, 26, 23, 0.2)",
      font: "12px/1.4 Inter, ui-sans-serif, system-ui, sans-serif",
      pointerEvents: "none",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      display: "none"
    });
    document.body.append(overlay, badge);

    const updateOverlay = () => {
      current = candidates[level] ?? null;
      if (!current) {
        overlay.style.display = "none";
        badge.style.display = "none";
        return;
      }
      const rect = current.getBoundingClientRect();
      overlay.style.display = "block";
      overlay.style.left = `${Math.max(0, rect.left)}px`;
      overlay.style.top = `${Math.max(0, rect.top)}px`;
      overlay.style.width = `${Math.max(0, Math.min(window.innerWidth, rect.right) - Math.max(0, rect.left))}px`;
      overlay.style.height = `${Math.max(0, Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top))}px`;
      badge.style.display = "block";
      badge.style.left = `${Math.min(window.innerWidth - 16, Math.max(8, rect.left))}px`;
      badge.style.top = `${Math.min(window.innerHeight - 80, Math.max(8, rect.top - 56))}px`;
      badge.textContent = [
        articlePickerLabel(current, level),
        uiText(language, "manualBodySelectionHint")
      ].join("\n");
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("scroll", updateOverlay, true);
      window.removeEventListener("resize", updateOverlay, true);
      overlay.remove();
      badge.remove();
      cancelArticlePickerSession = null;
      articlePickerSession = null;
    };

    const finish = async (element: HTMLElement | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!element) {
        resolve(null);
        return;
      }
      if (manualArticleRoot) {
        delete manualArticleRoot.dataset.webmindManualArticle;
      }
      clearArticleBlockEdits();
      manualArticleRoot = element;
      manualArticleRoot.dataset.webmindManualArticle = "true";
      resolve(await extractPageContextAsync(true, language, "article"));
    };

    cancelArticlePickerSession = () => finish(null);

    function onPointerMove(event: PointerEvent) {
      candidates = pickerCandidatesFromEvent(event);
      level = 0;
      updateOverlay();
    }

    function onWheel(event: WheelEvent) {
      if (!candidates.length) return;
      event.preventDefault();
      event.stopPropagation();
      level = clamp(level + (event.deltaY > 0 ? 1 : -1), 0, candidates.length - 1);
      updateOverlay();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish(null);
        return;
      }
      if (!candidates.length) return;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        level = clamp(level + 1, 0, candidates.length - 1);
        updateOverlay();
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        level = clamp(level - 1, 0, candidates.length - 1);
        updateOverlay();
      }
    }

    function onClick(event: MouseEvent) {
      if (!current) return;
      event.preventDefault();
      event.stopPropagation();
      finish(current);
    }

    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("scroll", updateOverlay, true);
    window.addEventListener("resize", updateOverlay, true);
    badge.textContent = uiText(language, "selectingBodyRange");
    badge.style.display = "block";
    badge.style.left = "8px";
    badge.style.top = "8px";
  });
  return articlePickerSession;
}

export function cancelManualArticleSelection(): { ok: boolean } {
  if (!cancelArticlePickerSession) return { ok: false };
  cancelArticlePickerSession();
  return { ok: true };
}

export async function restoreAutomaticArticleSelection(
  language?: AppSettings["interfaceLanguage"],
  articleExtractionRules: ArticleExtractionRule[] = []
): Promise<PageContext> {
  automaticArticleRootCache.invalidate();
  if (manualArticleRoot) {
    delete manualArticleRoot.dataset.webmindManualArticle;
  }
  manualArticleRoot = null;
  clearArticleBlockEdits();
  return extractPageContextAsync(
    true,
    language,
    "article",
    articleExtractionRules
  );
}

export function extractPageContext(
  ignoreSelection = false,
  language?: AppSettings["interfaceLanguage"],
  scope: "page" | "article" = "page",
  articleExtractionRules: ArticleExtractionRule[] = []
): PageContext {
  const selection =
    ignoreSelection
      ? undefined
      : pageSelectionText() || retainedPageSelectionText();
  const description =
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ??
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content;
  const siteName =
    document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content ??
    location.hostname;
  if (selection) {
    const selectionMarkdown = pageSelectionMarkdown();
    return {
      kind: "selection",
      title: document.title || location.hostname,
      url: location.href,
      text: truncateText(selection, 20000, language),
      markdown: truncateText(selectionMarkdown || selection, 20000, language),
      selection,
      description: uiText(language, "selectionDescription").replace(
        "{count}",
        String(selection.length)
      ),
      language: document.documentElement.lang || navigator.language,
      siteName
    };
  }
  if (scope === "article") {
    const article = readableArticleText(articleExtractionRules);
    return {
      kind: "article",
      title: article.title || document.title || location.hostname,
      url: location.href,
      text: article.text,
      markdown: article.markdown,
      description: article.description || description,
      language: document.documentElement.lang || navigator.language,
      siteName,
      articleSummary: article.summary,
      articlePreview: article.preview
    };
  }

  const query = searchQuery();
  const pageText =
    textFromElement(document.querySelector("main")) ||
    textFromElement(document.querySelector("[role='main']")) ||
    textFromElement(document.body) ||
    "";
  const pageMarkdown =
    markdownFromElement(document.querySelector("main")) ||
    markdownFromElement(document.querySelector("[role='main']")) ||
    markdownFromElement(document.body) ||
    pageText;
  return {
    kind: query ? "search" : "webpage",
    title: document.title || location.hostname,
    url: location.href,
    text: truncateText(pageText, 100000, language),
    markdown: truncateText(pageMarkdown, 100000, language),
    description,
    language: document.documentElement.lang || navigator.language,
    siteName
  };
}

export async function extractPageContextAsync(
  ignoreSelection = false,
  language?: AppSettings["interfaceLanguage"],
  scope: "page" | "article" = "page",
  articleExtractionRules: ArticleExtractionRule[] = [],
  articleExtractionOptions: ArticleExtractionOptions = {}
): Promise<PageContext> {
  const selection =
    ignoreSelection
      ? undefined
      : pageSelectionText() || retainedPageSelectionText();
  if (selection) {
    return extractPageContext(
      ignoreSelection,
      language,
      scope,
      articleExtractionRules
    );
  }
  await waitForPageIdle();
  if (scope === "article") {
    const article = await readableArticleTextAsync(
      articleExtractionRules,
      articleExtractionOptions
    );
    const description =
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ??
      document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content;
    return {
      kind: "article",
      title: article.title || document.title || location.hostname,
      url: location.href,
      text: article.text,
      markdown: article.markdown,
      description: article.description || description,
      language: document.documentElement.lang || navigator.language,
      siteName:
        document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')
          ?.content ?? location.hostname,
      articleSummary: article.summary,
      articlePreview: article.preview
    };
  }
  return extractPageContext(
    ignoreSelection,
    language,
    scope,
    articleExtractionRules
  );
}
