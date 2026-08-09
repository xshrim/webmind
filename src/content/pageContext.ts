import { Readability } from "@mozilla/readability";
import { uiText } from "../shared/i18n";
import { searchQueryFromUrl } from "../shared/searchEngines";
import type {
  AppSettings,
  ArticlePreviewBlock,
  ArticleQualitySummary,
  PageContext,
  WebSearchResult
} from "../shared/types";
import { truncateText } from "../shared/utils";
import { pageSelectionText, textFromElement } from "./selection";

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
    (match, label: string, namedIndex: string | undefined, bareIndex: string | undefined, offset: number, source: string) => {
      if (source[offset + match.length] === "(") return match;
      const index = Number(namedIndex ?? bareIndex) - 1;
      const result = results[index];
      if (!result?.url) return match;
      return `[${label}](${markdownUrl(result.url)})`;
    }
  );
}

interface ArticleCandidate {
  title?: string;
  titleElement?: HTMLElement;
  text: string;
  description?: string;
  element?: HTMLElement;
  source: ArticleQualitySummary["source"];
  selector?: string;
  score?: ArticleQualitySummary;
  preview?: ArticlePreviewBlock[];
}

interface ArticleLanguageProfile {
  family: "latin" | "han" | "kana" | "hangul" | "other";
  count: number;
}

interface ArticlePreviewSourceBlock {
  text: string;
  element?: HTMLElement;
}

interface ArticleExtractionCache {
  visible: WeakMap<HTMLElement, boolean>;
  text: WeakMap<HTMLElement, string>;
}

let manualArticleRoot: HTMLElement | null = null;
let editedArticleRoot: HTMLElement | null = null;
let articlePickerSession: Promise<PageContext | null> | null = null;
let articlePreviewIdCounter = 0;
let activeArticleExtractionCache: ArticleExtractionCache | null = null;
const articlePreviewTargets = new Map<string, HTMLElement>();
const removedArticleBlockTextKeys = new Set<string>();

const ARTICLE_BLOCK_SELECTOR =
  "h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, td, th, pre, [role='heading'], [role='paragraph']";
const ARTICLE_ROOT_SELECTOR =
  "article, main, [role='main'], [itemprop='articleBody'], [data-testid*='article' i], [data-testid*='content' i], [data-testid*='post' i], [data-testid*='story' i], [data-testid*='readme' i], [class*='article' i], [class*='content' i], [class*='post' i], [class*='story' i], [class*='entry' i], [class*='readme' i], [class*='markdown' i], [id*='article' i], [id*='content' i], [id*='post' i], [id*='story' i], [id*='readme' i], [id*='markdown' i]";
const ARTICLE_PREVIEW_HIGHLIGHT_STYLE_ID =
  "webmind-article-preview-highlight-style";
const ARTICLE_ROOT_CANDIDATE_LIMIT = 80;
const ARTICLE_BLOCK_CANDIDATE_LIMIT = 400;
const SHADOW_HOST_SCAN_LIMIT = 1200;

function waitForPageIdle(timeout = 120): Promise<void> {
  return new Promise((resolve) => {
    const requestIdle = window.requestIdleCallback?.bind(window);
    if (requestIdle) {
      requestIdle(() => resolve(), { timeout });
      return;
    }
    window.setTimeout(resolve, 0);
  });
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function normalizedText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function articleBlockTextKey(value: string): string {
  return normalizedText(value).toLowerCase();
}

function textLength(value: string): number {
  return value.replace(/\s+/g, "").length;
}

function withArticleExtractionCache<T>(callback: () => T): T {
  if (activeArticleExtractionCache) return callback();
  activeArticleExtractionCache = {
    visible: new WeakMap(),
    text: new WeakMap()
  };
  try {
    return callback();
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
  if (
    element.closest(
      "script, style, noscript, template, svg, [hidden], [aria-hidden='true'], .webmind-root, .webmind-translation, .webmind-reading, .webmind-immersive-reading-token"
    )
  ) {
    return setCached(false);
  }
  const style = getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number(style.opacity) === 0
  ) {
    return setCached(false);
  }
  const rects = element.getClientRects();
  return setCached(rects.length > 0);
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
    for (const child of Array.from(node.childNodes)) visit(child);
    if (
      /^(?:ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DIV|FIGCAPTION|H[1-6]|LI|P|PRE|SECTION|TR)$/.test(
        node.tagName
      )
    ) {
      parts.push("\n\n");
    } else if (/^(?:TD|TH)$/.test(node.tagName)) {
      parts.push("\t");
    }
  };
  visit(element);
  const text = parts
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  activeArticleExtractionCache?.text.set(element, text);
  return text;
}

