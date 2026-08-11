import { describe, expect, it } from "vitest";
import { toolInstruction, toolPromptWithContext } from "./tools";
import type { CustomTool } from "./types";

describe("toolInstruction", () => {
  it("injects the resolved context into custom tool placeholders", () => {
    const tool: CustomTool = {
      id: "custom-context-tool",
      title: "Custom context tool",
      description: "Uses the current context",
      icon: "Sparkles",
      template: "Process {{text}} and keep {{context}} available"
    };

    const result = toolInstruction(
      tool,
      { interfaceLanguage: "zh-CN" },
      "**当前正文** [链接](https://example.com)"
    );

    expect(result).toContain("**当前正文** [链接](https://example.com)");
    expect(result).not.toContain("当前上下文");
  });

  it("does not invent a context value when a caller has no context", () => {
    const tool: CustomTool = {
      id: "custom-empty-context-tool",
      title: "Custom empty context tool",
      description: "Uses the current context",
      icon: "Sparkles",
      template: "Process {{text}}"
    };

    expect(toolInstruction(tool, { interfaceLanguage: "zh-CN" })).toBe(
      "Process "
    );
  });

  it("adds context explicitly for templates without placeholders", () => {
    const tool: CustomTool = {
      id: "custom-instruction-tool",
      title: "Custom instruction tool",
      description: "Uses an implicit context",
      icon: "Sparkles",
      template: "Summarize the current material."
    };

    const result = toolPromptWithContext(
      tool,
      { interfaceLanguage: "zh-CN" },
      "正文内容",
      "标题：示例\nURL：https://example.com"
    );

    expect(result).toContain("正文内容");
    expect(result).toContain("标题：示例");
  });

  it("uses the target context language when the tool setting is enabled", () => {
    const tool: CustomTool = {
      id: "custom-language-tool",
      title: "Language tool",
      description: "Tests response language",
      icon: "Languages",
      template: "Summarize {{text}}"
    };

    const result = toolPromptWithContext(
      tool,
      {
        interfaceLanguage: "zh-CN",
        toolResponseUseContextLanguage: true
      },
      "English source content"
    );

    expect(result).toContain("提问上下文的主要原始语言为English");
    expect(result).toContain("工具提示词本身以何种语言书写不算回答语言要求");
  });

  it("uses the interface language when the tool setting is disabled", () => {
    const tool: CustomTool = {
      id: "custom-interface-language-tool",
      title: "Language tool",
      description: "Tests response language",
      icon: "Languages",
      template: "Summarize {{text}}"
    };

    const result = toolPromptWithContext(
      tool,
      {
        interfaceLanguage: "en",
        toolResponseUseContextLanguage: false
      },
      "中文原文"
    );

    expect(result).toContain("current interface language (English)");
    expect(result).toContain("tool prompt takes priority");
  });

  it("uses an English rule template with the exact new interface language", () => {
    const tool: CustomTool = {
      id: "custom-spanish-language-tool",
      title: "Language tool",
      description: "Language test",
      template: "Summarize {{text}}",
      icon: "languages"
    };
    const result = toolPromptWithContext(
      tool,
      { interfaceLanguage: "es", toolResponseUseContextLanguage: false },
      "Texto original"
    );

    expect(result).toContain("current interface language (Spanish)");
    expect(result).toContain("tool prompt takes priority");
  });

  it("uses a page language hint for non-English Latin text", () => {
    const tool: CustomTool = {
      id: "custom-french-tool",
      title: "French context tool",
      description: "Tests a page language hint",
      icon: "Languages",
      template: "总结 {{text}}"
    };

    const result = toolPromptWithContext(
      tool,
      {
        interfaceLanguage: "zh-CN",
        toolResponseUseContextLanguage: true
      },
      "Bonjour tout le monde",
      "",
      undefined,
      "fr"
    );

    expect(result).toContain("French (fr)");
    expect(result).toContain("工具提示词本身以何种语言书写不算回答语言要求");
  });

  it("does not constrain translation or code explanation tool languages", () => {
    for (const id of [
      "translate-text",
      "translate-document",
      "explain-code"
    ]) {
      const tool: CustomTool = {
        id,
        title: id,
        description: "Excluded tool",
        icon: "Languages",
        template: "Process {{text}}"
      };
      const result = toolPromptWithContext(
        tool,
        {
          interfaceLanguage: "zh-CN",
          toolResponseUseContextLanguage: true
        },
        "Context"
      );
      expect(result).not.toContain("回答语言规则");
    }
  });
});
