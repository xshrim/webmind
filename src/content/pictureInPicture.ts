import { uiText } from "../shared/i18n";
import type { AppLanguage } from "../shared/types";

interface PictureInPictureWindowApi {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
}

export interface PictureInPictureVideoTarget {
  id: string;
  video: HTMLVideoElement;
  rect: { left: number; top: number; width: number; height: number };
  active: boolean;
}

export interface PictureInPictureResult {
  kind: "video" | "element";
}

interface DocumentContext {
  document: Document;
  window: Window;
}

interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface StyledElement extends Element {
  style: CSSStyleDeclaration;
}

interface ComputedStyleSnapshot {
  element: StyledElement;
  originalStyle: string | null;
  declarations: Array<[string, string, string]>;
}

function rectRight(rect: RectLike): number {
  return rect.left + rect.width;
}

function rectBottom(rect: RectLike): number {
  return rect.top + rect.height;
}

const PICTURE_IN_PICTURE_UI_CLASS = "webmind-pip-picker-ui";
const NON_RENDERED_TAGS = new Set([
  "html",
  "body",
  "head",
  "script",
  "style",
  "noscript",
  "template",
  "meta",
  "link",
  "title"
]);

let cancelSelection: (() => void) | null = null;

function isElementNode(value: unknown): value is Element {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Node).nodeType === Node.ELEMENT_NODE &&
      typeof (value as Element).tagName === "string"
  );
}

function isIframeElement(value: unknown): value is HTMLIFrameElement {
  return isElementNode(value) && value.tagName.toLowerCase() === "iframe";
}

function shadowRootOf(element: Element): ShadowRoot | null {
  const shadowRoot = (element as Element & { shadowRoot?: ShadowRoot | null })
    .shadowRoot;
  return shadowRoot ?? null;
}

function isShadowRootNode(value: unknown): value is ShadowRoot {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as Node).nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
      "host" in (value as object)
  );
}

function isPictureInPictureWindowApi(
  value: unknown
): value is PictureInPictureWindowApi {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { requestWindow?: unknown }).requestWindow === "function"
  );
}

function pictureInPictureWindowFor(
  sourceWindow: Window | null | undefined
): PictureInPictureWindowApi | null {
  const sourceApi = sourceWindow
    ? (sourceWindow as Window & {
        documentPictureInPicture?: unknown;
      }).documentPictureInPicture
    : null;
  if (isPictureInPictureWindowApi(sourceApi)) return sourceApi;
  const topApi = (window as Window & {
    documentPictureInPicture?: unknown;
  }).documentPictureInPicture;
  return isPictureInPictureWindowApi(topApi) ? topApi : null;
}

function isVideoElement(element: Element): element is HTMLVideoElement {
  return element.tagName.toLowerCase() === "video";
}

function isWebMindElement(element: Element): boolean {
  return Boolean(
    element.closest(
      `#webmind-root, .webmind-root, .webmind-translation, .webmind-reading, .webmind-immersive-reading-token, .${PICTURE_IN_PICTURE_UI_CLASS}`
    )
  );
}

function elementIsVisible(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  if (NON_RENDERED_TAGS.has(tagName) || isWebMindElement(element)) return false;
  const ownerWindow = element.ownerDocument.defaultView;
  if (!ownerWindow) return false;
  const style = ownerWindow.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number(style.opacity) === 0
  ) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width >= 8 && rect.height >= 8 && element.getClientRects().length > 0;
}

function pickerCandidatesFromEvent(event: Event): Element[] {
  const path = event.composedPath();
  if (
    path.some(
      (item) => isElementNode(item) && isWebMindElement(item)
    )
  ) {
    return [];
  }
  const candidates: Element[] = [];
  for (const item of path) {
    if (!isElementNode(item) || !elementIsVisible(item)) continue;
    candidates.push(item);
  }
  return Array.from(new Set(candidates));
}

