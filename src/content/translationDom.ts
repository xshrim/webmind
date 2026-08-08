import type {
  ImmersiveTranslationDisplayStyle,
  ImmersiveTranslationTextEffect,
  PageTranslation,
  PageTranslationMode
} from "../shared/types";
import { restoreTranslationText } from "../shared/utils";

export interface TranslationCitation {
  token: string;
  marker: string;
  node: HTMLElement;
}

export interface TranslationLink {
  startToken: string;
  endToken: string;
  node: HTMLAnchorElement;
  text: string;
}

export interface TranslationFormat {
  startToken: string;
  endToken: string;
  node: HTMLElement;
  text: string;
}

export interface TranslationSourceRecord {
  element: HTMLElement;
  originalText: string;
  citations: TranslationCitation[];
  links: TranslationLink[];
  formats: TranslationFormat[];
  selection: boolean;
}

export interface TranslationDomDependencies {
  sources: Map<string, TranslationSourceRecord>;
  findSource: (id: string) => HTMLElement | null;
  installStyles: () => void;
  classNames: (
    displayStyle: ImmersiveTranslationDisplayStyle,
    effects: ImmersiveTranslationTextEffect[]
  ) => string[];
  displayStyle: (value: unknown) => ImmersiveTranslationDisplayStyle;
  textEffects: (value: unknown) => ImmersiveTranslationTextEffect[];
  writeFailed: (id: string, source: HTMLElement | null) => void;
  clearSources: () => void;
}

const CITATION_MARKER_PATTERN =
  /^(?:\[\s*\d+(?:\s*[-,–]\s*\d+)*\s*\]|[（(【]?\s*\d+(?:\s*[-,–]\s*\d+)*\s*[)）】]?|[¹²³⁴⁵⁶⁷⁸⁹⁰]+)$/;
const CITATION_TOKEN_PATTERN =
  /(?:`?\{\{\s*WEBMIND_CITATION_(\d+)\s*\}\}`?|\[\s*WEBMIND_CITATION_(\d+)\s*\]|WEBMIND_CITATION_(\d+))/gi;
const TRANSLATION_RENDER_TOKEN_PATTERN =
  /(?:`?\{\{\s*WEBMIND_CITATION_(\d+)\s*\}\}`?|\[\s*WEBMIND_CITATION_(\d+)\s*\]|WEBMIND_CITATION_(\d+)|`?\{\{\s*WEBMIND_LINK_(START|END)_(\d+)\s*\}\}`?|\[\s*WEBMIND_LINK_(START|END)_(\d+)\s*\]|WEBMIND_LINK_(START|END)_(\d+)|`?\{\{\s*WEBMIND_FORMAT_(START|END)_(\d+)\s*\}\}`?|\[\s*WEBMIND_FORMAT_(START|END)_(\d+)\s*\]|WEBMIND_FORMAT_(START|END)_(\d+))/gi;

const TRANSLATION_DISPLAY_STYLES = [
  "default",
  "highlight",
  "divider",
  "quote",
  "blur",
  "transparent"
];
const TRANSLATION_TEXT_EFFECTS = [
  "underline",
  "dashed-underline",
  "large",
  "small",
  "bold",
  "italic",
  "emphasis",
  "light"
];

function normalizedBlockText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function citationTokenIndex(match: RegExpExecArray): number {
  return Number(match[1] ?? match[2] ?? match[3]);
}

