import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./defaults";
import {
  buildLocalReadingPlan,
  dedupeImmersiveReadingTranslations,
  detectReadingFamily,
  finalizeLocalReadingPlan,
  type EnglishWordFrequencyIndex,
  type HoverDefinitionDictionary
} from "./immersiveReading";

const dictionary: HoverDefinitionDictionary = {
  source: "test",
  version: 1,
  zh: {
    学校: "school",
    调查: "investigation",
    动机: "motive",
    作案动机: "criminal motive",
    战略: "strategy",
    战略规划: "strategic planning",
    复杂: "complex",
    复杂系统: "complex system"
  },
  en: {
    investigation: "调查",
    motive: "动机",
    school: "学校",
    student: "学生"
  }
};

const frequencies: EnglishWordFrequencyIndex = new Map([
  ["school", 194],
  ["student", 1084],
  ["investigation", 1766],
  ["strategy", 4200],
  ["strategic", 5200],
  ["planning", 1548],
  ["criminal", 6100],
  ["complex", 3235],
  ["motive", 7829]
]);

describe("immersive reading planning", () => {
  it("treats Chinese text with English terms as Chinese-dominant", () => {
    expect(
      detectReadingFamily("这个 React 组件需要处理 API 返回的数据，并在页面中显示结果。")
    ).toBe("zh");
    expect(
      detectReadingFamily("This React component renders API data on the page.")
    ).toBe("en");
  });

  it("uses English frequency as a major difficulty signal", () => {
    const plan = buildLocalReadingPlan(
      [
        {
          id: "block-1",
          text: "The school student investigated the motive behind the investigation. The investigation continued after the student explained the motive to the officials and the local community."
        }
      ],
      { ...DEFAULT_SETTINGS, interfaceLanguage: "zh-CN", immersiveReadingDifficulty: 3 },
      dictionary,
      frequencies
    );

    const translations = finalizeLocalReadingPlan(plan.blocks, []);
    expect(translations[0]?.text).toContain("[[WEBMIND_READING|motive|动机|3]]");
    expect(translations[0]?.text).toContain("[[WEBMIND_READING|investigation|调查|2]]");
    expect(translations[0]?.text).not.toContain("[[WEBMIND_READING|school|");
    expect(translations[0]?.text).not.toContain("[[WEBMIND_READING|student|");
  });

  it("judges Chinese candidates by the English translation difficulty", () => {
    const plan = buildLocalReadingPlan(
      [
        {
          id: "block-1",
          text: "学校正在调查动机，调查人员继续调查相关问题，研究人员分析事件原因并评估后续影响。"
        }
      ],
      { ...DEFAULT_SETTINGS, interfaceLanguage: "zh-CN", immersiveReadingDifficulty: 3 },
      dictionary,
      frequencies
    );

    const translations = finalizeLocalReadingPlan(plan.blocks, []);
    expect(translations[0]?.text).toContain("[[WEBMIND_READING|调查|investigation|2]]");
    expect(translations[0]?.text).toContain("[[WEBMIND_READING|动机|motive|3]]");
    expect(translations[0]?.text).not.toContain("[[WEBMIND_READING|学校|");
  });

  it("prefers Chinese candidates with single-word English glosses over phrases", () => {
    const plan = buildLocalReadingPlan(
      [
        {
          id: "block-1",
          text: "警方正在调查作案动机，并讨论战略规划。研究人员继续分析复杂系统中的异常模式。"
        }
      ],
      { ...DEFAULT_SETTINGS, interfaceLanguage: "zh-CN", immersiveReadingDifficulty: 3 },
      dictionary,
      frequencies
    );

    const translations = finalizeLocalReadingPlan(plan.blocks, []);
    expect(translations[0]?.text).toContain("[[WEBMIND_READING|动机|motive|3]]");
    expect(translations[0]?.text).toContain("[[WEBMIND_READING|战略|strategy|3]]");
    expect(translations[0]?.text).toContain("[[WEBMIND_READING|复杂|complex|3]]");
    expect(translations[0]?.text).not.toContain("[[WEBMIND_READING|作案动机|criminal motive|");
    expect(translations[0]?.text).not.toContain("[[WEBMIND_READING|战略规划|strategic planning|");
    expect(translations[0]?.text).not.toContain("[[WEBMIND_READING|复杂系统|complex system|");
  });

  it("dedupes reading markers across a whole run", () => {
    const seen = new Set<string>();
    const result = dedupeImmersiveReadingTranslations(
      [
        { id: "a", text: "[[WEBMIND_READING|motive|动机|3]]" },
        { id: "b", text: "second [[WEBMIND_READING|motive|动机|3]]" }
      ],
      [
        { id: "a", text: "motive" },
        { id: "b", text: "motive" }
      ],
      seen
    );

    expect(result[0].text).toBe("[[WEBMIND_READING|motive|动机|3]]");
    expect(result[1].text).toBe("second motive");
  });
});
