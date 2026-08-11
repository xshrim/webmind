import { describe, expect, it } from "vitest";
import {
  hasBlockCodeMetadata,
  markdownCodeFence,
  markdownLinkLabel
} from "./selection";

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

describe("markdownCodeFence", () => {
  it("preserves a normalized language marker", () => {
    expect(markdownCodeFence("const answer = 42;", "Language-JavaScript")).toBe(
      "\n\n```javascript\nconst answer = 42;\n```\n\n"
    );
  });

  it("uses a longer fence when code contains backticks", () => {
    expect(markdownCodeFence("const fence = ```;", "js")).toBe(
      "\n\n````js\nconst fence = ```;\n````\n\n"
    );
  });

  it("preserves code indentation and line breaks", () => {
    expect(markdownCodeFence("  if (ready) {\n    run();\n  }", "js")).toBe(
      "\n\n```js\n  if (ready) {\n    run();\n  }\n```\n\n"
    );
  });

  it("drops unsafe language metadata", () => {
    expect(markdownCodeFence("value", 'js onclick="bad"')).toBe(
      "\n\n```\nvalue\n```\n\n"
    );
  });
});

describe("hasBlockCodeMetadata", () => {
  it("recognizes generic block code and syntax-highlight metadata", () => {
    expect(hasBlockCodeMetadata("example code-block language-js")).toBe(true);
    expect(hasBlockCodeMetadata("sourceCode highlight-source-go")).toBe(true);
    expect(hasBlockCodeMetadata("syntax_highlight notranslate")).toBe(true);
  });

  it("does not treat unrelated prose metadata as code", () => {
    expect(hasBlockCodeMetadata("article-content prose-body")).toBe(false);
  });
});
