import DOMPurify from "dompurify";
import { marked, Renderer } from "marked";
import { useMemo } from "react";

marked.setOptions({
  breaks: true,
  gfm: true
});

export type MarkdownCodeRenderer = (
  code: string,
  language?: string
) => string | null;

export function renderMarkdownHtml(
  content: string,
  codeRenderer?: MarkdownCodeRenderer
): string {
  const renderer = codeRenderer ? new Renderer() : undefined;
  if (renderer && codeRenderer) {
    const defaultCodeRenderer = renderer.code.bind(renderer);
    renderer.code = (token) =>
      codeRenderer(token.text, token.lang) ?? defaultCodeRenderer(token);
  }
  const rendered = marked.parse(content, { renderer }) as string;
  return DOMPurify.sanitize(rendered, {
    ADD_ATTR: ["target", "rel"]
  }).replace(
    /<a /g,
    '<a target="_blank" rel="noreferrer noopener" '
  );
}

export function Markdown({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdownHtml(content), [content]);
  return (
    <div
      className="markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
