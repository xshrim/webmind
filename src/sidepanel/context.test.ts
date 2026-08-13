import { describe, expect, it } from "vitest";
import {
  buildSystemMessage,
  contextMatchesTab,
  contextModeAfterTabSwitch,
  contextTranslationSourceText,
  defaultContextMode,
  sameTabIdentity
} from "./context";
import type { AppSettings, PageContext, ProviderProfile } from "../shared/types";

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
    expect(contextModeAfterTabSwitch("selection", "none", null)).toBe("none");
  });

  it("maps the no-context setting to the chat context menu default", () => {
    expect(defaultContextMode({ defaultContextScope: "none" } as AppSettings)).toBe(
      "none"
    );
  });

  it("preserves non-selection modes", () => {
    expect(contextModeAfterTabSwitch("none", "article", null)).toBe("none");
    expect(contextModeAfterTabSwitch("page", "article", null)).toBe("page");
    expect(contextModeAfterTabSwitch("article", "page", null)).toBe("article");
  });
});

describe("tab context identity", () => {
  const context: PageContext = {
    kind: "webpage",
    title: "Current",
    url: "https://example.com/current",
    text: "current page"
  };

  it("accepts the cached context only for the same active tab identity", () => {
    expect(
      sameTabIdentity(
        { id: 2, url: "https://example.com/current" },
        { id: 2, url: "https://example.com/current" }
      )
    ).toBe(true);
    expect(
      sameTabIdentity(
        { id: 3, url: "https://example.com/current" },
        { id: 2, url: "https://example.com/current" }
      )
    ).toBe(false);
    expect(
      sameTabIdentity(
        { id: 2, url: "https://example.com/next" },
        { id: 2, url: "https://example.com/current" }
      )
    ).toBe(false);
  });

  it("requires cached page context to belong to the active tab URL", () => {
    expect(
      contextMatchesTab(context, { url: "https://example.com/current" })
    ).toBe(true);
    expect(
      contextMatchesTab(context, { url: "https://example.com/next" })
    ).toBe(false);
  });
});

describe("contextTranslationSourceText", () => {
  it("uses the visible article preview blocks as the canonical translation input", () => {
    const context: PageContext = {
      kind: "article",
      title: "Article",
      url: "https://example.com/article",
      text: "stale plain text",
      markdown: "stale markdown",
      articlePreview: [
        { id: "heading", text: "Heading", markdown: "# Heading" },
        {
          id: "code",
          text: "const answer = 42;",
          markdown: "```javascript\nconst answer = 42;\n```"
        }
      ]
    };

    expect(contextTranslationSourceText(context)).toBe(
      "# Heading\n\n```javascript\nconst answer = 42;\n```"
    );
  });

  it("keeps the page Markdown fallback for non-article contexts", () => {
    expect(
      contextTranslationSourceText({
        kind: "webpage",
        title: "Page",
        url: "https://example.com",
        text: "plain text",
        markdown: "# Rich page"
      })
    ).toBe("# Rich page");
  });
});
