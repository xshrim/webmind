import { describe, expect, it } from "vitest";
import { UI_TEXT } from "./i18n";
import { buildProtectedTranslationPrompt } from "./utils";
import {
  builtInToolsForLanguage,
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

  it("locks the translation direction for short source text", () => {
    const shortEnglish = translationDirectionInstruction(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "Open the settings panel"
    );
    const shortChinese = translationDirectionInstruction(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "打开设置面板"
    );

    expect(shortEnglish).toContain("简体中文");
    expect(shortEnglish).toContain("English");
    expect(shortEnglish).toContain("强制翻译任务");
    expect(shortEnglish).toContain("不要因为内容简短而原样返回");
    expect(shortChinese).toContain("English");
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
    expect(prompt).toContain("Open the settings panel");
  });

  it("can build a dictionary-style prompt for short translation inputs", () => {
    const prompt = buildProtectedTranslationPrompt(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "serendipity",
      "serendipity",
      { dictionaryForShortInput: true }
    );

    expect(prompt).toContain("查词式翻译任务");
    expect(prompt).toContain("紧凑但清楚");
    expect(prompt).toContain("最多一个短标题");
    expect(prompt).toContain("不要层层标题");
    expect(prompt).toContain("必要换行");
    expect(prompt).toContain("4-8 行短项");
    expect(prompt).not.toContain("只输出 <translation-input> 中原文的译文");
  });

  it("keeps sentence-like translation inputs in normal translation mode", () => {
    const prompt = buildProtectedTranslationPrompt(
      { interfaceLanguage: "zh-CN", translationLanguage: "auto" },
      "Open the settings panel.",
      "Open the settings panel.",
      { dictionaryForShortInput: true }
    );

    expect(prompt).not.toContain("查词式翻译任务");
    expect(prompt).toContain("只输出 <translation-input> 中原文的译文");
  });
});
