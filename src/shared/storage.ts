import { DEFAULT_SETTINGS } from "./defaults";
import { uiText } from "./i18n";
import type {
  ArticleExtractionRule,
  AppLanguage,
  AppLogLevel,
  AppSettings,
  Conversation,
  CustomTool,
  HoverDefinitionShortcut,
  ImmersiveShortcut,
  PendingAction,
  ProviderProfile,
  McpServerConfig,
  McpToolApprovalMode,
  ReasoningStrategy,
  SelectionMatchHighlightMode
} from "./types";
import { SELECTION_OVERLAY_FIXED_TOOL_ORDER } from "./types";

const APP_LANGUAGES = new Set<AppLanguage>([
  "auto",
  "zh-CN",
  "zh-TW",
  "en",
  "ja",
  "ko",
  "es",
  "fr",
  "de",
  "it"
]);

type StorageAreaName = "local" | "session" | "sync";

const SETTINGS_KEY = "webmind.settings";
const HISTORY_KEY = "webmind.history";
const CUSTOM_TOOLS_KEY = "webmind.customTools";
const SESSION_SECRETS_KEY = "webmind.sessionSecrets";
const PENDING_ACTION_KEY = "webmind.pendingAction";
const MCP_SERVERS_KEY = "webmind.mcpServers";
const CHROME_SYNC_META_KEY = "webmind.chromeSync.meta";
const CHROME_SYNC_CHUNK_PREFIX = "webmind.chromeSync.chunk.";
const CHROME_SYNC_CHUNK_CHARS = 2400;

export const SETTINGS_EXPORT_FORMAT = "webmind-settings";
export const SETTINGS_EXPORT_VERSION = 3;

const APP_LOG_LEVELS = new Set<AppLogLevel>([
  "debug",
  "info",
  "success",
  "warning",
  "error"
]);

const IMMERSIVE_SHORTCUTS = new Set<ImmersiveShortcut>([
  "off",
  "ctrl",
  "alt",
  "shift",
  "ctrl-alt",
  "ctrl-shift",
  "alt-shift",
  "ctrl-alt-shift"
]);

const HOVER_DEFINITION_SHORTCUTS = new Set<HoverDefinitionShortcut>([
  "off",
  "ctrl",
  "alt",
  "shift",
  "ctrl-alt",
  "ctrl-shift",
  "alt-shift",
  "ctrl-alt-shift"
]);

const MCP_TOOL_APPROVAL_MODES = new Set<McpToolApprovalMode>([
  "deny",
  "ask",
  "allow"
]);

const REASONING_STRATEGIES = new Set<ReasoningStrategy>([
  "none",
  "openai-chat",
  "anthropic",
  "gemini-budget",
  "ollama"
]);

const SELECTION_MATCH_HIGHLIGHT_MODES = new Set<SelectionMatchHighlightMode>([
  "off",
  "ignore-case",
  "case-sensitive"
]);

function normalizeImmersiveShortcut(
  value: unknown,
  fallback: ImmersiveShortcut
): ImmersiveShortcut {
  return IMMERSIVE_SHORTCUTS.has(value as ImmersiveShortcut)
    ? (value as ImmersiveShortcut)
    : fallback;
}

export interface ChromeSyncPayload {
  format: "webmind-chrome-sync";
  version: 1;
  syncedAt: string;
  settings: AppSettings;
  customTools: CustomTool[];
}

interface ChromeSyncMeta {
  format: "webmind-chrome-sync-meta";
  version: 1;
  syncedAt: string;
  chunkCount: number;
}

const memoryFallback = new Map<string, unknown>();

function hasChromeStorage(area: StorageAreaName): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.[area]);
}

async function getValue<T>(
  area: StorageAreaName,
  key: string,
  fallback: T
): Promise<T> {
  if (!hasChromeStorage(area)) {
    return (memoryFallback.get(`${area}:${key}`) as T | undefined) ?? fallback;
  }
  const result = await chrome.storage[area].get(key);
  return (result[key] as T | undefined) ?? fallback;
}

