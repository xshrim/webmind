import { describe, expect, it } from "vitest";
import {
  canHighlightSelectionText,
  SELECTION_MATCH_HIGHLIGHT_CSS,
  normalizedSelectionMatchText,
  selectionMatchOffsets
} from "./selectionHighlighter";

describe("selection match highlighter", () => {
  it("uses the product logo color for matching text highlights", () => {
    expect(SELECTION_MATCH_HIGHLIGHT_CSS).toContain(
      "background-color: #e8533f"
    );
    expect(SELECTION_MATCH_HIGHLIGHT_CSS).not.toContain("::selection");
  });

  it("normalizes whitespace and uses the configured trigger threshold", () => {
    expect(normalizedSelectionMatchText("  source\n text ")).toBe("source text");
    expect(canHighlightSelectionText(" a ", 2)).toBe(false);
    expect(canHighlightSelectionText("source text", 8)).toBe(true);
  });

  it("finds every non-overlapping match", () => {
    expect(selectionMatchOffsets("note / note / note", "note")).toEqual([
      { start: 0, end: 4 },
      { start: 7, end: 11 },
      { start: 14, end: 18 }
    ]);
  });

  it("can ignore case when locating matching page text", () => {
    expect(selectionMatchOffsets("Term term TERM", "term", false)).toEqual([
      { start: 0, end: 4 },
      { start: 5, end: 9 },
      { start: 10, end: 14 }
    ]);
    expect(selectionMatchOffsets("Term term TERM", "term", true)).toEqual([
      { start: 5, end: 9 }
    ]);
  });

  it("does not scan selections below the configured trigger threshold", () => {
    expect(selectionMatchOffsets("same same", "")).toEqual([]);
  });
});