function sameLanguageProfile(text: string): ArticleLanguageProfile {
  const profiles: ArticleLanguageProfile[] = [
    { family: "han", count: text.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g)?.length ?? 0 },
    { family: "kana", count: text.match(/[\u3040-\u30ff]/g)?.length ?? 0 },
    { family: "hangul", count: text.match(/[\uac00-\ud7af]/g)?.length ?? 0 },
    { family: "latin", count: text.match(/[A-Za-z]/g)?.length ?? 0 }
  ];
  const best = profiles.sort((left, right) => right.count - left.count)[0];
  return best.count ? best : { family: "other", count: 0 };
}

function languageConsistency(blocks: string[]): number {
  const meaningful = blocks
    .map((block) => sameLanguageProfile(block))
    .filter((profile) => profile.count >= 3);
  if (!meaningful.length) return 0.6;
  const familyCounts = meaningful.reduce<Record<string, number>>(
    (accumulator, profile) => {
      accumulator[profile.family] = (accumulator[profile.family] ?? 0) + 1;
      return accumulator;
    },
    {}
  );
  return (
    Math.max(...Object.values(familyCounts)) / Math.max(1, meaningful.length)
  );
}

function articleBlockElements(root: ParentNode): HTMLElement[] {
  const descendants = Array.from(
    root.querySelectorAll<HTMLElement>(ARTICLE_BLOCK_SELECTOR)
  );
  return root instanceof HTMLElement && root.matches(ARTICLE_BLOCK_SELECTOR)
    ? [root, ...descendants]
    : descendants;
}

function contentBlocksFromElement(element: HTMLElement): string[] {
  return visibleTextFromElement(element)
    .split(/\n{2,}/)
    .map(normalizedText)
    .filter((text) => textLength(text) > 0);
}

function contentBlocksFromText(text: string): string[] {
  return text
    .split(/\n{2,}|(?<=[。！？.!?])\s+/)
    .map(normalizedText)
    .filter((block) => textLength(block) >= 12);
}

function articleTitleSourceFromElement(element?: HTMLElement): {
  text: string;
  element?: HTMLElement;
} {
  if (!element) return { text: "" };
  const localHeading =
    element.matches("h1, h2, [role='heading']")
      ? element
      : element.querySelector<HTMLElement>(
          "h1, h2, [role='heading'][aria-level='1'], [role='heading'][aria-level='2']"
        );
  if (localHeading) {
    return {
      text: normalizedText(visibleTextFromElement(localHeading)),
      element: localHeading
    };
  }
  const nearbyHeading = precedingArticleHeading(element);
  if (nearbyHeading) {
    return {
      text: normalizedText(visibleTextFromElement(nearbyHeading)),
      element: nearbyHeading
    };
  }
  const pageHeading = document.querySelector<HTMLElement>(
    "main h1, article h1, h1, main h2, article h2"
  );
  return {
    text: pageHeading ? normalizedText(visibleTextFromElement(pageHeading)) : "",
    element: pageHeading ?? undefined
  };
}

function precedingArticleHeading(element: HTMLElement): HTMLElement | null {
  const selector =
    "h1, h2, [role='heading'][aria-level='1'], [role='heading'][aria-level='2']";
  let current: HTMLElement | null = element;
  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    let sibling = current.previousElementSibling as HTMLElement | null;
    while (sibling) {
      const heading = sibling.matches(selector)
        ? sibling
        : sibling.querySelector<HTMLElement>(selector);
      if (heading && textLength(visibleTextFromElement(heading)) >= 4) {
        return heading;
      }
      sibling = sibling.previousElementSibling as HTMLElement | null;
    }
    current = current.parentElement;
  }
  return null;
}

function prependArticleTitle(title: string | undefined, text: string): string {
  const normalizedTitle = normalizedText(title ?? "");
  if (!normalizedTitle) return text;
  if (
    text === normalizedTitle ||
    text.startsWith(`${normalizedTitle} `) ||
    text.slice(0, 500).includes(normalizedTitle)
  ) {
    return text;
  }
  return `${normalizedTitle}\n\n${text}`;
}

