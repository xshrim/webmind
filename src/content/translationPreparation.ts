import type {
  ArticleExtractionRule,
  ArticlePreviewBlock,
  PageTextBlock
} from "../shared/types";
import { protectTranslationText } from "../shared/utils";
import {
  articlePreviewElementById,
  findBestArticleRoot,
  isEditedArticleBlockExcluded
} from "./pageContext";
import type {
  TranslationCitation,
  TranslationFormat,
  TranslationLink,
  TranslationSourceRecord
} from "./translationDom";

export interface TranslationBlockOptions {
  preserveRichText?: boolean;
  maxVisibleTextLength?: number;
  minVisibleTextLength?: number;
  articleExtractionRules?: ArticleExtractionRule[];
  articlePreviewBlocks?: ArticlePreviewBlock[];
}

export interface TranslationPreparationDependencies {
  sources: Map<string, TranslationSourceRecord>;
  installStyles: () => void;
  isVisible: (element: HTMLElement) => boolean;
  viewportPriority: (element: HTMLElement, order: number) => number;
  textNodes: (root: Node) => Text[];
  currentSelection: (target: EventTarget | null) => { text: string } | null;
  translatableElementFromTarget: (
    target: EventTarget | null
  ) => HTMLElement | null;
  lastPointerTarget: () => EventTarget | null;
  nextBlockId: () => string;
}

const TRANSLATABLE_BLOCK_SELECTOR =
  "h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, td, dt, dd, [role='heading'], [role='paragraph']";
const TRANSLATABLE_PAGE_SELECTOR = TRANSLATABLE_BLOCK_SELECTOR;
const TRANSLATABLE_ARTICLE_UNIT_SELECTOR =
  `${TRANSLATABLE_BLOCK_SELECTOR}, pre, table, ul, ol, dl, figure, details`;
const CITATION_MARKER_PATTERN =
  /^(?:\[\s*\d+(?:\s*[-,–]\s*\d+)*\s*\]|[（(【]?\s*\d+(?:\s*[-,–]\s*\d+)*\s*[)）】]?|[¹²³⁴⁵⁶⁷⁸⁹⁰]+)$/;
const CITATION_TOKEN_PATTERN =
  /(?:`?\{\{\s*WEBMIND_CITATION_(\d+)\s*\}\}`?|\[\s*WEBMIND_CITATION_(\d+)\s*\]|WEBMIND_CITATION_(\d+))/gi;
const LINK_TOKEN_PATTERN =
  /(?:`?\{\{\s*WEBMIND_LINK_(START|END)_(\d+)\s*\}\}`?|\[\s*WEBMIND_LINK_(START|END)_(\d+)\s*\]|WEBMIND_LINK_(START|END)_(\d+))/gi;
const FORMAT_TOKEN_PATTERN =
  /(?:`?\{\{\s*WEBMIND_FORMAT_(START|END)_(\d+)\s*\}\}`?|\[\s*WEBMIND_FORMAT_(START|END)_(\d+)\s*\]|WEBMIND_FORMAT_(START|END)_(\d+))/gi;

function normalizedBlockText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function blockCandidatesFromRoot(root: HTMLElement): HTMLElement[] {
  const descendants = Array.from(
    root.querySelectorAll<HTMLElement>(TRANSLATABLE_PAGE_SELECTOR)
  );
  if (
    root.matches(TRANSLATABLE_PAGE_SELECTOR) ||
    root.dataset.webmindManualArticle === "true"
  ) {
    return [root, ...descendants];
  }
  return descendants;
}

function isWebMindGeneratedElement(element: HTMLElement): boolean {
  return Boolean(
    element.closest(".webmind-translation, .webmind-immersive-reading-token")
  );
}

function hasDirectText(element: HTMLElement): boolean {
  return Array.from(element.childNodes).some(
    (node) => node instanceof Text && Boolean(node.textContent?.trim())
  );
}

function translationElementVisibleText(element: HTMLElement): string {
  return translationVisibleText(translationTextFromElement(element, []));
}

function articleScopeTextMatchesCandidate(
  articleText: string,
  candidateText: string
): boolean {
  const normalizedCandidate = normalizedBlockText(candidateText);
  if (!articleText || !normalizedCandidate) return true;
  return (
    articleText === normalizedCandidate ||
    articleText.includes(normalizedCandidate)
  );
}