async function setValue<T>(
  area: StorageAreaName,
  key: string,
  value: T
): Promise<void> {
  if (!hasChromeStorage(area)) {
    memoryFallback.set(`${area}:${key}`, value);
    return;
  }
  await chrome.storage[area].set({ [key]: value });
}

async function getValues(
  area: StorageAreaName,
  keys: string[]
): Promise<Record<string, unknown>> {
  if (!hasChromeStorage(area)) {
    return Object.fromEntries(
      keys.map((key) => [key, memoryFallback.get(`${area}:${key}`)])
    );
  }
  return chrome.storage[area].get(keys);
}

async function setValues(
  area: StorageAreaName,
  values: Record<string, unknown>
): Promise<void> {
  if (!hasChromeStorage(area)) {
    Object.entries(values).forEach(([key, value]) =>
      memoryFallback.set(`${area}:${key}`, value)
    );
    return;
  }
  await chrome.storage[area].set(values);
}

async function removeValues(
  area: StorageAreaName,
  keys: string[]
): Promise<void> {
  if (!keys.length) return;
  if (!hasChromeStorage(area)) {
    keys.forEach((key) => memoryFallback.delete(`${area}:${key}`));
    return;
  }
  await chrome.storage[area].remove(keys);
}

function normalizeEnabledToolIds(
  stored: Partial<AppSettings>["enabledToolIds"]
): AppSettings["enabledToolIds"] {
  return {
    ...DEFAULT_SETTINGS.enabledToolIds,
    ...(stored ?? {})
  };
}

function normalizeArticleExtractionRules(
  rules: Partial<ArticleExtractionRule>[] = []
): ArticleExtractionRule[] {
  return rules
    .map((rule) => ({
      id: String(rule.id || crypto.randomUUID()),
      urlPattern: String(rule.urlPattern ?? "").trim(),
      selector: String(rule.selector ?? "").trim()
    }))
    .filter((rule) => rule.urlPattern && rule.selector);
}

