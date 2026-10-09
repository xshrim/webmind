import { pageSelectionTextForCopy } from "./selection";

const FORCE_COPY_ATTRIBUTE = "data-webmind-force-copy";
const FORCE_COPY_STYLE_ID = "webmind-force-copy-style";
const FORCE_COPY_CSS = `
:root[${FORCE_COPY_ATTRIBUTE}][${FORCE_COPY_ATTRIBUTE}][${FORCE_COPY_ATTRIBUTE}],
:root[${FORCE_COPY_ATTRIBUTE}][${FORCE_COPY_ATTRIBUTE}][${FORCE_COPY_ATTRIBUTE}] body,
:root[${FORCE_COPY_ATTRIBUTE}][${FORCE_COPY_ATTRIBUTE}][${FORCE_COPY_ATTRIBUTE}] body * {
  -webkit-user-select: text !important;
  user-select: text !important;
}
`;

let enabled = false;
let listenerAttached = false;

function setForceCopyStyles(nextEnabled: boolean): void {
  const existing = document.getElementById(FORCE_COPY_STYLE_ID);
  if (!nextEnabled) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const style = document.createElement("style");
  style.id = FORCE_COPY_STYLE_ID;
  style.textContent = FORCE_COPY_CSS;
  (document.head ?? document.documentElement).append(style);
}

function copySelectedText(event: ClipboardEvent): void {
  if (!enabled || !event.clipboardData) return;
  const text = pageSelectionTextForCopy();
  if (!text) return;
  event.clipboardData.setData("text/plain", text);
  event.preventDefault();
}

export function setForceCopyEnabled(nextEnabled: boolean): boolean {
  enabled = nextEnabled;
  document.documentElement.toggleAttribute(FORCE_COPY_ATTRIBUTE, enabled);
  setForceCopyStyles(enabled);
  if (!listenerAttached) {
    window.addEventListener("copy", copySelectedText, true);
    listenerAttached = true;
  }
  return enabled;
}

export function isForceCopyEnabled(): boolean {
  return enabled;
}
