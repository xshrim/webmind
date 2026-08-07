import { builtInToolsForLanguage, fillPrompt, type PromptConfigSource } from "./prompts";
import { LANGUAGE_LABELS, resolveLanguage, uiText } from "./i18n";
import type { AppSettings, CustomTool, ToolDefinition } from "./types";

export function allTools(
  customTools: CustomTool[] = [],
  language?: PromptConfigSource
): ToolDefinition[] {
  const customById = new Map(
    customTools.map((tool) => [tool.id, tool])
  );
  const mergedBuiltIns = builtInToolsForLanguage(language).map((tool) => {
    const override = customById.get(tool.id);
    if (!override) return tool;
    customById.delete(tool.id);
    return {
      ...tool,
      ...override,
      id: tool.id,
      builtin: true
    };
  });
  return [...mergedBuiltIns, ...Array.from(customById.values())];
}

export function findTool(
  toolId: string,
  customTools: CustomTool[] = [],
  language?: PromptConfigSource
): ToolDefinition | null {
  return allTools(customTools, language).find((tool) => tool.id === toolId) ?? null;
}

export function toolInstruction(
  tool: ToolDefinition,
  settings?: Pick<AppSettings, "interfaceLanguage">,
  contextText?: string
): string {
  const language = resolveLanguage(settings?.interfaceLanguage);
  const resolvedContextText =
    contextText ?? uiText(settings?.interfaceLanguage, "currentContext");
  return fillPrompt(tool.template, {
    text: resolvedContextText,
    context: resolvedContextText,
    targetLanguage: LANGUAGE_LABELS[language],
    interfaceLanguage: LANGUAGE_LABELS[language]
  });
}
