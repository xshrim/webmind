import { uiText } from "./i18n";
import type { AppLanguage, WebSearchResult } from "./types";

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\""
};

function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10))
    )
    .replace(
      /&([a-z]+);/gi,
      (_, name: string) => HTML_ENTITIES[name.toLowerCase()] ?? `&${name};`
    );
}

function textFromHtml(value: string): string {
  return decodeHtml(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function attrValue(tag: string, name: string): string {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
  );
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function unwrapDuckDuckGoUrl(value: string): string {
  try {
    const url = new URL(value, "https://duckduckgo.com");
    const target = url.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : url.href;
  } catch {
    return value;
  }
}

export function parseDuckDuckGoResults(
  html: string,
  limit = 6
): WebSearchResult[] {
  const resultBlocks =
    html.match(
      /<div[^>]+class=(?:"[^"]*\bresult\b[^"]*"|'[^']*\bresult\b[^']*')[\s\S]*?(?=<div[^>]+class=(?:"[^"]*\bresult\b[^"]*"|'[^']*\bresult\b[^']*')|<\/body>)/gi
    ) ?? [];
  const seen = new Set<string>();
  const results: WebSearchResult[] = [];

  for (const block of resultBlocks) {
    if (results.length >= limit) break;
    const linkMatch = block.match(
      /<a\b[^>]+class=(?:"[^"]*\bresult__a\b[^"]*"|'[^']*\bresult__a\b[^']*')[^>]*>[\s\S]*?<\/a>/i
    );
    if (!linkMatch) continue;
    const link = linkMatch[0];
    const title = textFromHtml(link);
    const url = unwrapDuckDuckGoUrl(attrValue(link, "href"));
    if (!title || !url) continue;
    const snippetMatch = block.match(
      /<([a-z0-9]+)\b[^>]+class=(?:"[^"]*\bresult__snippet\b[^"]*"|'[^']*\bresult__snippet\b[^']*')[^>]*>[\s\S]*?<\/\1>/i
    );
    const snippet = snippetMatch ? textFromHtml(snippetMatch[0]) : "";
    const key = `${title}\n${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ title, url, snippet });
  }

  return results;
}

export async function searchWeb(
  query: string,
  limit = 6,
  language?: AppLanguage
): Promise<WebSearchResult[]> {
  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", query);
  const response = await fetch(url, {
    headers: { Accept: "text/html" }
  });
  if (!response.ok) {
    throw new Error(`${uiText(language, "webSearchFailed")} (${response.status})`);
  }
  const results = parseDuckDuckGoResults(await response.text(), limit);
  if (!results.length) throw new Error(uiText(language, "webSearchNoResults"));
  return results;
}
