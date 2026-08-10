import { BUILT_IN_TOOLS } from "./prompts";
import type {
  AppSettings,
  ProviderKind,
  ProviderProfile,
  ToolSurface
} from "./types";

export const APP_NAME = "WebMind";

const TOOL_IDS = BUILT_IN_TOOLS.map((tool) => tool.id);
const DEFAULT_SELECTION_TOOL_IDS = [
  "translate-text",
  "summary",
  "explain",
  "explain-code"
];
const DEFAULT_HOME_TOOL_IDS = [
  "translate-text",
  "summary",
  "explain",
  "extract-actions",
  "concise",
  "expand-detail",
  "polish",
  "study-notes",
  "explain-code"
];
const DEFAULT_TOOLS_TAB_IDS = TOOL_IDS.filter((id) => id !== "ask-selection");
const DEFAULT_EDGE_TOOL_IDS = ["summary"];

export const PROVIDER_DEFAULTS: Record<
  ProviderKind,
  Pick<
    ProviderProfile,
    "name" | "baseUrl" | "model" | "supportsVision" | "maxContextChars"
  >
> = {
  "openai-compatible": {
    name: "OpenAI Compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    supportsVision: true,
    maxContextChars: 60000
  },
  grok: {
    name: "Grok",
    baseUrl: "https://api.x.ai/v1",
    model: "grok-4",
    supportsVision: true,
    maxContextChars: 90000
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
    supportsVision: false,
    maxContextChars: 60000
  },
  kimi: {
    name: "Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
    supportsVision: false,
    maxContextChars: 60000
  },
  qwen: {
    name: "Qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    supportsVision: false,
    maxContextChars: 90000
  },
  zhipu: {
    name: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4.5",
    supportsVision: false,
    maxContextChars: 90000
  },
  mimo: {
    name: "MiMo",
    baseUrl: "https://api.xiaomimimo.com/v1",
    model: "mimo-v2.5-pro",
    supportsVision: false,
    maxContextChars: 60000
  },
  longcat: {
    name: "LongCat",
    baseUrl: "https://api.longcat.chat/openai/v1",
    model: "LongCat-2.0",
    supportsVision: false,
    maxContextChars: 90000
  },
  minimax: {
    name: "MiniMax",
    baseUrl: "https://api.minimax.chat/v1",
    model: "MiniMax-M1",
    supportsVision: false,
    maxContextChars: 90000
  },
  "doubao-seed": {
    name: "Doubao Seed",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model: "doubao-seed-1-6-250615",
    supportsVision: false,
    maxContextChars: 90000
  },
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4.1-mini",
    supportsVision: true,
    maxContextChars: 60000
  },
  siliconflow: {
    name: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen3-8B",
    supportsVision: false,
    maxContextChars: 60000
  },
  anthropic: {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-4-20250514",
    supportsVision: true,
    maxContextChars: 90000
  },
  gemini: {
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash",
    supportsVision: true,
    maxContextChars: 90000
  },
  ollama: {
    name: "Ollama Local",
    baseUrl: "http://localhost:11434",
    model: "qwen3:8b",
    supportsVision: false,
    maxContextChars: 50000
  }
};

export const PROVIDER_MODEL_SUGGESTIONS: Record<ProviderKind, string[]> = {
  "openai-compatible": ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"],
  grok: ["grok-4", "grok-3", "grok-3-mini", "grok-2-vision-1212"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  kimi: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
  qwen: ["qwen-plus", "qwen-turbo", "qwen-max", "qwen-vl-plus"],
  zhipu: ["glm-4.5", "glm-4-air", "glm-4-flash", "glm-4v-flash"],
  mimo: ["mimo-v2.5-pro", "mimo-v2-omni"],
  longcat: ["LongCat-2.0", "LongCat-Flash-Chat"],
  minimax: ["MiniMax-M1", "MiniMax-Text-01", "abab6.5s-chat"],
  "doubao-seed": [
    "doubao-seed-1-6-250615",
    "doubao-seed-1-6-thinking-250615",
    "doubao-1-5-pro-32k-250115"
  ],
  openrouter: [
    "openai/gpt-4.1-mini",
    "anthropic/claude-sonnet-4",
    "google/gemini-2.5-flash",
    "deepseek/deepseek-chat"
  ],
  siliconflow: [
    "Qwen/Qwen3-8B",
    "Qwen/Qwen3-32B",
    "deepseek-ai/DeepSeek-V3",
    "deepseek-ai/DeepSeek-R1"
  ],
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-3-5-haiku-20241022"
  ],
  gemini: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
  ollama: ["qwen3:8b", "llama3.1:8b", "gemma3:4b"]
};

