import { useEffect, useMemo, useRef, useState } from "react";
import { renderMarkdownHtml } from "../ui/Markdown";
import { highlightedCodeHtml } from "./syntaxHighlight";

type SyntaxHighlighter = typeof import("highlight.js/lib/common")["default"];

let syntaxHighlighterPromise: Promise<SyntaxHighlighter> | null = null;
let loadedSyntaxHighlighter: SyntaxHighlighter | null = null;

function loadSyntaxHighlighter(): Promise<SyntaxHighlighter> {
  syntaxHighlighterPromise ??= import("highlight.js/lib/common").then(
    (module) => {
      loadedSyntaxHighlighter = module.default;
      return module.default;
    }
  );
  return syntaxHighlighterPromise;
}

export function SyntaxHighlightedMarkdown({
  content,
  eager = false
}: {
  content: string;
  eager?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [highlighter, setHighlighter] = useState<SyntaxHighlighter | null>(
    () => loadedSyntaxHighlighter
  );
  const plainHtml = useMemo(() => renderMarkdownHtml(content), [content]);
  const hasCodeBlock = /<pre><code(?:\s|>)/i.test(plainHtml);
  const html = useMemo(
    () =>
      highlighter && hasCodeBlock
        ? renderMarkdownHtml(content, (code, language) =>
            highlightedCodeHtml(highlighter, code, language)
          )
        : plainHtml,
    [content, hasCodeBlock, highlighter, plainHtml]
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !hasCodeBlock || highlighter) return;
    let active = true;
    const activate = () => {
      void loadSyntaxHighlighter().then((loaded) => {
        if (active) setHighlighter(() => loaded);
      });
    };

    if (eager) {
      activate();
      return () => {
        active = false;
      };
    }

    if (!("IntersectionObserver" in globalThis)) {
      activate();
      return () => {
        active = false;
      };
    }

    const scrollRoot = root.closest<HTMLElement>(".body-preview-blocks");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        activate();
      },
      { root: scrollRoot, rootMargin: "80px 0px" }
    );
    observer.observe(root);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [eager, hasCodeBlock, highlighter]);

  return (
    <div
      ref={rootRef}
      className="markdown syntax-highlighted-markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
