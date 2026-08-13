export function shouldCloseFloatingResult(
  event: Pick<PointerEvent, "isPrimary" | "button">,
  startedInsideResult: boolean
): boolean {
  return event.isPrimary && event.button === 0 && !startedInsideResult;
}

export type FloatingResultAnchor = Pick<
  DOMRect,
  "left" | "top" | "right" | "bottom" | "width" | "height"
>;

export function candidateFloatingResultPosition(
  target: FloatingResultAnchor,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 10,
  gap = 10
): { left: number; top: number } {
  const actualWidth = Math.min(width, viewportWidth - margin * 2);
  const actualHeight = Math.min(height, viewportHeight - margin * 2);
  const clamp = (left: number, top: number) => ({
    left: Math.max(
      margin,
      Math.min(viewportWidth - actualWidth - margin, Math.round(left))
    ),
    top: Math.max(
      margin,
      Math.min(viewportHeight - actualHeight - margin, Math.round(top))
    )
  });
  const centeredLeft = target.left + (target.width - actualWidth) / 2;
  const centeredTop = target.top + (target.height - actualHeight) / 2;

  if (target.bottom + gap + actualHeight <= viewportHeight - margin) {
    return clamp(centeredLeft, target.bottom + gap);
  }
  if (target.right + gap + actualWidth <= viewportWidth - margin) {
    return clamp(target.right + gap, centeredTop);
  }
  if (target.left - gap - actualWidth >= margin) {
    return clamp(target.left - gap - actualWidth, centeredTop);
  }
  if (target.top - gap - actualHeight >= margin) {
    return clamp(centeredLeft, target.top - gap - actualHeight);
  }
  return clamp(centeredLeft, target.bottom + gap);
}