export function normalizeSettings(stored: Partial<AppSettings> = {}): AppSettings {
  const profiles = (stored.profiles ?? []).map((profile) => ({
    ...profile,
    reasoningStrategy: REASONING_STRATEGIES.has(
      profile.reasoningStrategy as ReasoningStrategy
    )
      ? (profile.reasoningStrategy as ReasoningStrategy)
      : "none"
  }));
  const quickToolsUrlBlacklist = stored.edgeQuickToolUrlBlacklist ?? [];
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const visionProfileIds = new Set(
    profiles
      .filter((profile) => profile.supportsVision)
      .map((profile) => profile.id)
  );
  const storedTimeoutSeconds = Math.max(
    0,
    Math.round(Number(stored.modelThinkingTimeoutSeconds) || 0)
  );
  const activeProfileId =
    stored.activeProfileId && profileIds.has(stored.activeProfileId)
      ? stored.activeProfileId
      : null;
  const defaultProfileId =
    (stored.defaultProfileId && profileIds.has(stored.defaultProfileId)
      ? stored.defaultProfileId
      : null) ?? activeProfileId;
  const translationProfileId =
    stored.translationProfileId && profileIds.has(stored.translationProfileId)
      ? stored.translationProfileId
      : null;
  const visionProfileId =
    stored.visionProfileId && visionProfileIds.has(stored.visionProfileId)
      ? stored.visionProfileId
      : null;
  return {
    profiles,
    activeProfileId,
    defaultProfileId,
    translationProfileId,
    visionProfileId,
    compareProfileIds: stored.compareProfileIds ?? [],
    theme: stored.theme ?? DEFAULT_SETTINGS.theme,
    logLevel: APP_LOG_LEVELS.has(stored.logLevel as AppLogLevel)
      ? (stored.logLevel as AppLogLevel)
      : DEFAULT_SETTINGS.logLevel,
    autoScrollDuringStreaming: stored.autoScrollDuringStreaming ?? true,
    modelThinkingTimeoutSeconds: storedTimeoutSeconds,
    reasoningEnabledByDefault:
      stored.reasoningEnabledByDefault ??
      DEFAULT_SETTINGS.reasoningEnabledByDefault,
    mcpToolApprovalMode: MCP_TOOL_APPROVAL_MODES.has(
      stored.mcpToolApprovalMode as McpToolApprovalMode
    )
      ? (stored.mcpToolApprovalMode as McpToolApprovalMode)
      : DEFAULT_SETTINGS.mcpToolApprovalMode,
    interfaceLanguage:
      stored.interfaceLanguage && APP_LANGUAGES.has(stored.interfaceLanguage)
        ? stored.interfaceLanguage
        : DEFAULT_SETTINGS.interfaceLanguage,
    translationLanguage:
      stored.translationLanguage && APP_LANGUAGES.has(stored.translationLanguage)
        ? stored.translationLanguage
        : DEFAULT_SETTINGS.translationLanguage,
    defaultContextScope:
      stored.defaultContextScope === "none" || stored.defaultContextScope === "page"
        ? stored.defaultContextScope
        : "article",
    selectionOverlayMode:
      stored.selectionOverlayMode ?? DEFAULT_SETTINGS.selectionOverlayMode,
    selectionOverlayShortcut: HOVER_DEFINITION_SHORTCUTS.has(
      stored.selectionOverlayShortcut as HoverDefinitionShortcut
    )
      ? (stored.selectionOverlayShortcut as HoverDefinitionShortcut)
      : DEFAULT_SETTINGS.selectionOverlayShortcut,
    selectionOverlayMinChars: Math.max(
      1,
      Math.round(Number(stored.selectionOverlayMinChars ?? 2) || 2)
    ),
    selectionOverlayFixedTools: Array.isArray(stored.selectionOverlayFixedTools)
      ? SELECTION_OVERLAY_FIXED_TOOL_ORDER.filter((tool) =>
          stored.selectionOverlayFixedTools?.includes(tool)
        )
      : DEFAULT_SETTINGS.selectionOverlayFixedTools,
    selectionSearchEngine:
      stored.selectionSearchEngine === "bing" ||
      stored.selectionSearchEngine === "duckduckgo" ||
      stored.selectionSearchEngine === "brave" ||
      stored.selectionSearchEngine === "baidu" ||
      stored.selectionSearchEngine === "yahoo" ||
      stored.selectionSearchEngine === "yandex" ||
      stored.selectionSearchEngine === "ecosia" ||
      stored.selectionSearchEngine === "custom"
        ? stored.selectionSearchEngine
        : DEFAULT_SETTINGS.selectionSearchEngine,
    selectionSearchCustomUrl: String(stored.selectionSearchCustomUrl ?? "").trim(),
    selectionSearchOpenMode:
      stored.selectionSearchOpenMode === "current" ||
      stored.selectionSearchOpenMode === "new-tab"
        ? stored.selectionSearchOpenMode
        : DEFAULT_SETTINGS.selectionSearchOpenMode,
    selectionMatchHighlightMode: SELECTION_MATCH_HIGHLIGHT_MODES.has(
      stored.selectionMatchHighlightMode as SelectionMatchHighlightMode
    )
      ? (stored.selectionMatchHighlightMode as SelectionMatchHighlightMode)
      : DEFAULT_SETTINGS.selectionMatchHighlightMode,
    linkTextSelectionEnabled:
      stored.linkTextSelectionEnabled ??
      DEFAULT_SETTINGS.linkTextSelectionEnabled,
    immersiveTranslationStyle:
      stored.immersiveTranslationStyle ??
      DEFAULT_SETTINGS.immersiveTranslationStyle,
    immersiveTranslationDisplayStyle:
      stored.immersiveTranslationDisplayStyle ??
      DEFAULT_SETTINGS.immersiveTranslationDisplayStyle,
    immersiveTranslationTextEffects:
      stored.immersiveTranslationTextEffects ??
      DEFAULT_SETTINGS.immersiveTranslationTextEffects,
    inputAutoReplyEnabled:
      stored.inputAutoReplyEnabled ?? DEFAULT_SETTINGS.inputAutoReplyEnabled,
    inputAutoReplyDisableSingleLine:
      stored.inputAutoReplyDisableSingleLine ?? true,
    immersiveTranslationAutoWhitelist:
      stored.immersiveTranslationAutoWhitelist ?? [],
    immersiveTranslationParagraphShortcut: normalizeImmersiveShortcut(
      stored.immersiveTranslationParagraphShortcut,
      DEFAULT_SETTINGS.immersiveTranslationParagraphShortcut
    ),
    immersiveTranslationPageShortcut: normalizeImmersiveShortcut(
      stored.immersiveTranslationPageShortcut,
      DEFAULT_SETTINGS.immersiveTranslationPageShortcut
    ),
    immersiveTranslationModeToggleShortcut:
      normalizeImmersiveShortcut(
        stored.immersiveTranslationModeToggleShortcut,
        DEFAULT_SETTINGS.immersiveTranslationModeToggleShortcut
      ),
    immersiveReadingAutoWhitelist: stored.immersiveReadingAutoWhitelist ?? [],
    immersiveReadingDifficulty:
      stored.immersiveReadingDifficulty ??
      DEFAULT_SETTINGS.immersiveReadingDifficulty,
    immersiveReadingMode:
      stored.immersiveReadingMode ?? DEFAULT_SETTINGS.immersiveReadingMode,
    immersiveReadingStrategy:
      stored.immersiveReadingStrategy === "model-page"
        ? "model-page"
        : "local-first",
    immersiveReadingBackgroundStyle:
      stored.immersiveReadingBackgroundStyle === "uniform" ||
      stored.immersiveReadingBackgroundStyle === "leveled"
        ? stored.immersiveReadingBackgroundStyle
        : "none",
    immersiveReadingParagraphShortcut: normalizeImmersiveShortcut(
      stored.immersiveReadingParagraphShortcut,
      DEFAULT_SETTINGS.immersiveReadingParagraphShortcut
    ),
    immersiveReadingContextShortcut: normalizeImmersiveShortcut(
      stored.immersiveReadingContextShortcut,
      DEFAULT_SETTINGS.immersiveReadingContextShortcut
    ),
    immersiveReadingOuterTextEffects:
      stored.immersiveReadingOuterTextEffects ??
      DEFAULT_SETTINGS.immersiveReadingOuterTextEffects,
    immersiveReadingInnerTextEffects:
      stored.immersiveReadingInnerTextEffects ??
      DEFAULT_SETTINGS.immersiveReadingInnerTextEffects,
    hoverDefinitionMode: stored.hoverDefinitionMode ?? "off",
    hoverDefinitionShortcut: HOVER_DEFINITION_SHORTCUTS.has(
      stored.hoverDefinitionShortcut as HoverDefinitionShortcut
    )
      ? (stored.hoverDefinitionShortcut as HoverDefinitionShortcut)
      : DEFAULT_SETTINGS.hoverDefinitionShortcut,
    hoverDefinitionStyle:
      stored.hoverDefinitionStyle === "highlight" ||
      stored.hoverDefinitionStyle === "underline"
        ? stored.hoverDefinitionStyle
        : DEFAULT_SETTINGS.hoverDefinitionStyle,
    hoverDefinitionUrlBlacklist: stored.hoverDefinitionUrlBlacklist ?? [],
    edgeQuickToolsEnabled:
      stored.edgeQuickToolsEnabled ?? DEFAULT_SETTINGS.edgeQuickToolsEnabled,
    edgeQuickToolBottom:
      stored.edgeQuickToolBottom ?? DEFAULT_SETTINGS.edgeQuickToolBottom,
    selectionOverlayUrlBlacklist: stored.selectionOverlayUrlBlacklist ?? [],
    imageTextExtractionEnabled: stored.imageTextExtractionEnabled ?? false,
    imageTextExtractionMinSize: stored.imageTextExtractionMinSize ?? 160,
    articleExtractionRules: normalizeArticleExtractionRules(
      stored.articleExtractionRules
    ),
    edgeQuickToolUrlBlacklist: quickToolsUrlBlacklist,
    chromeSyncEnabled: stored.chromeSyncEnabled ?? false,
    enabledToolIds: normalizeEnabledToolIds(stored.enabledToolIds),
    searchAnswerEnabled:
      stored.searchAnswerEnabled ?? DEFAULT_SETTINGS.searchAnswerEnabled,
    includePageByDefault:
      stored.includePageByDefault ?? DEFAULT_SETTINGS.includePageByDefault,
    webSearchByDefault:
      stored.webSearchByDefault ?? DEFAULT_SETTINGS.webSearchByDefault,
    toolResponseUseContextLanguage:
      stored.toolResponseUseContextLanguage ??
      DEFAULT_SETTINGS.toolResponseUseContextLanguage,
    historyLimit: stored.historyLimit ?? DEFAULT_SETTINGS.historyLimit
  };
}