function elementLabel(element: Element, level: number): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const className =
    typeof element.className === "string"
      ? element.className
          .split(/\s+/)
          .filter((name) => name && !name.startsWith("webmind-"))
          .slice(0, 2)
          .map((name) => `.${name}`)
          .join("")
      : "";
  const rect = element.getBoundingClientRect();
  return `${tag}${id}${className} · L${level + 1} · ${Math.round(
    rect.width
  )}×${Math.round(rect.height)}`;
}

function rectWithinTopViewport(element: Element): RectLike | null {
  const sourceWindow = element.ownerDocument.defaultView;
  if (!sourceWindow) return null;
  const sourceRect = element.getBoundingClientRect();
  let left = sourceRect.left;
  let top = sourceRect.top;
  let frameWindow = sourceWindow;
  while (frameWindow !== window) {
    const frame = frameWindow.frameElement;
    if (!isIframeElement(frame)) break;
    const frameRect = frame.getBoundingClientRect();
    left += frameRect.left + frame.clientLeft;
    top += frameRect.top + frame.clientTop;
    frameWindow = frame.ownerDocument.defaultView ?? window;
  }
  return {
    left,
    top,
    width: sourceRect.width,
    height: sourceRect.height
  };
}

function collectDocumentContexts(): DocumentContext[] {
  const contexts: DocumentContext[] = [];
  const seenDocuments = new Set<Document>();

  const visitRoot = (root: ParentNode) => {
    for (const element of Array.from(root.querySelectorAll("*"))) {
      if (isIframeElement(element)) {
        try {
          if (element.contentDocument) visitDocument(element.contentDocument);
        } catch {
          // Cross-origin frames remain outside the content script boundary.
        }
      }
      const shadowRoot = shadowRootOf(element);
      if (shadowRoot) {
        visitRoot(shadowRoot);
      }
    }
  };

  const visitDocument = (nextDocument: Document) => {
    if (seenDocuments.has(nextDocument)) return;
    const nextWindow = nextDocument.defaultView;
    if (!nextWindow) return;
    seenDocuments.add(nextDocument);
    contexts.push({ document: nextDocument, window: nextWindow });
    visitRoot(nextDocument);
  };

  visitDocument(document);
  return contexts;
}

function styledElementOf(element: Element): StyledElement | null {
  const style = (element as Element & { style?: unknown }).style;
  return style && typeof (style as CSSStyleDeclaration).setProperty === "function"
    ? (element as StyledElement)
    : null;
}

function snapshotComputedStyle(root: Element): ComputedStyleSnapshot[] {
  const sourceWindow = root.ownerDocument.defaultView;
  const element = styledElementOf(root);
  if (!sourceWindow || !element) return [];
  const computed = sourceWindow.getComputedStyle(element);
  const declarations: Array<[string, string, string]> = [];
  for (const property of Array.from(computed)) {
    const value = computed.getPropertyValue(property);
    if (!value) continue;
    declarations.push([
      property,
      value,
      computed.getPropertyPriority(property)
    ]);
  }
  return [{
    element,
    originalStyle: element.getAttribute("style"),
    declarations
  }];
}

function applyComputedStyles(snapshots: ComputedStyleSnapshot[]): void {
  for (const snapshot of snapshots) {
    for (const [property, value, priority] of snapshot.declarations) {
      snapshot.element.style.setProperty(property, value, priority);
    }
  }
}

function restoreInlineStyles(snapshots: ComputedStyleSnapshot[]): void {
  for (const snapshot of snapshots) {
    if (snapshot.originalStyle === null) {
      snapshot.element.removeAttribute("style");
    } else {
      snapshot.element.setAttribute("style", snapshot.originalStyle);
    }
  }
}

function copyElementAttributes(source: Element, target: Element): void {
  for (const attribute of Array.from(source.attributes)) {
    if (attribute.name === "style") continue;
    target.setAttribute(attribute.name, attribute.value);
  }
}

