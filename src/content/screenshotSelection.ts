export interface ScreenshotSelection {
  left: number;
  top: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}

let cancelActiveSelection: (() => void) | null = null;

function pointWithinViewport(value: number, limit: number): number {
  return Math.max(0, Math.min(limit, value));
}

export function selectScreenshotArea(): Promise<ScreenshotSelection | null> {
  cancelActiveSelection?.();

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    const selection = document.createElement("div");
    let startX = 0;
    let startY = 0;
    let pointerId: number | null = null;
    let selecting = false;
    let completed = false;

    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "fixed",
      zIndex: "2147483647",
      inset: "0",
      cursor: "crosshair",
      background: "rgba(11, 20, 18, 0.2)",
      touchAction: "none"
    });
    Object.assign(selection.style, {
      position: "fixed",
      display: "none",
      pointerEvents: "none",
      border: "2px solid #178f7c",
      background: "transparent",
      boxShadow: "0 0 0 100vmax rgba(11, 20, 18, 0.38)"
    });
    overlay.append(selection);
    document.documentElement.append(overlay);

    const finish = (result: ScreenshotSelection | null) => {
      if (completed) return;
      completed = true;
      overlay.remove();
      document.removeEventListener("keydown", onKeyDown, true);
      cancelActiveSelection = null;
      resolve(result);
    };

    const selectionFromPoint = (clientX: number, clientY: number) => {
      const currentX = pointWithinViewport(clientX, window.innerWidth);
      const currentY = pointWithinViewport(clientY, window.innerHeight);
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      Object.assign(selection.style, {
        display: "block",
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`
      });
      return { left, top, width, height };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!selecting) return;
      event.preventDefault();
      selectionFromPoint(event.clientX, event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!selecting || event.pointerId !== pointerId) return;
      selecting = false;
      pointerId = null;
      const area = selectionFromPoint(event.clientX, event.clientY);
      if (area.width < 8 || area.height < 8) {
        finish(null);
        return;
      }
      const result: ScreenshotSelection = {
        ...area,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
      overlay.remove();
      document.removeEventListener("keydown", onKeyDown, true);
      cancelActiveSelection = null;
      completed = true;
      window.requestAnimationFrame(() => resolve(result));
    };

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      if (event.button !== 0) {
        finish(null);
        return;
      }
      selecting = true;
      pointerId = event.pointerId;
      startX = pointWithinViewport(event.clientX, window.innerWidth);
      startY = pointWithinViewport(event.clientY, window.innerHeight);
      overlay.setPointerCapture(event.pointerId);
      selectionFromPoint(event.clientX, event.clientY);
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      finish(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      finish(null);
    };

    overlay.addEventListener("pointerdown", onPointerDown);
    overlay.addEventListener("pointermove", onPointerMove);
    overlay.addEventListener("pointerup", onPointerUp);
    overlay.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown, true);
    cancelActiveSelection = () => finish(null);
  });
}