function settingsForChromeSync(settings: AppSettings): AppSettings {
  const normalized = normalizeSettings(settings);
  return {
    ...normalized,
    profiles: normalized.profiles.map(({ apiKey: _apiKey, ...profile }) => profile)
  };
}

function mergeSyncedSettingsWithLocalSecrets(
  incoming: Partial<AppSettings>,
  current: AppSettings
): AppSettings {
  const localKeys = new Map(
    current.profiles.map((profile) => [profile.id, profile.apiKey ?? ""])
  );
  const normalized = normalizeSettings(incoming);
  return {
    ...normalized,
    profiles: normalized.profiles.map((profile) => ({
      ...profile,
      apiKey: localKeys.get(profile.id) ?? ""
    }))
  };
}

function normalizeCustomTool(tool: CustomTool): CustomTool {
  return {
    ...tool,
    id: tool.id || crypto.randomUUID(),
    title: tool.title || uiText(undefined, "customToolFallback"),
    description: tool.description ?? "",
    template: tool.template ?? "",
    icon: tool.icon || "Sparkles",
    createdAt: tool.createdAt ?? Date.now()
  };
}

function normalizeCustomTools(tools: CustomTool[] = []): CustomTool[] {
  return tools.map(normalizeCustomTool);
}

function chunkKey(index: number): string {
  return `${CHROME_SYNC_CHUNK_PREFIX}${index}`;
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += CHROME_SYNC_CHUNK_CHARS) {
    chunks.push(text.slice(index, index + CHROME_SYNC_CHUNK_CHARS));
  }
  return chunks.length ? chunks : [""];
}

