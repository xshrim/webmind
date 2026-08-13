type SearchRule = {
  match: (host: string, path: string) => boolean;
  params: string[];
};

export const SELECTION_SEARCH_ENGINE_OPTIONS = [
  ["google", "Google"],
  ["bing", "Bing"],
  ["duckduckgo", "DuckDuckGo"],
  ["brave", "Brave"],
  ["baidu", "百度"],
  ["yahoo", "Yahoo"],
  ["yandex", "Yandex"],
  ["ecosia", "Ecosia"]
] as const;

export type SelectionSearchEngineId =
  (typeof SELECTION_SEARCH_ENGINE_OPTIONS)[number][0];

const SELECTION_SEARCH_URLS: Record<SelectionSearchEngineId, string> = {
  google: "https://www.google.com/search?q=",
  bing: "https://www.bing.com/search?q=",
  duckduckgo: "https://duckduckgo.com/?q=",
  brave: "https://search.brave.com/search?q=",
  baidu: "https://www.baidu.com/s?wd=",
  yahoo: "https://search.yahoo.com/search?p=",
  yandex: "https://yandex.com/search/?text=",
  ecosia: "https://www.ecosia.org/search?q="
};

export function selectionSearchUrl(
  engine: SelectionSearchEngineId,
  query: string
): string {
  return `${SELECTION_SEARCH_URLS[engine] ?? SELECTION_SEARCH_URLS.google}${encodeURIComponent(query.trim())}`;
}

const SEARCH_RULES: SearchRule[] = [
  {
    match: (host, path) =>
      /^google\.[a-z.]+$/.test(host) &&
      (path === "/search" || path === "/webhp" || path === "/"),
    params: ["q"]
  },
  {
    match: (host, path) =>
      (host === "bing.com" || host.endsWith(".bing.com")) &&
      path.startsWith("/search"),
    params: ["q"]
  },
  {
    match: (host) =>
      host === "duckduckgo.com" || host.endsWith(".duckduckgo.com"),
    params: ["q"]
  },
  {
    match: (host, path) => host === "search.brave.com" && path.startsWith("/search"),
    params: ["q"]
  },
  {
    match: (host, path) =>
      /^search\.yahoo\.[a-z.]+$/.test(host) && path.startsWith("/search"),
    params: ["p", "q"]
  },
  {
    match: (host, path) =>
      (host === "baidu.com" || host.endsWith(".baidu.com")) &&
      (path === "/s" || path === "/baidu" || path === "/"),
    params: ["wd", "word", "q"]
  },
  {
    match: (host, path) =>
      (host === "sogou.com" || host.endsWith(".sogou.com")) &&
      (path.startsWith("/web") || path === "/"),
    params: ["query", "keyword", "q"]
  },
  {
    match: (host, path) =>
      ["so.com", "360search.com", "haosou.com"].some(
        (domain) => host === domain || host.endsWith(`.${domain}`)
      ) && (path.startsWith("/s") || path === "/"),
    params: ["q"]
  },
  {
    match: (host, path) =>
      /^yandex\.[a-z.]+$/.test(host) && path.startsWith("/search"),
    params: ["text", "q"]
  },
  {
    match: (host, path) =>
      (host === "ecosia.org" || host.endsWith(".ecosia.org")) &&
      path.startsWith("/search"),
    params: ["q"]
  },
  {
    match: (host, path) =>
      (host === "startpage.com" || host.endsWith(".startpage.com")) &&
      (path.startsWith("/sp/search") ||
        path.startsWith("/do/search") ||
        path.startsWith("/do/dsearch") ||
        path === "/"),
    params: ["query", "q"]
  },
  {
    match: (host, path) =>
      (host === "ask.com" || host.endsWith(".ask.com")) &&
      path.startsWith("/web"),
    params: ["q"]
  },
  {
    match: (host) => host === "search.aol.com",
    params: ["q"]
  },
  {
    match: (host, path) =>
      host === "search.naver.com" && path.startsWith("/search.naver"),
    params: ["query"]
  },
  {
    match: (host) => host === "search.seznam.cz",
    params: ["q"]
  },
  {
    match: (host) => host === "qwant.com" || host.endsWith(".qwant.com"),
    params: ["q"]
  },
  {
    match: (host, path) =>
      (host === "yep.com" || host.endsWith(".yep.com")) &&
      path.startsWith("/web"),
    params: ["q"]
  },
  {
    match: (host, path) =>
      (host === "you.com" || host.endsWith(".you.com")) &&
      path.startsWith("/search"),
    params: ["q"]
  },
  {
    match: (host, path) =>
      (host === "sm.cn" || host.endsWith(".sm.cn")) && path.startsWith("/s"),
    params: ["q"]
  }
];

function searchRuleFromUrl(value: string): {
  url: URL;
  rule: SearchRule;
} | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname || "/";
    const rule = SEARCH_RULES.find((item) => item.match(host, path));
    if (!rule) return null;
    return { url, rule };
  } catch {
    return null;
  }
}

export function searchParamNamesFromUrl(value: string): string[] {
  return searchRuleFromUrl(value)?.rule.params ?? [];
}

export function searchQueryFromUrl(value: string): string | null {
  const match = searchRuleFromUrl(value);
  if (!match) return null;
  try {
    const { url, rule } = match;
    for (const param of rule.params) {
      const query = url.searchParams.get(param)?.trim();
      if (query) return query;
    }
    return null;
  } catch {
    return null;
  }
}
