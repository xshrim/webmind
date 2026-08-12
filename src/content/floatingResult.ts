export function shouldCloseFloatingResult(
  event: Pick<PointerEvent, "isPrimary" | "button">,
  startedInsideResult: boolean
): boolean {
  return event.isPrimary && event.button === 0 && !startedInsideResult;
}
