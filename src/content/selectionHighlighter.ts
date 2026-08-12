const HIGHLIGHT_NAME = "webmind-selection-match";
const STYLE_ID = "webmind-selection-match-style";
const MARKER_HOST_ID = "webmind-selection-match-markers";
type SelectionMatchHighlightMode =
  | "off"
  | "ignore-case"
  | "case-sensitive";

interface IndexedTextNode {
  end: number;
  node: Text;
  start: number;
}

interface HighlightRegistry {
  delete(name: string): void;
  set(name: string, highlight: unknown): void;
}

interface HighlightConstructor {
  new (...ranges: Range[]): unknown;
}

let enabled = false;
let listenersAttached = false;
let frameId: number | null = null;
let activeRanges: Range[] = [];
let minTriggerChars = 1;
let matchMode: SelectionMatchHighlightMode = "off";

export const SELECTION_MATCH_HIGHLIGHT_CSS = `
::highlight(${HIGHLIGHT_NAME}) {
  background-color: #e8533f;
  color: #fff;
}
#${MARKER_HOST_ID} {
  position: fixed;
  z-index: 2147483645;
  top: 0;
  right: 0;
  width: 9px;
  height: 100vh;
  pointer-events: none;
}
#${MARKER_HOST_ID} button {
  position: absolute;
  right: 1px;
  width: 7px;
  height: 3px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 1px;
  background: #178f7c;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, .72);
  cursor: pointer;
  pointer-events: auto;
}
#${MARKER_HOST_ID} button:hover,
#${MARKER_HOST_ID} button:focus-visible {
  width: 9px;
  height: 5px;
  outline: 1px solid #0f6a5a;
  outline-offset: 1px;
}
`;

export function normalizedSelectionMatchText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function canHighlightSelectionText(
  value: string,
  minimumChars = minTriggerChars
): boolean {
  return normalizedSelectionMatchText(value).length >= minimumChars;
}