async function writeChromeSyncPayload(
  settings: AppSettings,
  customTools: CustomTool[]
): Promise<ChromeSyncPayload> {
  const payload: ChromeSyncPayload = {
    format: "webmind-chrome-sync",
    version: 1,
    syncedAt: new Date().toISOString(),
    settings: settingsForChromeSync(settings),
    customTools: normalizeCustomTools(customTools)
  };
  const chunks = chunkText(JSON.stringify(payload));
  const previousMeta = await getValue<ChromeSyncMeta | null>(
    "sync",
    CHROME_SYNC_META_KEY,
    null
  );
  const previousChunkKeys = Array.from(
    { length: previousMeta?.chunkCount ?? 0 },
    (_, index) => chunkKey(index)
  );
  const nextValues: Record<string, unknown> = {
    [CHROME_SYNC_META_KEY]: {
      format: "webmind-chrome-sync-meta",
      version: 1,
      syncedAt: payload.syncedAt,
      chunkCount: chunks.length
    } satisfies ChromeSyncMeta
  };
  chunks.forEach((chunk, index) => {
    nextValues[chunkKey(index)] = chunk;
  });
  await setValues("sync", nextValues);
  await removeValues("sync", previousChunkKeys.slice(chunks.length));
  return payload;
}

export async function loadChromeSyncPayload(): Promise<ChromeSyncPayload | null> {
  const meta = await getValue<ChromeSyncMeta | null>(
    "sync",
    CHROME_SYNC_META_KEY,
    null
  );
  if (
    !meta ||
    meta.format !== "webmind-chrome-sync-meta" ||
    meta.version !== 1 ||
    !meta.chunkCount
  ) {
    return null;
  }
  const keys = Array.from({ length: meta.chunkCount }, (_, index) =>
    chunkKey(index)
  );
  const values = await getValues("sync", keys);
  const raw = keys.map((key) => values[key] ?? "").join("");
  if (!raw) return null;
  const payload = JSON.parse(raw) as Partial<ChromeSyncPayload>;
  if (
    payload.format !== "webmind-chrome-sync" ||
    payload.version !== 1 ||
    !payload.settings ||
    !Array.isArray(payload.customTools)
  ) {
    throw new Error(uiText(undefined, "chromeSyncInvalidData"));
  }
  return {
    format: "webmind-chrome-sync",
    version: 1,
    syncedAt: payload.syncedAt ?? meta.syncedAt,
    settings: normalizeSettings(payload.settings),
    customTools: normalizeCustomTools(payload.customTools)
  };
}

