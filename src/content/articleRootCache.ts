export type ArticleRootCacheStatus = "hit" | "miss" | "bypass";

interface ArticleRootCacheEntry<T> {
  value: T;
  url: string;
  ruleSignature: string;
}

export interface ArticleRootCacheLookup<T> {
  status: ArticleRootCacheStatus;
  value?: T;
}

export function articleExtractionRuleSignature(
  rules: ReadonlyArray<{
    id: string;
    urlPattern: string;
    selector: string;
  }>
): string {
  return JSON.stringify(
    rules.map(({ id, urlPattern, selector }) => [id, urlPattern, selector])
  );
}

export class ArticleRootCache<T> {
  private entry: ArticleRootCacheEntry<T> | null = null;

  constructor(private readonly onInvalidate?: () => void) {}

  synchronizeContext(url: string, ruleSignature: string): void {
    if (
      this.entry &&
      (this.entry.url !== url || this.entry.ruleSignature !== ruleSignature)
    ) {
      this.invalidate();
    }
  }

  lookup(options: {
    url: string;
    ruleSignature: string;
    bypass: boolean;
    isConnected: (value: T) => boolean;
  }): ArticleRootCacheLookup<T> {
    this.synchronizeContext(options.url, options.ruleSignature);
    if (options.bypass) {
      this.invalidate();
      return { status: "bypass" };
    }
    if (!this.entry) return { status: "miss" };
    if (!options.isConnected(this.entry.value)) {
      this.invalidate();
      return { status: "miss" };
    }
    return { status: "hit", value: this.entry.value };
  }

  store(value: T, url: string, ruleSignature: string): void {
    this.invalidate();
    this.entry = { value, url, ruleSignature };
  }

  invalidate(): void {
    if (!this.entry) return;
    this.entry = null;
    this.onInvalidate?.();
  }
}
