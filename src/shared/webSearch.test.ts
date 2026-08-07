import { describe, expect, it } from "vitest";
import { parseDuckDuckGoResults } from "./webSearch";

describe("DuckDuckGo result parsing", () => {
  it("extracts titles, snippets and original result URLs", () => {
    const html = `
      <html>
        <body>
          <div class="result results_links">
            <h2 class="result__title">
              <a class="result__a" href="/l/?uddg=https%3A%2F%2Fexample.com%2Farticle%3Fa%3D1&amp;rut=abc">
                Example &amp; Research
              </a>
            </h2>
            <a class="result__snippet">Useful &lt;b&gt;summary&lt;/b&gt; text.</a>
          </div>
        </body>
      </html>
    `;

    expect(parseDuckDuckGoResults(html)).toEqual([
      {
        title: "Example & Research",
        url: "https://example.com/article?a=1",
        snippet: "Useful <b>summary</b> text."
      }
    ]);
  });
});
