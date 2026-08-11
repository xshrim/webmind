import { describe, expect, it } from "vitest";
import { markdownPreviewSegments } from "./markdownPreview";

describe("markdownPreviewSegments", () => {
  it("keeps a fenced code block with blank lines intact", () => {
    expect(
      markdownPreviewSegments(
        "Before\n\n```ts\nconst first = 1;\n\nconst second = 2;\n```\n\nAfter"
      )
    ).toEqual([
      "Before",
      "```ts\nconst first = 1;\n\nconst second = 2;\n```",
      "After"
    ]);
  });

  it("keeps lists and tables as top-level preview blocks", () => {
    expect(
      markdownPreviewSegments(
        "- first\n- second\n\n| A | B |\n| - | - |\n| 1 | 2 |"
      )
    ).toEqual(["- first\n- second", "| A | B |\n| - | - |\n| 1 | 2 |"]);
  });
});
