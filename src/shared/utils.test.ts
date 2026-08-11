import { describe, expect, it } from "vitest";
import {
  alignPageTranslations,
  cleanCitationExplanationText,
  extractJsonArray,
  extractPageTranslationEntries,
  isPointInsideAnyRect,
  normalizeDictionaryTranslationMarkdown,
  originPattern,
  parseCustomHeaders,
  protectTranslationText,
  createMessage,
  restoreTranslationText,
  toModelMessage,
  truncateText
} from "./utils";

describe("shared utilities", () => {
  it("parses JSON arrays returned inside a code fence", () => {
    expect(
      extractJsonArray<{ id: string }>(
        "```json\n[{\"id\":\"a\"}]\n```"
      )
    ).toEqual([{ id: "a" }]);
  });

  it("creates a host permission pattern from a provider URL", () => {
    expect(originPattern("https://api.example.com/v1")).toBe(
      "https://api.example.com/*"
    );
    expect(originPattern("not-a-url")).toBeNull();
  });

  it("validates custom headers as a JSON object", () => {
    expect(parseCustomHeaders('{"X-Team":"research","X-Flag":true}')).toEqual({
      "X-Team": "research",
      "X-Flag": "true"
    });
    expect(() => parseCustomHeaders("[]")).toThrow();
  });

  it("truncates long context while keeping the tail", () => {
    const result = truncateText("a".repeat(80) + "TAIL", 40, "zh-CN");
    expect(result.length).toBeGreaterThan(40);
    expect(result).toContain("内容已截断");
    expect(result).toContain("TAIL");
  });

  it("uses request-only message content without changing the visible message", () => {
    const message = createMessage("user", "自动翻译", {
      modelContent: "自动翻译\n\n以下是待翻译正文：\nFull page text"
    });

    expect(toModelMessage(message).content).toContain("Full page text");
    expect(toModelMessage(message).modelContent).toBeUndefined();
    expect(message.content).toBe("自动翻译");
  });

  it("requires the pointer to be inside a text rectangle", () => {
    const wordRect = {
      left: 100,
      right: 140,
      top: 20,
      bottom: 40,
      width: 40,
      height: 20
    };

    expect(isPointInsideAnyRect([wordRect], 120, 30)).toBe(true);
    expect(isPointInsideAnyRect([wordRect], 80, 30)).toBe(false);
    expect(isPointInsideAnyRect([wordRect], 160, 30)).toBe(false);
    expect(isPointInsideAnyRect([wordRect], 120, 60)).toBe(false);
  });

  it("normalizes dictionary fields into separate Markdown paragraphs", () => {
    expect(
      normalizeDictionaryTranslationMarkdown(
        "**获取** /huò qǔ/ **释义** acquire；**义项：** v. to obtain **例句** 获取数据（acquire data）"
      )
    ).toBe(
      "**获取** /huò qǔ/\n\n**释义** acquire\n\n**义项：** v. to obtain\n\n**例句** 获取数据（acquire data）"
    );
  });

  it("keeps already separated dictionary paragraphs stable", () => {
    const markdown =
      "**模型** /mó xíng/\n\n**釋義** model\n\n**語域** computing";

    expect(normalizeDictionaryTranslationMarkdown(markdown)).toBe(markdown);
  });

  it("promotes single dictionary line breaks to Markdown paragraphs", () => {
    expect(
      normalizeDictionaryTranslationMarkdown(
        "**获取** /huò qǔ/\n**释义** acquire\n**义项** v. to obtain"
      )
    ).toBe(
      "**获取** /huò qǔ/\n\n**释义** acquire\n\n**义项** v. to obtain"
    );
  });

  it("normalizes localized western dictionary fields", () => {
    const cases = [
      ["**mot** /mo/ **Définition** sens **Exemples** phrase", "Définition", "Exemples"],
      ["**Wort** /vɔʁt/ **Bedeutungen** Sinn **Beispiele** Satz", "Bedeutungen", "Beispiele"],
      ["**parola** /paˈrɔla/ **Definizione** senso **Esempi** frase", "Definizione", "Esempi"],
      ["**palabra** /paˈlaβɾa/ **Definición** significado **Ejemplos** frase", "Definición", "Ejemplos"]
    ] as const;

    for (const [input, firstField, secondField] of cases) {
      const normalized = normalizeDictionaryTranslationMarkdown(input);
      expect(normalized).toContain(`\n\n**${firstField}**`);
      expect(normalized).toContain(`\n\n**${secondField}**`);
    }
  });

  it("keeps translations attached to their requested blocks when IDs change", () => {
    expect(
      alignPageTranslations(
        [
          { id: "block-a", text: "Hello" },
          { id: "block-b", text: "World" }
        ],
        [
          { id: "model-a", translatedText: "你好" },
          { id: "model-b", content: "世界" }
        ]
      )
    ).toEqual([
      { id: "block-a", text: "你好" },
      { id: "block-b", text: "世界" }
    ]);
  });

  it("reserves exact translation IDs before applying positional fallbacks", () => {
    expect(
      alignPageTranslations(
        [
          { id: "block-a", text: "A" },
          { id: "block-b", text: "B" },
          { id: "block-c", text: "C" }
        ],
        [
          { id: "changed-a", text: "译文 A" },
          { id: "block-c", text: "译文 C" }
        ]
      )
    ).toEqual([
      { id: "block-a", text: "译文 A" },
      { id: "block-c", text: "译文 C" }
    ]);
  });

  it("accepts plain text and wrapped objects for single-block translations", () => {
    expect(extractPageTranslationEntries("直接返回的译文", 1)).toEqual([
      { text: "直接返回的译文" }
    ]);
    expect(
      extractPageTranslationEntries(
        '{"translation":"对象中的译文"}',
        1
      )
    ).toEqual([{ translation: "对象中的译文" }]);
  });

  it("protects and restores translation paragraphs and citation markers", () => {
    const source = "First paragraph [1-3].\n\nSecond paragraph¹.";
    const protection = protectTranslationText(source);

    expect(protection.text).toContain("{{WEBMIND_CITATION_1}}");
    expect(protection.text).toContain("{{WEBMIND_CITATION_2}}");
    expect(protection.text).toContain("{{WEBMIND_PARAGRAPH_BREAK_1}}");
    expect(
      restoreTranslationText(
        "第一段 {{WEBMIND_CITATION_1}}。{{WEBMIND_PARAGRAPH_BREAK_1}}第二段{{WEBMIND_CITATION_2}}。",
        protection
      )
    ).toBe("第一段 [1-3]。\n\n第二段¹。");
  });

  it("protects every source line break instead of allowing line merging", () => {
    const protection = protectTranslationText("Title\nFirst line\n\nSecond paragraph");

    expect(protection.paragraphBreaks).toEqual(["\n", "\n\n"]);
    expect(protection.text).toBe(
      "Title{{WEBMIND_PARAGRAPH_BREAK_1}}First line{{WEBMIND_PARAGRAPH_BREAK_2}}Second paragraph"
    );
    expect(
      restoreTranslationText(
        "标题{{WEBMIND_PARAGRAPH_BREAK_1}}第一行{{WEBMIND_PARAGRAPH_BREAK_2}}第二段",
        protection
      )
    ).toBe("标题\n第一行\n\n第二段");
  });

  it("restores fenced code blocks verbatim when the model wraps placeholders", () => {
    const source =
      "Run this example:\n\n```javascript\nconst answer = 42;\nconsole.log(answer);\n```\n\nDone.";
    const protection = protectTranslationText(source);

    expect(protection.codeBlocks).toEqual([
      "```javascript\nconst answer = 42;\nconsole.log(answer);\n```"
    ]);
    expect(protection.text).not.toContain("const answer");
    expect(
      restoreTranslationText(
        "运行这个示例：{{WEBMIND_PARAGRAPH_BREAK_1}}``{{WEBMIND_CODE_BLOCK_1}}``{{WEBMIND_PARAGRAPH_BREAK_2}}完成。",
        protection
      )
    ).toBe(
      "运行这个示例：\n\n```javascript\nconst answer = 42;\nconsole.log(answer);\n```\n\n完成。"
    );
  });

  it("restores a code block at its source position when the model drops its placeholder", () => {
    const source =
      "Before.\n\n```typescript\nconst answer = 42;\n```\n\nAfter.";
    const protection = protectTranslationText(source);

    expect(
      restoreTranslationText("之前。{{WEBMIND_PARAGRAPH_BREAK_1}}{{WEBMIND_PARAGRAPH_BREAK_2}}之后。", protection)
    ).toBe("之前。\n\n```typescript\nconst answer = 42;\n```\n\n之后。");
  });

  it("removes numbering that was invented for ordinary source paragraphs", () => {
    const protection = protectTranslationText("First paragraph.\n\nSecond paragraph.\n\nThird paragraph.");

    expect(
      restoreTranslationText(
        "第一段。{{WEBMIND_PARAGRAPH_BREAK_1}}1. 第二段。{{WEBMIND_PARAGRAPH_BREAK_2}}2. 第三段。",
        protection
      )
    ).toBe("第一段。\n\n第二段。\n\n第三段。");
  });

  it("preserves source list markers while restoring translations", () => {
    const source = "1. First item\n2. Second item";
    const protection = protectTranslationText(source);

    expect(
      restoreTranslationText(
        "1. 第一项{{WEBMIND_PARAGRAPH_BREAK_1}}2. 第二项",
        protection
      )
    ).toBe("1. 第一项\n2. 第二项");
  });

  it("removes numbering continued by the model after a genuine source list", () => {
    const source = "1. First item\n2. Second item\n\nOrdinary paragraph.\n\nAnother paragraph.";
    const protection = protectTranslationText(source);

    expect(
      restoreTranslationText(
        "1. 第一项{{WEBMIND_PARAGRAPH_BREAK_1}}2. 第二项{{WEBMIND_PARAGRAPH_BREAK_2}}3. 普通段落。{{WEBMIND_PARAGRAPH_BREAK_3}}4. 另一个段落。",
        protection
      )
    ).toBe("1. 第一项\n2. 第二项\n\n普通段落。\n\n另一个段落。");
  });

  it("hides incomplete protected tokens only in the streaming view", () => {
    const protection = protectTranslationText("First\n\nSecond");
    const partialResponses = [
      "第一段{",
      "第一段{{",
      "第一段{{W",
      "第一段{{WEB",
      "第一段``{{WEBMI",
      "第一段{{WEBMIND_PARAGRAPH_BREAK_"
    ];

    for (const response of partialResponses) {
      expect(
        restoreTranslationText(response, protection, { streaming: true })
      ).toBe("第一段");
    }
    expect(
      restoreTranslationText(
        "第一段{{WEBMIND_PARAGRAPH_BREAK_1}}第二段",
        protection,
        { streaming: true }
      )
    ).toBe("第一段\n\n第二段");
    expect(restoreTranslationText("最终内容 WEB", protection)).toBe(
      "最终内容 WEB"
    );

    const citationProtection = protectTranslationText("Claim [1].");
    expect(
      restoreTranslationText("译文仍在生成", citationProtection, {
        streaming: true
      })
    ).toBe("译文仍在生成");
    expect(restoreTranslationText("完整译文", citationProtection)).toBe(
      "完整译文 [1]"
    );
  });

  it("restores mildly reformatted translation placeholders", () => {
    const protection = protectTranslationText("Alpha [2].\n\nBeta.");

    expect(
      restoreTranslationText(
        "甲 `[ WEBMIND_CITATION_1 ]`。\n[WEBMIND_PARAGRAPH_BREAK_1]\n乙。",
        protection
      )
    ).toBe("甲 [2]。\n\n乙。");
  });

  it("protects link targets while translating visible link text", () => {
    const protection = protectTranslationText(
      "Read [the documentation](https://example.com/path?q=1)."
    );

    expect(protection.text).toContain("{{WEBMIND_LINK_START_1}}");
    expect(protection.text).toContain("the documentation");
    expect(protection.text).not.toContain("https://example.com");
    expect(
      restoreTranslationText(
        "阅读 {{WEBMIND_LINK_START_1}}文档{{WEBMIND_LINK_END_1}}。",
        protection
      )
    ).toBe("阅读 [文档](<https://example.com/path?q=1>)。");
  });

  it("does not expose invisible HTML link attributes as translation source text", () => {
    const protection = protectTranslationText(
      'Read <a href="https://secret.example/path?q=1" title="Hidden title" aria-label="Hidden label" data-topic="metadata">visible docs</a>.'
    );

    expect(protection.text).toContain(
      "{{WEBMIND_LINK_START_1}}visible docs{{WEBMIND_LINK_END_1}}"
    );
    expect(protection.text).not.toContain("https://secret.example");
    expect(protection.text).not.toContain("Hidden title");
    expect(protection.text).not.toContain("Hidden label");
    expect(protection.text).not.toContain("metadata");
    expect(protection.links[0]).toEqual({
      href: "https://secret.example/path?q=1",
      text: "visible docs"
    });
  });

  it("protects Markdown link titles without treating titles as source text", () => {
    const protection = protectTranslationText(
      'Read [visible docs](https://example.com/path "Invisible title").'
    );

    expect(protection.text).toContain(
      "{{WEBMIND_LINK_START_1}}visible docs{{WEBMIND_LINK_END_1}}"
    );
    expect(protection.text).not.toContain("https://example.com");
    expect(protection.text).not.toContain("Invisible title");
    expect(
      restoreTranslationText(
        "阅读 {{WEBMIND_LINK_START_1}}文档{{WEBMIND_LINK_END_1}}。",
        protection
      )
    ).toBe("阅读 [文档](<https://example.com/path>)。");
  });

  it("protects superscript and subscript markup while translating visible text", () => {
    const protection = protectTranslationText(
      "H<sub>2</sub>O and x<sup>2</sup>."
    );

    expect(protection.text).toContain("{{WEBMIND_FORMAT_START_1}}2");
    expect(protection.text).toContain("{{WEBMIND_FORMAT_START_2}}2");
    expect(protection.text).not.toContain("<sub>");
    expect(protection.text).not.toContain("<sup>");
    expect(
      restoreTranslationText(
        "水 {{WEBMIND_FORMAT_START_1}}2{{WEBMIND_FORMAT_END_1}} 和 x{{WEBMIND_FORMAT_START_2}}2{{WEBMIND_FORMAT_END_2}}。",
        protection
      )
    ).toBe("水 <sub>2</sub> 和 x<sup>2</sup>。");
  });

  it("does not expose invisible attributes from superscript or subscript markup", () => {
    const protection = protectTranslationText(
      'x<sup title="squared" data-note="metadata">2</sup> and H<sub aria-label="two">2</sub>O'
    );

    expect(protection.text).toContain(
      "x{{WEBMIND_FORMAT_START_1}}2{{WEBMIND_FORMAT_END_1}}"
    );
    expect(protection.text).toContain(
      "H{{WEBMIND_FORMAT_START_2}}2{{WEBMIND_FORMAT_END_2}}O"
    );
    expect(protection.text).not.toContain("squared");
    expect(protection.text).not.toContain("metadata");
    expect(protection.text).not.toContain("two");
  });

  it("protects and restores visible Markdown HTML formatting", () => {
    const source =
      "Use <strong>bold</strong>, <em>italic</em>, <u>underlined</u>, and <del>removed</del> text.";
    const protection = protectTranslationText(source);

    expect(protection.text).toContain("{{WEBMIND_HTML_TAG_1}}");
    expect(protection.text).not.toContain("<strong>");
    expect(
      restoreTranslationText(
        "使用 {{WEBMIND_HTML_TAG_1}}粗体{{WEBMIND_HTML_TAG_2}}、{{WEBMIND_HTML_TAG_3}}斜体{{WEBMIND_HTML_TAG_4}}、{{WEBMIND_HTML_TAG_5}}下划线{{WEBMIND_HTML_TAG_6}}和{{WEBMIND_HTML_TAG_7}}删除{{WEBMIND_HTML_TAG_8}}文字。",
        protection
      )
    ).toBe(
      "使用 <strong>粗体</strong>、<em>斜体</em>、<u>下划线</u>和<del>删除</del>文字。"
    );
  });

  it("protects general HTML tags while translating visible text", () => {
    const protection = protectTranslationText(
      'Read <span class="secret" hidden>hidden</span> and <br/> keep going.'
    );

    expect(protection.text).toContain(
      "{{WEBMIND_HTML_TAG_1}}hidden{{WEBMIND_HTML_TAG_2}}"
    );
    expect(protection.text).toContain("{{WEBMIND_HTML_TAG_3}}");
    expect(protection.text).not.toContain('class="secret"');
    expect(
      restoreTranslationText(
        "阅读 {{WEBMIND_HTML_TAG_1}}隐藏{{WEBMIND_HTML_TAG_2}} 并 {{WEBMIND_HTML_TAG_3}} 继续。",
        protection
      )
    ).toBe('阅读 <span class="secret" hidden>隐藏</span> 并 <br/> 继续。');
  });

  it("falls back to plain visible text when rich-text boundary tokens are incomplete", () => {
    const protection = protectTranslationText(
      "Read [the documentation](https://example.com/path) and H<sub>2</sub>O."
    );

    expect(
      restoreTranslationText(
        "阅读 {{WEBMIND_LINK_START_1}}文档，同时水 {{WEBMIND_FORMAT_START_1}}2。",
        protection
      )
    ).toBe("阅读 文档，同时水 2。");
  });

  it("keeps citation markers visible when the model drops citation placeholders", () => {
    const protection = protectTranslationText("This claim [5] is important.");

    expect(restoreTranslationText("这个说法很重要。", protection)).toBe(
      "这个说法很重要。 [5]"
    );
  });

  it("keeps citation markers while removing extracted citation labels", () => {
    const source =
      "A total solar eclipse will cross a narrow corridor **4 citations from multiple sources**[1-4]. Totality will last up to two minutes **Citation 5 from theguardian.com**[5]**Citation 2 from npr.org**[2]. NASA reported this [9].";

    expect(cleanCitationExplanationText(source)).toBe(
      "A total solar eclipse will cross a narrow corridor [1-4]. Totality will last up to two minutes [5][2]. NASA reported this [9]."
    );
  });

  it("removes citation explanations hallucinated around placeholders", () => {
    const protection = protectTranslationText("This claim [5] is important.");

    expect(
      restoreTranslationText(
        "这个说法 多方来源的 5 条引用{{WEBMIND_CITATION_1}} 很重要。",
        protection
      )
    ).toBe("这个说法[5] 很重要。");
  });

  it("removes invented WebMind placeholder fragments from translations", () => {
    const protection = protectTranslationText("First [1].\n\nSecond.");

    expect(
      restoreTranslationText(
        "第一{{WEBMIND_CITATION_1}}。{{WEBMIND_PARAGRAPH_BREAK_1}}第二。{WEBMIND_CITATION_14}}来自 example.com",
        protection
      )
    ).toBe("第一[1]。\n\n第二。来自 example.com");
  });

  it("removes partial brace placeholder fragments from translations", () => {
    const protection = protectTranslationText("Alpha.\n\nBeta.");

    expect(
      restoreTranslationText(
        "阿尔法。{{WEBMIND_PARAGR\n\n{{3}}贝塔。",
        protection
      )
    ).toBe("阿尔法。\n\n贝塔。");
  });

  it("removes English source labels hallucinated before restored citation markers", () => {
    const protection = protectTranslationText("Alpha [1]. Beta [2].");

    expect(
      restoreTranslationText(
        "阿尔法 Citation 1 from nasa.gov{{WEBMIND_CITATION_1}}。贝塔 Citation 2 from bbc.co.uk{{WEBMIND_CITATION_2}}。",
        protection
      )
    ).toBe("阿尔法[1]。贝塔[2]。");
  });

  it("removes repeated translation-task prefaces from translated text", () => {
    const protection = protectTranslationText("Hello.");

    expect(
      restoreTranslationText(
        "这是一个翻译任务。以下是根据您提供的内容进行的翻译：\n\n这是一个翻译任务。以下是根据您提供的内容进行的翻译：\n\n你好。",
        protection
      )
    ).toBe("你好。");
  });
});
