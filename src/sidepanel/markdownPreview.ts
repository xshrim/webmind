import { marked } from "marked";

export function markdownPreviewSegments(markdown: string): string[] {
  const source = markdown.trim();
  if (!source) return [];
  try {
    return marked
      .lexer(source, { breaks: true, gfm: true })
      .filter((token) => token.type !== "space")
      .map((token) => token.raw.trim())
      .filter(Boolean);
  } catch {
    return [source];
  }
}