function prependArticleTitlePreviewBlock(
  title: string,
  blocks: ArticlePreviewSourceBlock[],
  titleElement?: HTMLElement
): ArticlePreviewSourceBlock[] {
  const normalizedTitle = normalizedText(title);
  if (!normalizedTitle) return blocks;
  const first = blocks[0]?.text ?? "";
  if (
    first === normalizedTitle ||
    first.startsWith(`${normalizedTitle} `) ||
    blocks.slice(0, 3).some((block) => block.text.includes(normalizedTitle))
  ) {
    return blocks;
  }
  return [{ text: normalizedTitle, element: titleElement }, ...blocks];
}

function isArticleNoiseElement(element: HTMLElement): boolean {
  if (
    element.matches(
      "script, style, noscript, template, svg, canvas, nav, header, footer, aside, form, dialog, menu, [hidden], [aria-hidden='true'], .webmind-root, .webmind-translation, .webmind-reading"
    )
  ) {
    return true;
  }
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
  return /(^|\b)(ad|ads|advert|banner|cookie|comment|comments|footer|header|login|menu|modal|nav|newsletter|paywall|promo|recommend|related|share|sidebar|sponsor|subscribe|toolbar)(\b|[-_])/i.test(
    metadata
  );
}

function elementVisibleArea(element?: HTMLElement): number {
  if (!element) return 0.8;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return 0.25;
  const width = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
  const height = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
  const visibleArea = Math.max(0, width) * Math.max(0, height);
  const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
  return clamp(visibleArea / Math.max(1, viewportArea * 0.35));
}

function selectorHint(element?: HTMLElement): string | undefined {
  if (!element) return undefined;
  if (element.dataset.webmindManualArticle === "true") {
    return "manual";
  }
  if (element.id) return `${element.tagName.toLowerCase()}#${element.id}`;
  const className = Array.from(element.classList).slice(0, 2).join(".");
  return className
    ? `${element.tagName.toLowerCase()}.${className}`
    : element.tagName.toLowerCase();
}

function linkRatio(element: HTMLElement | undefined, text: string): number {
  const total = textLength(text);
  if (!total || !element) return 0;
  const linkText = Array.from(element.querySelectorAll("a"))
    .map((anchor) => anchor.textContent ?? "")
    .join(" ");
  return clamp(textLength(linkText) / total);
}

function clutterPenalty(element?: HTMLElement): number {
  if (!element) return 0;
  let penalty = 0;
  const noise = element.querySelectorAll(
    "nav, header, footer, aside, form, button, input, select, textarea, [role='navigation'], [role='complementary'], [role='banner'], [role='contentinfo']"
  ).length;
  const blocks = Math.max(1, element.querySelectorAll("p, li, blockquote, pre, table").length);
  penalty += clamp(noise / Math.max(1, blocks * 1.2), 0, 0.5);
  if (isArticleNoiseElement(element)) penalty += 0.35;
  return clamp(penalty);
}

function continuityScore(blocks: string[]): number {
  if (!blocks.length) return 0;
  const substantial = blocks.filter((block) => textLength(block) >= 40).length;
  const adjacentLongRuns = blocks.reduce(
    (state, block) => {
      const isLong = textLength(block) >= 40;
      const currentRun = isLong ? state.currentRun + 1 : 0;
      return {
        currentRun,
        bestRun: Math.max(state.bestRun, currentRun)
      };
    },
    { currentRun: 0, bestRun: 0 }
  );
  return clamp(
    substantial / Math.max(3, blocks.length) * 0.55 +
      adjacentLongRuns.bestRun / Math.max(3, blocks.length) * 0.45
  );
}

function articlePreviewTargetId(element?: HTMLElement): string | undefined {
  if (!element) return undefined;
  articlePreviewIdCounter += 1;
  const id = `article-preview-${articlePreviewIdCounter}`;
  articlePreviewTargets.set(id, element);
  return id;
}

function articlePreviewElementById(targetId?: string): HTMLElement | null {
  if (!targetId) return null;
  const target = articlePreviewTargets.get(targetId);
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
    block.element?.dataset.webmindArticleExcluded === "true"
  );
}

function articlePreview(
  blocks: Array<string | ArticlePreviewSourceBlock>
): ArticlePreviewBlock[] {
  return blocks.map((block, index) => {
    const sourceBlock =
      typeof block === "string" ? { text: block } : block;
    return {
      id: `preview-${index + 1}`,
      text: truncateText(sourceBlock.text, 320),
      sourceText: sourceBlock.text,
      targetId: articlePreviewTargetId(sourceBlock.element)
    };
  });
}