export async function syncSettingsToChrome(
  settings?: AppSettings,
  customTools?: CustomTool[]
): Promise<ChromeSyncPayload> {
  return writeChromeSyncPayload(
    settings ?? (await loadSettings()),
    customTools ?? (await loadCustomTools())
  );
}

export async function syncSettingsFromChrome(): Promise<{
  payload: ChromeSyncPayload;
  settings: AppSettings;
  customTools: CustomTool[];
}> {
  const payload = await loadChromeSyncPayload();
  if (!payload) throw new Error(uiText(undefined, "chromeSyncNoData"));
  const current = await loadSettings();
  const settings = mergeSyncedSettingsWithLocalSecrets(payload.settings, current);
  const customTools = normalizeCustomTools(payload.customTools);
  await setValue("local", SETTINGS_KEY, settings);
  await setValue("local", CUSTOM_TOOLS_KEY, customTools);
  return { payload, settings, customTools };
}

async function syncIfEnabled(settings: AppSettings): Promise<void> {
  if (!settings.chromeSyncEnabled) return;
  await writeChromeSyncPayload(settings, await loadCustomTools());
}

export async function loadSettings(): Promise<AppSettings> {
  const stored = await getValue<Partial<AppSettings>>(
    "local",
    SETTINGS_KEY,
    {}
  );
  return normalizeSettings(stored);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await setValue("local", SETTINGS_KEY, settings);
  await syncIfEnabled(settings);
}

export async function updateSettings(
  updater: (settings: AppSettings) => AppSettings
): Promise<AppSettings> {
  const next = updater(await loadSettings());
  await saveSettings(next);
  return next;
}

export async function getProviderSecret(
  profile: ProviderProfile
): Promise<string> {
  if (profile.secretStorage === "local") return profile.apiKey ?? "";
  const secrets = await getValue<Record<string, string>>(
    "session",
    SESSION_SECRETS_KEY,
    {}
  );
  return secrets[profile.id] ?? "";
}