function textWithCitationFallbacks(
  text: string,
  citations: TranslationCitation[]
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

function cloneCitation(citation: TranslationCitation): HTMLElement {
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

function cloneTranslationLink(link: TranslationLink): HTMLAnchorElement {
  const clone = link.node.cloneNode(false) as HTMLAnchorElement;
  clone.removeAttribute("id");
  for (const attribute of Array.from(clone.attributes)) {
    if (attribute.name.toLowerCase().startsWith("on")) {
      clone.removeAttribute(attribute.name);
    }
  }
  clone.classList.add("webmind-translation-link");
  clone.textContent = "";
  return clone;
}

function cloneTranslationFormat(format: TranslationFormat): HTMLElement {
  const clone = format.node.cloneNode(false) as HTMLElement;
  clone.removeAttribute("id");
  for (const attribute of Array.from(clone.attributes)) {
    if (attribute.name.toLowerCase().startsWith("on")) {
      clone.removeAttribute(attribute.name);
    }
  }
  clone.classList.add("webmind-translation-format");
  clone.textContent = "";
  return clone;
}

function renderTokenFromMatch(match: RegExpExecArray):
  | { type: "citation"; index: number }
  | { type: "link"; index: number; kind: "START" | "END" }
  | { type: "format"; index: number; kind: "START" | "END" } {
  const citationIndex = match[1] ?? match[2] ?? match[3];
  if (citationIndex) {
    return { type: "citation", index: Number(citationIndex) };
  }
  const linkKind = match[4] ?? match[6] ?? match[8];
  if (linkKind) {
    return {
      type: "link",
      kind: linkKind as "START" | "END",
      index: Number(match[5] ?? match[7] ?? match[9])
    };
  }
  return {
    type: "format",
    kind: (match[10] ?? match[12] ?? match[14]) as "START" | "END",
    index: Number(match[11] ?? match[13] ?? match[15])
  };
}

function translatedContent(
  id: string,
  text: string,
  sources: Map<string, TranslationSourceRecord>
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const record = sources.get(id);
  const citations = record?.citations ?? [];
  const links = record?.links ?? [];
  const formats = record?.formats ?? [];
  const restoredText = restoreTranslationText(text, {
    citations: citations.map((citation) => citation.marker),
    paragraphBreaks: []
  });
  const protectedText = textWithCitationFallbacks(restoredText, citations);
  const inserted = new Set<number>();
  const openInline: Array<{
    type: "link" | "format";
    index: number;
    element: HTMLElement;
    fallbackText: string;
  }> = [];
  const currentTarget = (): DocumentFragment | HTMLElement =>
    openInline[openInline.length - 1]?.element ?? fragment;
  let offset = 0;
  TRANSLATION_RENDER_TOKEN_PATTERN.lastIndex = 0;
  let match = TRANSLATION_RENDER_TOKEN_PATTERN.exec(protectedText);
  while (match) {
    if (match.index > offset) {
      currentTarget().append(
        document.createTextNode(protectedText.slice(offset, match.index))
      );
    }
    const token = renderTokenFromMatch(match);
    if (token.type === "citation") {
      const citation = citations[token.index - 1];
      if (citation && !inserted.has(token.index)) {
        currentTarget().append(cloneCitation(citation));
        inserted.add(token.index);
      }
    } else if (token.kind === "START") {
      if (token.type === "link") {
        const link = links[token.index - 1];
        if (link) {
          const clone = cloneTranslationLink(link);
          currentTarget().append(clone);
          openInline.push({
            type: token.type,
            index: token.index,
            element: clone,
            fallbackText: link.text
          });
        }
      } else {
        const format = formats[token.index - 1];
        if (format) {
          const clone = cloneTranslationFormat(format);
          currentTarget().append(clone);
          openInline.push({
            type: token.type,
            index: token.index,
            element: clone,
            fallbackText: format.text
          });
        }
      }
    } else {
      let openIndex = -1;
      for (let index = openInline.length - 1; index >= 0; index -= 1) {
        if (
          openInline[index].type === token.type &&
          openInline[index].index === token.index
        ) {
          openIndex = index;
          break;
        }
      }
      if (openIndex >= 0) {
        const inline = openInline[openIndex];
        if (!normalizedBlockText(inline.element.textContent || "")) {
          inline.element.textContent = inline.fallbackText;
        }
        openInline.splice(openIndex);
      }
    }
    offset = match.index + match[0].length;
    match = TRANSLATION_RENDER_TOKEN_PATTERN.exec(protectedText);
  }
  if (offset < protectedText.length) {
    currentTarget().append(document.createTextNode(protectedText.slice(offset)));
  }
  while (openInline.length) {
    const inline = openInline.pop();
    if (!inline) continue;
    if (!normalizedBlockText(inline.element.textContent || "")) {
      inline.element.textContent = inline.fallbackText;
    }
    inline.element.replaceWith(...Array.from(inline.element.childNodes));
  }
  citations.forEach((citation, index) => {
    if (inserted.has(index + 1)) return;
    if (fragment.childNodes.length) fragment.append(document.createTextNode(" "));
    fragment.append(cloneCitation(citation));
  });
  return fragment;
}

function removeTranslationStyleClasses(
  element: HTMLElement,
  dependencies: TranslationDomDependencies
): void {
  element.classList.remove("webmind-translated-only");
  element.classList.remove(
    ...dependencies.classNames("default", []),
    ...TRANSLATION_DISPLAY_STYLES.map((style) => `webmind-translation-${style}`),
    ...TRANSLATION_TEXT_EFFECTS.map(
      (effect) => `webmind-translation-effect-${effect}`
    )
  );
}

function translationEffectsFromDataset(
  value: string | undefined,
  dependencies: TranslationDomDependencies
): ImmersiveTranslationTextEffect[] {
  if (!value) return dependencies.textEffects([]);
  try {
    return dependencies.textEffects(JSON.parse(value));
  } catch {
    return dependencies.textEffects([]);
  }
}

export function applyTranslations(
  translations: PageTranslation[],
  mode: PageTranslationMode = "bilingual",
  displayStyle: ImmersiveTranslationDisplayStyle = "default",
  effects: ImmersiveTranslationTextEffect[] = [],
  dependencies: TranslationDomDependencies
): number {
  dependencies.installStyles();
  let count = 0;
  const classNames = dependencies.classNames(displayStyle, effects);
  for (const translation of translations) {
    const source = dependencies.findSource(translation.id);
    if (!source || !translation.text.trim()) {
      dependencies.writeFailed(translation.id, source);
      continue;
    }
    source.dataset.webmindOriginalHtml =
      source.dataset.webmindOriginalHtml ?? source.innerHTML;
    source.dataset.webmindTranslationText = translation.text;
    source.dataset.webmindTranslationMode = mode;
    source.dataset.webmindTranslationDisplayStyle = displayStyle;
    source.dataset.webmindTranslationEffects = JSON.stringify(effects);
    source.innerHTML = source.dataset.webmindOriginalHtml;
    removeTranslationStyleClasses(source, dependencies);
    document
      .querySelectorAll(`[data-webmind-for="${CSS.escape(translation.id)}"]`)
      .forEach((element) => element.remove());
    if (mode === "translation-only") {
      source.classList.add("webmind-translated-only", ...classNames);
      source.replaceChildren(
        translatedContent(translation.id, translation.text, dependencies.sources)
      );
      count += 1;
      continue;
    }
    const translated = document.createElement(
      source.matches("span, a") ? "span" : "div"
    );
    translated.className = ["webmind-translation", ...classNames].join(" ");
    translated.dataset.webmindFor = translation.id;
    translated.append(
      translatedContent(translation.id, translation.text, dependencies.sources)
    );
    if (source.matches("li, td")) {
      source.append(translated);
    } else {
      source.insertAdjacentElement("afterend", translated);
    }
    if (!translated.isConnected) {
      dependencies.writeFailed(translation.id, source);
      continue;
    }
    count += 1;
  }
  return count;
}

function setTranslationDisplayMode(
  source: HTMLElement,
  mode: PageTranslationMode,
  dependencies: TranslationDomDependencies
): boolean {
  const id = source.dataset.webmindBlockId;
  const translationText = source.dataset.webmindTranslationText;
  const originalHtml = source.dataset.webmindOriginalHtml;
  if (!id || !translationText || originalHtml === undefined) return false;
  const displayStyle = dependencies.displayStyle(
    source.dataset.webmindTranslationDisplayStyle
  );
  const effects = translationEffectsFromDataset(
    source.dataset.webmindTranslationEffects,
    dependencies
  );
  const classNames = dependencies.classNames(displayStyle, effects);
  document
    .querySelectorAll(`[data-webmind-for="${CSS.escape(id)}"]`)
    .forEach((element) => element.remove());
  source.innerHTML = originalHtml;
  removeTranslationStyleClasses(source, dependencies);
  source.dataset.webmindTranslationMode = mode;
  if (mode === "translation-only") {
    source.classList.add("webmind-translated-only", ...classNames);
    source.replaceChildren(translatedContent(id, translationText, dependencies.sources));
    return true;
  }
  const translated = document.createElement(source.matches("span, a") ? "span" : "div");
  translated.className = ["webmind-translation", ...classNames].join(" ");
  translated.dataset.webmindFor = id;
  translated.append(translatedContent(id, translationText, dependencies.sources));
  if (source.matches("li, td")) {
    source.append(translated);
  } else {
    source.insertAdjacentElement("afterend", translated);
  }
  return translated.isConnected;
}

export function toggleImmersiveTranslationDisplayMode(
  dependencies: TranslationDomDependencies
): boolean {
  const sources = Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-webmind-translation-text][data-webmind-original-html]"
    )
  );
  if (!sources.length) return false;
  const nextMode: PageTranslationMode = sources.some(
    (source) =>
      source.classList.contains("webmind-translated-only") ||
      source.dataset.webmindTranslationMode === "translation-only"
  )
    ? "bilingual"
    : "translation-only";
  let changed = false;
  for (const source of sources) {
    changed = setTranslationDisplayMode(source, nextMode, dependencies) || changed;
  }
  return changed;
}

export function restorePage(dependencies: TranslationDomDependencies): void {
  document
    .querySelectorAll(".webmind-translation")
    .forEach((element) => element.remove());
  document
    .querySelectorAll<HTMLElement>("[data-webmind-original-html]")
    .forEach((element) => {
      element.innerHTML = element.dataset.webmindOriginalHtml ?? element.innerHTML;
      delete element.dataset.webmindOriginalHtml;
      delete element.dataset.webmindTranslationText;
      delete element.dataset.webmindTranslationMode;
      delete element.dataset.webmindTranslationDisplayStyle;
      delete element.dataset.webmindTranslationEffects;
      element.classList.remove("webmind-immersive-reading-source");
      removeTranslationStyleClasses(element, dependencies);
    });
  document
    .querySelectorAll<HTMLElement>(".webmind-immersive-source")
    .forEach((element) => {
      element.replaceWith(...Array.from(element.childNodes));
    });
  document
    .querySelectorAll<HTMLElement>("[data-webmind-block-id]")
    .forEach((element) => delete element.dataset.webmindBlockId);
  dependencies.clearSources();
}
