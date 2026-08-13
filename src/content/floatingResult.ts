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
  const fits = (left: number, top: number): boolean =>
    left >= margin &&
    top >= margin &&
    left + actualWidth <= viewportWidth - margin &&
    top + actualHeight <= viewportHeight - margin;
  const belowLeft = target.left;
  const belowCenter = target.left + (target.width - actualWidth) / 2;
  const rightCenter = target.right + gap;
  const aboveLeft = target.left;
  const belowRight = target.right - actualWidth;
  const leftCenter = target.left - gap - actualWidth;
  const aboveRight = belowRight;
  const centerTop = target.top + (target.height - actualHeight) / 2;
  const belowTop = target.bottom + gap;
  const aboveTop = target.top - gap - actualHeight;
  const candidates: Array<[number, number]> = [
    [belowLeft, belowTop],
    [belowCenter, belowTop],
    [rightCenter, centerTop],
    [aboveLeft, aboveTop],
    [belowCenter, aboveTop],
    [belowRight, belowTop],
    [leftCenter, centerTop],
    [aboveRight, aboveTop]
  ];
  const available = candidates.find(([left, top]) => fits(left, top));
  if (available) return clamp(available[0], available[1]);

  // All prioritized placements are clipped; keep the popup fully visible.
  return clamp(
    (viewportWidth - actualWidth) / 2,
    (viewportHeight - actualHeight) / 2
  );
}
