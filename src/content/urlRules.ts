function normalizePattern(value: string): string {
  return value.trim().toLowerCase();
}

function wildcardMatch(value: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i").test(value);
}

function urlMatchesRule(url: string, rule: string): boolean {
  const pattern = normalizePattern(rule);
  if (!pattern) return false;
  const current = new URL(url);
  const href = current.href.toLowerCase();
  const host = current.hostname.toLowerCase();
  if (pattern.includes("://") || pattern.includes("/") || pattern.includes("*")) {
    return wildcardMatch(href, pattern) || href.includes(pattern.replace(/\*/g, ""));
  }
  return host === pattern || host.endsWith(`.${pattern}`);
}

export function urlMatchesBlacklist(url: string, rules: string[] = []): boolean {
  return rules.some((rule) => {
    try {
      return urlMatchesRule(url, rule);
    } catch {
      return false;
    }
  });
}

export function urlMatchesWhitelist(url: string, rules: string[] = []): boolean {
  return rules.some((rule) => {
    try {
      return urlMatchesRule(url, rule);
    } catch {
      return false;
    }
  });
}