export const DEFAULT_SETTINGS: AppSettings = {
  profiles: [],
  activeProfileId: null,
  defaultProfileId: null,
  translationProfileId: null,
  visionProfileId: null,
  compareProfileIds: [],
  theme: "system",
  logLevel: "info",
  autoScrollDuringStreaming: true,
  modelThinkingTimeoutSeconds: 0,
  interfaceLanguage: "auto",
  translationLanguage: "auto",
  defaultContextScope: "article",
  selectionOverlayMode: "off",
  selectionOverlayShortcut: "off",
  selectionOverlayMinChars: 2,
  immersiveTranslationStyle: "bilingual",
  immersiveTranslationDisplayStyle: "default",
  immersiveTranslationTextEffects: ["light"],
  immersiveTranslationParagraphShortcut: "off",
  immersiveTranslationPageShortcut: "off",
  immersiveTranslationModeToggleShortcut: "off",
  immersiveTranslationAutoWhitelist: [],
  immersiveReadingDifficulty: 3,
  immersiveReadingStrategy: "local-first",
  immersiveReadingMode: "original-translation",
  immersiveReadingBackgroundStyle: "none",
  immersiveReadingParagraphShortcut: "off",
  immersiveReadingContextShortcut: "off",
  immersiveReadingOuterTextEffects: [],
  immersiveReadingInnerTextEffects: ["light"],
  immersiveReadingAutoWhitelist: [],
  hoverDefinitionMode: "off",
  hoverDefinitionShortcut: "off",
  hoverDefinitionStyle: "none",
  hoverDefinitionUrlBlacklist: [],
  edgeQuickToolsEnabled: false,
  edgeQuickToolBottom: 36,
  selectionOverlayUrlBlacklist: [],
  edgeQuickToolUrlBlacklist: [],
  inputAutoReplyEnabled: false,
  inputAutoReplyDisableSingleLine: true,
  imageTextExtractionEnabled: false,
  imageTextExtractionMinSize: 160,
  articleExtractionRules: [],
  enabledToolIds: {
    selection: [...DEFAULT_SELECTION_TOOL_IDS],
    home: [...DEFAULT_HOME_TOOL_IDS],
    tools: [...DEFAULT_TOOLS_TAB_IDS],
    edge: [...DEFAULT_EDGE_TOOL_IDS]
  },
  chromeSyncEnabled: false,
  searchAnswerEnabled: false,
  includePageByDefault: true,
  webSearchByDefault: false,
  historyLimit: 60
};

export function defaultEnabledToolIds(
  toolIds: string[] = TOOL_IDS
): Record<ToolSurface, string[]> {
  const available = new Set(toolIds);
  return {
    selection: DEFAULT_SELECTION_TOOL_IDS.filter((id) => available.has(id)),
    home: DEFAULT_HOME_TOOL_IDS.filter((id) => available.has(id)),
    tools: toolIds.filter((id) => id !== "ask-selection"),
    edge: DEFAULT_EDGE_TOOL_IDS.filter((id) => available.has(id))
  };
}

export function createProviderProfile(
  kind: ProviderKind,
  partial: Partial<ProviderProfile> = {}
): ProviderProfile {
  const preset = PROVIDER_DEFAULTS[kind];
  return {
    id: crypto.randomUUID(),
    name: preset.name,
    kind,
    baseUrl: preset.baseUrl,
    model: preset.model,
    secretStorage: "local",
    customHeaders: "",
    supportsVision: preset.supportsVision,
    temperature: 0.5,
    maxTokens: 2048,
    maxContextChars: preset.maxContextChars,
    ...partial
  };
}