function copyStylesToPictureInPictureWindow(
  sourceDocument: Document,
  sourceRoot: Node,
  targetDocument: Document
): void {
  if (sourceDocument.documentElement) {
    copyElementAttributes(
      sourceDocument.documentElement,
      targetDocument.documentElement
    );
  }
  if (sourceDocument.body) {
    copyElementAttributes(sourceDocument.body, targetDocument.body);
  }
  const base = targetDocument.createElement("base");
  base.href = sourceDocument.baseURI;
  targetDocument.head.append(base);

  const styleNodes = [
    ...Array.from(sourceDocument.querySelectorAll("style, link[rel='stylesheet']")),
    ...(isShadowRootNode(sourceRoot)
      ? Array.from(sourceRoot.querySelectorAll("style, link[rel='stylesheet']"))
      : [])
  ];
  for (const node of Array.from(new Set(styleNodes))) {
    const clone = node.cloneNode(true) as Element;
    if (node.tagName.toLowerCase() === "link") {
      const href = (node as HTMLLinkElement).href;
      if (href) clone.setAttribute("href", href);
    }
    targetDocument.head.append(clone);
  }

  const defaultStyle = targetDocument.createElement("style");
  defaultStyle.textContent =
    "html, body { width: 100%; height: 100%; margin: 0; min-width: 0; min-height: 0; overflow: hidden; }";
  targetDocument.head.append(defaultStyle);
}

function pictureInPictureError(language?: AppLanguage): Error {
  return new Error(uiText(language, "unsupportedQuickAction"));
}

export async function openPictureInPicture(
  target: Element,
  language?: AppLanguage
): Promise<PictureInPictureResult> {
  const sourceDocument = target.ownerDocument;
  const sourceWindow = sourceDocument.defaultView;
  if (!sourceWindow) throw pictureInPictureError(language);

  if (isVideoElement(target)) {
    if (
      !sourceDocument.pictureInPictureEnabled ||
      target.disablePictureInPicture ||
      typeof target.requestPictureInPicture !== "function"
    ) {
      throw pictureInPictureError(language);
    }
    if (sourceDocument.pictureInPictureElement === target) {
      await sourceDocument.exitPictureInPicture();
    } else {
      await target.requestPictureInPicture();
    }
    return { kind: "video" };
  }

  const pictureInPictureWindow = pictureInPictureWindowFor(sourceWindow);
  if (!pictureInPictureWindow || !target.parentNode) {
    throw pictureInPictureError(language);
  }
  const rect = target.getBoundingClientRect();
  const width = Math.max(160, Math.min(960, Math.round(rect.width || 420)));
  const height = Math.max(120, Math.min(720, Math.round(rect.height || 280)));
  // Keep requestWindow in the click task so the browser's user activation is preserved.
  const pictureInPictureWindowPromise = pictureInPictureWindow.requestWindow({
    width,
    height
  });
  const nextWindow = await pictureInPictureWindowPromise;
  const styleSnapshots = snapshotComputedStyle(target);
  const sourceRoot = target.getRootNode();
  copyStylesToPictureInPictureWindow(sourceDocument, sourceRoot, nextWindow.document);
  if (nextWindow.closed || !target.parentNode) return { kind: "element" };
  const placeholder = sourceDocument.createComment("webmind-picture-in-picture");
  target.parentNode.replaceChild(placeholder, target);
  const stage = nextWindow.document.createElement("div");
  Object.assign(stage.style, {
    position: "absolute",
    width: `${Math.max(1, rect.width)}px`,
    height: `${Math.max(1, rect.height)}px`,
    transformOrigin: "top left"
  });
  stage.append(target);
  nextWindow.document.body.replaceChildren(stage);
  nextWindow.document.documentElement.style.overflow = "hidden";
  nextWindow.document.body.style.overflow = "hidden";
  applyComputedStyles(styleSnapshots);

  const fitContent = () => {
    const scale = Math.min(
      nextWindow.innerWidth / Math.max(1, rect.width),
      nextWindow.innerHeight / Math.max(1, rect.height)
    );
    stage.style.left = `${Math.max(0, (nextWindow.innerWidth - rect.width * scale) / 2)}px`;
    stage.style.top = `${Math.max(0, (nextWindow.innerHeight - rect.height * scale) / 2)}px`;
    stage.style.transform = `scale(${scale})`;
  };
  fitContent();
  nextWindow.addEventListener("resize", fitContent);

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    nextWindow.removeEventListener("resize", fitContent);
    if (placeholder.isConnected) {
      placeholder.replaceWith(target);
    } else if (target.isConnected) {
      target.remove();
    } else if (sourceDocument.body) {
      sourceDocument.body.append(target);
    }
    restoreInlineStyles(styleSnapshots);
  };
  nextWindow.addEventListener("pagehide", restore, { once: true });
  return { kind: "element" };
}