function highlightRegistry(): HighlightRegistry | undefined {
  return (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
}

function highlightConstructor(): HighlightConstructor | undefined {
  return (globalThis as unknown as { Highlight?: HighlightConstructor }).Highlight;
}

function isIgnoredTextNode(node: Text): boolean {
  const parent = node.parentElement;
  return Boolean(
    !parent ||
      parent.closest(
        "#webmind-root, script, style, noscript, textarea, input, select, option, [contenteditable='true'], [aria-hidden='true']"
      )
  );
}

function pageTextIndex(): { text: string; nodes: IndexedTextNode[] } {
  const nodes: IndexedTextNode[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let text = "";
  let node = walker.nextNode();
  while (node instanceof Text) {
    if (!isIgnoredTextNode(node) && node.data) {
      const start = text.length;
      text += node.data;
      nodes.push({ node, start, end: text.length });
    }
    node = walker.nextNode();
  }
  return { text, nodes };
}

function textOffsetAt(
  nodes: readonly IndexedTextNode[],
  offset: number,
  isEnd: boolean
): { node: Text; offset: number } | null {
  const index = nodes.findIndex(({ end }) =>
    isEnd ? offset <= end : offset < end
  );
  const entry = nodes[index] ?? (isEnd ? nodes[nodes.length - 1] : undefined);
  if (!entry) return null;
  return {
    node: entry.node,
    offset: Math.max(0, Math.min(entry.node.data.length, offset - entry.start))
  };
}

export function selectionMatchOffsets(
  pageText: string,
  selectedText: string,
  caseSensitive = true
): Array<{ start: number; end: number }> {
  if (!canHighlightSelectionText(selectedText)) return [];
  const searchablePageText = caseSensitive ? pageText : pageText.toLowerCase();
  const searchableSelectedText = caseSensitive
    ? selectedText
    : selectedText.toLowerCase();
  const matches: Array<{ start: number; end: number }> = [];
  let fromIndex = 0;
  while (true) {
    const start = searchablePageText.indexOf(searchableSelectedText, fromIndex);
    if (start < 0) break;
    matches.push({ start, end: start + selectedText.length });
    fromIndex = start + selectedText.length;
  }
  return matches;
}

function matchingRanges(selectedText: string): Range[] {
  const { text, nodes } = pageTextIndex();
  return selectionMatchOffsets(
    text,
    selectedText,
    matchMode === "case-sensitive"
  ).flatMap(({ start, end }) => {
    const rangeStart = textOffsetAt(nodes, start, false);
    const rangeEnd = textOffsetAt(nodes, end, true);
    if (!rangeStart || !rangeEnd) return [];
    const range = document.createRange();
    range.setStart(rangeStart.node, rangeStart.offset);
    range.setEnd(rangeEnd.node, rangeEnd.offset);
    return range.collapsed ? [] : [range];
  });
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = SELECTION_MATCH_HIGHLIGHT_CSS;
  (document.head ?? document.documentElement).append(style);
}

function markerHost(): HTMLElement {
  const existing = document.getElementById(MARKER_HOST_ID);
  if (existing) return existing;
  const host = document.createElement("div");
  host.id = MARKER_HOST_ID;
  document.documentElement.append(host);
  return host;
}

function clearMarkers(): void {
  document.getElementById(MARKER_HOST_ID)?.replaceChildren();
}

function renderMarkers(ranges: readonly Range[]): void {
  const host = markerHost();
  host.replaceChildren();
  const documentHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body?.scrollHeight ?? 0,
    window.innerHeight
  );
  const fragment = document.createDocumentFragment();
  for (const range of ranges) {
    const rect = range.getBoundingClientRect();
    if (rect.height <= 0) continue;
    const marker = document.createElement("button");
    marker.type = "button";
    marker.title = "Go to matching text";
    marker.style.top = `${Math.min(
      window.innerHeight - 5,
      Math.max(0, ((rect.top + window.scrollY) / documentHeight) * window.innerHeight)
    )}px`;
    marker.addEventListener("click", () => {
      const targetTop = Math.max(
        0,
        range.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.32
      );
      window.scrollTo({ top: targetTop, behavior: "smooth" });
    });
    fragment.append(marker);
  }
  host.append(fragment);
}

function clearHighlights(): void {
  activeRanges = [];
  highlightRegistry()?.delete(HIGHLIGHT_NAME);
  clearMarkers();
}

function refreshHighlights(): void {
  frameId = null;
  if (!enabled) return;
  const selection = window.getSelection();
  const selectedText = selection?.toString() ?? "";
  if (!canHighlightSelectionText(selectedText)) {
    clearHighlights();
    return;
  }
  const registry = highlightRegistry();
  const Highlight = highlightConstructor();
  if (!registry || !Highlight) return;
  const ranges = matchingRanges(selectedText);
  registry.delete(HIGHLIGHT_NAME);
  activeRanges = ranges;
  if (!ranges.length) {
    clearMarkers();
    return;
  }
  registry.set(HIGHLIGHT_NAME, new Highlight(...ranges));
  renderMarkers(ranges);
}

function scheduleRefresh(): void {
  if (!enabled || frameId !== null) return;
  frameId = window.requestAnimationFrame(refreshHighlights);
}

function refreshMarkerPositions(): void {
  if (activeRanges.length) renderMarkers(activeRanges);
}

export function setSelectionMatchHighlightMode(
  nextMode: SelectionMatchHighlightMode,
  nextMinTriggerChars = 1
): void {
  matchMode = nextMode;
  enabled = matchMode !== "off";
  minTriggerChars = Math.max(1, Math.round(nextMinTriggerChars) || 1);
  if (!enabled) {
    if (frameId !== null) window.cancelAnimationFrame(frameId);
    frameId = null;
    clearHighlights();
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(MARKER_HOST_ID)?.remove();
    if (listenersAttached) {
      document.removeEventListener("selectionchange", scheduleRefresh);
      window.removeEventListener("scroll", refreshMarkerPositions, true);
      window.removeEventListener("resize", refreshMarkerPositions);
      listenersAttached = false;
    }
    return;
  }

  ensureStyles();
  if (!listenersAttached) {
    document.addEventListener("selectionchange", scheduleRefresh);
    window.addEventListener("scroll", refreshMarkerPositions, true);
    window.addEventListener("resize", refreshMarkerPositions);
    listenersAttached = true;
  }
  scheduleRefresh();
}