function editedArticleRootSource(): ArticleQualitySummary["source"] | null {
  if (manualArticleRoot?.isConnected) return "manual";
  if (editedArticleRoot?.isConnected || removedArticleBlockTextKeys.size > 0) {
    return "edited";
  }
  return null;
}

function hasArticleBlockEdits(): boolean {
  return Boolean(editedArticleRoot?.isConnected || removedArticleBlockTextKeys.size > 0);
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

function articlePreviewMatchCandidates(root: ParentNode = document): HTMLElement[] {
  const roots: ParentNode[] =
    root === document
      ? [...(document.body ? [document.body] : []), ...sameOriginIframeBodies()]
      : [root];
  const elements = roots.flatMap((root) => {
    const own = root instanceof HTMLElement ? [root] : [];
    return [...own, ...articleBlockElements(root), ...collectOpenShadowElements(root)];
  });
  return Array.from(new Set(elements)).filter(
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

function alignPreviewBlocksToDom(
  blocks: string[],
  root: ParentNode = document
): ArticlePreviewSourceBlock[] {
  const candidates = articlePreviewMatchCandidates(root)
    .filter(isElementVisible)
    .map((element, order) => ({
      element,
      order,
      text: normalizedText(visibleTextFromElement(element))
    }))
    .filter((candidate) => textLength(candidate.text) > 0);
  let minimumOrder = -1;
  return blocks.map((text) => {
    const target = normalizedText(text);
    const match = candidates
      .map((candidate) => ({
        ...candidate,
        score:
          candidate.order > minimumOrder
            ? articlePreviewTextMatchScore(candidate.text, target)
            : -Infinity
      }))
      .filter((candidate) => Number.isFinite(candidate.score))
      .sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score;
        const leftLengthDelta = Math.abs(left.text.length - target.length);
        const rightLengthDelta = Math.abs(right.text.length - target.length);
        if (leftLengthDelta !== rightLengthDelta) {
          return leftLengthDelta - rightLengthDelta;
        }
        if (left.element.childElementCount !== right.element.childElementCount) {
          return left.element.childElementCount - right.element.childElementCount;
        }
        return left.order - right.order;
      })[0];
    if (!match) return { text };
    minimumOrder = match.order;
    return { text, element: match.element };
  });
}

function articleQualityWarnings(
  blockCount: number,
  totalTextLength: number
): ArticleQualitySummary["warnings"] {
  const viewportHeight = Math.max(1, window.innerHeight || 1);
  const scrollHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body?.scrollHeight ?? 0
  );
  if (
    scrollHeight > viewportHeight * 6 &&
    (blockCount < 8 || totalTextLength < 1200)
  ) {
    return ["virtualizedContentMayBeIncomplete"];
  }
  return undefined;
}

