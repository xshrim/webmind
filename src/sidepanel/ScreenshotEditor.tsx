import {
  ArrowUpRight,
  Check,
  Minus,
  Pencil,
  RotateCcw,
  Save,
  Square,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
  X
} from "lucide-react";
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { uiText, type UiTextKey } from "../shared/i18n";
import type { AppLanguage, ImageAttachment } from "../shared/types";
import { screenshotCrop } from "./screenshotCrop";

type ScreenshotTool = "pen" | "line" | "arrow" | "rectangle" | "text";

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  tool: ScreenshotTool;
  color: string;
  width: number;
  points?: Point[];
  start?: Point;
  end?: Point;
  text?: string;
}

export interface ScreenshotEditorPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}

interface ScreenshotEditorProps {
  attachment: ImageAttachment;
  language?: AppLanguage;
  placement?: ScreenshotEditorPlacement;
  sourceDataUrl?: string;
  onCancel: () => void;
  onConfirm: (attachment: ImageAttachment) => void;
}

type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

const RESIZE_HANDLES: Array<{ id: ResizeHandle; className: string }> = [
  { id: "n", className: "screenshot-resize-n" },
  { id: "ne", className: "screenshot-resize-ne" },
  { id: "e", className: "screenshot-resize-e" },
  { id: "se", className: "screenshot-resize-se" },
  { id: "s", className: "screenshot-resize-s" },
  { id: "sw", className: "screenshot-resize-sw" },
  { id: "w", className: "screenshot-resize-w" },
  { id: "nw", className: "screenshot-resize-nw" }
];

const TOOLS: Array<{ id: ScreenshotTool; icon: typeof Pencil; label: UiTextKey }> = [
  { id: "pen", icon: Pencil, label: "screenshotToolPen" },
  { id: "line", icon: Minus, label: "screenshotToolLine" },
  { id: "arrow", icon: ArrowUpRight, label: "screenshotToolArrow" },
  { id: "rectangle", icon: Square, label: "screenshotToolRectangle" },
  { id: "text", icon: Type, label: "screenshotToolText" }
];

function drawArrow(
  context: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  width: number
): void {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const head = Math.max(10, width * 4);
  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(
    end.x - head * Math.cos(angle - Math.PI / 6),
    end.y - head * Math.sin(angle - Math.PI / 6)
  );
  context.moveTo(end.x, end.y);
  context.lineTo(
    end.x - head * Math.cos(angle + Math.PI / 6),
    end.y - head * Math.sin(angle + Math.PI / 6)
  );
  context.stroke();
}

function drawAnnotation(
  context: CanvasRenderingContext2D,
  annotation: Annotation
): void {
  context.save();
  context.strokeStyle = annotation.color;
  context.fillStyle = annotation.color;
  context.lineWidth = annotation.width;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (annotation.tool === "text") {
    context.font = `700 ${Math.max(16, annotation.width * 6)}px sans-serif`;
    context.fillText(annotation.text ?? "", annotation.start?.x ?? 0, annotation.start?.y ?? 0);
    context.restore();
    return;
  }
  if (annotation.tool === "pen" && annotation.points?.length) {
    context.beginPath();
    context.moveTo(annotation.points[0].x, annotation.points[0].y);
    annotation.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.stroke();
    context.restore();
    return;
  }
  if (!annotation.start || !annotation.end) {
    context.restore();
    return;
  }
  if (annotation.tool === "rectangle") {
    context.strokeRect(
      annotation.start.x,
      annotation.start.y,
      annotation.end.x - annotation.start.x,
      annotation.end.y - annotation.start.y
    );
  } else {
    context.beginPath();
    context.moveTo(annotation.start.x, annotation.start.y);
    context.lineTo(annotation.end.x, annotation.end.y);
    context.stroke();
    if (annotation.tool === "arrow") {
      drawArrow(context, annotation.start, annotation.end, annotation.width);
    }
  }
  context.restore();
}

function drawScene(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  annotations: Annotation[],
  draft: Annotation | null
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  annotations.forEach((annotation) => drawAnnotation(context, annotation));
  if (draft) drawAnnotation(context, draft);
}

