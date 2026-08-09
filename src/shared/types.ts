export type ProviderKind =
  | "openai-compatible"
  | "grok"
  | "deepseek"
  | "kimi"
  | "qwen"
  | "zhipu"
  | "mimo"
  | "longcat"
  | "minimax"
  | "doubao-seed"
  | "openrouter"
  | "siliconflow"
  | "anthropic"
  | "gemini"
  | "ollama";

export type ThemeMode = "system" | "light" | "dark";
export type AppLanguage = "auto" | "zh-CN" | "zh-TW" | "en" | "ja" | "ko";
export type AppLogLevel = "debug" | "info" | "success" | "warning" | "error";
export type SelectionOverlayMode = "off" | "always" | "hover";
export type ImmersiveTranslationStyle = "translation-only" | "bilingual";
export type ImmersiveTranslationDisplayStyle =
  | "default"
  | "highlight"
  | "divider"
  | "quote"
  | "blur"
  | "transparent";
export type ImmersiveTranslationTextEffect =
  | "underline"
  | "dashed-underline"
  | "large"
  | "small"
  | "bold"
  | "italic"
  | "light"
  | "emphasis";
export type ImmersiveShortcut =
  | "off"
  | "ctrl"
  | "alt"
  | "shift"
  | "ctrl-alt"
  | "ctrl-shift"
  | "alt-shift"
  | "ctrl-alt-shift";
export type ImmersiveTranslationShortcut = ImmersiveShortcut;
export type ImmersiveTranslationModeToggleShortcut = ImmersiveShortcut;
export type ImmersiveReadingMode =
  | "translation"
  | "original-translation"
  | "translation-original";
export type ImmersiveReadingStrategy = "local-first" | "model-page";
export type ImmersiveReadingBackgroundStyle = "none" | "uniform" | "leveled";
export type HoverDefinitionMode = "off" | "zh" | "en" | "both";
export type HoverDefinitionShortcut = ImmersiveShortcut;
export type SelectionOverlayShortcut = HoverDefinitionShortcut;
export type ToolSurface = "selection" | "home" | "tools" | "edge";
export type ModelPurpose = "default" | "translation" | "vision";
export type DefaultContextScope = "article" | "page";

export interface ToolDefinition {
  id: string;
  title: string;
  description: string;
  template: string;
  icon: string;
  builtin?: boolean;
  createdAt?: number;
}

export type CustomTool = Omit<ToolDefinition, "builtin"> & {
  builtin?: false;
};

export interface ProviderProfile {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  apiKey?: string;
  secretStorage: "local" | "session";
  customHeaders: string;
  supportsVision: boolean;
  temperature: number;
  maxTokens: number;
  maxContextChars: number;
}

export interface AppSettings {
  profiles: ProviderProfile[];
  activeProfileId: string | null;
  defaultProfileId: string | null;
  translationProfileId: string | null;
  visionProfileId: string | null;
  compareProfileIds: string[];
  theme: ThemeMode;
  logLevel: AppLogLevel;
  autoScrollDuringStreaming: boolean;
  modelThinkingTimeoutSeconds: number;
  interfaceLanguage: AppLanguage;
  translationLanguage: AppLanguage;
  defaultContextScope: DefaultContextScope;
  selectionOverlayMode: SelectionOverlayMode;
  selectionOverlayShortcut: SelectionOverlayShortcut;
  selectionOverlayMinChars: number;
  immersiveTranslationStyle: ImmersiveTranslationStyle;
  immersiveTranslationDisplayStyle: ImmersiveTranslationDisplayStyle;
  immersiveTranslationTextEffects: ImmersiveTranslationTextEffect[];
  immersiveTranslationParagraphShortcut: ImmersiveTranslationShortcut;
  immersiveTranslationPageShortcut: ImmersiveTranslationShortcut;
  immersiveTranslationModeToggleShortcut: ImmersiveTranslationModeToggleShortcut;
  immersiveTranslationAutoWhitelist: string[];
  immersiveReadingDifficulty: number;
  immersiveReadingStrategy: ImmersiveReadingStrategy;
  immersiveReadingMode: ImmersiveReadingMode;
  immersiveReadingBackgroundStyle: ImmersiveReadingBackgroundStyle;
  immersiveReadingParagraphShortcut: ImmersiveShortcut;
  immersiveReadingContextShortcut: ImmersiveShortcut;
  immersiveReadingOuterTextEffects: ImmersiveTranslationTextEffect[];
  immersiveReadingInnerTextEffects: ImmersiveTranslationTextEffect[];
  immersiveReadingAutoWhitelist: string[];
  hoverDefinitionMode: HoverDefinitionMode;
  hoverDefinitionShortcut: HoverDefinitionShortcut;
  hoverDefinitionUrlBlacklist: string[];
  edgeQuickToolsEnabled: boolean;
  edgeQuickToolBottom: number;
  selectionOverlayUrlBlacklist: string[];
  edgeQuickToolUrlBlacklist: string[];
  inputAutoReplyEnabled: boolean;
  inputAutoReplyDisableSingleLine: boolean;
  imageTextExtractionEnabled: boolean;
  imageTextExtractionMinSize: number;
  enabledToolIds: Record<ToolSurface, string[]>;
  chromeSyncEnabled: boolean;
  searchAnswerEnabled: boolean;
  includePageByDefault: boolean;
  webSearchByDefault: boolean;
  historyLimit: number;
}

