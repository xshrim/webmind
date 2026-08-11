import { describe, expect, it } from "vitest";
import { UI_TEXT } from "./i18n";
import {
  buildProtectedTranslationPrompt,
  protectTranslationText
} from "./utils";
import {
  articlePruneInstruction,
  builtInToolsForLanguage,
  isDictionaryTranslationInput,
  quickActionPrompt,
  translationDirectionInstruction
} from "./prompts";

describe("localized tools and prompts", () => {
  it("keeps UI text keys complete for every supported language", () => {
    const baseKeys = Object.keys(UI_TEXT["zh-CN"]).sort();
    for (const language of ["zh-TW", "en", "ja", "ko"] as const) {
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

  it("treats Chinese text with English terms as Chinese-dominant", () => {
    const mixedChinese = translationDirectionInstruction(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "这个 React 组件需要处理 API 返回的数据，并在页面中显示结果。"
    );

    expect(mixedChinese).toContain("本地预判原文主要语言为 Chinese");
    expect(mixedChinese).toContain("目标语言已固定为English");
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
    expect(prompt).toContain("星级后可列 CET-6 / GRE / IELTS");
    expect(prompt).toContain("没有音标、拼音、星级或考试标签时，省略对应部分");
    expect(prompt).toContain("后续行只能使用这些字段");
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
    expect(prompt).toContain("不要列 CET-6 / GRE / IELTS");
    expect(prompt).toContain("不要为了凑格式编造音标");
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
