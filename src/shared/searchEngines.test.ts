import { describe, expect, it } from "vitest";
import { searchParamNamesFromUrl, searchQueryFromUrl } from "./searchEngines";

describe("search engine URL detection", () => {
  it.each([
    ["Google", "https://www.google.co.uk/search?q=webmind+extension", "webmind extension"],
    ["Bing", "https://www.bing.com/search?q=ai+browser", "ai browser"],
    ["DuckDuckGo", "https://duckduckgo.com/?q=privacy+search", "privacy search"],
    ["Brave", "https://search.brave.com/search?q=local+llm", "local llm"],
    ["Yahoo", "https://search.yahoo.com/search?p=browser+assistant", "browser assistant"],
    ["Baidu", "https://www.baidu.com/s?wd=%E6%B5%8F%E8%A7%88%E5%99%A8AI", "浏览器AI"],
    ["Sogou", "https://www.sogou.com/web?query=%E7%BF%BB%E8%AF%91", "翻译"],
    ["360", "https://www.so.com/s?q=%E6%90%9C%E7%B4%A2", "搜索"],
    ["Yandex", "https://yandex.com/search/?text=web+assistant", "web assistant"],
    ["Ecosia", "https://www.ecosia.org/search?q=green+search", "green search"],
    ["Startpage", "https://www.startpage.com/sp/search?query=private+search", "private search"],
    ["Naver", "https://search.naver.com/search.naver?query=ai", "ai"]
  ])("detects %s search result URLs", (_, url, query) => {
    expect(searchQueryFromUrl(url)).toBe(query);
  });

  it("ignores non-search pages", () => {
    expect(searchQueryFromUrl("https://mail.google.com/mail/u/0/#search/test")).toBeNull();
    expect(searchQueryFromUrl("https://example.com/?q=test")).toBeNull();
  });

  it("returns query parameter names for matched search engines", () => {
    expect(searchParamNamesFromUrl("https://www.google.com/search")).toEqual([
      "q"
    ]);
    expect(searchParamNamesFromUrl("https://www.baidu.com/s")).toEqual([
      "wd",
      "word",
      "q"
    ]);
    expect(searchParamNamesFromUrl("https://example.com/search")).toEqual([]);
  });
});
