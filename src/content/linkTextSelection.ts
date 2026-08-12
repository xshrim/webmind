const LINK_TEXT_SELECTION_STYLE_ID = "webmind-link-text-selection";
const LINK_TEXT_SELECTING_ATTRIBUTE = "data-webmind-link-text-selecting";

export const LINK_TEXT_SELECTION_CSS = `
a[href],
a[href] * {
  -webkit-user-select: text !important;
  user-select: text !important;
}

a[href][${LINK_TEXT_SELECTING_ATTRIBUTE}],
a[href][${LINK_TEXT_SELECTING_ATTRIBUTE}] * {
  -webkit-user-drag: none !important;
}
`;

const LINK_SELECTION_DRAG_THRESHOLD = 4;

interface LinkSelectionPointerState {
  activationTarget: Element;
  intent: "pending" | "horizontal" | "vertical";
  startX: number;
  startY: number;
}

let listenersAttached = false;
let pointerState: LinkSelectionPointerState | null = null;

function clearLinkTextSelectingMarker(
  activationTarget: Element | null = pointerState?.activationTarget ?? null
): void {
  activationTarget?.removeAttribute(LINK_TEXT_SELECTING_ATTRIBUTE);
}

export function shouldBlockLinkDragTarget(target: EventTarget | null): boolean {
  const candidate = target as { closest?: unknown } | null;
  return (
    typeof candidate?.closest === "function" &&
    Boolean(
      (candidate.closest as (selector: string) => Element | null)("a[href]")
    )
  );
}

function selectionActivationTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  return target.closest("a[href]");
}

export function isSelectionActivationTarget(
  activationTarget: Element,
  eventTarget: EventTarget | null
): boolean {
  return eventTarget instanceof Node && activationTarget.contains(eventTarget);
}

export function hasMovedBeyondLinkSelectionThreshold(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
): boolean {
  return Math.hypot(currentX - startX, currentY - startY) >=
    LINK_SELECTION_DRAG_THRESHOLD;
}

export function isHorizontalLinkSelectionDrag(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
): boolean {
  return (
    Math.abs(currentX - startX) > Math.abs(currentY - startY)
  );
}

function blockLinkDrag(event: DragEvent): void {
  if (
    pointerState?.intent !== "horizontal" ||
    !isSelectionActivationTarget(pointerState.activationTarget, event.target) ||
    !shouldBlockLinkDragTarget(event.target)
  ) {
    return;
  }
  event.preventDefault();
}

function trackLinkSelectionStart(event: MouseEvent): void {
  clearLinkTextSelectingMarker();
  const activationTarget = selectionActivationTarget(event.target);
  if (event.button !== 0 || !activationTarget) {
    pointerState = null;
    return;
  }
  pointerState = {
    activationTarget,
    intent: "pending",
    startX: event.clientX,
    startY: event.clientY
  };
}

function trackLinkSelectionMove(event: MouseEvent): void {
  if (!pointerState || pointerState.intent !== "pending") return;
  if (
    !hasMovedBeyondLinkSelectionThreshold(
    pointerState.startX,
    pointerState.startY,
    event.clientX,
    event.clientY
    )
  ) {
    return;
  }

  pointerState.intent = isHorizontalLinkSelectionDrag(
    pointerState.startX,
    pointerState.startY,
    event.clientX,
    event.clientY
  )
    ? "horizontal"
    : "vertical";
  if (pointerState.intent === "horizontal") {
    pointerState.activationTarget.setAttribute(
      LINK_TEXT_SELECTING_ATTRIBUTE,
      ""
    );
  }
}

function clearLinkSelectionPointerState(): void {
  window.setTimeout(() => {
    clearLinkTextSelectingMarker();
    pointerState = null;
  }, 0);
}

function suppressLinkClickAfterSelection(event: MouseEvent): void {
  if (
    pointerState?.intent !== "horizontal" ||
    !isSelectionActivationTarget(pointerState.activationTarget, event.target)
  ) {
    return;
  }
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  pointerState = null;
}

export function setLinkTextSelectionEnabled(enabled: boolean): void {
  const existing = document.getElementById(LINK_TEXT_SELECTION_STYLE_ID);
  if (!enabled) {
    existing?.remove();
    clearLinkTextSelectingMarker();
    pointerState = null;
    if (listenersAttached) {
      document.removeEventListener("dragstart", blockLinkDrag, true);
      document.removeEventListener("mousedown", trackLinkSelectionStart, true);
      document.removeEventListener("mousemove", trackLinkSelectionMove, true);
      document.removeEventListener("mouseup", clearLinkSelectionPointerState, true);
      document.removeEventListener("dragend", clearLinkSelectionPointerState, true);
      document.removeEventListener("click", suppressLinkClickAfterSelection, true);
      listenersAttached = false;
    }
    return;
  }

  if (!existing) {
    const style = document.createElement("style");
    style.id = LINK_TEXT_SELECTION_STYLE_ID;
    style.textContent = LINK_TEXT_SELECTION_CSS;
    (document.head ?? document.documentElement).append(style);
  }
  if (!listenersAttached) {
    document.addEventListener("dragstart", blockLinkDrag, true);
    document.addEventListener("mousedown", trackLinkSelectionStart, true);
    document.addEventListener("mousemove", trackLinkSelectionMove, true);
    document.addEventListener("mouseup", clearLinkSelectionPointerState, true);
    document.addEventListener("dragend", clearLinkSelectionPointerState, true);
    document.addEventListener("click", suppressLinkClickAfterSelection, true);
    listenersAttached = true;
  }
}