export function startPictureInPictureSelection(
  language?: AppLanguage
): Promise<PictureInPictureResult | null> {
  cancelSelection?.();
  const contexts = collectDocumentContexts();
  return new Promise((resolve, reject) => {
    let settled = false;
    const overlays: HTMLElement[] = [];
    const badges: HTMLElement[] = [];
    const cleanupCallbacks: Array<() => void> = [];
    const states = contexts.map(() => ({
      candidates: [] as Element[],
      level: 0,
      current: null as Element | null
    }));

    const updateOverlay = (
      index: number,
      context: DocumentContext
    ) => {
      const state = states[index];
      const overlay = overlays[index];
      const badge = badges[index];
      state.current = state.candidates[state.level] ?? null;
      if (!state.current) {
        overlay.style.display = "none";
        badge.style.display = "none";
        return;
      }
      const rect = state.current.getBoundingClientRect();
      const width = Math.max(
        0,
        Math.min(context.window.innerWidth, rect.right) - Math.max(0, rect.left)
      );
      const height = Math.max(
        0,
        Math.min(context.window.innerHeight, rect.bottom) - Math.max(0, rect.top)
      );
      Object.assign(overlay.style, {
        display: "block",
        left: `${Math.max(0, rect.left)}px`,
        top: `${Math.max(0, rect.top)}px`,
        width: `${width}px`,
        height: `${height}px`
      });
      Object.assign(badge.style, {
        display: "block",
        left: `${Math.min(
          context.window.innerWidth - 16,
          Math.max(8, rect.left)
        )}px`,
        top: `${Math.min(
          context.window.innerHeight - 80,
          Math.max(8, rect.top - 56)
        )}px`
      });
      badge.textContent = [
        elementLabel(state.current, state.level),
        uiText(language, "pictureInPictureSelectionHint")
      ].join("\n");
    };

    const cleanup = () => {
      for (const cleanupCallback of cleanupCallbacks) cleanupCallback();
      overlays.forEach((overlay) => overlay.remove());
      badges.forEach((badge) => badge.remove());
      cancelSelection = null;
    };

    const finish = (element: Element | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!element) {
        resolve(null);
        return;
      }
      void openPictureInPicture(element, language).then(resolve, reject);
    };

    contexts.forEach((context, index) => {
      const overlay = context.document.createElement("div");
      const badge = context.document.createElement("div");
      overlay.className = PICTURE_IN_PICTURE_UI_CLASS;
      badge.className = PICTURE_IN_PICTURE_UI_CLASS;
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
        maxWidth: "min(620px, calc(100vw - 16px))",
        padding: "7px 9px",
        border: "1px solid #d8ddda",
        borderRadius: "6px",
        color: "#17201e",
        background: "#ffffff",
        boxShadow: "0 10px 28px rgba(15, 26, 23, 0.2)",
        font: "12px/1.4 Inter, ui-sans-serif, system-ui, sans-serif",
        pointerEvents: "none",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        display: "block",
        left: "8px",
        top: "8px"
      });
      context.document.documentElement.append(overlay, badge);
      overlays[index] = overlay;
      badges[index] = badge;

      const onPointerMove = (event: PointerEvent) => {
        const state = states[index];
        state.candidates = pickerCandidatesFromEvent(event);
        state.level = 0;
        updateOverlay(index, context);
      };
      const onWheel = (event: WheelEvent) => {
        const state = states[index];
        if (!state.candidates.length) return;
        event.preventDefault();
        event.stopPropagation();
        state.level = Math.max(
          0,
          Math.min(
            state.candidates.length - 1,
            state.level + (event.deltaY > 0 ? 1 : -1)
          )
        );
        updateOverlay(index, context);
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          finish(null);
          return;
        }
        const state = states[index];
        if (!state.candidates.length) return;
        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          event.stopPropagation();
          state.level = Math.min(state.candidates.length - 1, state.level + 1);
          updateOverlay(index, context);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          state.level = Math.max(0, state.level - 1);
          updateOverlay(index, context);
        }
      };
      const onClick = (event: MouseEvent) => {
        if (!event.isTrusted || event.button !== 0 || event.detail === 0) return;
        const eventPath = event.composedPath();
        if (
          eventPath.some((item) => isElementNode(item) && isWebMindElement(item))
        ) {
          return;
        }
        const state = states[index];
        if (!state.current || !eventPath.includes(state.current)) return;
        event.preventDefault();
        event.stopPropagation();
        finish(state.current);
      };
      const update = () => updateOverlay(index, context);
      context.window.addEventListener("pointermove", onPointerMove, true);
      context.window.addEventListener("wheel", onWheel, {
        capture: true,
        passive: false
      });
      context.window.addEventListener("keydown", onKeyDown, true);
      context.window.addEventListener("click", onClick, true);
      context.window.addEventListener("scroll", update, true);
      context.window.addEventListener("resize", update);
      cleanupCallbacks.push(() => {
        context.window.removeEventListener("pointermove", onPointerMove, true);
        context.window.removeEventListener("wheel", onWheel, true);
        context.window.removeEventListener("keydown", onKeyDown, true);
        context.window.removeEventListener("click", onClick, true);
        context.window.removeEventListener("scroll", update, true);
        context.window.removeEventListener("resize", update);
      });
    });

    cancelSelection = () => finish(null);
    badges[0].textContent = uiText(language, "pictureInPicture");
  });
}

