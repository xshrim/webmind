import {
  builtInToolsForLanguage,
  fillPrompt,
  originalLanguageLabel,
  type PromptConfigSource
} from "./prompts";
import { LANGUAGE_LABELS, resolveLanguage, uiText } from "./i18n";
import type { AppSettings, CustomTool, ToolDefinition } from "./types";

type ToolPromptSettings = Pick<AppSettings, "interfaceLanguage"> &
  Partial<Pick<AppSettings, "toolResponseUseContextLanguage">>;

const TOOL_RESPONSE_LANGUAGE_EXCLUDED_IDS = new Set([
  "translate-text",
  "translate-document",
  "explain-code"
]);

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
  const resolvedContextText = contextText ?? "";
  return fillPrompt(tool.template, {
    text: resolvedContextText,
    context: resolvedContextText,
    targetLanguage: LANGUAGE_LABELS[language],
    interfaceLanguage: LANGUAGE_LABELS[language]
  });
}

export function toolResponseLanguageInstruction(
  tool: ToolDefinition,
  settings?: ToolPromptSettings,
  contextLanguage?: string | null
): string {
  if (TOOL_RESPONSE_LANGUAGE_EXCLUDED_IDS.has(tool.id)) return "";
  const language = resolveLanguage(settings?.interfaceLanguage);
  const interfaceLanguage = LANGUAGE_LABELS[language];
  const useContextLanguage =
    settings?.toolResponseUseContextLanguage === true;
  switch (language) {
    case "zh-TW":
      return useContextLanguage
        ? contextLanguage
          ? `回答語言規則：已判定提問上下文的主要原始語言為${contextLanguage}。除非工具提示詞明確要求使用另一種語言回答，否則最終回答必須完整使用${contextLanguage}。工具提示詞本身以何種語言書寫不算回答語言要求。`
          : `回答語言規則：忽略工具提示詞本身使用的語言，判斷提問上下文的主要原始語言並用該語言回答。只有工具提示詞明確要求使用某種語言回答時才覆蓋此規則；無法判斷時使用${interfaceLanguage}。`
        : `回答語言規則：如果工具提示詞本身明確指定回答語言，優先遵循工具提示詞；否則，回答必須使用目前介面語言（${interfaceLanguage}）。`;
    case "en":
      return useContextLanguage
        ? contextLanguage
          ? `Response-language rule: the question context's primary original language has been identified as ${contextLanguage}. The final answer must be entirely in ${contextLanguage} unless the tool prompt explicitly requests a different response language. The language in which the tool prompt itself is written is not a response-language request.`
          : `Response-language rule: ignore the language in which the tool prompt itself is written. Identify the question context's primary original language and answer in that language. Override this only when the tool prompt explicitly requests a response language; if detection is impossible, use ${interfaceLanguage}.`
        : `Response-language rule: an explicit response-language requirement in the tool prompt takes priority. Otherwise, respond in the current interface language (${interfaceLanguage}).`;
    case "ja":
      return useContextLanguage
        ? contextLanguage
          ? `回答言語ルール：質問コンテキストの主要な原文言語は${contextLanguage}と判定済みです。ツールプロンプトが別の回答言語を明示的に要求していない限り、最終回答全体を${contextLanguage}で作成してください。ツールプロンプト自体の記述言語は回答言語の指定ではありません。`
          : `回答言語ルール：ツールプロンプト自体の記述言語を無視し、質問コンテキストの主要な原文言語を判定して、その言語で回答してください。ツールプロンプトが回答言語を明示した場合だけその指定を優先し、判定できない場合は${interfaceLanguage}を使用してください。`
        : `回答言語ルール：ツールプロンプト自体に回答言語が明示されている場合は、その指定を優先してください。それ以外は現在のインターフェース言語（${interfaceLanguage}）で回答してください。`;
    case "ko":
      return useContextLanguage
        ? contextLanguage
          ? `답변 언어 규칙: 질문 컨텍스트의 주요 원문 언어는 ${contextLanguage}(으)로 판정되었습니다. 도구 프롬프트가 다른 답변 언어를 명시적으로 요구하지 않는 한 최종 답변 전체를 ${contextLanguage}(으)로 작성하세요. 도구 프롬프트 자체가 쓰인 언어는 답변 언어 요구가 아닙니다.`
          : `답변 언어 규칙: 도구 프롬프트 자체가 쓰인 언어는 무시하고 질문 컨텍스트의 주요 원문 언어를 판정하여 그 언어로 답하세요. 도구 프롬프트가 답변 언어를 명시적으로 요구할 때만 그 요구를 우선하며, 판정할 수 없으면 ${interfaceLanguage}를 사용하세요.`
        : `답변 언어 규칙: 도구 프롬프트 자체에 답변 언어가 명시되어 있으면 그 요구를 우선하세요. 그렇지 않으면 현재 인터페이스 언어(${interfaceLanguage})로 답하세요.`;
    case "zh-CN":
    default:
      return useContextLanguage
        ? contextLanguage
          ? `回答语言规则：已判定提问上下文的主要原始语言为${contextLanguage}。除非工具提示词明确要求使用另一种语言回答，否则最终回答必须完整使用${contextLanguage}。工具提示词本身以何种语言书写不算回答语言要求。`
          : `回答语言规则：忽略工具提示词本身使用的语言，判断提问上下文的主要原始语言并用该语言回答。只有工具提示词明确要求使用某种语言回答时才覆盖此规则；无法判断时使用${interfaceLanguage}。`
        : `回答语言规则：如果工具提示词本身明确指定了回答语言，优先遵循工具提示词；否则，回答必须使用当前界面语言（${interfaceLanguage}）。`;
  }
}

export function toolPromptWithContext(
  tool: ToolDefinition,
  settings: ToolPromptSettings | undefined,
  contextText: string,
  metadata = "",
  contextLabel = uiText(settings?.interfaceLanguage, "currentContext"),
  contextLanguageHint?: string
): string {
  const instruction = toolInstruction(tool, settings, contextText);
  const hasContextPlaceholder = /\{\{(?:text|context)\}\}/.test(
    tool.template
  );
  const responseLanguage = toolResponseLanguageInstruction(
    tool,
    settings,
    originalLanguageLabel(contextText, contextLanguageHint)
  );
  return [
    instruction,
    metadata,
    !hasContextPlaceholder && contextText
      ? `${contextLabel}：\n${contextText}`
      : "",
    responseLanguage
  ]
    .filter(Boolean)
    .join("\n\n");
}