function scoreArticleCandidate(
  candidate: ArticleCandidate,
  options: { includePreview?: boolean } = {}
): ArticleCandidate {
  const includePreview = options.includePreview ?? true;
  const titleSource = candidate.title
    ? { text: normalizedText(candidate.title), element: candidate.titleElement }
    : articleTitleSourceFromElement(candidate.element);
  const title = normalizedText(titleSource.text);
  const rawText =
    candidate.element ? visibleTextFromElement(candidate.element) : normalizedText(candidate.text);
  const rawTextWithTitle = prependArticleTitle(title, rawText);
  const rawBlocks = candidate.element
    ? contentBlocksFromElement(candidate.element)
    : contentBlocksFromText(rawText);
  const sourceBlocks = includePreview
    ? candidate.element
      ? alignPreviewBlocksToDom(rawBlocks, candidate.element)
      : alignPreviewBlocksToDom(contentBlocksFromText(rawText))
    : rawBlocks.map((text) => ({ text }));
  const filteredBlocks = sourceBlocks.filter(
    (block) => !isArticleTextBlockExcluded(block)
  );
  const blocksWithTitle = prependArticleTitlePreviewBlock(
    title,
    filteredBlocks,
    includePreview ? titleSource.element : undefined
  ).filter((block) => !isArticleTextBlockExcluded(block));
  const blocks = blocksWithTitle.map((block) => block.text);
  const text = hasArticleBlockEdits() ? blocks.join("\n\n") : rawTextWithTitle;
  const totalTextLength = textLength(text);
  const rect = candidate.element?.getBoundingClientRect();
  const rawArea = rect ? Math.max(1, rect.width * rect.height) : totalTextLength * 8;
  const density = clamp(totalTextLength / Math.max(1, rawArea / 16), 0, 1);
  const candidateLinkRatio = linkRatio(candidate.element, text);
  const visibleArea = elementVisibleArea(candidate.element);
  const continuity = continuityScore(blocks);
  const language = languageConsistency(blocks);
  const clutter = clutterPenalty(candidate.element);
  const lengthScore = clamp(totalTextLength / 1800);
  const score = Math.round(
    100 *
      clamp(
        lengthScore * 0.18 +
          density * 0.2 +
          (1 - candidateLinkRatio) * 0.18 +
          visibleArea * 0.14 +
          continuity * 0.16 +
          language * 0.14 -
          clutter * 0.35
      )
  );
  return {
    ...candidate,
    text,
    selector: candidate.selector ?? selectorHint(candidate.element),
    score: {
      score,
      textDensity: Number(density.toFixed(2)),
      linkRatio: Number(candidateLinkRatio.toFixed(2)),
      visibleArea: Number(visibleArea.toFixed(2)),
      continuity: Number(continuity.toFixed(2)),
      clutterPenalty: Number(clutter.toFixed(2)),
      languageConsistency: Number(language.toFixed(2)),
      source: editedArticleRootSource() ?? candidate.source,
      selector: candidate.selector ?? selectorHint(candidate.element),
      blockCount: blocks.length,
      wordCount: totalTextLength,
      warnings: articleQualityWarnings(blocks.length, totalTextLength)
    },
    preview: includePreview ? articlePreview(blocksWithTitle) : candidate.preview
  };
}

function collectOpenShadowElements(root: ParentNode): HTMLElement[] {
  const elements: HTMLElement[] = [];
  Array.from(root.querySelectorAll<HTMLElement>("*"))
    .slice(0, SHADOW_HOST_SCAN_LIMIT)
    .forEach((element) => {
    if (element.shadowRoot) {
      elements.push(
        ...Array.from(
          element.shadowRoot.querySelectorAll<HTMLElement>(ARTICLE_ROOT_SELECTOR)
        )
      );
      elements.push(...collectOpenShadowElements(element.shadowRoot));
    }
  });
  return elements;
}

function iframeCandidates(): ArticleCandidate[] {
  const candidates: ArticleCandidate[] = [];
  document.querySelectorAll("iframe").forEach((iframe, index) => {
    try {
      const body = iframe.contentDocument?.body;
      if (!body) return;
      const text = textFromElement(body);
      if (textLength(text) < 120) return;
      candidates.push({
        text,
        element: body,
        source: "dom",
        selector: `iframe:nth-of-type(${index + 1})`
      });
    } catch {
      // Cross-origin frames cannot be inspected by the content script.
    }
  });
  return candidates;
}

function readabilityCandidate(): ArticleCandidate | null {
  try {
    const clone = document.cloneNode(true) as Document;
    const article = new Readability(clone, { charThreshold: 300 }).parse();
    let articleText = "";
    if (article?.content) {
      const container = document.createElement("div");
      container.innerHTML = article.content;
      articleText = textFromElement(container);
    }
    if (!articleText) articleText = article?.textContent ?? "";
    if (textLength(articleText) < 120) return null;
    return {
      title: article?.title ?? "",
      description: article?.excerpt ?? "",
      text: articleText,
      source: "readability",
      selector: "readability"
    };
  } catch {
    return null;
  }
}

function articleRootElements(root: ParentNode = document): HTMLElement[] {
  const roots = [
    ...Array.from(root.querySelectorAll<HTMLElement>(ARTICLE_ROOT_SELECTOR)),
    ...collectOpenShadowElements(root)
  ];
  return Array.from(new Set(roots)).filter(
    (element) => !isArticleNoiseElement(element) && textLength(element.textContent ?? "") >= 120
  )
    .slice(0, ARTICLE_ROOT_CANDIDATE_LIMIT)
    .filter((element) => textLength(visibleTextFromElement(element)) >= 120);
}