export function cancelPictureInPictureSelection(): { ok: boolean } {
  if (!cancelSelection) return { ok: false };
  cancelSelection();
  return { ok: true };
}

function scanNestedRoots(
  root: ParentNode,
  registerDocument: (nextDocument: Document) => void,
  registerShadowRoot: (shadowRoot: ShadowRoot) => void,
  registerVideo: (video: HTMLVideoElement) => void,
  registerFrame: (frame: HTMLIFrameElement) => void
): void {
  for (const element of Array.from(root.querySelectorAll("*"))) {
    if (element.tagName.toLowerCase() === "video") {
      registerVideo(element as HTMLVideoElement);
    }
    if (isIframeElement(element)) registerFrame(element);
    const shadowRoot = shadowRootOf(element);
    if (shadowRoot) {
      registerShadowRoot(shadowRoot);
      scanNestedRoots(
        shadowRoot,
        registerDocument,
        registerShadowRoot,
        registerVideo,
        registerFrame
      );
    }
  }
}

function topViewportRect(video: HTMLVideoElement): RectLike | null {
  const rect = rectWithinTopViewport(video);
  if (!rect || rect.width < 24 || rect.height < 24) return null;
  if (
    rectRight(rect) < 0 ||
    rectBottom(rect) < 0 ||
    rect.left > window.innerWidth ||
    rect.top > window.innerHeight
  ) {
    return null;
  }
  return rect;
}

