import { describe, expect, it } from "vitest";
import { buildSystemMessage, contextModeAfterTabSwitch } from "./context";
import type { PageContext, ProviderProfile } from "../shared/types";

const profile = {
  maxContextChars: 1000
} as ProviderProfile;

describe("buildSystemMessage", () => {
  it("uses the rich Markdown context shared by the preview", () => {
    const context: PageContext = {
      kind: "article",
      title: "Article",
      url: "https://example.com/article",
      text: "plain fallback",
      markdown: "**正文**\n\n[原文链接](https://example.com/source)"
    };

    const result = buildSystemMessage(context, [], profile, "zh-CN");

    expect(result.content).toContain(context.markdown);
    expect(result.content).not.toContain(context.text);
  });
});

describe("contextModeAfterTabSwitch", () => {
  const selectionContext: PageContext = {
    kind: "selection",
    title: "Selected text",
    url: "https://example.com/next",
    text: "selected text"
  };

  it("keeps selection when the newly active tab has selected text", () => {
    expect(
      contextModeAfterTabSwitch("selection", "article", selectionContext)
    ).toBe("selection");
  });

  it("uses the configured default when the newly active tab has no selection", () => {
    expect(contextModeAfterTabSwitch("selection", "page", null)).toBe("page");
    expect(
      contextModeAfterTabSwitch("selection", "article", {
        kind: "webpage",
        title: "Page",
        url: "https://example.com/next",
        text: "page text"
      })
    ).toBe("article");
  });

  it("preserves non-selection modes", () => {
    expect(contextModeAfterTabSwitch("none", "article", null)).toBe("none");
    expect(contextModeAfterTabSwitch("page", "article", null)).toBe("page");
    expect(contextModeAfterTabSwitch("article", "page", null)).toBe("article");
  });
});
