import { searchParamNamesFromUrl } from "../shared/searchEngines";
import { cleanCitationExplanationText } from "../shared/utils";

export interface SelectionSnapshot {
  text: string;
  rect: DOMRect;
  range?: Range;
  editable?:
    | {
        element: HTMLInputElement | HTMLTextAreaElement;
        start: number;
        end: number;
      }
    | { element: HTMLElement; range: Range };
}

export interface AutoReplyTarget {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  singleLine: boolean;
  text: string;
  rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
}

const CITATION_MARKER_PATTERN =
  /^(?:\[\s*\d+(?:\s*[-,–]\s*\d+)*\s*\]|[（(【]?\s*\d+(?:\s*[-,–]\s*\d+)*\s*[)）】]?|[¹²³⁴⁵⁶⁷⁸⁹⁰]+)$/;

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

export function textFromElement(element: Element | null): string {
  if (!element) return "";
  const parts: string[] = [];
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
      const marker = (node.innerText || node.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
      parts.push(
        CITATION_MARKER_PATTERN.test(marker)
          ? marker
          : /^\d+(?:\s*[-,–—]\s*\d+)*$/.test(marker)
            ? `[${marker}]`
            : marker || ""
      );
      return;
    }
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
  for (const child of Array.from(element.childNodes)) visit(child);
  return cleanCitationExplanationText(parts
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim());
}

export function textFromElementWithLinks(element: Element | null): string {
  if (!element) return "";
  const parts: string[] = [];
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
      const marker = (node.innerText || node.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
      parts.push(
        CITATION_MARKER_PATTERN.test(marker)
          ? marker
          : /^\d+(?:\s*[-,–—]\s*\d+)*$/.test(marker)
            ? `[${marker}]`
            : marker
      );
      return;
    }
    if (node.tagName === "BR") {
      parts.push("\n");
      return;
    }
    if (node.matches("a[href]")) {
      const link = node as HTMLAnchorElement;
      const text = (link.innerText || link.textContent || "").trim();
      if (text) {
        const href = encodeURI(link.href)
          .replace(/\(/g, "%28")
          .replace(/\)/g, "%29");
        parts.push(`[${text.replace(/]/g, "\\]")}](${href})`);
        return;
      }
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
  for (const child of Array.from(element.childNodes)) visit(child);
  return cleanCitationExplanationText(parts
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim());
}

export function selectionTextWithLayout(selection: Selection | null): string {
  if (!selection?.rangeCount) return "";
  try {
    const container = document.createElement("div");
    container.append(selection.getRangeAt(0).cloneContents());
    const structured = textFromElementWithLinks(container);
    if (structured) return structured;
  } catch {
    // Fall back to the browser's plain-text selection below.
  }
  return cleanCitationExplanationText(selection
    .toString()
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim());
}

export function pageSelectionText(): string {
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

export function selectedInputText(
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

export function selectedCharacterCount(text: string): number {
  return Array.from(text).length;
}

export function currentSelection(
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

export function replaceSelection(
  snapshot: SelectionSnapshot,
  replacement: string
): void {
  const editable = snapshot.editable;
  if (!editable) return;
  if ("start" in editable && "end" in editable) {
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
  if (!("range" in editable)) return;
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

export function editableText(
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

export function setEditableText(
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

export function supportedSingleLineInput(element: HTMLInputElement): boolean {
  const type = (element.getAttribute("type") || "text").toLowerCase();
  return ["", "text", "search", "email", "url", "tel"].includes(type);
}

export function isSearchInputElement(element: HTMLElement): boolean {
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

export function autoReplyTargetFromEvent(
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