function continuousRootCandidates(root: ParentNode = document): HTMLElement[] {
  const blockEntries = articleBlockElements(root)
    .filter((element) => !isArticleNoiseElement(element))
    .filter((element) => textLength(element.textContent ?? "") >= 24)
    .slice(0, ARTICLE_BLOCK_CANDIDATE_LIMIT)
    .map((element, order) => ({
      element,
      order,
      text: normalizedText(visibleTextFromElement(element))
    }))
    .filter((entry) => textLength(entry.text) >= 24)
    .slice(0, 400);
  const summaries = new Map<
    HTMLElement,
    { blocks: number; textLength: number; first: number; last: number }
  >();
  blockEntries.forEach((entry) => {
    let ancestor = entry.element.parentElement;
    let depth = 0;
    while (
      ancestor &&
      ancestor !== document.documentElement &&
      depth < 8
    ) {
      if (ancestor === document.body) break;
      if (!isArticleNoiseElement(ancestor)) {
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
    .filter(([, summary]) => summary.blocks >= 2 && summary.textLength >= 120)
    .sort((left, right) => {
      const leftSummary = left[1];
      const rightSummary = right[1];
      const score = (summary: typeof leftSummary) =>
        summary.textLength * 0.55 +
        summary.blocks * 40 +
        summary.blocks / Math.max(1, summary.last - summary.first + 1) * 240;
      return score(rightSummary) - score(leftSummary);
    })
    .slice(0, 12)
    .map(([element]) => element);
}

function articleCandidateFromRoot(element: HTMLElement): ArticleCandidate {
  const titleSource = articleTitleSourceFromElement(element);
  return {
    title: titleSource.text,
    titleElement: titleSource.element,
    text: visibleTextFromElement(element),
    element,
    source: "dom",
    selector: selectorHint(element)
  };
}

function articleCandidates(): ArticleCandidate[] {
  const domRoots = Array.from(
    new Set([...articleRootElements(document), ...continuousRootCandidates(document)])
  ).map(articleCandidateFromRoot);
  const manualCandidate =
    manualArticleRoot?.isConnected && textLength(visibleTextFromElement(manualArticleRoot)) >= 40
      ? (() => {
          const titleSource = articleTitleSourceFromElement(manualArticleRoot);
          return {
            title: titleSource.text,
            titleElement: titleSource.element,
            text: visibleTextFromElement(manualArticleRoot),
            element: manualArticleRoot,
            source: "manual" as const,
            selector: selectorHint(manualArticleRoot)
          };
        })()
      : null;
  const editedCandidate =
    !manualCandidate &&
    editedArticleRoot?.isConnected &&
    textLength(visibleTextFromElement(editedArticleRoot)) >= 40
      ? (() => {
          const titleSource = articleTitleSourceFromElement(editedArticleRoot);
          return {
            title: titleSource.text,
            titleElement: titleSource.element,
            text: visibleTextFromElement(editedArticleRoot),
            element: editedArticleRoot,
            source: "edited" as const,
            selector: selectorHint(editedArticleRoot)
          };
        })()
      : null;
  if (manualArticleRoot && !manualArticleRoot.isConnected) {
    manualArticleRoot = null;
  }
  if (editedArticleRoot && !editedArticleRoot.isConnected) {
    editedArticleRoot = null;
    removedArticleBlockTextKeys.clear();
  }
  return [
    manualCandidate,
    editedCandidate,
    ...domRoots,
    ...iframeCandidates()
  ].filter((candidate): candidate is ArticleCandidate =>
    Boolean(
      candidate &&
        textLength(candidate.text) >=
          (candidate.source === "manual" ? 40 : 120)
    )
  );
}

export function findBestArticleRoot(): HTMLElement | null {
  return withArticleExtractionCache(() => {
    if (manualArticleRoot?.isConnected) return manualArticleRoot;
    if (editedArticleRoot?.isConnected) return editedArticleRoot;
    const best = articleCandidates()
      .filter((candidate) => candidate.element)
      .map((candidate) => scoreArticleCandidate(candidate, { includePreview: false }))
      .sort((left, right) => (right.score?.score ?? 0) - (left.score?.score ?? 0))[0];
    return best?.element ?? null;
  });
}

function sameOriginIframeBodies(): HTMLElement[] {
  const bodies: HTMLElement[] = [];
  document.querySelectorAll("iframe").forEach((iframe) => {
    try {
      const body = iframe.contentDocument?.body;
      if (body) bodies.push(body);
    } catch {
      // Cross-origin frames cannot be inspected by the content script.
    }
  });
  return bodies;
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

function articlePreviewHighlightCandidates(): HTMLElement[] {
  return articlePreviewMatchCandidates();
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
  if (textLength(target) < 12) return { ok: false };
  const candidates = articlePreviewHighlightCandidates()
    .filter(isElementVisible)
    .map((element) => ({
      element,
      text: normalizedText(visibleTextFromElement(element))
    }))
    .filter((candidate) => textLength(candidate.text) >= 12)
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
  if (!match) return { ok: false };
  return applyArticlePreviewHighlight(match.element);
}

function setEditedArticleRootFromCurrent(): HTMLElement | null {
  const root =
    manualArticleRoot?.isConnected
      ? manualArticleRoot
      : editedArticleRoot?.isConnected
        ? editedArticleRoot
        : findBestArticleRoot();
  if (root?.isConnected) {
    editedArticleRoot = root;
    return root;
  }
  return null;
}

export function removeArticlePreviewBlock(
  text: string,
  targetId?: string,
  language?: AppSettings["interfaceLanguage"]
): PageContext {
  setEditedArticleRootFromCurrent();
  const normalized = normalizedText(text);
  const target = articlePreviewElementById(targetId);
  if (target) {
    target.dataset.webmindArticleExcluded = "true";
  }
  if (normalized) {
    removedArticleBlockTextKeys.add(articleBlockTextKey(normalized));
  }
  return extractPageContext(true, language, "article");
}

function elementMetadataText(element?: HTMLElement): string {
  if (!element) return "";
  return [
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
}

function isLikelyNonArticlePreviewBlock(block: ArticlePreviewBlock): boolean {
  const text = normalizedText(block.sourceText ?? block.text);
  const length = textLength(text);
  if (!text || length <= 2) return true;
  if (length >= 80) return false;
  const target = articlePreviewElementById(block.targetId) ?? undefined;
  if (target?.matches("h1, h2, h3, [role='heading']")) return false;
  const metadata = elementMetadataText(target);
  const linkHeavy =
    target instanceof HTMLElement &&
    linkRatio(target, visibleTextFromElement(target)) > 0.65 &&
    length < 60;
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
    !/\s{2,}/.test(text) &&
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

export function pruneArticlePreviewBlocks(
  language?: AppSettings["interfaceLanguage"]
): PageContext {
  setEditedArticleRootFromCurrent();
  const snapshot = readableArticleText();
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
  if (remaining.length >= 2 && remainingTextLength >= 120) {
    removable.forEach((block) => {
      const target = articlePreviewElementById(block.targetId);
      if (target) target.dataset.webmindArticleExcluded = "true";
      const text = normalizedText(block.sourceText ?? block.text);
      if (text) removedArticleBlockTextKeys.add(articleBlockTextKey(text));
    });
  }
  return extractPageContext(true, language, "article");
}

function pickerTextLength(element: HTMLElement): number {
  return textLength(element.innerText || element.textContent || "");
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
    if (isPickerElement(item) || isArticleNoiseElement(item)) continue;
    if (pickerTextLength(item) < 20) continue;
    candidates.push(item);
  }
  return Array.from(new Set(candidates));
}

function articlePickerLabel(element: HTMLElement, level: number): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const className = Array.from(element.classList).slice(0, 2).join(".");
  const classHint = className ? `.${className}` : "";
  return `${tag}${id}${classHint} · L${level + 1} · ${pickerTextLength(element)}`;
}

export function startManualArticleSelection(
  language?: AppSettings["interfaceLanguage"]
): Promise<PageContext | null> {
  if (articlePickerSession) return articlePickerSession;
  articlePickerSession = new Promise((resolve) => {
    let candidates: HTMLElement[] = [];
    let level = 0;
    let current: HTMLElement | null = null;
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
      maxWidth: "min(420px, calc(100vw - 16px))",
      padding: "7px 9px",
      border: "1px solid #d8ddda",
      borderRadius: "6px",
      color: "#17201e",
      background: "#ffffff",
      boxShadow: "0 10px 28px rgba(15, 26, 23, 0.2)",
      font: "12px/1.4 Inter, ui-sans-serif, system-ui, sans-serif",
      pointerEvents: "none",
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
      badge.style.top = `${Math.min(window.innerHeight - 64, Math.max(8, rect.top - 42))}px`;
      badge.textContent = [
        uiText(language, "selectingBodyRange"),
        articlePickerLabel(current, level),
        uiText(language, "manualBodySelectionHint")
      ].join(" · ");
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
      articlePickerSession = null;
    };

    const finish = (element: HTMLElement | null) => {
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
      resolve(extractPageContext(true, language, "article"));
    };

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

export function restoreAutomaticArticleSelection(
  language?: AppSettings["interfaceLanguage"]
): PageContext {
  if (manualArticleRoot) {
    delete manualArticleRoot.dataset.webmindManualArticle;
  }
  manualArticleRoot = null;
  clearArticleBlockEdits();
  return extractPageContext(true, language, "article");
}

function readableArticleText(): {
  title?: string;
  text: string;
  description?: string;
  quality?: ArticleQualitySummary;
  preview?: ArticlePreviewBlock[];
} {
  return withArticleExtractionCache(() => {
    articlePreviewTargets.clear();
    if (manualArticleRoot?.isConnected) {
      const manualText = visibleTextFromElement(manualArticleRoot);
      if (textLength(manualText) >= 40) {
        const manual = scoreArticleCandidate({
          text: manualText,
          element: manualArticleRoot,
          source: "manual",
          selector: selectorHint(manualArticleRoot)
        });
        return {
          title: document.title || location.hostname,
          text: manual.text,
          description: "",
          quality: manual.score,
          preview: manual.preview
        };
      }
    }
    if (editedArticleRoot?.isConnected) {
      const editedText = visibleTextFromElement(editedArticleRoot);
      if (textLength(editedText) >= 40) {
        const edited = scoreArticleCandidate({
          text: editedText,
          element: editedArticleRoot,
          source: "edited",
          selector: selectorHint(editedArticleRoot)
        });
        return {
          title: document.title || location.hostname,
          text: edited.text,
          description: "",
          quality: edited.score,
          preview: edited.preview
        };
      }
    }
    const scoredCandidates = articleCandidates()
      .map((candidate) => scoreArticleCandidate(candidate, { includePreview: false }))
      .sort((left, right) => (right.score?.score ?? 0) - (left.score?.score ?? 0));
    const best = scoredCandidates[0];
    if (best?.score && textLength(best.text) >= 120) {
      const detailed = scoreArticleCandidate(best, { includePreview: true });
      return {
        title: detailed.title,
        text: detailed.text,
        description: detailed.description,
        quality: detailed.score,
        preview: detailed.preview
      };
    }
    const readableFallback = readabilityCandidate();
    if (readableFallback && textLength(readableFallback.text) >= 120) {
      const readable = scoreArticleCandidate(readableFallback);
      return {
        title: readable.title,
        text: readable.text,
        description: readable.description,
        quality: readable.score,
        preview: readable.preview
      };
    }
    const fallbackElement =
      document.querySelector<HTMLElement>("article") ||
      document.querySelector<HTMLElement>("main") ||
      document.querySelector<HTMLElement>('[role="main"]');
    const fallback = fallbackElement ? visibleTextFromElement(fallbackElement) : "";
    const fallbackCandidate = fallbackElement
      ? scoreArticleCandidate({
          text: fallback,
          element: fallbackElement,
          source: "dom",
          selector: selectorHint(fallbackElement)
        })
      : null;
    return {
      title: "",
      text: fallback,
      description: "",
      quality: fallbackCandidate?.score,
      preview: fallbackCandidate?.preview
    };
  });
}

export function extractPageContext(
  ignoreSelection = false,
  language?: AppSettings["interfaceLanguage"],
  scope: "page" | "article" = "page"
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
  if (scope === "article") {
    const article = readableArticleText();
    return {
      kind: "article",
      title: article.title || document.title || location.hostname,
      url: location.href,
      text: truncateText(article.text, 100000, language),
      description: article.description || description,
      language: document.documentElement.lang || navigator.language,
      siteName,
      articleQuality: article.quality,
      articlePreview: article.preview
    };
  }
  const article = readableArticleText();
  let text = article.text;
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

export async function extractPageContextAsync(
  ignoreSelection = false,
  language?: AppSettings["interfaceLanguage"],
  scope: "page" | "article" = "page"
): Promise<PageContext> {
  const selection = ignoreSelection ? undefined : pageSelectionText() || undefined;
  if (!selection) {
    await waitForPageIdle();
  }
  return extractPageContext(ignoreSelection, language, scope);
}