export function observePictureInPictureVideos(
  onChange: (targets: PictureInPictureVideoTarget[]) => void
): () => void {
  const videos = new Set<HTMLVideoElement>();
  const documents = new Set<Document>();
  const roots = new Set<ParentNode>();
  const observers: MutationObserver[] = [];
  const frameListeners = new Map<HTMLIFrameElement, () => void>();
  const videoListeners = new Map<HTMLVideoElement, () => void>();
  const ids = new WeakMap<HTMLVideoElement, string>();
  let nextId = 1;
  let refreshFrame: number | null = null;
  let stopped = false;

  const emit = () => {
    if (stopped) return;
    const targets = Array.from(videos)
      .filter((video) => video.isConnected && !video.disablePictureInPicture)
      .map((video) => {
        const rect = topViewportRect(video);
        if (!rect) return null;
        const ownerDocument = video.ownerDocument;
        if (!ownerDocument.pictureInPictureEnabled) return null;
        return {
          id: ids.get(video) ?? "",
          video,
          rect,
          active: ownerDocument.pictureInPictureElement === video
        } satisfies PictureInPictureVideoTarget;
      })
      .filter((target): target is PictureInPictureVideoTarget => Boolean(target));
    onChange(targets);
  };

  const scheduleEmit = () => {
    if (refreshFrame !== null || stopped) return;
    refreshFrame = window.requestAnimationFrame(() => {
      refreshFrame = null;
      emit();
    });
  };

  const registerVideo = (video: HTMLVideoElement) => {
    if (videos.has(video)) return;
    videos.add(video);
    ids.set(video, `webmind-pip-video-${nextId++}`);
    const update = () => scheduleEmit();
    [
      "enterpictureinpicture",
      "leavepictureinpicture",
      "loadedmetadata",
      "durationchange",
      "emptied"
    ].forEach((eventName) => video.addEventListener(eventName, update));
    videoListeners.set(video, () => {
      [
        "enterpictureinpicture",
        "leavepictureinpicture",
        "loadedmetadata",
        "durationchange",
        "emptied"
      ].forEach((eventName) => video.removeEventListener(eventName, update));
    });
  };

  const registerFrame = (frame: HTMLIFrameElement) => {
    if (frameListeners.has(frame)) return;
    const onLoad = () => {
      try {
        if (frame.contentDocument) registerDocument(frame.contentDocument);
      } catch {
        // Cross-origin frames remain outside the content script boundary.
      }
      scheduleEmit();
    };
    frame.addEventListener("load", onLoad);
    frameListeners.set(frame, () => frame.removeEventListener("load", onLoad));
    try {
      if (frame.contentDocument) registerDocument(frame.contentDocument);
    } catch {
      // Cross-origin frames remain outside the content script boundary.
    }
  };

  const registerShadowRoot = (shadowRoot: ShadowRoot) => {
    registerRoot(shadowRoot);
  };

  const scan = (root: ParentNode) => {
    scanNestedRoots(
      root,
      registerDocument,
      registerShadowRoot,
      registerVideo,
      registerFrame
    );
    scheduleEmit();
  };

  const registerRoot = (root: ParentNode) => {
    if (roots.has(root)) return;
    roots.add(root);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
            if (isElementNode(node)) {
            if (node.tagName.toLowerCase() === "video") {
              registerVideo(node as HTMLVideoElement);
            }
            if (isIframeElement(node)) registerFrame(node);
            const shadowRoot = shadowRootOf(node);
            if (shadowRoot) {
              registerShadowRoot(shadowRoot);
            }
            scan(node);
          }
        }
      }
      scheduleEmit();
    });
    observer.observe(root, { childList: true, subtree: true });
    observers.push(observer);
    scan(root);
  };

  const registerDocument = (nextDocument: Document) => {
    if (documents.has(nextDocument)) return;
    documents.add(nextDocument);
    const nextWindow = nextDocument.defaultView;
    registerRoot(nextDocument);
    if (!nextWindow) return;
    const update = () => scheduleEmit();
    nextWindow.addEventListener("scroll", update, true);
    nextWindow.addEventListener("resize", update);
    observers.push({
      disconnect: () => {
        nextWindow.removeEventListener("scroll", update, true);
        nextWindow.removeEventListener("resize", update);
      }
    } as MutationObserver);
  };

  registerDocument(document);
  emit();

  return () => {
    stopped = true;
    if (refreshFrame !== null) window.cancelAnimationFrame(refreshFrame);
    observers.forEach((observer) => observer.disconnect());
    frameListeners.forEach((cleanup) => cleanup());
    videoListeners.forEach((cleanup) => cleanup());
    videos.clear();
    onChange([]);
  };
}
