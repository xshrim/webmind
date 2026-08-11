export interface TextRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export function textRectAtPoint<T extends TextRect>(
  rects: readonly T[],
  clientX: number,
  clientY: number
): T | null {
  return (
    rects.find(
      (rect) =>
        rect.width > 0 &&
        rect.height > 0 &&
        clientX >= rect.left &&
        clientX < rect.right &&
        clientY >= rect.top &&
        clientY < rect.bottom
    ) ?? null
  );
}
