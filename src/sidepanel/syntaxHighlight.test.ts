import highlighter from "highlight.js/lib/common";
import { describe, expect, it, vi } from "vitest";
import { renderMarkdownHtml } from "../ui/Markdown";
import {
  MAX_HIGHLIGHTED_CODE_CHARS,
  highlightedCodeHtml
} from "./syntaxHighlight";

vi.mock("dompurify", () => ({
  default: {
    sanitize: (html: string) => html
  }
}));

describe("highlightedCodeHtml", () => {
  it("renders syntax tokens directly into the final code HTML", () => {
    const html = highlightedCodeHtml(
      highlighter,
      "const answer = 42;",
      "javascript"
    );
    expect(html).toContain('class="hljs language-javascript"');
    expect(html).toContain('class="hljs-keyword"');
    expect(html).toContain('class="hljs-number"');
  });

  it("automatically highlights code without a language marker", () => {
    const html = highlightedCodeHtml(
      highlighter,
      "function calculate(value) { return value + 1; }"
    );
    expect(html).toContain('class="hljs"');
    expect(html).toMatch(/class="hljs-[^"]+"/);
  });

  it("includes syntax classes in the final Markdown HTML", () => {
    const html = renderMarkdownHtml(
      "```javascript\nconst answer = 42;\n```",
      (code, language) =>
        highlightedCodeHtml(highlighter, code, language)
    );
    expect(html).toContain('class="hljs language-javascript"');
    expect(html).toContain('class="hljs-keyword"');
    expect(html).toContain('class="hljs-number"');
  });

  it("renders Markdown emphasis as semantic strong content", () => {
    expect(renderMarkdownHtml("Normal **bold text** normal")).toContain(
      "<strong>bold text</strong>"
    );
  });

  it("falls back to the regular Markdown renderer for oversized code", () => {
    expect(
      highlightedCodeHtml(
        highlighter,
        "x".repeat(MAX_HIGHLIGHTED_CODE_CHARS + 1),
        "javascript"
      )
    ).toBeNull();
  });
});
