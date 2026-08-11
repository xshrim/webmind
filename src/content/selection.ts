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

export function markdownLinkLabel(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/([\[\]])/g, "\\$1");
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
      const text = markdownLinkLabel(link.innerText || link.textContent || "");
      if (text) {
        const href = encodeURI(link.href)
          .replace(/\(/g, "%28")
          .replace(/\)/g, "%29");
        parts.push(`[${text}](${href})`);
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

function escapeMarkdownText(value: string): string {
  return value.replace(/[\\`*_~]/g, "\\$&");
}

function markdownHref(value: string): string {
  return encodeURI(value)
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E");
}

function markdownInlineFromNode(node: Node): string {
  if (node instanceof Text) {
    return escapeMarkdownText(
      (node.textContent ?? "").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ")
    );
  }
  if (!(node instanceof HTMLElement)) return "";
  if (
    node.matches(
      "script, style, noscript, template, svg, canvas, [hidden], [aria-hidden='true'], .webmind-root, .webmind-translation, .webmind-reading, .webmind-immersive-reading-token"
    )
  ) {
    return "";
  }
  if (node.isConnected) {
    const style = node.ownerDocument.defaultView?.getComputedStyle(node);
    if (
      style &&
      (style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse" ||
        style.contentVisibility === "hidden" ||
        node.getClientRects().length === 0)
    ) {
      return "";
    }
  }
  const citationAnchor = node.matches("a[href]")
    ? (node as HTMLAnchorElement)
    : node.tagName === "SUP"
      ? node.querySelector<HTMLAnchorElement>("a[href]")
      : null;
  if (
    citationAnchor &&
    (node.tagName === "SUP" || isCitationAnchor(citationAnchor))
  ) {
    const marker = (node.innerText || node.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    return CITATION_MARKER_PATTERN.test(marker)
      ? marker
      : /^\d+(?:\s*[-,–—]\s*\d+)*$/.test(marker)
        ? `[${marker}]`
        : escapeMarkdownText(marker);
  }
  if (node.tagName === "BR") return "\n";
  if (node.tagName === "IMG") {
    return escapeMarkdownText(node.getAttribute("alt")?.trim() ?? "");
  }
  if (node.tagName === "A") {
    const link = node as HTMLAnchorElement;
    const label = markdownLinkLabel(
      Array.from(link.childNodes).map(markdownInlineFromNode).join("")
    );
    if (!label || !link.href) return label;
    return `[${label}](${markdownHref(link.href)})`;
  }
  if (node.tagName === "PRE") {
    const code = (node.textContent ?? "").replace(/\r\n?/g, "\n").trim();
    return code ? `\n\n${"```"}\n${code}\n${"```"}\n\n` : "";
  }
  const content = Array.from(node.childNodes)
    .map(markdownInlineFromNode)
    .join("");
  switch (node.tagName) {
    case "STRONG":
    case "B":
      return content.trim() ? `<strong>${content}</strong>` : "";
    case "EM":
    case "I":
      return content.trim() ? `<em>${content}</em>` : "";
    case "U":
      return content.trim() ? `<u>${content}</u>` : "";
    case "S":
    case "DEL":
    case "STRIKE":
      return content.trim() ? `<del>${content}</del>` : "";
    case "CODE":
      return content.trim() ? `<code>${content}</code>` : "";
    case "BLOCKQUOTE":
      return content.trim()
        ? `\n\n${content.trim().split("\n").map((line) => `> ${line}`).join("\n")}\n\n`
        : "";
    case "H1":
    case "H2":
    case "H3":
    case "H4":
    case "H5":
    case "H6": {
      const level = Number(node.tagName.slice(1));
      return content.trim() ? `\n\n${"#".repeat(level)} ${content.trim()}\n\n` : "";
    }
    case "LI":
      if (!content.trim()) return "";
      if (node.parentElement?.tagName === "OL") {
        const index = Array.from(node.parentElement.children).indexOf(node) + 1;
        return `\n${index}. ${content.trim()}\n`;
      }
      return `\n- ${content.trim()}\n`;
    default:
      return content + (/^(?:ADDRESS|ARTICLE|ASIDE|DIV|FIGCAPTION|P|SECTION|TR|TD|TH|UL|OL|DL|DT|DD|FIGURE|DETAILS)$/.test(node.tagName) ? "\n\n" : "");
  }
}

export function markdownFromElement(element: Element | null): string {
  if (!element) return "";
  return cleanCitationExplanationText(
    Array.from(element.childNodes)
      .map(markdownInlineFromNode)
      .join("")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export function markdownFromText(value: string): string {
  return escapeMarkdownText(value.replace(/\r\n?/g, "\n").trim());
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

export function selectionMarkdownWithLayout(selection: Selection | null): string {
  if (!selection?.rangeCount) return "";
  try {
    const container = document.createElement("div");
    container.append(selection.getRangeAt(0).cloneContents());
    const structured = markdownFromElement(container);
    if (structured) return structured;
  } catch {
    // Fall back to plain selected text below.
  }
  return markdownFromText(selection.toString());
}

export function pageSelectionMarkdown(): string {
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement
  ) {
    const start = active.selectionStart ?? 0;
    const end = active.selectionEnd ?? start;
    return markdownFromText(active.value.slice(start, end));
  }
  return selectionMarkdownWithLayout(window.getSelection());
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
