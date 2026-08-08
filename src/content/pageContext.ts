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

let manualArticleRoot: HTMLElement | null = null;
let articlePickerSession: Promise<PageContext | null> | null = null;

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function normalizedText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function textLength(value: string): number {
  return value.replace(/\s+/g, "").length;
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

function contentBlocksFromElement(element: HTMLElement): string[] {
  const blockSelector =
    "h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, td, th, pre, code, section, [role='heading'], [role='paragraph']";
  const blocks = Array.from(element.querySelectorAll<HTMLElement>(blockSelector))
    .filter((node) => !isArticleNoiseElement(node))
    .map((node) => normalizedText(node.innerText || node.textContent || ""))
    .filter((text) => textLength(text) >= 12);
  if (blocks.length) return blocks;
  return normalizedText(element.innerText || element.textContent || "")
    .split(/\n{2,}/)
    .map(normalizedText)
    .filter((text) => textLength(text) >= 12);
}

function contentBlocksFromText(text: string): string[] {
  return text
    .split(/\n{2,}|(?<=[。！？.!?])\s+/)
    .map(normalizedText)
    .filter((block) => textLength(block) >= 12);
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

function articlePreview(blocks: string[]): ArticlePreviewBlock[] {
  return blocks.slice(0, 8).map((text, index) => ({
    id: `preview-${index + 1}`,
    text: truncateText(text, 320)
  }));
}

function scoreArticleCandidate(candidate: ArticleCandidate): ArticleCandidate {
  const text = normalizedText(candidate.text);
  const blocks = candidate.element
    ? contentBlocksFromElement(candidate.element)
    : contentBlocksFromText(text);
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
      source:
        candidate.element === manualArticleRoot ? "manual" : candidate.source,
      selector: candidate.selector ?? selectorHint(candidate.element),
      blockCount: blocks.length,
      wordCount: totalTextLength
    },
    preview: articlePreview(blocks.length ? blocks : contentBlocksFromText(text))
  };
}

function collectOpenShadowElements(root: ParentNode): HTMLElement[] {
  const elements: HTMLElement[] = [];
  root.querySelectorAll<HTMLElement>("*").forEach((element) => {
    if (element.shadowRoot) {
      elements.push(...collectOpenShadowElements(element.shadowRoot));
    }
  });
  return [
    ...Array.from(root.querySelectorAll<HTMLElement>(
      "article, main, [role='main'], [data-testid*='article' i], [data-testid*='content' i], [class*='article' i], [class*='content' i], [class*='post' i], [id*='article' i], [id*='content' i], [id*='post' i]"
    )),
    ...elements
  ];
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

function articleCandidates(): ArticleCandidate[] {
  const seen = new Set<HTMLElement>();
  const domCandidates = collectOpenShadowElements(document)
    .filter((element) => {
      if (seen.has(element) || isArticleNoiseElement(element)) return false;
      seen.add(element);
      return textLength(element.innerText || element.textContent || "") >= 120;
    })
    .map<ArticleCandidate>((element) => ({
      text: textFromElement(element),
      element,
      source: "dom",
      selector: selectorHint(element)
    }));
  const manualCandidate =
    manualArticleRoot?.isConnected && textLength(textFromElement(manualArticleRoot)) >= 40
      ? {
          text: textFromElement(manualArticleRoot),
          element: manualArticleRoot,
          source: "manual" as const,
          selector: selectorHint(manualArticleRoot)
        }
      : null;
  if (manualArticleRoot && !manualArticleRoot.isConnected) {
    manualArticleRoot = null;
  }
  return [
    manualCandidate,
    readabilityCandidate(),
    ...domCandidates,
    ...iframeCandidates()
  ].filter((candidate): candidate is ArticleCandidate =>
    Boolean(candidate && textLength(candidate.text) >= 120)
  );
}

export function findBestArticleRoot(): HTMLElement | null {
  if (manualArticleRoot?.isConnected) return manualArticleRoot;
  const best = articleCandidates()
    .filter((candidate) => candidate.element)
    .map(scoreArticleCandidate)
    .sort((left, right) => (right.score?.score ?? 0) - (left.score?.score ?? 0))[0];
  return best?.element ?? null;
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
  return extractPageContext(true, language, "article");
}

function readableArticleText(): {
  title?: string;
  text: string;
  description?: string;
  quality?: ArticleQualitySummary;
  preview?: ArticlePreviewBlock[];
} {
  if (manualArticleRoot?.isConnected) {
    const manualText = textFromElement(manualArticleRoot);
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
  const scoredCandidates = articleCandidates()
    .map(scoreArticleCandidate)
    .sort((left, right) => (right.score?.score ?? 0) - (left.score?.score ?? 0));
  const best = scoredCandidates[0];
  if (best?.score && textLength(best.text) >= 120) {
    return {
      title: best.title,
      text: best.text,
      description: best.description,
      quality: best.score,
      preview: best.preview
    };
  }
  const fallbackElement =
    document.querySelector<HTMLElement>("article") ||
    document.querySelector<HTMLElement>("main") ||
    document.querySelector<HTMLElement>('[role="main"]');
  const fallback = fallbackElement ? textFromElement(fallbackElement) : "";
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
