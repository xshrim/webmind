import { describe, expect, it } from "vitest";
import {
  cancelLatestAnimationFrame,
  boundedTextLength,
  scheduleLatestAnimationFrame,
  textOffsetAtPoint,
  textRectAtPoint,
  type LatestFrameState,
  type TextRect
} from "./hoverDefinition";

const rect = (
  left: number,
  top: number,
  right: number,
  bottom: number
): TextRect => ({
  left,
  top,
  right,
  bottom,
  width: right - left,
  height: bottom - top
});

describe("textRectAtPoint", () => {
  it("accepts a point inside a rendered text rectangle", () => {
    const renderedText = rect(20, 10, 80, 26);
    expect(textRectAtPoint([renderedText], 42, 18)).toBe(renderedText);
  });

  it("rejects line-leading and line-trailing whitespace", () => {
    const renderedText = rect(20, 10, 80, 26);
    expect(textRectAtPoint([renderedText], 12, 18)).toBeNull();
    expect(textRectAtPoint([renderedText], 81, 18)).toBeNull();
    expect(textRectAtPoint([renderedText], 80, 18)).toBeNull();
  });

  it("rejects vertical whitespace and zero-sized rectangles", () => {
    expect(textRectAtPoint([rect(20, 10, 80, 26)], 42, 28)).toBeNull();
    expect(textRectAtPoint([rect(20, 10, 20, 26)], 20, 18)).toBeNull();
  });

  it("selects only the wrapped-line rectangle under the pointer", () => {
    const firstLine = rect(20, 10, 100, 26);
    const secondLine = rect(20, 30, 60, 46);
    expect(textRectAtPoint([firstLine, secondLine], 42, 38)).toBe(secondLine);
    expect(textRectAtPoint([firstLine, secondLine], 82, 38)).toBeNull();
  });
});

describe("latest animation-frame scheduling", () => {
  it("uses the latest pointer value once the frame runs", () => {
    const state: LatestFrameState<string> = { frameId: null, value: null };
    const frame: { callback: FrameRequestCallback | null } = {
      callback: null
    };
    const values: string[] = [];

    scheduleLatestAnimationFrame(
      state,
      "first",
      (next) => {
        frame.callback = next;
        return 7;
      },
      (value) => values.push(value)
    );
    scheduleLatestAnimationFrame(
      state,
      "latest",
      () => {
        throw new Error("a second frame must not be scheduled");
      },
      (value) => values.push(value)
    );

    if (!frame.callback) throw new Error("animation frame was not scheduled");
    frame.callback(0);
    expect(values).toEqual(["latest"]);
    expect(state).toEqual({ frameId: null, value: null });
  });

  it("cancels a queued frame and drops its value", () => {
    const state: LatestFrameState<string> = { frameId: 5, value: "word" };
    let cancelled: number | null = null;

    cancelLatestAnimationFrame(state, (frameId) => {
      cancelled = frameId;
    });

    expect(cancelled).toBe(5);
    expect(state).toEqual({ frameId: null, value: null });
  });
});

describe("boundedTextLength", () => {
  it("keeps fallback text scanning within its remaining character budget", () => {
    expect(boundedTextLength(18, 40)).toBe(18);
    expect(boundedTextLength(240, 40)).toBe(40);
    expect(boundedTextLength(240, 0)).toBe(0);
  });
});

describe("textOffsetAtPoint", () => {
  it("finds only the rendered character under the pointer", () => {
    const characterRects = [rect(10, 10, 20, 24), rect(20, 10, 30, 24)];
    expect(
      textOffsetAtPoint(2, 20, 24, 18, (offset) => [characterRects[offset]])
    ).toBe(1);
  });

  it("does not scan beyond the configured character budget", () => {
    expect(
      textOffsetAtPoint(3, 2, 34, 18, (offset) => [rect(10 + offset * 12, 10, 22 + offset * 12, 24)])
    ).toBeNull();
  });
});