export async function saveProviderSecret(
  profile: ProviderProfile,
  secret: string
): Promise<ProviderProfile> {
  const secrets = await getValue<Record<string, string>>(
    "session",
    SESSION_SECRETS_KEY,
    {}
  );
  if (profile.secretStorage === "session") {
    await setValue("session", SESSION_SECRETS_KEY, {
      ...secrets,
      [profile.id]: secret
    });
    return { ...profile, apiKey: "" };
  }
  if (secrets[profile.id]) {
    const next = { ...secrets };
    delete next[profile.id];
    await setValue("session", SESSION_SECRETS_KEY, next);
  }
  return { ...profile, apiKey: secret };
}

export async function deleteProviderSecret(profileId: string): Promise<void> {
  const secrets = await getValue<Record<string, string>>(
    "session",
    SESSION_SECRETS_KEY,
    {}
  );
  if (!secrets[profileId]) return;
  const next = { ...secrets };
  delete next[profileId];
  await setValue("session", SESSION_SECRETS_KEY, next);
}

export async function listConversations(): Promise<Conversation[]> {
  return getValue<Conversation[]>("local", HISTORY_KEY, []);
}

export async function saveConversation(
  conversation: Conversation,
  limit: number
): Promise<void> {
  const history = await listConversations();
  const next = [
    conversation,
    ...history.filter((item) => item.id !== conversation.id)
  ]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
  await setValue("local", HISTORY_KEY, next);
}

export async function deleteConversation(id: string): Promise<void> {
  const history = await listConversations();
  await setValue(
    "local",
    HISTORY_KEY,
    history.filter((item) => item.id !== id)
  );
}

export async function clearConversations(): Promise<void> {
  await setValue("local", HISTORY_KEY, []);
}

export async function loadCustomTools(): Promise<CustomTool[]> {
  const tools = await getValue<CustomTool[]>("local", CUSTOM_TOOLS_KEY, []);
  return normalizeCustomTools(tools);
}

export async function saveCustomTools(tools: CustomTool[]): Promise<void> {
  const normalized = normalizeCustomTools(tools);
  await setValue("local", CUSTOM_TOOLS_KEY, normalized);
  const settings = await loadSettings();
  if (settings.chromeSyncEnabled) {
    await writeChromeSyncPayload(settings, normalized);
  }
}

function normalizeMcpServers(servers: McpServerConfig[] = []): McpServerConfig[] {
  return servers
    .map((server) => ({
      id: String(server.id || crypto.randomUUID()),
      name: String(server.name ?? "").trim(),
      url: String(server.url ?? "").trim(),
      transport: server.transport === "sse" ? "sse" as const : "streamable-http" as const,
      customHeaders: String(server.customHeaders ?? "").trim(),
      tools: Array.isArray(server.tools)
        ? server.tools
            .map((tool) => ({
              name: String(tool.name ?? "").trim(),
              description: String(tool.description ?? "").trim(),
              inputSchema:
                tool.inputSchema && typeof tool.inputSchema === "object"
                  ? tool.inputSchema
                  : { type: "object" },
              readOnly: Boolean(tool.readOnly),
              destructive: Boolean(tool.destructive)
            }))
            .filter((tool) => tool.name)
        : [],
      updatedAt: Number(server.updatedAt) || undefined
    }))
    .filter((server) => server.name && server.url);
}

export async function loadMcpServers(): Promise<McpServerConfig[]> {
  return normalizeMcpServers(
    await getValue<McpServerConfig[]>("local", MCP_SERVERS_KEY, [])
  );
}

export async function saveMcpServers(
  servers: McpServerConfig[]
): Promise<void> {
  await setValue("local", MCP_SERVERS_KEY, normalizeMcpServers(servers));
}

export async function setPendingAction(
  action: PendingAction | null
): Promise<void> {
  await setValue("session", PENDING_ACTION_KEY, action);
}

export async function consumePendingAction(): Promise<PendingAction | null> {
  const action = await getValue<PendingAction | null>(
    "session",
    PENDING_ACTION_KEY,
    null
  );
  await setPendingAction(null);
  return action;
}
