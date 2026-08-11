import { describe, expect, it } from "vitest";
import { textRectAtPoint, type TextRect } from "./hoverDefinition";

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
