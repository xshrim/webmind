import { describe, expect, it } from "vitest";
import {
  LANGUAGE_OPTIONS,
  UI_TEXT,
  resolveLanguage,
  resolvePromptLanguage
} from "./i18n";
import {
  buildProtectedTranslationPrompt,
  protectTranslationText
} from "./utils";
import {
  articlePruneInstruction,
  builtInToolsForLanguage,
  detectTranslationLanguage,
  isDictionaryTranslationInput,
  quickActionPrompt,
  translationDirectionInstruction
} from "./prompts";

describe("localized tools and prompts", () => {
  it("supports the additional European language settings", () => {
    expect(LANGUAGE_OPTIONS.slice(-4).map(({ id }) => id)).toEqual([
      "es",
      "fr",
      "de",
      "it"
    ]);
    expect(resolveLanguage("auto", "es-MX")).toBe("es");
    expect(resolveLanguage("auto", "fr-FR")).toBe("fr");
    expect(resolveLanguage("auto", "de-DE")).toBe("de");
    expect(resolveLanguage("auto", "it-IT")).toBe("it");
    expect(resolvePromptLanguage("fr")).toBe("en");
    expect(UI_TEXT.es.settings).toBe("Configuración");
    expect(UI_TEXT.fr.settings).toBe("Paramètres");
    expect(UI_TEXT.de.settings).toBe("Einstellungen");
    expect(UI_TEXT.it.settings).toBe("Impostazioni");
    expect(UI_TEXT.fr).not.toBe(UI_TEXT.en);
    expect(LANGUAGE_OPTIONS.map(({ label }) => label)).toEqual([
      "自动",
      "简体中文",
      "繁體中文",
      "English",
      "日本語",
      "한국어",
      "Español",
      "Français",
      "Deutsch",
      "Italiano"
    ]);
  });

  it("keeps UI text keys complete for every supported language", () => {
    const baseKeys = Object.keys(UI_TEXT["zh-CN"]).sort();
    for (const language of [
      "zh-TW",
      "en",
      "ja",
      "ko",
      "es",
      "fr",
      "de",
      "it"
    ] as const) {
      expect(Object.keys(UI_TEXT[language]).sort()).toEqual(baseKeys);
    }
  });

  it("localizes built-in tool metadata and templates", () => {
    const englishSummary = builtInToolsForLanguage("en").find(
      (tool) => tool.id === "summary"
    );
    const chineseAutoTranslate = builtInToolsForLanguage({
      interfaceLanguage: "zh-CN",
      translationLanguage: "auto"
    }).find((tool) => tool.id === "translate-text");
    const japaneseTranslate = builtInToolsForLanguage({
      interfaceLanguage: "ja",
      translationLanguage: "ko"
    }).find(
      (tool) => tool.id === "translate-text"
    );

    expect(englishSummary?.title).toBe("Summarize");
    expect(englishSummary?.template).toContain("Key conclusions");
    expect(chineseAutoTranslate?.title).toBe("自动翻译");
    expect(chineseAutoTranslate?.template).toContain("自然英文");
    expect(chineseAutoTranslate?.template).toContain("当前界面语言（简体中文）");
    expect(chineseAutoTranslate?.template).toContain("<translation-input>");
    expect(chineseAutoTranslate?.template).toContain("不要合并段落");
    expect(chineseAutoTranslate?.template).toContain("WEBMIND_CITATION_N");
    expect(chineseAutoTranslate?.template).toContain("WEBMIND_LINK_START_N");
    expect(chineseAutoTranslate?.template).toContain("WEBMIND_FORMAT_START_N");
    expect(japaneseTranslate?.title).toBe("自動翻訳");
    expect(japaneseTranslate?.template).toContain("한국어");
    expect(builtInToolsForLanguage("es").find((tool) => tool.id === "summary")?.title).toBe(
      "Resumir"
    );
    expect(builtInToolsForLanguage("fr").find((tool) => tool.id === "explain-code")?.title).toBe(
      "Expliquer le code"
    );
    expect(builtInToolsForLanguage("de").find((tool) => tool.id === "draft-reply")?.title).toBe(
      "Antwort entwerfen"
    );
    expect(builtInToolsForLanguage("it").find((tool) => tool.id === "study-notes")?.title).toBe(
      "Appunti di studio"
    );
    expect(builtInToolsForLanguage("es").find((tool) => tool.id === "summary")?.template).toContain(
      "Key conclusions"
    );
  });

  it("localizes quick action prompts", () => {
    expect(quickActionPrompt("reply", "ko")).toContain("답장");
    expect(quickActionPrompt("summarize", "zh-TW")).toContain("總結");
    expect(
      quickActionPrompt("translate", {
        interfaceLanguage: "zh-CN",
        translationLanguage: "ko"
      })
    ).toContain("한국어");
    expect(quickActionPrompt("summarize", "fr")).toContain(
      "Output the entire result in French"
    );
  });

  it("uses localized dictionary field labels with one shared western prompt", () => {
    const expectedFields = {
      en: "**Definition**",
      es: "**Definición**",
      fr: "**Définition**",
      de: "**Bedeutungen**",
      it: "**Definizione**"
    } as const;

    for (const [language, field] of Object.entries(expectedFields) as Array<
      [keyof typeof expectedFields, string]
    >) {
      const prompt = buildProtectedTranslationPrompt(
        { interfaceLanguage: language, translationLanguage: "auto" },
        "serendipity",
        "serendipity",
        { dictionaryForShortInput: true }
      );
      expect(prompt).toContain(field);
      expect(prompt).toContain(
        `All field labels and explanations must be in ${
          language === "en"
            ? "English"
            : language === "es"
              ? "Spanish"
              : language === "fr"
                ? "French"
                : language === "de"
                  ? "German"
                  : "Italian"
        }`
      );
      expect(prompt).toContain("The stars represent only estimated usage frequency");
      expect(prompt).not.toMatch(/CET-6|GRE|IELTS/);
    }
  });

  it("gives model pruning conservative block-classification rules", () => {
    const prompt = articlePruneInstruction("zh-CN");
    expect(prompt).toContain("<article-blocks>");
    expect(prompt).toContain("keep");
    expect(prompt).toContain("remove");
    expect(prompt).toContain("评论和回复");
    expect(prompt).toContain("请使用严格的剔除标准");
    expect(prompt).toContain("评论和回复（即使评论很长）");
    expect(prompt).toContain("就选择 remove");
    expect(prompt).toContain("JSON 数组之外不得输出任何文字");
  });

  it("locks the translation direction for short source text", () => {
    const shortEnglish = translationDirectionInstruction(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "Open the settings panel"
    );
    const shortChinese = translationDirectionInstruction(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "打开设置面板"
    );
    const singleChinese = translationDirectionInstruction(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "词"
    );

    expect(shortEnglish).toContain("简体中文");
    expect(shortEnglish).toContain("English");
    expect(shortEnglish).toContain("强制翻译任务");
    expect(shortEnglish).toContain("不要因为内容简短而原样返回");
    expect(shortChinese).toContain("English");
    expect(singleChinese).toContain("本地预判原文主要语言为 Chinese");
    expect(singleChinese).toContain("目标语言已固定为English");
  });

  it("detects supported Latin languages from clear sentence evidence", () => {
    expect(detectTranslationLanguage("Abre el panel y guarda los cambios para continuar.")).toBe("es");
    expect(detectTranslationLanguage("Ouvrez le panneau et enregistrez les modifications dans la page.")).toBe("fr");
    expect(detectTranslationLanguage("Öffnen Sie das Menü und speichern Sie die Änderungen für später.")).toBe("de");
    expect(detectTranslationLanguage("Apri il pannello e salva le modifiche nella pagina.")).toBe("it");
  });

  it("uses new interface and translation languages as exact model targets", () => {
    const automaticFrench = translationDirectionInstruction(
      { interfaceLanguage: "fr", translationLanguage: "auto" },
      "Open the settings panel and save the changes."
    );
    const fixedItalian = translationDirectionInstruction(
      { interfaceLanguage: "de", translationLanguage: "it" },
      "Open the settings panel"
    );
    const frenchSource = translationDirectionInstruction(
      { interfaceLanguage: "fr", translationLanguage: "auto" },
      "Ouvrez le panneau et enregistrez les modifications dans la page."
    );

    expect(automaticFrench).toContain("target language for this request is fixed as French");
    expect(fixedItalian).toContain("target language for this request is fixed as Italian");
    expect(frenchSource).toContain("source is mainly French");
    expect(frenchSource).toContain("target language for this request is fixed as English");
  });

  it("treats Chinese text with English terms as Chinese-dominant", () => {
    const mixedChinese = translationDirectionInstruction(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "这个 React 组件需要处理 API 返回的数据，并在页面中显示结果。"
    );

    expect(mixedChinese).toContain("本地预判原文主要语言为 Chinese");
    expect(mixedChinese).toContain("目标语言已固定为English");
  });

  it("excludes fenced and HTML code blocks from source-language detection", () => {
    const fencedSource = [
      "这是一个配置示例，请按照正文说明操作。",
      "",
      "```typescript",
      "export interface TranslationRequest {",
      "  sourceLanguage: string;",
      "  targetLanguage: string;",
      "  preserveMarkdown: boolean;",
      "}",
      "const request = createTranslationRequest(options);",
      "````",
      "",
      "完成后重新打开页面。"
    ].join("\n");
    const htmlSource =
      "这是中文说明。<pre><code>const englishWords = createVeryLargeConfiguration();</code></pre>请继续操作。";

    expect(detectTranslationLanguage(fencedSource)).toBe("zh");
    expect(detectTranslationLanguage(htmlSource)).toBe("zh");
    expect(
      detectTranslationLanguage("```javascript\nconst englishOnly = true;\n```")
    ).toBeNull();
  });

  it("requires a high natural-language Latin share before overriding Chinese", () => {
    expect(
      detectTranslationLanguage(
        "这段正文主要使用中文，只包含 React component and API response 这些英文术语。"
      )
    ).toBe("zh");
    expect(
      detectTranslationLanguage(
        "说明：This section explains how the translation pipeline preserves paragraph structure and restores protected content correctly."
      )
    ).toBe("en");
  });

  it("does not count inline code as English language evidence", () => {
    expect(
      detectTranslationLanguage(
        "调用 `createTranslationRequest(sourceLanguage, targetLanguage)` 后继续处理正文。"
      )
    ).toBe("zh");
  });

  it("does not use Markdown link destinations for language detection", () => {
    const linkedChinese = translationDirectionInstruction(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "阅读[项目文档](https://example.com/english/documentation/path)"
    );

    expect(linkedChinese).toContain("本地预判原文主要语言为 Chinese");
    expect(linkedChinese).toContain("目标语言已固定为English");
  });

  it("builds a protected prompt that fixes English source to Chinese target", () => {
    const prompt = buildProtectedTranslationPrompt(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "Open the settings panel",
      "Open the settings panel"
    );

    expect(prompt).toContain("本地预判原文主要语言为 English");
    expect(prompt).toContain("目标语言已固定为简体中文");
    expect(prompt).toContain("不得复制原文");
    expect(prompt).toContain("<translation-input>");
    expect(prompt).toContain("WEBMIND_HTML_TAG_N");
    expect(prompt).toContain("Open the settings panel");
  });

  it("keeps invisible rich-text metadata out of protected translation input", () => {
    const source =
      'Read <a href="https://secret.example/path" title="Hidden title">visible docs</a><sup data-note="metadata">[1]</sup>.';
    const protection = protectTranslationText(source);
    const prompt = buildProtectedTranslationPrompt(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      source,
      protection.text
    );
    const translationInput = prompt.match(
      /<translation-input>\n([\s\S]*?)\n<\/translation-input>/
    )?.[1];

    expect(translationInput).toContain("visible docs");
    expect(translationInput).toContain("WEBMIND_LINK_START_1");
    expect(translationInput).toContain("WEBMIND_FORMAT_START_1");
    expect(translationInput).not.toContain("https://secret.example");
    expect(translationInput).not.toContain("Hidden title");
    expect(translationInput).not.toContain("metadata");
  });

  it("can build a dictionary-style prompt for short translation inputs", () => {
    const prompt = buildProtectedTranslationPrompt(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "serendipity",
      "serendipity",
      { dictionaryForShortInput: true }
    );

    expect(prompt).toContain("查词式翻译任务");
    expect(prompt).toContain("固定行格式");
    expect(prompt).toContain("第一行格式为 **原词** /音标或拼音/");
    expect(prompt).toContain("英文词使用音标");
    expect(prompt).toContain("词频星级必须保留");
    expect(prompt).toContain("星星只表示原词在其源语言现代通用语境中的使用频率");
    expect(prompt).toContain("★★★★★ 极常见");
    expect(prompt).toContain("★☆☆☆☆ 罕见");
    expect(prompt).toContain("不要解释评分过程");
    expect(prompt).not.toMatch(/CET-6|GRE|IELTS/);
    expect(prompt).toContain("后续行只能使用这些字段");
    expect(prompt).toContain("\n\n**释义** 核心译义\n\n**义项**");
    expect(prompt).toContain("每个字段都必须是独立的 Markdown 段落");
    expect(prompt).toContain("禁止把两个字段名写在同一行");
    expect(prompt).toContain("**释义**");
    expect(prompt).toContain("**义项**");
    expect(prompt).toContain("**语域**");
    expect(prompt).toContain("**搭配**");
    expect(prompt).toContain("**变体**");
    expect(prompt).toContain("**助记**");
    expect(prompt).toContain("**例句**");
    expect(prompt).not.toContain("只输出 <translation-input> 中原文的译文");
  });

  it("uses dictionary mode for Chinese words but requires target-language meaning", () => {
    const prompt = buildProtectedTranslationPrompt(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "获取",
      "获取",
      { dictionaryForShortInput: true }
    );

    expect(isDictionaryTranslationInput("获取")).toBe(true);
    expect(prompt).toContain("查词式翻译任务");
    expect(prompt).toContain("译文与例句翻译使用English");
    expect(prompt).toContain("核心译义必须使用English");
    expect(prompt).toContain("中文词使用拼音");
    expect(prompt).toContain("词频星级必须保留");
    expect(prompt).toContain("词频星级按上述五档标准估算");
    expect(prompt).not.toMatch(/CET-6|GRE|IELTS/);
  });

  it("keeps sentence-like short Chinese inputs in normal translation mode", () => {
    const prompt = buildProtectedTranslationPrompt(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "获取可以模型",
      "获取可以模型",
      { dictionaryForShortInput: true }
    );

    expect(isDictionaryTranslationInput("获取可以模型")).toBe(false);
    expect(prompt).not.toContain("查词式翻译任务");
    expect(prompt).toContain("这是一个翻译任务");
    expect(prompt).toContain("目标语言已固定为English");
    expect(prompt).toContain("只输出 <translation-input> 中原文的译文");
  });

  it("keeps sentence-like translation inputs in normal translation mode", () => {
    const prompt = buildProtectedTranslationPrompt(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "Open the settings panel",
      "Open the settings panel",
      { dictionaryForShortInput: true }
    );

    expect(isDictionaryTranslationInput("Open the settings panel")).toBe(false);
    expect(prompt).not.toContain("查词式翻译任务");
    expect(prompt).toContain("只输出 <translation-input> 中原文的译文");
  });
});