function articlePreviewBlockElement(
  block: ArticlePreviewBlock,
  root: HTMLElement,
  dependencies: TranslationPreparationDependencies
): HTMLElement | null {
  const direct = articlePreviewElementById(block.targetId);
  if (direct?.isConnected) return direct;
  const target = normalizedBlockText(block.sourceText ?? block.text);
  if (!target) return null;
  const candidates = articleContentCandidatesFromRoot(
    root,
    { maxVisibleTextLength: 20000 },
    dependencies
  )
    .filter((element) => dependencies.isVisible(element))
    .map((element, order) => {
      const text = normalizedBlockText(translationElementVisibleText(element));
      const contains =
        text === target || text.includes(target) || target.includes(text);
      return {
        element,
        order,
        text,
        score: contains ? Math.abs(text.length - target.length) : Infinity
      };
    })
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score;
      return left.order - right.order;
    });
  return candidates[0]?.element ?? null;
}

interface TextRunChar {
  char: string;
  node: Text;
  offset: number;
}

function collectTextRuns(root: HTMLElement): TextRunChar[][] {
  const runs: TextRunChar[][] = [];
  let current: TextRunChar[] = [];
  const flush = () => {
    if (normalizedBlockText(current.map((item) => item.char).join(""))) {
      runs.push(current);
    }
    current = [];
  };
  const visit = (node: Node) => {
    if (node instanceof Text) {
      const parent = node.parentElement;
      if (!parent || isVisuallyHiddenTranslationElement(parent)) return;
      const value = node.textContent ?? "";
      for (let offset = 0; offset < value.length; offset += 1) {
        current.push({ char: value[offset], node, offset });
      }
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (isVisuallyHiddenTranslationElement(node)) return;
    if (node.tagName === "BR") {
      flush();
      return;
    }
    for (const child of Array.from(node.childNodes)) visit(child);
    if (
      /^(?:ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DIV|FIGCAPTION|H[1-6]|LI|P|PRE|SECTION|TR)$/.test(
        node.tagName
      )
    ) {
      flush();
    }
  };
  for (const child of Array.from(root.childNodes)) visit(child);
  flush();
  return runs;
}

function normalizedRun(run: TextRunChar[]): {
  text: string;
  positions: TextRunChar[];
} {
  let text = "";
  const positions: TextRunChar[] = [];
  let pendingSpace: TextRunChar | null = null;
  for (const item of run) {
    if (/\s/.test(item.char)) {
      pendingSpace = pendingSpace ?? item;
      continue;
    }
    if (pendingSpace && text) {
      text += " ";
      positions.push(pendingSpace);
    }
    pendingSpace = null;
    text += item.char;
    positions.push(item);
  }
  return { text, positions };
}

function wrapArticlePreviewText(
  element: HTMLElement,
  text: string,
  id: string
): HTMLElement | null {
  const target = normalizedBlockText(text);
  if (!target) return null;
  if (normalizedBlockText(translationElementVisibleText(element)) === target) {
    return element;
  }
  for (const run of collectTextRuns(element)) {
    const normalized = normalizedRun(run);
    const start = normalized.text.indexOf(target);
    if (start < 0) continue;
    const first = normalized.positions[start];
    const last = normalized.positions[start + target.length - 1];
    if (!first || !last) continue;
    const range = document.createRange();
    range.setStart(first.node, first.offset);
    range.setEnd(last.node, last.offset + 1);
    const wrapper = document.createElement("span");
    wrapper.className = "webmind-immersive-source";
    wrapper.dataset.webmindBlockId = id;
    try {
      wrapper.append(range.extractContents());
      range.insertNode(wrapper);
    } catch {
      return null;
    }
    return wrapper.isConnected ? wrapper : null;
  }
  return null;
}

function articleContentCandidatesFromRoot(
  root: HTMLElement,
  options: TranslationBlockOptions,
  dependencies: TranslationPreparationDependencies
): HTMLElement[] {
  const maxVisibleTextLength = options.maxVisibleTextLength ?? 900;
  const candidates: HTMLElement[] = [];
  const visit = (element: HTMLElement) => {
    if (!dependencies.isVisible(element) || isWebMindGeneratedElement(element)) {
      return;
    }
    const text = translationElementVisibleText(element);
    if (!text) return;
    const children = Array.from(element.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement
    );
    const textChildren = children.filter(
      (child) =>
        dependencies.isVisible(child) &&
        !isWebMindGeneratedElement(child) &&
        Boolean(translationElementVisibleText(child))
    );
    const canUseWholeElement =
      element !== root &&
      text.length <= maxVisibleTextLength &&
      (hasDirectText(element) ||
        !textChildren.length ||
        element.matches(TRANSLATABLE_ARTICLE_UNIT_SELECTOR));
    if (canUseWholeElement) {
      candidates.push(element);
      return;
    }
    for (const child of children) visit(child);
    if (!textChildren.length && element === root && text.length <= maxVisibleTextLength) {
      candidates.push(element);
    }
  };
  visit(root);
  return candidates;
}

function articleHeadingCandidates(root: HTMLElement): HTMLElement[] {
  const localHeading = root.matches("h1, h2, [role='heading']")
    ? root
    : root.querySelector<HTMLElement>(
        "h1, h2, [role='heading'][aria-level='1'], [role='heading'][aria-level='2']"
      );
  const pageHeading = document.querySelector<HTMLElement>(
    "main h1, article h1, h1, main h2, article h2"
  );
  return [localHeading, pageHeading].filter(
    (element, index, elements): element is HTMLElement =>
      Boolean(
        element &&
          elements.indexOf(element) === index &&
          (root.contains(element) || !element.contains(root))
      )
  );
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

function linkToken(kind: "START" | "END", index: number): string {
  return `{{WEBMIND_LINK_${kind}_${index}}}`;
}

function formatToken(kind: "START" | "END", index: number): string {
  return `{{WEBMIND_FORMAT_${kind}_${index}}}`;
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
  citationNodes: HTMLElement[],
  links: TranslationLink[] | null = null,
  formats: TranslationFormat[] | null = null
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
    if (links && node instanceof HTMLAnchorElement && node.matches("a[href]")) {
      const visibleText = normalizedBlockText(
        node.innerText || node.textContent || ""
      );
      if (!visibleText) return;
      const index = links.length + 1;
      links.push({
        startToken: linkToken("START", index),
        endToken: linkToken("END", index),
        node: node.cloneNode(false) as HTMLAnchorElement,
        text: visibleText
      });
      parts.push(linkToken("START", index));
      for (const child of Array.from(node.childNodes)) visit(child);
      parts.push(linkToken("END", index));
      return;
    }
    if (formats && (node.tagName === "SUP" || node.tagName === "SUB")) {
      const visibleText = normalizedBlockText(
        node.innerText || node.textContent || ""
      );
      if (!visibleText) return;
      const index = formats.length + 1;
      formats.push({
        startToken: formatToken("START", index),
        endToken: formatToken("END", index),
        node: node.cloneNode(false) as HTMLElement,
        text: visibleText
      });
      parts.push(formatToken("START", index));
      for (const child of Array.from(node.childNodes)) visit(child);
      parts.push(formatToken("END", index));
      return;
    }
    if (node.tagName === "BR") parts.push(" ");
    for (const child of Array.from(node.childNodes)) visit(child);
    if (
      /^(?:ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DIV|FIGCAPTION|H[1-6]|LI|P|TD)$/.test(
        node.tagName
      )
    ) {
      parts.push(" ");
    }
  };
  for (const child of Array.from(root.childNodes)) visit(child);
  return normalizedBlockText(parts.join(""));
}

function translationVisibleText(text: string): string {
  return normalizedBlockText(
    text
      .replace(LINK_TOKEN_PATTERN, "")
      .replace(FORMAT_TOKEN_PATTERN, "")
      .replace(CITATION_TOKEN_PATTERN, "")
  );
}

function prepareTranslationBlock(
  element: HTMLElement,
  id: string,
  selection: boolean,
  options: TranslationBlockOptions,
  dependencies: TranslationPreparationDependencies
): PageTextBlock | null {
  const citationNodes = citationElements(element);
  const links: TranslationLink[] = [];
  const formats: TranslationFormat[] = [];
  let text = translationTextFromElement(
    element,
    citationNodes,
    options.preserveRichText ? links : null,
    options.preserveRichText ? formats : null
  );
  const visibleText = translationVisibleText(text);
  const maxVisibleTextLength = options.maxVisibleTextLength ?? 900;
  const minVisibleTextLength = options.minVisibleTextLength ?? 3;
  if (
    visibleText.length < minVisibleTextLength ||
    visibleText.length > maxVisibleTextLength
  ) {
    return null;
  }
  const citations: TranslationCitation[] = citationNodes.map((node, index) => ({
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
  ).replace(LINK_TOKEN_PATTERN, "");
  const sourceText = originalText.replace(FORMAT_TOKEN_PATTERN, "");
  dependencies.sources.set(id, {
    element,
    originalText: normalizedBlockText(sourceText),
    citations,
    links: options.preserveRichText ? links : [],
    formats: options.preserveRichText ? formats : [],
    selection
  });
  return { id, text };
}

function wrapCurrentSelection(
  textFallback: string,
  dependencies: TranslationPreparationDependencies
): HTMLElement | null {
  const selection = window.getSelection();
  const selectedText = selection?.toString().replace(/\s+/g, " ").trim();
  if (selection && selection.rangeCount && selectedText) {
    const range = selection.getRangeAt(0).cloneRange();
    const wrapper = document.createElement("span");
    wrapper.className = "webmind-immersive-source";
    wrapper.dataset.webmindBlockId = dependencies.nextBlockId();
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
  const exact = dependencies
    .textNodes(document.body)
    .find((node) => node.textContent?.includes(textFallback));
  if (!exact || !exact.textContent) return null;
  const index = exact.textContent.indexOf(textFallback);
  if (index < 0) return null;
  const range = document.createRange();
  range.setStart(exact, index);
  range.setEnd(exact, index + textFallback.length);
  const wrapper = document.createElement("span");
  wrapper.className = "webmind-immersive-source";
  wrapper.dataset.webmindBlockId = dependencies.nextBlockId();
  wrapper.append(range.extractContents());
  range.insertNode(wrapper);
  return wrapper;
}

export function prepareTranslationBlocks(
  scope: "page" | "article" | "selection" = "page",
  textFallback = "",
  options: TranslationBlockOptions = {},
  dependencies: TranslationPreparationDependencies
): PageTextBlock[] {
  dependencies.installStyles();
  if (scope === "selection") {
    const wrapper = wrapCurrentSelection(textFallback, dependencies);
    if (!wrapper) return [];
    const id = wrapper.dataset.webmindBlockId ?? "";
    const block = prepareTranslationBlock(wrapper, id, true, options, dependencies);
    return block ? [block] : [];
  }
  const root =
    scope === "article"
      ? findBestArticleRoot(options.articleExtractionRules) ??
        document.querySelector("article") ??
        document.querySelector("main") ??
        document.querySelector('[role="main"]') ??
        document.body
      : document.body;
  const articleOptions =
    scope === "article"
      ? {
          ...options,
          minVisibleTextLength: 1,
          maxVisibleTextLength: Math.max(
            options.maxVisibleTextLength ?? 0,
            20000
          )
        }
      : options;
  const articleScopeText =
    scope === "article" ? normalizedBlockText(textFallback) : "";
  const seen = new Set<string>();
  const blocks: PageTextBlock[] = [];
  if (scope === "article" && Array.isArray(options.articlePreviewBlocks)) {
    for (const previewBlock of options.articlePreviewBlocks) {
      const rawSourceText = (previewBlock.sourceText ?? previewBlock.text).trim();
      const sourceText = normalizedBlockText(rawSourceText);
      if (!sourceText) continue;
      if (
        articleScopeText &&
        !articleScopeText.includes(sourceText) &&
        !sourceText.includes(articleScopeText)
      ) {
        continue;
      }
      const element = articlePreviewBlockElement(
        previewBlock,
        root,
        dependencies
      );
      if (!element || !dependencies.isVisible(element)) continue;
      if (isWebMindGeneratedElement(element)) continue;
      if (isEditedArticleBlockExcluded(element)) continue;
      let id = dependencies.nextBlockId();
      let sourceElement: HTMLElement | null = element;
      if (
        normalizedBlockText(translationElementVisibleText(element)) === sourceText
      ) {
        id = element.dataset.webmindBlockId ?? id;
      } else {
        sourceElement = wrapArticlePreviewText(element, rawSourceText, id);
      }
      if (!sourceElement || !dependencies.isVisible(sourceElement)) continue;
      sourceElement.dataset.webmindBlockId = id;
      const prepared = prepareTranslationBlock(
        sourceElement,
        id,
        false,
        articleOptions,
        dependencies
      );
      if (!prepared) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      blocks.push({ id: prepared.id, text: rawSourceText });
    }
    return blocks;
  }
  const rootCandidates =
    scope === "article"
      ? articleContentCandidatesFromRoot(root, articleOptions, dependencies)
      : blockCandidatesFromRoot(root);
  const candidatesForScope =
    scope === "article"
      ? [
          ...articleHeadingCandidates(root).filter(
            (heading) => !rootCandidates.includes(heading)
          ),
          ...rootCandidates
        ]
      : rootCandidates;
  const orderedCandidates = candidatesForScope
    .map((element, order) => ({ element, order }))
    .filter(({ element }) => {
      if (!dependencies.isVisible(element)) return false;
      if (isWebMindGeneratedElement(element)) return false;
      if (scope === "article" && isEditedArticleBlockExcluded(element)) return false;
      if (scope !== "article" && element.closest("nav, footer, aside, [aria-hidden='true']")) return false;
      return true;
    })
    .map((candidate) => ({
      ...candidate,
      priority: dependencies.viewportPriority(candidate.element, candidate.order)
    }))
    .sort((left, right) => left.priority - right.priority)
    .map(({ element }) => element);
  const candidates =
    scope === "article" ? orderedCandidates : orderedCandidates.slice(0, 160);
  for (const element of candidates) {
    if (
      articleScopeText &&
      !articleScopeTextMatchesCandidate(
        articleScopeText,
        translationElementVisibleText(element)
      )
    ) {
      continue;
    }
    const id = element.dataset.webmindBlockId ?? dependencies.nextBlockId();
    element.dataset.webmindBlockId = id;
    const block = prepareTranslationBlock(
      element,
      id,
      false,
      articleOptions,
      dependencies
    );
    if (!block) continue;
    if (scope !== "article" && seen.has(block.text)) continue;
    seen.add(block.text);
    blocks.push(block);
  }
  if (!blocks.length && root.dataset.webmindManualArticle === "true") {
    const id = root.dataset.webmindBlockId ?? dependencies.nextBlockId();
    root.dataset.webmindBlockId = id;
    const block = prepareTranslationBlock(
      root,
      id,
      false,
      {
        ...options,
        maxVisibleTextLength: Math.max(
          options.maxVisibleTextLength ?? 0,
          20000
        )
      },
      dependencies
    );
    if (block) blocks.push(block);
  }
  return blocks;
}

export function prepareParagraphTranslationBlocks(
  target: EventTarget | null,
  textFallback = "",
  options: TranslationBlockOptions = {},
  dependencies: TranslationPreparationDependencies
): PageTextBlock[] {
  dependencies.installStyles();
  const selection = dependencies.currentSelection(target);
  if (selection?.text) {
    return prepareTranslationBlocks(
      "selection",
      selection.text,
      options,
      dependencies
    );
  }
  const element =
    dependencies.translatableElementFromTarget(target) ??
    dependencies.translatableElementFromTarget(dependencies.lastPointerTarget()) ??
    dependencies.translatableElementFromTarget(document.activeElement);
  if (!element || !dependencies.isVisible(element)) return [];
  const id = element.dataset.webmindBlockId ?? dependencies.nextBlockId();
  element.dataset.webmindBlockId = id;
  const block = prepareTranslationBlock(element, id, false, options, dependencies);
  if (block) return [block];
  const fallback = normalizedBlockText(textFallback);
  if (fallback.length < 3 || fallback.length > 900) return [];
  dependencies.sources.set(id, {
    element,
    originalText: fallback,
    citations: [],
    links: [],
    formats: [],
    selection: false
  });
  return [{ id, text: fallback }];
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

export function findTranslationSource(
  id: string,
  dependencies: TranslationPreparationDependencies
): HTMLElement | null {
  const record = dependencies.sources.get(id);
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
    const wrapper = wrapCurrentSelection(record.originalText, dependencies);
    if (wrapper) {
      wrapper.dataset.webmindBlockId = id;
      prepareTranslationBlock(
        wrapper,
        id,
        true,
        { preserveRichText: Boolean(record.links.length || record.formats.length) },
        dependencies
      );
      return wrapper;
    }
  }

  const sourceTag = record.element.tagName.toLowerCase();
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(sourceTag)
  ).filter(
    (element) =>
      dependencies.isVisible(element) &&
      !element.closest(".webmind-translation")
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
