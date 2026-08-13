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
export type AppLanguage =
  | "auto"
  | "zh-CN"
  | "zh-TW"
  | "en"
  | "ja"
  | "ko"
  | "es"
  | "fr"
  | "de"
  | "it";
export type AppLogLevel = "debug" | "info" | "success" | "warning" | "error";
export type SelectionOverlayMode = "off" | "always" | "hover";
export type SelectionMatchHighlightMode =
  | "off"
  | "ignore-case"
  | "case-sensitive";
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
export type HoverDefinitionStyle = "none" | "highlight" | "underline";
export type SelectionOverlayShortcut = HoverDefinitionShortcut;
export type ToolSurface = "selection" | "home" | "tools" | "edge";
export type ModelPurpose = "default" | "translation" | "vision";
export type DefaultContextScope = "none" | "article" | "page";
export type McpToolApprovalMode = "deny" | "ask" | "allow";
export type ReasoningStrategy =
  | "none"
  | "openai-chat"
  | "anthropic"
  | "gemini-budget"
  | "ollama";

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
  reasoningStrategy: ReasoningStrategy;
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
  reasoningEnabledByDefault: boolean;
  mcpToolApprovalMode: McpToolApprovalMode;
  interfaceLanguage: AppLanguage;
  translationLanguage: AppLanguage;
  defaultContextScope: DefaultContextScope;
  selectionOverlayMode: SelectionOverlayMode;
  selectionOverlayShortcut: SelectionOverlayShortcut;
  selectionOverlayMinChars: number;
  selectionMatchHighlightMode: SelectionMatchHighlightMode;
  linkTextSelectionEnabled: boolean;
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
  hoverDefinitionStyle: HoverDefinitionStyle;
  hoverDefinitionUrlBlacklist: string[];
  edgeQuickToolsEnabled: boolean;
  edgeQuickToolBottom: number;
  selectionOverlayUrlBlacklist: string[];
  edgeQuickToolUrlBlacklist: string[];
  inputAutoReplyEnabled: boolean;
  inputAutoReplyDisableSingleLine: boolean;
  imageTextExtractionEnabled: boolean;
  imageTextExtractionMinSize: number;
  articleExtractionRules: ArticleExtractionRule[];
  enabledToolIds: Record<ToolSurface, string[]>;
  chromeSyncEnabled: boolean;
  searchAnswerEnabled: boolean;
  includePageByDefault: boolean;
  webSearchByDefault: boolean;
  toolResponseUseContextLanguage: boolean;
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
  /** Whether this request used the configured reasoning protocol. */
  reasoningEnabled?: boolean;
  attachments?: ImageAttachment[];
  error?: boolean;
  interruptionNotice?: string;
  mcpToolEvents?: McpToolEvent[];
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
  /** Markdown representation for rich preview/copy and protected translation input. */
  markdown?: string;
  selection?: string;
  description?: string;
  language?: string;
  siteName?: string;
  articleSummary?: ArticleSummary;
  articlePreview?: ArticlePreviewBlock[];
}

export type ArticleSource = "rule" | "dom" | "manual" | "edited";

export interface ArticleScoreMetrics {
  length: number;
  structure: number;
  heading: number;
  semantics: number;
  density: number;
  linkPurity: number;
  focus: number;
  cleanliness: number;
}

export interface ArticleSummary {
  source: ArticleSource;
  selector?: string;
  blockCount: number;
  charCount: number;
  score?: number;
  scoreMetrics?: ArticleScoreMetrics;
}

export interface ArticlePreviewBlock {
  id: string;
  text: string;
  /** Markdown representation of the same visible block. */
  markdown?: string;
  sourceText?: string;
  targetId?: string;
}

export interface ArticleExtractionRule {
  id: string;
  urlPattern: string;
  selector: string;
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
  markdown?: string;
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
  reasoningEnabled?: boolean;
  mcpTools?: McpToolSelection[];
  mcpSessionTools?: McpToolSelection[];
}

export interface ModelCompleteRequest {
  profileId?: string;
  purpose?: ModelPurpose;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  reasoningEnabled?: boolean;
}

export interface ModelToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ModelToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ModelAgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  attachments?: ImageAttachment[];
  toolCallId?: string;
  toolName?: string;
  toolCalls?: ModelToolCall[];
}

export interface ModelToolTurnRequest {
  profileId?: string;
  purpose?: ModelPurpose;
  messages: ModelAgentMessage[];
  tools: ModelToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  reasoningEnabled?: boolean;
}

export interface ModelToolTurnResult {
  text: string;
  toolCalls: ModelToolCall[];
}

export type McpTransport = "streamable-http" | "sse";

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  readOnly?: boolean;
  destructive?: boolean;
}

export interface McpServerConfig {
  id: string;
  name: string;
  url: string;
  transport: McpTransport;
  customHeaders: string;
  tools: McpToolInfo[];
  updatedAt?: number;
}

export interface McpToolSelection {
  serverId: string;
  toolNames: string[];
}

export interface McpToolApprovalRequest {
  approvalId: string;
  serverId: string;
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
  description?: string;
  destructive?: boolean;
}

export type McpToolEventStatus = "called" | "blocked" | "failed";
export type McpToolBlockReason =
  | "global-deny"
  | "user-deny"
  | "approval-timeout";

export interface McpToolEvent {
  approvalId?: string;
  serverId: string;
  serverName: string;
  toolName: string;
  status: McpToolEventStatus;
  /** The untrusted, plain-text result returned by the MCP tool. */
  result?: string;
  reason?: McpToolBlockReason;
  error?: string;
}

export type McpToolApprovalDecision =
  | "allow-once"
  | "allow-round"
  | "allow-session"
  | "deny"
  | "deny-timeout";

export interface ProviderTestResult {
  ok: boolean;
  text?: string;
  error?: string;
}
