import type { ImmersiveShortcut } from "../shared/types";

function isModifierKey(event: KeyboardEvent, key: "alt" | "ctrl"): boolean {
  const lowerKey = event.key.toLowerCase();
  if (key === "alt") {
    return (
      lowerKey === "alt" ||
      lowerKey === "altgraph" ||
      event.code === "AltLeft" ||
      event.code === "AltRight"
    );
  }
  return (
    lowerKey === "control" ||
    event.code === "ControlLeft" ||
    event.code === "ControlRight"
  );
}

export function modifierShortcutFromEvent(
  event: KeyboardEvent | MouseEvent | PointerEvent
): Exclude<ImmersiveShortcut, "off"> | null {
  const altPressed =
    event.altKey ||
    event.getModifierState("AltGraph") ||
    (event instanceof KeyboardEvent && isModifierKey(event, "alt"));
  const ctrlPressed =
    event.ctrlKey ||
    event.getModifierState("AltGraph") ||
    (event instanceof KeyboardEvent && isModifierKey(event, "ctrl"));
  if (event.metaKey) return null;
  if (ctrlPressed && altPressed && event.shiftKey) return "ctrl-alt-shift";
  if (ctrlPressed && altPressed) return "ctrl-alt";
  if (ctrlPressed && event.shiftKey) return "ctrl-shift";
  if (altPressed && event.shiftKey) return "alt-shift";
  if (ctrlPressed) return "ctrl";
  if (altPressed) return "alt";
  if (event.shiftKey) return "shift";
  return null;
}

export function isModifierShortcutKey(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  return (
    key === "control" ||
    key === "alt" ||
    key === "altgraph" ||
    key === "shift" ||
    event.code === "ControlLeft" ||
    event.code === "ControlRight" ||
    event.code === "AltLeft" ||
    event.code === "AltRight" ||
    event.code === "ShiftLeft" ||
    event.code === "ShiftRight"
  );
}

export function shortcutWeight(shortcut: ImmersiveShortcut): number {
  if (shortcut === "off") return 0;
  return shortcut.split("-").length;
}