function cropSourceImage(
  image: HTMLImageElement,
  placement: ScreenshotEditorPlacement
): string {
  const crop = screenshotCrop(image.naturalWidth, image.naturalHeight, placement);
  const canvas = document.createElement("canvas");
  canvas.width = crop.outputWidth;
  canvas.height = crop.outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create screenshot canvas");
  context.drawImage(
    image,
    crop.sourceX,
    crop.sourceY,
    crop.sourceWidth,
    crop.sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas.toDataURL("image/png");
}

function resizedPlacement(
  start: ScreenshotEditorPlacement,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number
): ScreenshotEditorPlacement {
  const minSize = 32;
  let left = start.left;
  let top = start.top;
  let right = start.left + start.width;
  let bottom = start.top + start.height;
  if (handle.includes("w")) {
    left = Math.max(0, Math.min(right - minSize, start.left + deltaX));
  }
  if (handle.includes("e")) {
    right = Math.min(
      start.viewportWidth,
      Math.max(left + minSize, start.left + start.width + deltaX)
    );
  }
  if (handle.includes("n")) {
    top = Math.max(0, Math.min(bottom - minSize, start.top + deltaY));
  }
  if (handle.includes("s")) {
    bottom = Math.min(
      start.viewportHeight,
      Math.max(top + minSize, start.top + start.height + deltaY)
    );
  }
  return {
    ...start,
    left,
    top,
    width: right - left,
    height: bottom - top
  };
}

export function ScreenshotEditor({
  attachment,
  language,
  placement,
  sourceDataUrl,
  onCancel,
  onConfirm
}: ScreenshotEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const draftRef = useRef<Annotation | null>(null);
  const resizeRef = useRef<{
    handle: ResizeHandle;
    pointerX: number;
    pointerY: number;
    placement: ScreenshotEditorPlacement;
  } | null>(null);
  const cropFrameRef = useRef<number | null>(null);
  const pendingPlacementRef = useRef<ScreenshotEditorPlacement | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [imageVersion, setImageVersion] = useState(0);
  const [workingAttachment, setWorkingAttachment] = useState(attachment);
  const [editorPlacement, setEditorPlacement] = useState(placement);
  const [pagePosition, setPagePosition] = useState({
    left: placement?.left ?? 0,
    top: placement?.top ?? 0
  });
  const [tool, setTool] = useState<ScreenshotTool>("pen");
  const [color, setColor] = useState("#e53935");
  const [width, setWidth] = useState(4);
  const [text, setText] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [draft, setDraft] = useState<Annotation | null>(null);
  const [zoom, setZoom] = useState(1);

  const pageMode = Boolean(placement);
  const activePlacement = editorPlacement ?? placement;

  useEffect(() => {
    if (!sourceDataUrl || !placement) {
      sourceImageRef.current = null;
      setEditorPlacement(placement);
      setWorkingAttachment(attachment);
      return;
    }
    const source = new Image();
    source.onload = () => {
      sourceImageRef.current = source;
      setEditorPlacement(placement);
      setWorkingAttachment({
        ...attachment,
        dataUrl: cropSourceImage(source, placement)
      });
    };
    source.src = sourceDataUrl;
    return () => {
      source.onload = null;
    };
  }, [attachment, placement, sourceDataUrl]);

  useEffect(() => {
    if (!imageRef.current) setImageReady(false);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setImageReady(true);
      setImageVersion((value) => value + 1);
    };
    image.src = workingAttachment.dataUrl ?? "";
    return () => {
      image.onload = null;
    };
  }, [workingAttachment.dataUrl]);

  useEffect(() => {
    if (!placement) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCancel();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onCancel, placement]);

  useLayoutEffect(() => {
    if (!pageMode || !activePlacement || !imageReady || !editorRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const margin = 8;
      const rect = editor.getBoundingClientRect();
      setPagePosition({
        left: Math.max(
          margin,
          Math.min(activePlacement.left, window.innerWidth - rect.width - margin)
        ),
        top:
          activePlacement.top + rect.height <= window.innerHeight - margin
            ? Math.max(margin, activePlacement.top)
            : Math.max(margin, activePlacement.top - rect.height - margin)
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activePlacement, imageReady, pageMode, tool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !imageReady) return;
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    drawScene(canvas, image, annotations, draft);
  }, [annotations, draft, imageReady, imageVersion]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * (canvas.width / rect.width))),
      y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * (canvas.height / rect.height)))
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageReady) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    if (tool === "text") {
      if (!text.trim()) return;
      setAnnotations((current) => [
        ...current,
        { tool, color, width, start: point, text: text.trim() }
      ]);
      setText("");
      return;
    }
    const next: Annotation =
      tool === "pen"
        ? { tool, color, width, points: [point] }
        : { tool, color, width, start: point, end: point };
    draftRef.current = next;
    setDraft(next);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const current = draftRef.current;
    if (!current) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const next =
      current.tool === "pen"
        ? { ...current, points: [...(current.points ?? []), point] }
        : { ...current, end: point };
    draftRef.current = next;
    setDraft(next);
  };

  const finishPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const current = draftRef.current;
    if (!current) return;
    const point = pointFromEvent(event);
    const finished =
      current.tool === "pen"
        ? { ...current, points: [...(current.points ?? []), point] }
        : { ...current, end: point };
    draftRef.current = null;
    setDraft(null);
    setAnnotations((items) => [...items, finished]);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
  };

  const queueCrop = (nextPlacement: ScreenshotEditorPlacement) => {
    setEditorPlacement(nextPlacement);
    const source = sourceImageRef.current;
    if (!source) return;
    pendingPlacementRef.current = nextPlacement;
    if (cropFrameRef.current !== null) return;
    cropFrameRef.current = window.requestAnimationFrame(() => {
      cropFrameRef.current = null;
      const pending = pendingPlacementRef.current;
      pendingPlacementRef.current = null;
      if (!pending) return;
      setWorkingAttachment((current) => ({
        ...current,
        dataUrl: cropSourceImage(source, pending)
      }));
    });
  };

  const onResizePointerDown = (
    handle: ResizeHandle,
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (!activePlacement || !sourceImageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      handle,
      pointerX: event.clientX,
      pointerY: event.clientY,
      placement: activePlacement
    };
    setAnnotations([]);
    draftRef.current = null;
    setDraft(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onResizePointerMove = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    const current = resizeRef.current;
    if (!current) return;
    event.preventDefault();
    event.stopPropagation();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const scaleX = canvasRect
      ? current.placement.width / Math.max(1, canvasRect.width)
      : 1;
    const scaleY = canvasRect
      ? current.placement.height / Math.max(1, canvasRect.height)
      : 1;
    queueCrop(
      resizedPlacement(
        current.placement,
        current.handle,
        (event.clientX - current.pointerX) * scaleX,
        (event.clientY - current.pointerY) * scaleY
      )
    );
  };

  const finishResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!resizeRef.current) return;
    onResizePointerMove(event);
    resizeRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onConfirm({ ...workingAttachment, dataUrl: canvas.toDataURL("image/png") });
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = workingAttachment.name || "screenshot.png";
    link.click();
  };

  const pageStyle = pageMode
    ? ({ left: pagePosition.left, top: pagePosition.top } as CSSProperties)
    : undefined;
  const canvasStyle = !pageMode
    ? ({
        width: `${zoom * 100}%`,
        maxWidth: "none",
        maxHeight: "none",
        height: "auto"
      } as CSSProperties)
    : undefined;
  return (
    <div
      className={`modal-backdrop screenshot-editor-backdrop ${
        placement ? "screenshot-editor-page-mode" : ""
      }`}
    >
      <section
        ref={editorRef}
        className="screenshot-editor"
        style={pageStyle}
        role="dialog"
        aria-modal="true"
      >
        <div className="screenshot-preview-float">
          <header className="screenshot-editor-heading">
            <h2>{uiText(language, "screenshotEditorTitle")}</h2>
          </header>
          <div className="screenshot-editor-canvas-wrap">
            {imageReady ? (
              <div className="screenshot-editor-canvas-frame">
                <canvas
                  ref={canvasRef}
                  className="screenshot-editor-canvas"
                  style={canvasStyle}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={finishPointer}
                  onPointerCancel={finishPointer}
                />
                {pageMode && sourceImageRef.current &&
                  RESIZE_HANDLES.map(({ id, className }) => (
                    <button
                      key={id}
                      className={`screenshot-resize-handle ${className}`}
                      type="button"
                      aria-label={uiText(language, "screenshotEditorTitle")}
                      title={uiText(language, "screenshotEditorTitle")}
                      onPointerDown={(event) => onResizePointerDown(id, event)}
                      onPointerMove={onResizePointerMove}
                      onPointerUp={finishResize}
                      onPointerCancel={finishResize}
                    />
                  ))}
              </div>
            ) : (
              <span>{uiText(language, "screenshotEditorLoading")}</span>
            )}
          </div>
        </div>
        <div className="screenshot-tools-float">
          <div className="screenshot-editor-tools">
            <div className="screenshot-editor-tool-group">
              {TOOLS.map(({ id, icon: Icon, label }) => (
                <button
                  className={`icon-button mini ${tool === id ? "active" : ""}`}
                  key={id}
                  type="button"
                  title={uiText(language, label)}
                  aria-label={uiText(language, label)}
                  aria-pressed={tool === id}
                  onClick={() => setTool(id)}
                >
                  <Icon />
                </button>
              ))}
            </div>
            <label className="screenshot-editor-color" title={uiText(language, "screenshotStrokeColor")}>
              <input aria-label={uiText(language, "screenshotStrokeColor")} type="color" value={color} onChange={(event) => setColor(event.target.value)} />
            </label>
            <label className="screenshot-editor-width" title={uiText(language, "screenshotStrokeWidth")}>
              <input aria-label={uiText(language, "screenshotStrokeWidth")} type="range" min="1" max="14" value={width} onChange={(event) => setWidth(Number(event.target.value))} />
            </label>
            {tool === "text" && (
              <input
                className="screenshot-editor-text"
                value={text}
                placeholder={uiText(language, "screenshotTextPlaceholder")}
                aria-label={uiText(language, "screenshotTextPlaceholder")}
                onChange={(event) => setText(event.target.value)}
              />
            )}
            <span className="screenshot-tools-spacer" />
            {!pageMode && (
              <>
                <button className="icon-button mini" type="button" title="Zoom out" aria-label="Zoom out" disabled={zoom <= 0.75} onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}>
                  <ZoomOut />
                </button>
                <button className="icon-button mini" type="button" title="Reset zoom" aria-label="Reset zoom" disabled={zoom === 1} onClick={() => setZoom(1)}>
                  <RotateCcw />
                </button>
                <button className="icon-button mini" type="button" title="Zoom in" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom((value) => Math.min(3, value + 0.25))}>
                  <ZoomIn />
                </button>
              </>
            )}
            <button className="icon-button mini" type="button" title={uiText(language, "screenshotUndo")} aria-label={uiText(language, "screenshotUndo")} disabled={!annotations.length} onClick={() => setAnnotations((items) => items.slice(0, -1))}>
              <Undo2 />
            </button>
            <button className="icon-button mini" type="button" title={uiText(language, "screenshotClear")} aria-label={uiText(language, "screenshotClear")} disabled={!annotations.length} onClick={() => setAnnotations([])}>
              <Trash2 />
            </button>
            <button className="icon-button mini screenshot-editor-cancel" type="button" title={uiText(language, "screenshotCancel")} aria-label={uiText(language, "screenshotCancel")} onClick={onCancel}>
              <X />
            </button>
            <button className="icon-button mini screenshot-editor-confirm" type="button" title={uiText(language, "screenshotConfirm")} aria-label={uiText(language, "screenshotConfirm")} disabled={!imageReady} onClick={confirm}>
              <Check />
            </button>
            <button className="icon-button mini screenshot-editor-save" type="button" title={uiText(language, "save")} aria-label={uiText(language, "save")} disabled={!imageReady} onClick={save}>
              <Save />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
