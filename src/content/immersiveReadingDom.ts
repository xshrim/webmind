import type {
  ImmersiveReadingBackgroundStyle,
  ImmersiveReadingMode,
  ImmersiveTranslationTextEffect,
  PageTranslation
} from "../shared/types";
import {
  clampReadingLevel,
  cleanReadingTranslation,
  containsWebMindPlaceholder,
  sanitizeReadingMarkerValue
} from "../shared/immersiveReading";

export interface ReadingCitation {
  token: string;
  marker: string;
  node: HTMLElement;
}

export interface ReadingSourceRecord {
  element: HTMLElement;
  originalText: string;
  citations: ReadingCitation[];
  selection: boolean;
}

export interface ImmersiveReadingDomDependencies {
  sources: Map<string, ReadingSourceRecord>;
  findSource: (id: string) => HTMLElement | null;
  installStyles: () => void;
  log: (message: string) => void;
}

const IMMERSIVE_READING_TOKEN_PATTERN =
  /\[\[WEBMIND_READING\|([^|\]\n]{1,160})\|([^|\]\n]{1,160})(?:\|([1-5]))?\]\]/g;
const IMMERSIVE_READING_OR_CITATION_PATTERN =
  /\[\[WEBMIND_READING\|([^|\]\n]{1,160})\|([^|\]\n]{1,160})(?:\|([1-5]))?\]\]|(?:`?\{\{\s*WEBMIND_CITATION_(\d+)\s*\}\}`?|\[\s*WEBMIND_CITATION_(\d+)\s*\]|WEBMIND_CITATION_(\d+))/gi;

function normalizedBlockText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function textNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }
  return nodes;
}

function cloneCitation(citation: ReadingCitation): HTMLElement {
  const clone = citation.node.cloneNode(true) as HTMLElement;
  const descendants = [
    clone,
    ...Array.from(clone.querySelectorAll<HTMLElement>("*"))
  ];
  for (const element of descendants) {
    element.removeAttribute("id");
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.toLowerCase().startsWith("on")) {
        element.removeAttribute(attribute.name);
      }
    }
  }
  clone
    .querySelectorAll("script, style, iframe, object, embed")
    .forEach((node) => node.remove());
  return clone;
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
  backgroundStyle: ImmersiveReadingBackgroundStyle,
  level: number,
  outerEffects: ImmersiveTranslationTextEffect[],
  innerEffects: ImmersiveTranslationTextEffect[]
): HTMLSpanElement {
  const token = document.createElement("span");
  const levelClass = `webmind-immersive-reading-level-${clampReadingLevel(level)}`;
  token.className = [
    "webmind-immersive-reading-token",
    `webmind-immersive-reading-highlight-${backgroundStyle}`,
    backgroundStyle === "leveled" ? levelClass : ""
  ]
    .filter(Boolean)
    .join(" ");
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
  backgroundStyle: ImmersiveReadingBackgroundStyle,
  outerEffects: ImmersiveTranslationTextEffect[],
  innerEffects: ImmersiveTranslationTextEffect[],
  sources: Map<string, ReadingSourceRecord>
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const citations = sources.get(id)?.citations ?? [];
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
        const level = clampReadingLevel(match[3]);
        if (original && translation) {
          fragment.append(
            createReadingToken(
              original,
              translation,
              mode,
              backgroundStyle,
              level,
              outerEffects,
              innerEffects
            )
          );
        }
      }
    } else {
      const citationIndex = Number(match[4] ?? match[5] ?? match[6]);
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
  backgroundStyle: ImmersiveReadingBackgroundStyle,
  outerEffects: ImmersiveTranslationTextEffect[],
  innerEffects: ImmersiveTranslationTextEffect[]
): number {
  const pairs: Array<{ original: string; translation: string; level: number }> = [];
  IMMERSIVE_READING_TOKEN_PATTERN.lastIndex = 0;
  let match = IMMERSIVE_READING_TOKEN_PATTERN.exec(text);
  while (match) {
    pairs.push({
      original: match[1].trim(),
      translation: match[2].trim(),
      level: clampReadingLevel(match[3])
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
        backgroundStyle,
        pair.level,
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
    (match, original, _translation, _level, citationA, citationB, citationC) => {
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

export function applyImmersiveReading(
  translations: PageTranslation[],
  mode: ImmersiveReadingMode,
  backgroundStyle: ImmersiveReadingBackgroundStyle,
  outerEffects: ImmersiveTranslationTextEffect[],
  innerEffects: ImmersiveTranslationTextEffect[],
  dependencies: ImmersiveReadingDomDependencies
): number {
  dependencies.installStyles();
  dependencies.log(
    `[workflow] immersive reading apply start translations=${translations.length} mode=${mode}`
  );
  let count = 0;
  let replacedTotal = 0;
  let wholeBlockFallbacks = 0;
  let unsafeFallbackSkips = 0;
  for (const translation of translations) {
    IMMERSIVE_READING_TOKEN_PATTERN.lastIndex = 0;
    if (!IMMERSIVE_READING_TOKEN_PATTERN.test(translation.text)) continue;
    const source = dependencies.findSource(translation.id);
    if (!source) continue;
    source.dataset.webmindOriginalHtml =
      source.dataset.webmindOriginalHtml ?? source.innerHTML;
    source.innerHTML = source.dataset.webmindOriginalHtml;
    const replaced = applyReadingTokensInPlace(
      source,
      translation.text,
      mode,
      backgroundStyle,
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
          backgroundStyle,
          outerEffects,
          innerEffects,
          dependencies.sources
        )
      );
      wholeBlockFallbacks += 1;
    } else if (!replaced) {
      unsafeFallbackSkips += 1;
    }
    count += 1;
  }
  dependencies.log(
    `[workflow] immersive reading apply done appliedBlocks=${count} replacedTokens=${replacedTotal} wholeBlockFallbacks=${wholeBlockFallbacks} unsafeFallbackSkips=${unsafeFallbackSkips}`
  );
  return count;
}