export type AttachmentKind = "image" | "document" | "url";

export interface ImageAttachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl?: string;
  kind?: AttachmentKind;
  text?: string;
  url?: string;
}

export type ToolInvocationContextKind =
  | "none"
  | "page"
  | "article"
  | "selection"
  | "answer";

export interface ToolInvocationContext {
  kind: ToolInvocationContextKind;
  title?: string;
  text?: string;
  url?: string;
  faviconUrl?: string;
}

export interface ToolInvocation {
  toolId: string;
  title: string;
  icon: string;
  context: ToolInvocationContext;
}

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: number;
  /** Request-only content when the visible message should stay concise. */
  modelContent?: string;
  toolInvocation?: ToolInvocation;
  /** The text entered in the composer, before attachment context is appended. */
  inputText?: string;
  attachments?: ImageAttachment[];
  error?: boolean;
  interruptionNotice?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  providerId: string;
  pageTitle?: string;
  pageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export type PageContextKind =
  | "webpage"
  | "article"
  | "selection"
  | "pdf"
  | "youtube"
  | "image"
  | "search";

export interface PageContext {
  kind: PageContextKind;
  title: string;
  url: string;
  text: string;
  selection?: string;
  description?: string;
  language?: string;
  siteName?: string;
  articleQuality?: ArticleQualitySummary;
  articlePreview?: ArticlePreviewBlock[];
}

export interface ArticleQualitySummary {
  score: number;
  textDensity: number;
  linkRatio: number;
  visibleArea: number;
  continuity: number;
  clutterPenalty: number;
  languageConsistency: number;
  source: "readability" | "dom" | "manual" | "edited";
  selector?: string;
  blockCount: number;
  wordCount: number;
  warnings?: ArticleQualityWarning[];
}

export type ArticleQualityWarning = "virtualizedContentMayBeIncomplete";

export interface ArticlePreviewBlock {
  id: string;
  text: string;
  sourceText?: string;
  targetId?: string;
}

export interface PageTextBlock {
  id: string;
  text: string;
}

export interface PageTranslation {
  id: string;
  text: string;
}

export type PageTranslationMode = "bilingual" | "translation-only";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export type QuickActionId =
  | "ask"
  | "summarize"
  | "explain"
  | "translate"
  | "rewrite"
  | "reply";

export interface PendingAction {
  id: string;
  action: QuickActionId;
  createdAt: number;
  contextScope?: "page" | "article" | "selection";
  text?: string;
  imageUrl?: string;
  pageTitle?: string;
  pageUrl?: string;
}

export interface ChatRunRequest {
  requestId: string;
  profileId?: string;
  purpose?: ModelPurpose;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ModelCompleteRequest {
  profileId?: string;
  purpose?: ModelPurpose;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderTestResult {
  ok: boolean;
  text?: string;
  error?: string;
}
