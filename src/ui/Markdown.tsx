import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

marked.setOptions({
  breaks: true,
  gfm: true
});

export function Markdown({ content }: { content: string }) {
  const html = useMemo(() => {
    const rendered = marked.parse(content) as string;
    return DOMPurify.sanitize(rendered, {
      ADD_ATTR: ["target", "rel"]
    }).replace(
      /<a /g,
      '<a target="_blank" rel="noreferrer noopener" '
    );
  }, [content]);
  return (
    <div
      className="markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
