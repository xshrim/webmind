export type CookiePreviewFormat = "json" | "netscape" | "http" | "curl";

function cookieHeader(cookies: chrome.cookies.Cookie[]): string {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\\"'\\\"'")}'`;
}

function formatNetscapeCookie(cookie: chrome.cookies.Cookie): string {
  const domain = cookie.httpOnly ? `#HttpOnly_${cookie.domain}` : cookie.domain;
  const includeSubdomains = cookie.hostOnly ? "FALSE" : "TRUE";
  const secure = cookie.secure ? "TRUE" : "FALSE";
  const expiration = cookie.session
    ? "0"
    : String(Math.floor(cookie.expirationDate ?? 0));
  return [
    domain,
    includeSubdomains,
    cookie.path,
    secure,
    expiration,
    cookie.name,
    cookie.value
  ].join("\t");
}

export function formatCookiePreview(
  url: string,
  cookies: chrome.cookies.Cookie[],
  format: CookiePreviewFormat
): string {
  if (format === "json") return JSON.stringify(cookies, null, 2);
  if (format === "netscape") {
    return [
      "# Netscape HTTP Cookie File",
      "# https://curl.se/docs/http-cookies.html",
      "",
      ...cookies.map(formatNetscapeCookie)
    ].join("\n");
  }

  const header = `Cookie: ${cookieHeader(cookies)}`;
  if (format === "http") return header;
  return `curl ${shellQuote(url)} \\\n+  -H ${shellQuote(header)}`;
}
