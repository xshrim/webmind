import { describe, expect, it, vi } from "vitest";
import {
  ArticleRootCache,
  articleExtractionRuleSignature
} from "./articleRootCache";

describe("article root cache", () => {
  it("reuses a connected root for the same URL and rules", () => {
    const root = { connected: true };
    const cache = new ArticleRootCache<typeof root>();
    cache.store(root, "https://example.com/article", "rules");

    expect(
      cache.lookup({
        url: "https://example.com/article",
        ruleSignature: "rules",
        bypass: false,
        isConnected: (value) => value.connected
      })
    ).toEqual({ status: "hit", value: root });
  });

  it("invalidates the root when the URL changes", () => {
    const onInvalidate = vi.fn();
    const cache = new ArticleRootCache<object>(onInvalidate);
    cache.store({}, "https://example.com/first", "rules");

    cache.synchronizeContext("https://example.com/second", "rules");

    expect(onInvalidate).toHaveBeenCalledOnce();
    expect(
      cache.lookup({
        url: "https://example.com/second",
        ruleSignature: "rules",
        bypass: false,
        isConnected: () => true
      }).status
    ).toBe("miss");
  });

  it("invalidates the root when extraction rules change", () => {
    const cache = new ArticleRootCache<object>();
    cache.store({}, "https://example.com/article", "old-rules");

    expect(
      cache.lookup({
        url: "https://example.com/article",
        ruleSignature: "new-rules",
        bypass: false,
        isConnected: () => true
      }).status
    ).toBe("miss");
  });

  it("invalidates a disconnected root", () => {
    const onInvalidate = vi.fn();
    const cache = new ArticleRootCache<object>(onInvalidate);
    cache.store({}, "https://example.com/article", "rules");

    expect(
      cache.lookup({
        url: "https://example.com/article",
        ruleSignature: "rules",
        bypass: false,
        isConnected: () => false
      }).status
    ).toBe("miss");
    expect(onInvalidate).toHaveBeenCalledOnce();
  });

  it("bypasses and clears caching for unsupported DOM cases", () => {
    const onInvalidate = vi.fn();
    const cache = new ArticleRootCache<object>(onInvalidate);
    cache.store({}, "https://example.com/article", "rules");

    expect(
      cache.lookup({
        url: "https://example.com/article",
        ruleSignature: "rules",
        bypass: true,
        isConnected: () => true
      }).status
    ).toBe("bypass");
    expect(onInvalidate).toHaveBeenCalledOnce();
  });

  it("uses rule order and all matching fields in the signature", () => {
    const rules = [
      { id: "first", urlPattern: "example.com/*", selector: "main" },
      { id: "second", urlPattern: "*", selector: "article" }
    ];

    expect(articleExtractionRuleSignature(rules)).not.toBe(
      articleExtractionRuleSignature([...rules].reverse())
    );
    expect(articleExtractionRuleSignature(rules)).not.toBe(
      articleExtractionRuleSignature([
        rules[0],
        { ...rules[1], selector: "[role='main']" }
      ])
    );
  });
});
