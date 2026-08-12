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

export interface LatestFrameState<T> {
  frameId: number | null;
  value: T | null;
}

export function boundedTextLength(
  textLength: number,
  remainingBudget: number
): number {
  return Math.max(0, Math.min(textLength, remainingBudget));
}

export function textOffsetAtPoint<T extends TextRect>(
  textLength: number,
  characterBudget: number,
  clientX: number,
  clientY: number,
  rectsAtOffset: (offset: number) => readonly T[]
): number | null {
  const length = boundedTextLength(textLength, characterBudget);
  for (let offset = 0; offset < length; offset += 1) {
    if (textRectAtPoint(rectsAtOffset(offset), clientX, clientY)) return offset;
  }
  return null;
}

export function scheduleLatestAnimationFrame<T>(
  state: LatestFrameState<T>,
  value: T,
  requestFrame: (callback: FrameRequestCallback) => number,
  run: (value: T) => void
): void {
  state.value = value;
  if (state.frameId !== null) return;
  state.frameId = requestFrame(() => {
    state.frameId = null;
    const next = state.value;
    state.value = null;
    if (next !== null) run(next);
  });
}

export function cancelLatestAnimationFrame<T>(
  state: LatestFrameState<T>,
  cancelFrame: (frameId: number) => void
): void {
  if (state.frameId !== null) cancelFrame(state.frameId);
  state.frameId = null;
  state.value = null;
}
