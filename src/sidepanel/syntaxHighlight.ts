import type hljs from "highlight.js/lib/common";

type SyntaxHighlighter = typeof hljs;

export const MAX_HIGHLIGHTED_CODE_CHARS = 50_000;

function normalizedCodeLanguage(language?: string): string | undefined {
  const candidate = language?.trim().toLowerCase().split(/\s+/, 1)[0];
  return candidate && /^[a-z0-9_+#.-]+$/.test(candidate)
    ? candidate
    : undefined;
}

export function highlightedCodeHtml(
  highlighter: SyntaxHighlighter,
  code: string,
  language?: string
): string | null {
  if (code.length > MAX_HIGHLIGHTED_CODE_CHARS) return null;
  const normalizedLanguage = normalizedCodeLanguage(language);
  const result =
    normalizedLanguage && highlighter.getLanguage(normalizedLanguage)
      ? highlighter.highlight(code, { language: normalizedLanguage })
      : highlighter.highlightAuto(code);
  const languageClass = normalizedLanguage
    ? ` language-${normalizedLanguage}`
    : "";
  return `<pre><code class="hljs${languageClass}">${result.value}</code></pre>\n`;
}
