import { describe, expect, it } from "vitest";
import {
  hasMovedBeyondLinkSelectionThreshold,
  isHorizontalLinkSelectionDrag,
  LINK_TEXT_SELECTION_CSS,
  shouldBlockLinkDragTarget
} from "./linkTextSelection";

describe("link text selection", () => {
  it("provides selection and drag-suppression CSS", () => {
    expect(LINK_TEXT_SELECTION_CSS).toContain("user-select: text !important");
    expect(LINK_TEXT_SELECTION_CSS).toContain("-webkit-user-drag: none !important");
    expect(LINK_TEXT_SELECTION_CSS).toContain(
      "data-webmind-link-text-selecting"
    );
    expect(LINK_TEXT_SELECTION_CSS).not.toContain(
      "data-webmind-link-selection-overlay"
    );
  });

  it("only blocks drag starts originating from a link or its descendants", () => {
    const linkTarget = {
      closest: (selector: string) => (selector === "a[href]" ? {} : null)
    } as unknown as EventTarget;
    const otherTarget = {
      closest: () => null
    } as unknown as EventTarget;

    expect(shouldBlockLinkDragTarget(linkTarget)).toBe(true);
    expect(shouldBlockLinkDragTarget(otherTarget)).toBe(false);
    expect(shouldBlockLinkDragTarget(null)).toBe(false);
  });

  it("requires a meaningful pointer movement before treating a link action as selection", () => {
    expect(hasMovedBeyondLinkSelectionThreshold(10, 10, 12, 12)).toBe(false);
    expect(hasMovedBeyondLinkSelectionThreshold(10, 10, 14, 10)).toBe(true);
  });

  it("treats only horizontal link drags as text selection", () => {
    expect(isHorizontalLinkSelectionDrag(10, 10, 18, 13)).toBe(true);
    expect(isHorizontalLinkSelectionDrag(10, 10, 13, 18)).toBe(false);
    expect(isHorizontalLinkSelectionDrag(10, 10, 18, 18)).toBe(false);
  });
});
