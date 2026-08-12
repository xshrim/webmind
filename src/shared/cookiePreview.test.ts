import { describe, expect, it } from "vitest";
import { formatCookiePreview } from "./cookiePreview";

const cookies: chrome.cookies.Cookie[] = [
  {
    domain: ".example.com",
    expirationDate: 1_800_000_000,
    hostOnly: false,
    httpOnly: true,
    name: "session",
    path: "/",
    sameSite: "lax",
    secure: true,
    session: false,
    storeId: "0",
    value: "abc123"
  },
  {
    domain: "example.com",
    hostOnly: true,
    httpOnly: false,
    name: "theme",
    path: "/settings",
    sameSite: "unspecified",
    secure: false,
    session: true,
    storeId: "0",
    value: "dark"
  }
];

describe("formatCookiePreview", () => {
  it("serializes complete cookie records as JSON", () => {
    expect(formatCookiePreview("https://example.com", cookies, "json")).toBe(
      JSON.stringify(cookies, null, 2)
    );
  });

  it("writes Netscape cookie-file rows", () => {
    expect(formatCookiePreview("https://example.com", cookies, "netscape")).toBe(
      "# Netscape HTTP Cookie File\n" +
        "# https://curl.se/docs/http-cookies.html\n\n" +
        "#HttpOnly_.example.com\tTRUE\t/\tTRUE\t1800000000\tsession\tabc123\n" +
        "example.com\tFALSE\t/settings\tFALSE\t0\ttheme\tdark"
    );
  });

  it("writes HTTP and cURL request headers", () => {
    expect(formatCookiePreview("https://example.com/a?b=1", cookies, "http")).toBe(
      "Cookie: session=abc123; theme=dark"
    );
    expect(formatCookiePreview("https://example.com/a?b=1", cookies, "curl")).toBe(
      "curl 'https://example.com/a?b=1' \\\n+  -H 'Cookie: session=abc123; theme=dark'"
    );
  });
});
