import { describe, expect, it } from "vitest";
import { markdownLinkLabel } from "./selection";

describe("markdownLinkLabel", () => {
  it("collapses multiline link text into a valid inline label", () => {
    expect(markdownLinkLabel("0\n\n节点收藏")).toBe("0 节点收藏");
  });

  it("escapes brackets that could break the link label", () => {
    expect(markdownLinkLabel("收藏 [默认] 节点")).toBe(
      "收藏 \\[默认\\] 节点"
    );
  });
});
