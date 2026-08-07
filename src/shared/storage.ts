import { DEFAULT_SETTINGS } from "./defaults";
import { uiText } from "./i18n";
import type {
  AppLogLevel,
  AppSettings,
  Conversation,
  CustomTool,
  CustomPrompt,
  PendingAction,
  ProviderProfile
} from "./types";

type StorageAreaName = "local" | "session" | "sync";

const SETTINGS_KEY = "webmind.settings";
const HISTORY_KEY = "webmind.history";
const CUSTOM_PROMPTS_KEY = "webmind.customPrompts";
const CUSTOM_TOOLS_KEY = "webmind.customTools";
const SESSION_SECRETS_KEY = "webmind.sessionSecrets";
const PENDING_ACTION_KEY = "webmind.pendingAction";
const CHROME_SYNC_META_KEY = "webmind.chromeSync.meta";
const CHROME_SYNC_CHUNK_PREFIX = "webmind.chromeSync.chunk.";
const CHROME_SYNC_CHUNK_CHARS = 2400;

const APP_LOG_LEVELS = new Set<AppLogLevel>([
  "debug",
  "info",
  "success",
  "warning",
  "error"
]);

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

export function normalizeSettings(stored: Partial<AppSettings> = {}): AppSettings {
  const profiles = stored.profiles ?? [];
  const storedHoverDefinitionShortcut = String(
    stored.hoverDefinitionShortcut ?? ""
  );
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
  const legacyTwentySecondDefault =
    storedTimeoutSeconds === 20 &&
    stored.modelThinkingTimeoutCustomized !== true;
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
    ...DEFAULT_SETTINGS,
    ...stored,
    profiles,
    activeProfileId,
    defaultProfileId,
    translationProfileId,
    visionProfileId,
    compareProfileIds: stored.compareProfileIds ?? [],
    logLevel: APP_LOG_LEVELS.has(stored.logLevel as AppLogLevel)
      ? (stored.logLevel as AppLogLevel)
      : DEFAULT_SETTINGS.logLevel,
    autoScrollDuringStreaming: stored.autoScrollDuringStreaming ?? true,
    modelThinkingTimeoutSeconds: legacyTwentySecondDefault
      ? 0
      : storedTimeoutSeconds,
    modelThinkingTimeoutCustomized:
      stored.modelThinkingTimeoutCustomized ?? false,
    selectionOverlayMode:
      stored.selectionOverlayMode ??
      (stored.quickActionsEnabled === false ? "off" : "always"),
    selectionOverlayMinChars: Math.max(
      1,
      Math.round(Number(stored.selectionOverlayMinChars ?? 2) || 2)
    ),
    inputAutoReplyEnabled: stored.inputAutoReplyEnabled ?? true,
    inputAutoReplyDisableSingleLine:
      stored.inputAutoReplyDisableSingleLine ?? true,
    immersiveTranslationAutoWhitelist:
      stored.immersiveTranslationAutoWhitelist ?? [],
    immersiveReadingAutoWhitelist: stored.immersiveReadingAutoWhitelist ?? [],
    immersiveReadingStrategy:
      stored.immersiveReadingStrategy === "model-page"
        ? "model-page"
        : "local-first",
    hoverDefinitionMode: stored.hoverDefinitionMode ?? "off",
    hoverDefinitionShortcut:
      storedHoverDefinitionShortcut === "ctrl" ||
      storedHoverDefinitionShortcut === "ctrl-shift"
        ? "ctrl"
        : "off",
    hoverDefinitionUrlBlacklist: stored.hoverDefinitionUrlBlacklist ?? [],
    imageTextExtractionEnabled: stored.imageTextExtractionEnabled ?? false,
    imageTextExtractionMinSize: stored.imageTextExtractionMinSize ?? 160,
    edgeQuickToolUrlBlacklist: quickToolsUrlBlacklist,
    chromeSyncEnabled: stored.chromeSyncEnabled ?? false,
    enabledToolIds: normalizeEnabledToolIds(stored.enabledToolIds)
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
  if (!meta?.chunkCount) return null;
  const keys = Array.from({ length: meta.chunkCount }, (_, index) =>
    chunkKey(index)
  );
  const values = await getValues("sync", keys);
  const raw = keys.map((key) => values[key] ?? "").join("");
  if (!raw) return null;
  const payload = JSON.parse(raw) as Partial<ChromeSyncPayload>;
  if (payload.format !== "webmind-chrome-sync" || !payload.settings) {
    throw new Error(uiText(undefined, "chromeSyncInvalidData"));
  }
  return {
    format: "webmind-chrome-sync",
    version: 1,
    syncedAt: payload.syncedAt ?? meta.syncedAt,
    settings: normalizeSettings(payload.settings),
    customTools: normalizeCustomTools(payload.customTools ?? [])
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

export async function loadCustomPrompts(): Promise<CustomPrompt[]> {
  return getValue<CustomPrompt[]>("local", CUSTOM_PROMPTS_KEY, []);
}

export async function saveCustomPrompts(
  prompts: CustomPrompt[]
): Promise<void> {
  await setValue("local", CUSTOM_PROMPTS_KEY, prompts);
}

export async function loadCustomTools(): Promise<CustomTool[]> {
  const tools = await getValue<CustomTool[]>("local", CUSTOM_TOOLS_KEY, []);
  if (tools.length) return normalizeCustomTools(tools);
  const legacy = await getValue<CustomTool[]>("local", CUSTOM_PROMPTS_KEY, []);
  return normalizeCustomTools(legacy);
}

export async function saveCustomTools(tools: CustomTool[]): Promise<void> {
  const normalized = normalizeCustomTools(tools);
  await setValue("local", CUSTOM_TOOLS_KEY, normalized);
  const settings = await loadSettings();
  if (settings.chromeSyncEnabled) {
    await writeChromeSyncPayload(settings, normalized);
  }
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
