import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Cloud,
  CloudDownload,
  CloudUpload,
  Download,
  KeyRound,
  PlugZap,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createProviderProfile,
  DEFAULT_SETTINGS,
  PROVIDER_DEFAULTS,
  PROVIDER_MODEL_SUGGESTIONS
} from "../shared/defaults";
import { LANGUAGE_OPTIONS, uiText, type UiTextKey } from "../shared/i18n";
import { requestOriginPermission, runtimeRequest } from "../shared/browser";
import {
  clearConversations,
  deleteProviderSecret,
  getProviderSecret,
  loadCustomTools,
  loadSettings,
  normalizeSettings,
  saveCustomTools,
  saveProviderSecret,
  saveSettings,
  SETTINGS_EXPORT_FORMAT,
  SETTINGS_EXPORT_VERSION,
  syncSettingsFromChrome,
  syncSettingsToChrome
} from "../shared/storage";
import { allTools } from "../shared/tools";
import type {
  ArticleExtractionRule,
  AppSettings,
  AppLanguage,
  CustomTool,
  DefaultContextScope,
  HoverDefinitionMode,
  HoverDefinitionStyle,
  ImmersiveShortcut,
  ImmersiveReadingBackgroundStyle,
  ImmersiveTranslationDisplayStyle,
  ImmersiveTranslationTextEffect,
  ImmersiveReadingStrategy,
  ProviderKind,
  ProviderProfile,
  ReasoningStrategy,
  SelectionMatchHighlightMode,
  SelectionOverlayMode,
  ToolDefinition,
  ToolSurface
} from "../shared/types";
import { errorMessage, parseCustomHeaders } from "../shared/utils";

type Status = { kind: "success" | "error" | "info"; text: string } | null;
type AutoReplyMode = "off" | "multiline" | "all";

const PROVIDER_KINDS: ProviderKind[] = [
  "openai-compatible",
  "grok",
  "deepseek",
  "kimi",
  "qwen",
  "zhipu",
  "mimo",
  "longcat",
  "minimax",
  "doubao-seed",
  "openrouter",
  "siliconflow",
  "anthropic",
  "gemini",
  "ollama"
];

const PRIMARY_PROVIDER_KINDS: ProviderKind[] = [
  "openai-compatible",
  "anthropic",
  "gemini",
  "grok",
  "openrouter",
  "siliconflow",
  "ollama"
];

const MORE_PROVIDER_KINDS = PROVIDER_KINDS.filter(
  (kind) => !PRIMARY_PROVIDER_KINDS.includes(kind)
);

const OVERLAY_MODES: Array<{
  id: SelectionOverlayMode;
  titleKey: UiTextKey;
  descriptionKey: UiTextKey;
}> = [
  {
    id: "off",
    titleKey: "selectionOverlayOff",
    descriptionKey: "selectionOverlayOffHelp"
  },
  {
    id: "always",
    titleKey: "selectionOverlayAlways",
    descriptionKey: "selectionOverlayAlwaysHelp"
  },
  {
    id: "hover",
    titleKey: "selectionOverlayHover",
    descriptionKey: "selectionOverlayHoverHelp"
  }
];

const HOVER_DEFINITION_MODES: Array<{
  id: HoverDefinitionMode;
  titleKey:
    | "hoverDefinitionOff"
    | "hoverDefinitionChinese"
    | "hoverDefinitionEnglish"
    | "hoverDefinitionBoth";
}> = [
  { id: "off", titleKey: "hoverDefinitionOff" },
  { id: "zh", titleKey: "hoverDefinitionChinese" },
  { id: "en", titleKey: "hoverDefinitionEnglish" },
  { id: "both", titleKey: "hoverDefinitionBoth" }
];

const HOVER_DEFINITION_STYLES: Array<{
  id: HoverDefinitionStyle;
  titleKey:
    | "hoverDefinitionStyleNone"
    | "hoverDefinitionStyleHighlight"
    | "hoverDefinitionStyleUnderline";
}> = [
  { id: "none", titleKey: "hoverDefinitionStyleNone" },
  { id: "highlight", titleKey: "hoverDefinitionStyleHighlight" },
  { id: "underline", titleKey: "hoverDefinitionStyleUnderline" }
];

type ShortcutModifier = "ctrl" | "alt" | "shift";

const SHORTCUT_MODIFIERS: Array<{
  id: ShortcutModifier;
  labelKey: "shortcutCtrl" | "shortcutAlt" | "shortcutShift";
}> = [
  { id: "ctrl", labelKey: "shortcutCtrl" },
  { id: "alt", labelKey: "shortcutAlt" },
  { id: "shift", labelKey: "shortcutShift" }
];

function shortcutModifierSet(shortcut: ImmersiveShortcut): Set<ShortcutModifier> {
  if (shortcut === "off") return new Set();
  return new Set(shortcut.split("-") as ShortcutModifier[]);
}

function shortcutFromModifiers(
  modifiers: Iterable<ShortcutModifier>
): ImmersiveShortcut {
  const selected = new Set(modifiers);
  const ordered = SHORTCUT_MODIFIERS.map((modifier) => modifier.id).filter(
    (modifier) => selected.has(modifier)
  );
  return (ordered.length ? ordered.join("-") : "off") as ImmersiveShortcut;
}

const TOOL_SURFACES: Array<{
  id: ToolSurface;
  titleKey: UiTextKey;
  descriptionKey: UiTextKey;
}> = [
  {
    id: "selection",
    titleKey: "selectionOverlay",
    descriptionKey: "toolSurfaceSelectionHelp"
  },
  {
    id: "home",
    titleKey: "toolSurfaceHome",
    descriptionKey: "toolSurfaceHomeHelp"
  },
  {
    id: "edge",
    titleKey: "toolSurfaceEdge",
    descriptionKey: "toolSurfaceEdgeHelp"
  }
];

const TRANSLATION_DISPLAY_STYLES: Array<{
  id: ImmersiveTranslationDisplayStyle;
  titleKey: UiTextKey;
}> = [
  { id: "default", titleKey: "translationStyleDefault" },
  { id: "highlight", titleKey: "translationStyleHighlight" },
  { id: "divider", titleKey: "translationStyleDivider" },
  { id: "quote", titleKey: "translationStyleQuote" },
  { id: "blur", titleKey: "translationStyleBlur" },
  { id: "transparent", titleKey: "translationStyleTransparent" }
];

const TRANSLATION_TEXT_EFFECTS: Array<{
  id: ImmersiveTranslationTextEffect;
  titleKey: UiTextKey;
}> = [
  { id: "underline", titleKey: "underline" },
  { id: "dashed-underline", titleKey: "dashedUnderline" },
  { id: "large", titleKey: "largeText" },
  { id: "small", titleKey: "smallText" },
  { id: "bold", titleKey: "bold" },
  { id: "italic", titleKey: "italic" },
  { id: "emphasis", titleKey: "emphasis" },
  { id: "light", titleKey: "light" }
];

const IMMERSIVE_READING_STRATEGIES: Array<{
  id: ImmersiveReadingStrategy;
  titleKey:
    | "immersiveReadingStrategyLocalFirst"
    | "immersiveReadingStrategyModelPage";
  descriptionKey:
    | "immersiveReadingStrategyLocalFirstHelp"
    | "immersiveReadingStrategyModelPageHelp";
}> = [
  {
    id: "local-first",
    titleKey: "immersiveReadingStrategyLocalFirst",
    descriptionKey: "immersiveReadingStrategyLocalFirstHelp"
  },
  {
    id: "model-page",
    titleKey: "immersiveReadingStrategyModelPage",
    descriptionKey: "immersiveReadingStrategyModelPageHelp"
  }
];

const IMMERSIVE_READING_BACKGROUND_STYLES: Array<{
  id: ImmersiveReadingBackgroundStyle;
  labelKey:
    | "immersiveReadingHighlightNone"
    | "immersiveReadingHighlightUniform"
    | "immersiveReadingHighlightLeveled";
}> = [
  { id: "none", labelKey: "immersiveReadingHighlightNone" },
  { id: "uniform", labelKey: "immersiveReadingHighlightUniform" },
  { id: "leveled", labelKey: "immersiveReadingHighlightLeveled" }
];

function applyTheme(settings: AppSettings): void {
  document.documentElement.dataset.theme = settings.theme;
}

function languageLabel(language: AppLanguage, current: AppLanguage): string {
  if (language === "auto") return uiText(current, "languageOptionAuto");
  return LANGUAGE_OPTIONS.find((option) => option.id === language)?.label ?? language;
}

const PROVIDER_KIND_LABEL_KEYS: Partial<Record<ProviderKind, UiTextKey>> = {
  "openai-compatible": "providerKindOpenAICompatible",
  grok: "providerKindGrok",
  anthropic: "providerKindAnthropic",
  gemini: "providerKindGemini",
  ollama: "providerKindOllama"
};

const REASONING_STRATEGIES: Array<{
  id: ReasoningStrategy;
  label: UiTextKey;
}> = [
  { id: "none", label: "reasoningStrategyNone" },
  { id: "openai-chat", label: "reasoningStrategyOpenAiChat" },
  { id: "anthropic", label: "reasoningStrategyAnthropic" },
  { id: "gemini-budget", label: "reasoningStrategyGeminiBudget" },
  { id: "ollama", label: "reasoningStrategyOllama" }
];

const SELECTION_MATCH_HIGHLIGHT_MODES: Array<{
  id: SelectionMatchHighlightMode;
  titleKey: UiTextKey;
}> = [
  { id: "off", titleKey: "selectionMatchHighlightOff" },
  {
    id: "case-sensitive",
    titleKey: "selectionMatchHighlightCaseSensitive"
  },
  { id: "ignore-case", titleKey: "selectionMatchHighlightIgnoreCase" }
];

function providerKindLabel(kind: ProviderKind, language: AppLanguage): string {
  const key = PROVIDER_KIND_LABEL_KEYS[kind];
  return key ? uiText(language, key) : PROVIDER_DEFAULTS[kind].name;
}

function providerSymbol(kind: ProviderKind): string {
  return {
    "openai-compatible": "AI",
    grok: "GK",
    deepseek: "DS",
    kimi: "KM",
    qwen: "QW",
    zhipu: "GL",
    mimo: "MM",
    longcat: "LC",
    minimax: "MX",
    "doubao-seed": "DB",
    openrouter: "OR",
    siliconflow: "SF",
    anthropic: "CL",
    gemini: "GM",
    ollama: "LO"
  }[kind];
}

function SurfaceToolPicker({
  tools,
  selectedIds,
  onChange,
  language
}: {
  tools: ToolDefinition[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  language: AppLanguage;
}) {
  const t = (key: UiTextKey) => uiText(language, key);
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(
    () => new Map(tools.map((tool) => [tool.id, tool])),
    [tools]
  );
  const normalizedSelectedIds = useMemo(
    () => selectedIds.filter((id) => byId.has(id)),
    [byId, selectedIds]
  );
  const selectedTools = normalizedSelectedIds
    .map((id) => byId.get(id))
    .filter((tool): tool is ToolDefinition => Boolean(tool));
  const selectedSet = new Set(normalizedSelectedIds);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const toggleTool = (toolId: string) => {
    onChange(
      selectedSet.has(toolId)
        ? normalizedSelectedIds.filter((id) => id !== toolId)
        : [...normalizedSelectedIds, toolId]
    );
  };

  const moveTool = (toolId: string, offset: -1 | 1) => {
    const index = normalizedSelectedIds.indexOf(toolId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= normalizedSelectedIds.length) return;
    const next = [...normalizedSelectedIds];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="surface-tool-picker" ref={pickerRef}>
      <button
        className="surface-tool-trigger"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="surface-tool-value">
          {selectedTools.length ? (
            selectedTools.map((tool, index) => (
              <span className="surface-tool-chip" key={tool.id}>
                {index + 1}. {tool.title}
              </span>
            ))
          ) : (
            <span className="surface-tool-empty">{t("noToolsEnabled")}</span>
          )}
        </span>
        <ChevronDown />
      </button>
      {open && (
        <div className="surface-tool-menu">
          <div className="surface-tool-menu-head">
            <strong>{t("chooseTools")}</strong>
            <span>{t("chooseToolsHelp")}</span>
          </div>
          <div className="surface-tool-options">
            {tools.map((tool) => {
              const checked = selectedSet.has(tool.id);
              const order = normalizedSelectedIds.indexOf(tool.id);
              return (
                <div
                  className={`surface-tool-option ${checked ? "active" : ""}`}
                  key={tool.id}
                >
                    <button
                      className="surface-tool-check"
                      type="button"
                      aria-pressed={checked}
                      onClick={() => toggleTool(tool.id)}
                  >
                    {checked && <Check />}
                  </button>
                    <button
                      className="surface-tool-option-main"
                      type="button"
                      onClick={() => toggleTool(tool.id)}
                    >
                    <strong>{tool.title}</strong>
                    <small>
                      {tool.description ||
                        (tool.builtin ? t("builtinTool") : t("customTool"))}
                    </small>
                  </button>
                  <div className="surface-tool-order">
                    {checked && <span>{order + 1}</span>}
                    <button
                      type="button"
                      title={t("moveUp")}
                      disabled={!checked || order <= 0}
                      onClick={() => moveTool(tool.id, -1)}
                    >
                      <ArrowUp />
                    </button>
                    <button
                      type="button"
                      title={t("moveDown")}
                      disabled={
                        !checked || order >= normalizedSelectedIds.length - 1
                      }
                      onClick={() => moveTool(tool.id, 1)}
                    >
                      <ArrowDown />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderEditor({
  profile,
  language,
  onClose,
  onSaved
}: {
  profile: ProviderProfile;
  language: AppLanguage;
  onClose: () => void;
  onSaved: (profile: ProviderProfile, secret: string) => Promise<void>;
}) {
  const t = (key: UiTextKey) => uiText(language, key);
  const [draft, setDraft] = useState(profile);
  const [secret, setSecret] = useState(profile.apiKey ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [modelOptions, setModelOptions] = useState<string[]>(
    PROVIDER_MODEL_SUGGESTIONS[profile.kind] ?? []
  );
  const [modelsBusy, setModelsBusy] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [moreKindsOpen, setMoreKindsOpen] = useState(false);
  const kindPickerRef = useRef<HTMLDivElement>(null);
  const modelListId = useMemo(
    () => `provider-models-${crypto.randomUUID()}`,
    []
  );

  useEffect(() => {
    void getProviderSecret(profile).then(setSecret);
  }, [profile]);

  useEffect(() => {
    setModelOptions(PROVIDER_MODEL_SUGGESTIONS[draft.kind] ?? []);
    setModelsError("");
  }, [draft.kind]);

  useEffect(() => {
    if (!moreKindsOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!kindPickerRef.current?.contains(event.target as Node)) {
        setMoreKindsOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [moreKindsOpen]);

  const update = <K extends keyof ProviderProfile>(
    key: K,
    value: ProviderProfile[K]
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const chooseKind = (kind: ProviderKind) => {
    const preset = PROVIDER_DEFAULTS[kind];
    setDraft((current) => ({
      ...current,
      kind,
      name:
        current.name === PROVIDER_DEFAULTS[current.kind].name ||
        current.name === providerKindLabel(current.kind, language)
          ? preset.name
          : current.name,
      baseUrl: preset.baseUrl,
      model: preset.model,
      supportsVision: preset.supportsVision,
      maxContextChars: preset.maxContextChars,
      reasoningStrategy: preset.reasoningStrategy
    }));
  };

  const fetchModels = async () => {
    setModelsBusy(true);
    setModelsError("");
    try {
      if (!draft.baseUrl.trim()) throw new Error(t("providerBaseUrlRequired"));
      parseCustomHeaders(draft.customHeaders, language);
      await requestOriginPermission(draft.baseUrl);
      const result = await runtimeRequest<{ models: string[] }>(
        "provider.models",
        {
          profile: {
            ...draft,
            baseUrl: draft.baseUrl.trim(),
            model: draft.model.trim()
          },
          secret: secret.trim()
        },
        language
      );
      setModelOptions(
        Array.from(
          new Set([
            ...(result.models ?? []),
            ...(PROVIDER_MODEL_SUGGESTIONS[draft.kind] ?? [])
          ])
        )
      );
    } catch (fetchError) {
      setModelsError(errorMessage(fetchError));
    } finally {
      setModelsBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      if (!draft.name.trim()) throw new Error(t("providerNameRequired"));
      if (!draft.baseUrl.trim()) throw new Error(t("providerBaseUrlRequired"));
      if (!draft.model.trim()) throw new Error(t("providerModelRequired"));
      parseCustomHeaders(draft.customHeaders);
      await requestOriginPermission(draft.baseUrl);
      await onSaved(
        {
          ...draft,
          name: draft.name.trim(),
          baseUrl: draft.baseUrl.trim(),
          model: draft.model.trim()
        },
        secret.trim()
      );
      onClose();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal provider-editor"
        role="dialog"
        aria-modal="true"
        aria-label={t("providerEditorAria")}
      >
        <header className="modal-header">
          <div className="provider-editor-heading">
            <h2>{providerKindLabel(draft.kind, language)}</h2>
            <span>{t("modelEngines")}</span>
          </div>
          <button className="icon-button" type="button" title={t("close")} onClick={onClose}>
            <X />
          </button>
        </header>

        <div className="modal-body form-stack">
          <div className="field">
            <span className="field-label">{t("providerKind")}</span>
            <div
              className="segmented segmented-wrap provider-kind-picker"
              ref={kindPickerRef}
            >
              {PRIMARY_PROVIDER_KINDS.map((kind) => (
                <button
                  className={draft.kind === kind ? "active" : ""}
                  key={kind}
                  type="button"
                  onClick={() => chooseKind(kind)}
                >
                  {providerKindLabel(kind, language)}
                </button>
              ))}
              <div className="provider-kind-more">
                <button
                  className={
                    MORE_PROVIDER_KINDS.includes(draft.kind) ||
                    moreKindsOpen
                      ? "active"
                      : ""
                  }
                  type="button"
                  aria-expanded={moreKindsOpen}
                  onClick={() => setMoreKindsOpen((value) => !value)}
                >
                  {MORE_PROVIDER_KINDS.includes(draft.kind)
                    ? providerKindLabel(draft.kind, language)
                    : t("more")}
                  <ChevronDown />
                </button>
                {moreKindsOpen && (
                  <div className="provider-kind-menu">
                    {MORE_PROVIDER_KINDS.map((kind) => (
                      <button
                        className={draft.kind === kind ? "active" : ""}
                        key={kind}
                        type="button"
                        onClick={() => {
                          chooseKind(kind);
                          setMoreKindsOpen(false);
                        }}
                      >
                        {providerKindLabel(kind, language)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <label className="field">
            <span className="field-label">{t("providerName")}</span>
            <input
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder={t("providerNamePlaceholder")}
            />
          </label>

          <div className="form-grid provider-proportion-grid">
            <label className="field">
              <span className="field-label">{t("providerBaseUrl")}</span>
              <input
                value={draft.baseUrl}
                onChange={(event) => update("baseUrl", event.target.value)}
                placeholder="https://api.example.com/v1"
                inputMode="url"
              />
              <small>{t("providerBaseUrlHelp")}</small>
            </label>

            <label className="field">
              <span className="field-label">
                {t("providerModel")}
                <button
                  className="field-label-action"
                  type="button"
                  title={t("fetchModels")}
                  aria-label={t("fetchModels")}
                  disabled={modelsBusy}
                  onClick={() => void fetchModels()}
                >
                  <RefreshCw className={modelsBusy ? "spin" : ""} />
                </button>
              </span>
              <input
                value={draft.model}
                onChange={(event) => update("model", event.target.value)}
                placeholder={t("providerModelPlaceholder")}
                list={modelListId}
              />
              <datalist id={modelListId}>
                {modelOptions.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
              <small>{modelsError || t("providerModelHelp")}</small>
            </label>
          </div>

          {draft.kind !== "ollama" && (
            <div className="form-grid provider-proportion-grid">
              <label className="field">
                <span className="field-label">
                  {t("providerApiKey")}
                  <KeyRound size={14} />
                </span>
                <input
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  placeholder={t("providerApiKeyPlaceholder")}
                  type="password"
                  autoComplete="off"
                />
              </label>
              <div className="field">
                <span className="field-label">{t("providerSecretStorage")}</span>
                <div className="segmented">
                  <button
                    className={draft.secretStorage === "local" ? "active" : ""}
                    type="button"
                    onClick={() => update("secretStorage", "local")}
                  >
                    {t("providerSecretLocal")}
                  </button>
                  <button
                    className={draft.secretStorage === "session" ? "active" : ""}
                    type="button"
                    onClick={() => update("secretStorage", "session")}
                  >
                    {t("providerSecretSession")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="form-grid provider-limit-grid">
            <label className="field">
              <span className="field-label">{t("providerTemperature")}</span>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={draft.temperature}
                onChange={(event) =>
                  update("temperature", Number(event.target.value))
                }
              />
            </label>
            <label className="field">
              <span className="field-label">{t("providerMaxTokens")}</span>
              <input
                type="number"
                min="64"
                max="32768"
                step="64"
                value={draft.maxTokens}
                onChange={(event) =>
                  update("maxTokens", Number(event.target.value))
                }
              />
            </label>
            <label className="field">
              <span className="field-label">{t("providerMaxContext")}</span>
              <input
                type="number"
                min="2000"
                max="500000"
                step="1000"
                value={draft.maxContextChars}
                onChange={(event) =>
                  update("maxContextChars", Number(event.target.value))
                }
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">{t("reasoningStrategy")}</span>
              <select
                value={draft.reasoningStrategy}
                onChange={(event) =>
                  update(
                    "reasoningStrategy",
                    event.target.value as ReasoningStrategy
                  )
                }
              >
                {REASONING_STRATEGIES.map((strategy) => (
                  <option key={strategy.id} value={strategy.id}>
                    {t(strategy.label)}
                  </option>
                ))}
              </select>
              <small>{t("reasoningStrategyHelp")}</small>
            </label>
            <label className="toggle-row field-toggle">
              <input
                type="checkbox"
                checked={draft.supportsVision}
                onChange={(event) =>
                  update("supportsVision", event.target.checked)
                }
              />
              <span>
                <strong>{t("providerSupportsVision")}</strong>
                <small>{t("providerSupportsVisionHelp")}</small>
              </span>
            </label>
          </div>

          <label className="field">
            <span className="field-label">{t("providerCustomHeaders")}</span>
            <textarea
              rows={3}
              value={draft.customHeaders}
              onChange={(event) => update("customHeaders", event.target.value)}
              placeholder={'{"X-Organization": "team-a"}'}
              spellCheck={false}
            />
            <small>{t("providerCustomHeadersHelp")}</small>
          </label>

          {error && <div className="inline-alert error">{error}</div>}
        </div>

        <footer className="modal-footer">
          <button className="secondary-button" type="button" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={() => void save()}
          >
            <Save />
            {busy ? t("saving") : t("saveEngine")}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function SettingsApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [editor, setEditor] = useState<ProviderProfile | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [readingEffectsTarget, setReadingEffectsTarget] = useState<
    "outer" | "inner"
  >("outer");
  const [syncBusy, setSyncBusy] = useState<"to" | "from" | "toggle" | null>(
    null
  );
  const importRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<AppSettings | null>(null);
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    void Promise.all([loadSettings(), loadCustomTools()]).then(([value, tools]) => {
      settingsRef.current = value;
      setSettings(value);
      setCustomTools(tools);
      applyTheme(value);
    });
  }, []);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 3800);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    const closeRoleMenus = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      document
        .querySelectorAll<HTMLDetailsElement>(".provider-role-picker[open]")
        .forEach((menu) => {
          if (!menu.contains(target)) menu.open = false;
        });
    };
    document.addEventListener("pointerdown", closeRoleMenus);
    return () => document.removeEventListener("pointerdown", closeRoleMenus);
  }, []);

  const activeProfile = useMemo(
    () =>
      settings?.profiles.find(
        (profile) => profile.id === settings.activeProfileId
      ) ?? null,
    [settings]
  );

  const availableTools = useMemo(
    () => allTools(customTools, settings ?? undefined),
    [customTools, settings]
  );
  const t = (key: UiTextKey) => uiText(settings?.interfaceLanguage, key);

  const persist = async (next: AppSettings) => {
    settingsRef.current = next;
    setSettings(next);
    applyTheme(next);
    const operation = persistenceQueueRef.current
      .catch(() => undefined)
      .then(() => saveSettings(next));
    persistenceQueueRef.current = operation;
    await operation;
  };

  const saveProfile = async (profile: ProviderProfile, secret: string) => {
    if (!settings) return;
    const stored = await saveProviderSecret(profile, secret);
    const exists = settings.profiles.some((item) => item.id === stored.id);
    const profiles = exists
      ? settings.profiles.map((item) => (item.id === stored.id ? stored : item))
      : [...settings.profiles, stored];
    const next = {
      ...settings,
      profiles,
      activeProfileId: settings.activeProfileId ?? stored.id,
      defaultProfileId:
        settings.defaultProfileId ??
        (settings.profiles.length ? null : stored.id),
      visionProfileId:
        settings.visionProfileId === stored.id && !stored.supportsVision
          ? null
          : settings.visionProfileId
    };
    await persist(next);
    setStatus({ kind: "success", text: t("providerSaved") });
  };

  const removeProfile = async (profileId: string) => {
    if (!settings) return;
    await deleteProviderSecret(profileId);
    const profiles = settings.profiles.filter((item) => item.id !== profileId);
    await persist({
      ...settings,
      profiles,
      activeProfileId:
        settings.activeProfileId === profileId
          ? profiles[0]?.id ?? null
          : settings.activeProfileId,
      defaultProfileId:
        settings.defaultProfileId === profileId
          ? profiles[0]?.id ?? null
          : settings.defaultProfileId,
      translationProfileId:
        settings.translationProfileId === profileId
          ? null
          : settings.translationProfileId,
      visionProfileId:
        settings.visionProfileId === profileId
          ? null
          : settings.visionProfileId,
      compareProfileIds: settings.compareProfileIds.filter(
        (id) => id !== profileId
      )
    });
    setStatus({ kind: "info", text: t("providerDeleted") });
  };

  const testProfile = async (profile: ProviderProfile) => {
    setTestingId(profile.id);
    setStatus(null);
    try {
      await requestOriginPermission(profile.baseUrl);
      const result = await runtimeRequest<{ ok: boolean; text: string }>(
        "provider.test",
        { profileId: profile.id }
      );
      if (!result.ok) throw new Error(result.text);
      setStatus({ kind: "success", text: `${profile.name} ${t("test")}: OK` });
    } catch (error) {
      setStatus({ kind: "error", text: errorMessage(error) });
    } finally {
      setTestingId(null);
    }
  };

  const updatePreference = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const current = settingsRef.current ?? settings;
    if (!current) return;
    await persist({
      ...current,
      [key]: value
    });
  };

  const updateProfileRole = async (
    role: "default" | "translation" | "vision",
    profile: ProviderProfile
  ) => {
    const current = settingsRef.current ?? settings;
    if (!current) return;
    if (role === "default") {
      const assigned = current.defaultProfileId === profile.id;
      await persist({
        ...current,
        activeProfileId: assigned ? null : profile.id,
        defaultProfileId: assigned ? null : profile.id
      });
      return;
    }
    if (role === "translation") {
      await persist({
        ...current,
        translationProfileId:
          current.translationProfileId === profile.id ? null : profile.id
      });
      return;
    }
    if (!profile.supportsVision) return;
    await persist({
      ...current,
      visionProfileId:
        current.visionProfileId === profile.id ? null : profile.id
    });
  };

  const updateOverlayMode = async (mode: SelectionOverlayMode) => {
    if (!settings) return;
    await persist({
      ...settings,
      selectionOverlayMode: mode
    });
  };

  const updateSurfaceTools = async (
    surface: ToolSurface,
    toolIds: string[]
  ) => {
    if (!settings) return;
    await persist({
      ...settings,
      enabledToolIds: {
        ...settings.enabledToolIds,
        [surface]: Array.from(new Set(toolIds))
      }
    });
  };

  const updateArticleExtractionRules = async (
    rules: ArticleExtractionRule[]
  ) => {
    if (!settings) return;
    await persist({
      ...settings,
      articleExtractionRules: rules
    });
  };

  const updateArticleExtractionRule = async (
    ruleId: string,
    patch: Partial<Pick<ArticleExtractionRule, "urlPattern" | "selector">>
  ) => {
    const rules = settings?.articleExtractionRules ?? [];
    await updateArticleExtractionRules(
      rules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...patch } : rule
      )
    );
  };

  const addArticleExtractionRule = async () => {
    const rules = settings?.articleExtractionRules ?? [];
    await updateArticleExtractionRules([
      ...rules,
      {
        id: crypto.randomUUID(),
        urlPattern: "",
        selector: ""
      }
    ]);
  };

  const deleteArticleExtractionRule = async (ruleId: string) => {
    await updateArticleExtractionRules(
      (settings?.articleExtractionRules ?? []).filter(
        (rule) => rule.id !== ruleId
      )
    );
  };

  const updateSearchAnswerEnabled = async (enabled: boolean) => {
    if (!settings) return;
    if (enabled) {
      try {
        const allowed = await requestOriginPermission(
          "https://html.duckduckgo.com/"
        );
        if (!allowed) throw new Error(t("duckPermissionRequired"));
      } catch (error) {
        setStatus({ kind: "error", text: errorMessage(error) });
        return;
      }
    }
    await updatePreference("searchAnswerEnabled", enabled);
  };

  const autoReplyMode = (): AutoReplyMode => {
    if (!settings?.inputAutoReplyEnabled) return "off";
    return settings.inputAutoReplyDisableSingleLine ? "multiline" : "all";
  };

  const updateAutoReplyMode = async (mode: AutoReplyMode) => {
    if (!settings) return;
    await persist({
      ...settings,
      inputAutoReplyEnabled: mode !== "off",
      inputAutoReplyDisableSingleLine: mode !== "all"
    });
  };

  const updateChromeSyncEnabled = async (enabled: boolean) => {
    if (!settings) return;
    setSyncBusy("toggle");
    try {
      const next = { ...settings, chromeSyncEnabled: enabled };
      await persist(next);
      setStatus({
        kind: "success",
        text: enabled ? t("chromeSyncEnabled") : t("chromeSyncDisabled")
      });
    } catch (error) {
      setStatus({ kind: "error", text: errorMessage(error) });
    } finally {
      setSyncBusy(null);
    }
  };

  const pushChromeSync = async () => {
    if (!settings) return;
    setSyncBusy("to");
    try {
      await syncSettingsToChrome(settings, customTools);
      setStatus({ kind: "success", text: t("settingsSyncedToChrome") });
    } catch (error) {
      setStatus({ kind: "error", text: errorMessage(error) });
    } finally {
      setSyncBusy(null);
    }
  };

  const pullChromeSync = async () => {
    setSyncBusy("from");
    try {
      const result = await syncSettingsFromChrome();
      settingsRef.current = result.settings;
      setSettings(result.settings);
      setCustomTools(result.customTools);
      applyTheme(result.settings);
      setStatus({
        kind: "success",
        text: t("settingsSyncedFromChrome")
      });
    } catch (error) {
      setStatus({ kind: "error", text: errorMessage(error) });
    } finally {
      setSyncBusy(null);
    }
  };

  const updateTranslationEffect = async (
    effect: ImmersiveTranslationTextEffect,
    enabled: boolean
  ) => {
    if (!settings) return;
    const current = settings.immersiveTranslationTextEffects ?? [];
    await persist({
      ...settings,
      immersiveTranslationTextEffects: enabled
        ? Array.from(new Set([...current, effect]))
        : current.filter((item) => item !== effect)
    });
  };

  const updateReadingEffect = async (
    key:
      | "immersiveReadingOuterTextEffects"
      | "immersiveReadingInnerTextEffects",
    effect: ImmersiveTranslationTextEffect,
    enabled: boolean
  ) => {
    if (!settings) return;
    const current = settings[key] ?? [];
    await persist({
      ...settings,
      [key]: enabled
        ? Array.from(new Set([...current, effect]))
        : current.filter((item) => item !== effect)
    });
  };

  type ShortcutPreferenceKey =
    | "selectionOverlayShortcut"
    | "hoverDefinitionShortcut"
    | "immersiveTranslationParagraphShortcut"
    | "immersiveTranslationPageShortcut"
    | "immersiveTranslationModeToggleShortcut"
    | "immersiveReadingParagraphShortcut"
    | "immersiveReadingContextShortcut";

  const shortcutCheckboxField = (
    key: ShortcutPreferenceKey,
    labelKey: UiTextKey,
    helpKey?: UiTextKey,
    options: { holdPrefix?: boolean } = {}
  ) => {
    if (!settings) return null;
    const selected = shortcutModifierSet(settings[key] as ImmersiveShortcut);
    const updateShortcutModifier = (
      modifier: ShortcutModifier,
      checked: boolean
    ) => {
      const next = new Set(selected);
      if (checked) {
        next.add(modifier);
      } else {
        next.delete(modifier);
      }
      void updatePreference(
        key,
        shortcutFromModifiers(next) as AppSettings[ShortcutPreferenceKey]
      );
    };
    return (
      <div className="field">
        <span className="field-label">
          {uiText(settings.interfaceLanguage, labelKey)}
        </span>
        <div className="shortcut-checkboxes">
          {options.holdPrefix && (
            <span className="shortcut-checkbox-prefix">
              {t("shortcutHoldPrefix")}
            </span>
          )}
          {SHORTCUT_MODIFIERS.map((modifier) => (
            <label className="shortcut-checkbox" key={modifier.id}>
              <input
                type="checkbox"
                checked={selected.has(modifier.id)}
                onChange={(event) =>
                  updateShortcutModifier(modifier.id, event.target.checked)
                }
              />
              <span>
                {uiText(settings.interfaceLanguage, modifier.labelKey)}
              </span>
            </label>
          ))}
        </div>
        {helpKey && <small>{uiText(settings.interfaceLanguage, helpKey)}</small>}
      </div>
    );
  };

  const toolsForSurface = (surface: ToolSurface): ToolDefinition[] =>
    availableTools.filter((tool) => {
          if (tool.id === "ask-selection") return false;
          return true;
        });

  const exportData = async () => {
    if (!settings) return;
    const tools = await loadCustomTools();
    const cleanSettings = {
      ...settings,
      profiles: settings.profiles.map(({ apiKey: _apiKey, ...profile }) => profile)
    };
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: SETTINGS_EXPORT_FORMAT,
            version: SETTINGS_EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
            settings: cleanSettings,
            customTools: tools
          },
          null,
          2
        )
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `webmind-settings-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus({ kind: "success", text: t("settingsExported") });
  };

  const importData = async (file: File) => {
    try {
      const payload = JSON.parse(await file.text());
      if (
        payload.format !== SETTINGS_EXPORT_FORMAT ||
        payload.version !== SETTINGS_EXPORT_VERSION ||
        !payload.settings ||
        !Array.isArray(payload.customTools)
      ) {
        throw new Error(t("invalidSettingsFile"));
      }
      const incoming = payload.settings as Partial<AppSettings>;
      const next = normalizeSettings({
        ...incoming,
        profiles: (incoming.profiles ?? []).map(
          (profile: ProviderProfile) => ({ ...profile, apiKey: "" })
        )
      });
      const importedTools = payload.customTools as CustomTool[];
      await saveSettings(next);
      await saveCustomTools(importedTools);
      settingsRef.current = next;
      setSettings(next);
      setCustomTools(importedTools);
      applyTheme(next);
      setStatus({ kind: "success", text: t("settingsImported") });
    } catch (error) {
      setStatus({ kind: "error", text: errorMessage(error) });
    }
  };

  if (!settings) {
    return <div className="page-loading">{t("loading")}…</div>;
  }

  return (
    <div className="settings-page">
      <header className="settings-topbar">
        <div className="brand-lockup">
          <img src="/icons/icon-48.png" alt="" />
          <div>
            <strong>WebMind</strong>
            <span>{t("appSubtitle")}</span>
          </div>
        </div>
        {activeProfile && (
          <div className="active-engine">
            <span className="status-dot" />
            {activeProfile.name}
          </div>
        )}
      </header>

      <main className="settings-main">
        {status && (
          <div className={`status-banner ${status.kind}`}>
            {status.kind === "success" ? <Check /> : <ShieldCheck />}
            <span>{status.text}</span>
          </div>
        )}

        <section className="settings-section">
          <div className="section-heading">
            <div>
              <h2>{t("modelEngines")}</h2>
              <p>{t("modelEnginesDescription")}</p>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() =>
                setEditor(
                  createProviderProfile("openai-compatible", {
                    name: t("providerKindOpenAICompatible")
                  })
                )
              }
            >
              <CirclePlus />
              {t("addEngine")}
            </button>
          </div>

          {!settings.profiles.length ? (
            <div className="empty-band">
              <PlugZap />
              <div>
                <strong>{t("noModelEngines")}</strong>
                <span>{t("noModelEnginesHelp")}</span>
              </div>
              <ChevronRight />
            </div>
          ) : (
            <div className="provider-list">
              {settings.profiles.map((profile) => (
                <article
                  className={`provider-row ${
                    profile.id === settings.activeProfileId ? "active" : ""
                  }`}
                  key={profile.id}
                >
                  <div
                    className="provider-main"
                  >
                    <span className="provider-symbol">
                      {providerSymbol(profile.kind)}
                    </span>
                    <span className="provider-copy">
                      <strong>{profile.name}</strong>
                      <span>
                        {providerKindLabel(profile.kind, settings.interfaceLanguage)} ·{" "}
                        {profile.model}
                      </span>
                    </span>
                    {(profile.id === settings.defaultProfileId ||
                      profile.id === settings.translationProfileId ||
                      profile.id === settings.visionProfileId) && (
                      <span className="provider-role-list">
                        {profile.id === settings.defaultProfileId && (
                          <span className="provider-role default assigned">
                            {t("defaultModelRole")}
                          </span>
                        )}
                        {profile.id === settings.translationProfileId && (
                          <span className="provider-role translation assigned">
                            {t("translationModelRole")}
                          </span>
                        )}
                        {profile.id === settings.visionProfileId && (
                          <span className="provider-role vision assigned">
                            {t("visionModelRole")}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="provider-actions">
                    <details className="provider-role-picker">
                      <summary className="secondary-button compact">
                        {t("modelRoles")}
                        <ChevronDown />
                      </summary>
                      <div className="provider-role-menu">
                        <label>
                          <input
                            type="checkbox"
                            checked={profile.id === settings.defaultProfileId}
                            onChange={() =>
                              void updateProfileRole("default", profile)
                            }
                          />
                          <span className="provider-role-dot default" />
                          {t("defaultModelRole")}
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={profile.id === settings.translationProfileId}
                            onChange={() =>
                              void updateProfileRole("translation", profile)
                            }
                          />
                          <span className="provider-role-dot translation" />
                          {t("translationModelRole")}
                        </label>
                        <label
                          title={
                            profile.supportsVision
                              ? t("setVisionModelRole")
                              : t("visionModelRoleUnavailable")
                          }
                        >
                          <input
                            type="checkbox"
                            checked={profile.id === settings.visionProfileId}
                            disabled={!profile.supportsVision}
                            onChange={() =>
                              void updateProfileRole("vision", profile)
                            }
                          />
                          <span className="provider-role-dot vision" />
                          {t("visionModelRole")}
                        </label>
                      </div>
                    </details>
                    <button
                      className="secondary-button compact"
                      type="button"
                      disabled={testingId === profile.id}
                      onClick={() => void testProfile(profile)}
                    >
                      <PlugZap />
                      {testingId === profile.id ? t("testing") : t("test")}
                    </button>
                    <button
                      className="secondary-button compact"
                      type="button"
                      onClick={() => setEditor(profile)}
                    >
                      {t("edit")}
                    </button>
                    <button
                      className="icon-button danger"
                      type="button"
                      title={t("delete")}
                      onClick={() => void removeProfile(profile.id)}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="settings-section">
          <div className="section-heading">
            <div>
              <h2>{t("pageFeatures")}</h2>
              <p>{t("pageFeaturesHelp")}</p>
            </div>
          </div>
          <div className="feature-settings-grid">
            <article className="settings-card" style={{ order: 4 }}>
              <header>
                <strong>{t("selectionOverlay")}</strong>
                <span>{t("selectionOverlayHelp")}</span>
              </header>
              <div className="card-body">
                <div className="field">
                  <span className="field-label">{t("selectionOverlayMode")}</span>
                  <div className="segmented segmented-wrap overlay-mode-picker">
                    {OVERLAY_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        className={
                          settings.selectionOverlayMode === mode.id
                            ? "active"
                            : ""
                        }
                        type="button"
                        title={uiText(settings.interfaceLanguage, mode.descriptionKey)}
                        onClick={() => void updateOverlayMode(mode.id)}
                      >
                        {uiText(settings.interfaceLanguage, mode.titleKey)}
                      </button>
                    ))}
                  </div>
                  <small>
                    {uiText(
                      settings.interfaceLanguage,
                      OVERLAY_MODES.find(
                        (mode) => mode.id === settings.selectionOverlayMode
                      )?.descriptionKey ?? "selectionOverlayAlwaysHelp"
                    )}
                  </small>
                </div>
                {shortcutCheckboxField(
                  "selectionOverlayShortcut",
                  "selectionOverlayShortcut",
                  "selectionOverlayShortcutHelp",
                  { holdPrefix: true }
                )}
                <div className="field">
                  <span className="field-label">
                    {t("selectionMatchHighlight")}
                  </span>
                  <div className="segmented segmented-wrap">
                    {SELECTION_MATCH_HIGHLIGHT_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        className={
                          settings.selectionMatchHighlightMode === mode.id
                            ? "active"
                            : ""
                        }
                        type="button"
                        onClick={() =>
                          void updatePreference(
                            "selectionMatchHighlightMode",
                            mode.id
                          )
                        }
                      >
                        {t(mode.titleKey)}
                      </button>
                    ))}
                  </div>
                  <small>{t("selectionMatchHighlightHelp")}</small>
                </div>
                <label className="field">
                  <span className="field-label">
                    {t("selectionOverlayMinChars")}
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={settings.selectionOverlayMinChars ?? 2}
                    onChange={(event) =>
                      void updatePreference(
                        "selectionOverlayMinChars",
                        Math.max(
                          1,
                          Math.round(Number(event.target.value) || 1)
                        )
                      )
                    }
                  />
                  <small>{t("selectionOverlayMinCharsHelp")}</small>
                </label>
                <label className="field">
                  <span className="field-label">{t("urlBlacklist")}</span>
                  <textarea
                    rows={4}
                    value={settings.selectionOverlayUrlBlacklist.join("\n")}
                    onChange={(event) =>
                      void updatePreference(
                        "selectionOverlayUrlBlacklist",
                        event.target.value
                          .split(/\r?\n/)
                          .map((item) => item.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder={"example.com\n*.example.com\nhttps://news.example.com/*"}
                    spellCheck={false}
                  />
                  <small>{t("selectionOverlayBlacklistHelp")}</small>
                </label>
              </div>
            </article>

            <article className="settings-card" style={{ order: 3 }}>
              <header>
                <strong>{t("hoverDefinition")}</strong>
                <span>{t("hoverDefinitionHelp")}</span>
              </header>
              <div className="card-body">
                <div className="field">
                  <span className="field-label">{t("hoverDefinition")}</span>
                  <div className="segmented segmented-wrap">
                    {HOVER_DEFINITION_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        className={
                          settings.hoverDefinitionMode === mode.id ? "active" : ""
                        }
                        type="button"
                        onClick={() =>
                          void updatePreference("hoverDefinitionMode", mode.id)
                        }
                      >
                        {uiText(settings.interfaceLanguage, mode.titleKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="field-label">{t("hoverDefinitionStyle")}</span>
                  <div className="segmented segmented-wrap">
                    {HOVER_DEFINITION_STYLES.map((style) => (
                      <button
                        key={style.id}
                        className={
                          settings.hoverDefinitionStyle === style.id ? "active" : ""
                        }
                        type="button"
                        onClick={() =>
                          void updatePreference("hoverDefinitionStyle", style.id)
                        }
                      >
                        {t(style.titleKey)}
                      </button>
                    ))}
                  </div>
                </div>
                {shortcutCheckboxField(
                  "hoverDefinitionShortcut",
                  "hoverDefinitionShortcut",
                  "hoverDefinitionShortcutHelp",
                  { holdPrefix: true }
                )}
                <label className="field">
                  <span className="field-label">{t("urlBlacklist")}</span>
                  <textarea
                    rows={4}
                    value={settings.hoverDefinitionUrlBlacklist.join("\n")}
                    onChange={(event) =>
                      void updatePreference(
                        "hoverDefinitionUrlBlacklist",
                        event.target.value
                          .split(/\r?\n/)
                          .map((item) => item.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder={"example.com\n*.example.com\nhttps://docs.example.com/*"}
                    spellCheck={false}
                  />
                  <small>{t("hoverDefinitionBlacklistHelp")}</small>
                </label>
              </div>
            </article>

            <article className="settings-card" style={{ order: 2 }}>
              <header>
                <strong>{t("edgeQuickTools")}</strong>
                <span>{t("edgeQuickToolsHelp")}</span>
              </header>
              <div className="card-body">
                <div className="field">
                  <span className="field-label">{t("linkSelection")}</span>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.linkTextSelectionEnabled}
                      onChange={(event) =>
                        void updatePreference(
                          "linkTextSelectionEnabled",
                          event.target.checked
                        )
                      }
                    />
                    <span>
                      <strong>{t("linkTextSelection")}</strong>
                      <small>{t("linkTextSelectionHelp")}</small>
                    </span>
                  </label>
                </div>
                <div className="field">
                  <span className="field-label">{t("edgeDockMenu")}</span>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.edgeQuickToolsEnabled ?? false}
                      onChange={(event) =>
                        void updatePreference(
                          "edgeQuickToolsEnabled",
                          event.target.checked
                        )
                      }
                    />
                    <span>
                      <strong>{t("edgeQuickToolsEnable")}</strong>
                      <small>{t("edgeQuickToolsEnableHelp")}</small>
                    </span>
                  </label>
                </div>
                <div className="field">
                  <span className="field-label">{t("imageTextExtraction")}</span>
                  <div className="segmented segmented-wrap">
                    {([
                      [false, t("imageTextExtractionOff")],
                      [true, t("imageTextExtractionOn")]
                    ] as const).map(([enabled, label]) => (
                      <button
                        key={String(enabled)}
                        className={
                          settings.imageTextExtractionEnabled === enabled
                            ? "active"
                            : ""
                        }
                        type="button"
                        onClick={() =>
                          void updatePreference(
                            "imageTextExtractionEnabled",
                            enabled
                          )
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {settings.imageTextExtractionEnabled && (
                  <label className="field">
                    <span className="field-label">
                      {t("imageTextExtractionMinSize")}
                    </span>
                    <input
                      type="number"
                      min="24"
                      max="2000"
                      step="10"
                      value={settings.imageTextExtractionMinSize}
                      onChange={(event) =>
                        void updatePreference(
                          "imageTextExtractionMinSize",
                          Math.max(24, Number(event.target.value) || 160)
                        )
                      }
                    />
                    <small>{t("imageTextExtractionMinSizeHelp")}</small>
                  </label>
                )}
                <div className="field">
                  <span className="field-label">{t("autoReply")}</span>
                  <div className="segmented segmented-wrap">
                    {([
                      ["off", t("autoReplyOff")],
                      ["multiline", t("autoReplyMultiline")],
                      ["all", t("autoReplyAll")]
                    ] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        className={autoReplyMode() === mode ? "active" : ""}
                        type="button"
                        onClick={() => void updateAutoReplyMode(mode)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <small>{t("autoReplyHelp")}</small>
                </div>
                <label className="field">
                  <span className="field-label">{t("urlBlacklist")}</span>
                  <textarea
                    rows={4}
                    value={settings.edgeQuickToolUrlBlacklist.join("\n")}
                    onChange={(event) => {
                      const blacklist = event.target.value
                        .split(/\r?\n/)
                        .map((item) => item.trim())
                        .filter(Boolean);
                      void persist({
                        ...settings,
                        edgeQuickToolUrlBlacklist: blacklist
                      });
                    }}
                    placeholder={"example.com\n*.example.com\nhttps://docs.example.com/*"}
                    spellCheck={false}
                  />
                  <small>{t("quickToolsBlacklistHelp")}</small>
                </label>
              </div>
            </article>

            <article className="settings-card" style={{ order: 5 }}>
              <header>
                <strong>{t("immersiveTranslation")}</strong>
                <span>{t("immersiveTranslationHelp")}</span>
              </header>
              <div className="card-body">
                {shortcutCheckboxField(
                  "immersiveTranslationParagraphShortcut",
                  "immersiveTranslationParagraphShortcut"
                )}
                {shortcutCheckboxField(
                  "immersiveTranslationPageShortcut",
                  "immersiveTranslationPageShortcut",
                  "immersiveTranslationShortcutHelp"
                )}
                {shortcutCheckboxField(
                  "immersiveTranslationModeToggleShortcut",
                  "immersiveTranslationModeToggleShortcut"
                )}
                <div className="field">
                  <span className="field-label">{t("displayMode")}</span>
                  <div className="segmented segmented-wrap">
                    {([
                      ["translation-only", t("translationOnly")],
                      ["bilingual", t("bilingual")]
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        className={
                          settings.immersiveTranslationStyle === value
                            ? "active"
                            : ""
                        }
                        type="button"
                        onClick={() =>
                          void updatePreference(
                            "immersiveTranslationStyle",
                            value
                          )
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="field-label">{t("translationStyle")}</span>
                  <div className="segmented segmented-wrap">
                    {TRANSLATION_DISPLAY_STYLES.map((style) => (
                      <button
                        key={style.id}
                        className={
                          settings.immersiveTranslationDisplayStyle === style.id
                            ? "active"
                            : ""
                        }
                        type="button"
                        onClick={() =>
                          void updatePreference(
                            "immersiveTranslationDisplayStyle",
                            style.id
                          )
                        }
                      >
                        {uiText(settings.interfaceLanguage, style.titleKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="field-label">{t("textEffects")}</span>
                  <div className="effect-check-grid">
                    {TRANSLATION_TEXT_EFFECTS.map((effect) => (
                      <label className="tool-check-row compact" key={effect.id}>
                        <input
                          type="checkbox"
                          checked={(
                            settings.immersiveTranslationTextEffects ?? []
                          ).includes(effect.id)}
                          onChange={(event) =>
                            void updateTranslationEffect(
                              effect.id,
                              event.target.checked
                            )
                          }
                        />
                        <span>
                          <strong>
                            {uiText(settings.interfaceLanguage, effect.titleKey)}
                          </strong>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className="field">
                  <span className="field-label">
                    {t("immersiveTranslationAutoWhitelist")}
                  </span>
                  <textarea
                    rows={4}
                    value={settings.immersiveTranslationAutoWhitelist.join("\n")}
                    onChange={(event) =>
                      void updatePreference(
                        "immersiveTranslationAutoWhitelist",
                        event.target.value
                          .split(/\r?\n/)
                          .map((item) => item.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder={"example.com\n*.example.com\nhttps://docs.example.com/*"}
                    spellCheck={false}
                  />
                  <small>{t("immersiveTranslationAutoWhitelistHelp")}</small>
                </label>
              </div>
            </article>

            <article className="settings-card" style={{ order: 6 }}>
              <header>
                <strong>{t("immersiveReading")}</strong>
                <span>{t("immersiveReadingHelp")}</span>
              </header>
              <div className="card-body">
                <div className="field">
                  <span className="field-label">{t("immersiveReadingStrategy")}</span>
                  <div className="segmented">
                    {IMMERSIVE_READING_STRATEGIES.map((strategy) => (
                      <button
                        className={
                          settings.immersiveReadingStrategy === strategy.id
                            ? "active"
                            : ""
                        }
                        key={strategy.id}
                        type="button"
                        onClick={() =>
                          void updatePreference(
                            "immersiveReadingStrategy",
                            strategy.id
                          )
                        }
                      >
                        {t(strategy.titleKey)}
                      </button>
                    ))}
                  </div>
                  <small>
                    {t(
                      IMMERSIVE_READING_STRATEGIES.find(
                        (strategy) =>
                          strategy.id === settings.immersiveReadingStrategy
                      )?.descriptionKey ??
                        "immersiveReadingStrategyLocalFirstHelp"
                    )}
                  </small>
                </div>
                <label className="field">
                  <span className="field-label">
                    {t("immersiveReadingDifficulty")} ·{" "}
                    {settings.immersiveReadingDifficulty}
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={settings.immersiveReadingDifficulty}
                    onChange={(event) =>
                      void updatePreference(
                        "immersiveReadingDifficulty",
                        Number(event.target.value)
                      )
                    }
                  />
                  <div className="range-scale" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <span key={level}>{level}</span>
                    ))}
                  </div>
                  <small>{t("immersiveReadingDifficultyHelp")}</small>
                </label>
                {shortcutCheckboxField(
                  "immersiveReadingParagraphShortcut",
                  "immersiveReadingParagraphShortcut"
                )}
                {shortcutCheckboxField(
                  "immersiveReadingContextShortcut",
                  "immersiveReadingContextShortcut"
                )}
                <div className="field">
                  <span className="field-label">{t("immersiveReadingMode")}</span>
                  <div className="segmented segmented-wrap">
                    {([
                      ["translation", t("immersiveReadingTranslation")],
                      [
                        "original-translation",
                        t("immersiveReadingOriginalTranslation")
                      ],
                      [
                        "translation-original",
                        t("immersiveReadingTranslationOriginal")
                      ]
                    ] as const).map(([value, label]) => (
                      <button
                        className={
                          settings.immersiveReadingMode === value
                            ? "active"
                            : ""
                        }
                        key={value}
                        type="button"
                        onClick={() =>
                          void updatePreference("immersiveReadingMode", value)
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="field-label">
                    {t("immersiveReadingBackgroundStyle")}
                  </span>
                  <div className="segmented segmented-wrap">
                    {IMMERSIVE_READING_BACKGROUND_STYLES.map((style) => (
                      <button
                        className={
                          settings.immersiveReadingBackgroundStyle === style.id
                            ? "active"
                            : ""
                        }
                        key={style.id}
                        type="button"
                        onClick={() =>
                          void updatePreference(
                            "immersiveReadingBackgroundStyle",
                            style.id
                          )
                        }
                      >
                        {t(style.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="field-label">{t("textEffects")}</span>
                  <div className="segmented">
                    <button
                      className={
                        readingEffectsTarget === "outer" ? "active" : ""
                      }
                      type="button"
                      onClick={() => setReadingEffectsTarget("outer")}
                    >
                      {t("immersiveReadingOuterEffects")}
                    </button>
                    <button
                      className={
                        readingEffectsTarget === "inner" ? "active" : ""
                      }
                      type="button"
                      onClick={() => setReadingEffectsTarget("inner")}
                    >
                      {t("immersiveReadingInnerEffects")}
                    </button>
                  </div>
                  <div className="effect-check-grid">
                    {TRANSLATION_TEXT_EFFECTS.map((effect) => {
                      const key =
                        readingEffectsTarget === "outer"
                          ? "immersiveReadingOuterTextEffects"
                          : "immersiveReadingInnerTextEffects";
                      return (
                        <label className="tool-check-row compact" key={effect.id}>
                          <input
                            type="checkbox"
                            checked={(settings[key] ?? []).includes(effect.id)}
                            onChange={(event) =>
                              void updateReadingEffect(
                                key,
                                effect.id,
                                event.target.checked
                              )
                            }
                          />
                          <span>
                            <strong>
                              {uiText(
                                settings.interfaceLanguage,
                                effect.titleKey
                              )}
                            </strong>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <label className="field">
                  <span className="field-label">
                    {t("immersiveReadingAutoWhitelist")}
                  </span>
                  <textarea
                    rows={4}
                    value={settings.immersiveReadingAutoWhitelist.join("\n")}
                    onChange={(event) =>
                      void updatePreference(
                        "immersiveReadingAutoWhitelist",
                        event.target.value
                          .split(/\r?\n/)
                          .map((item) => item.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder={"example.com\n*.example.com\nhttps://learn.example.com/*"}
                    spellCheck={false}
                  />
                  <small>{t("immersiveReadingAutoWhitelistHelp")}</small>
                </label>
              </div>
            </article>

            <article className="settings-card" style={{ order: 1 }}>
              <header>
                <strong>{t("generalConfig")}</strong>
                <span>{t("generalConfigHelp")}</span>
              </header>
              <div className="card-body">
                <div className="language-settings-row">
                  <label className="field">
                    <span className="field-label">
                      {uiText(settings.interfaceLanguage, "languageSetting")}
                    </span>
                    <select
                      value={settings.interfaceLanguage}
                      onChange={(event) =>
                        void updatePreference(
                          "interfaceLanguage",
                          event.target.value as AppLanguage
                        )
                      }
                    >
                      {LANGUAGE_OPTIONS.map((language) => (
                        <option key={language.id} value={language.id}>
                          {languageLabel(language.id, settings.interfaceLanguage)}
                        </option>
                      ))}
                    </select>
                    <small>
                      {uiText(settings.interfaceLanguage, "languageSettingHelp")}
                    </small>
                  </label>
                  <label className="field">
                    <span className="field-label">
                      {uiText(
                        settings.interfaceLanguage,
                        "translationLanguageSetting"
                      )}
                    </span>
                    <select
                      value={settings.translationLanguage}
                      onChange={(event) =>
                        void updatePreference(
                          "translationLanguage",
                          event.target.value as AppLanguage
                        )
                      }
                    >
                      {LANGUAGE_OPTIONS.map((language) => (
                        <option key={language.id} value={language.id}>
                          {languageLabel(language.id, settings.interfaceLanguage)}
                        </option>
                      ))}
                    </select>
                    <small>
                      {uiText(
                        settings.interfaceLanguage,
                        "translationLanguageSettingHelp"
                      )}
                    </small>
                  </label>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <span className="field-label">{t("appearanceTheme")}</span>
                    <div className="segmented">
                      {(["system", "light", "dark"] as const).map((theme) => (
                        <button
                          key={theme}
                          className={settings.theme === theme ? "active" : ""}
                          type="button"
                          onClick={() => void updatePreference("theme", theme)}
                        >
                          {theme === "system"
                            ? t("themeSystem")
                            : theme === "light"
                              ? t("themeLight")
                              : t("themeDark")}
                        </button>
                      ))}
                    </div>
                    <small>{t("appearanceThemeHelp")}</small>
                  </div>
                  <div className="field">
                    <span className="field-label">
                      {uiText(
                        settings.interfaceLanguage,
                        "defaultContextScopeSetting"
                      )}
                    </span>
                    <div className="segmented">
                      {([
                        ["article", "currentBody"],
                        ["page", "currentPage"]
                      ] as const).map(([scope, labelKey]) => (
                        <button
                          key={scope}
                          className={
                            settings.defaultContextScope === scope
                              ? "active"
                              : ""
                          }
                          type="button"
                          onClick={() =>
                            void updatePreference(
                              "defaultContextScope",
                              scope as DefaultContextScope
                            )
                          }
                        >
                          {uiText(settings.interfaceLanguage, labelKey)}
                        </button>
                      ))}
                    </div>
                    <small>
                      {uiText(
                        settings.interfaceLanguage,
                        "defaultContextScopeHelp"
                      )}
                    </small>
                  </div>
                </div>
                <div className="field">
                  <span className="field-label">{t("mcpToolApprovalMode")}</span>
                  <div className="segmented segmented-wrap">
                    {([
                      ["deny", "mcpToolApprovalDeny"],
                      ["ask", "mcpToolApprovalAsk"],
                      ["allow", "mcpToolApprovalAllow"]
                    ] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        className={
                          settings.mcpToolApprovalMode === mode ? "active" : ""
                        }
                        type="button"
                        onClick={() =>
                          void updatePreference("mcpToolApprovalMode", mode)
                        }
                      >
                        {t(label)}
                      </button>
                    ))}
                  </div>
                  <small>{t("mcpToolApprovalModeHelp")}</small>
                </div>
                <div className="general-toggle-grid">
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.autoScrollDuringStreaming}
                      onChange={(event) =>
                        void updatePreference(
                          "autoScrollDuringStreaming",
                          event.target.checked
                        )
                      }
                    />
                    <span>
                      <strong>{t("autoScrollDuringStreaming")}</strong>
                      <small>{t("autoScrollDuringStreamingHelp")}</small>
                    </span>
                  </label>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.toolResponseUseContextLanguage}
                      onChange={(event) =>
                        void updatePreference(
                          "toolResponseUseContextLanguage",
                          event.target.checked
                        )
                      }
                    />
                    <span>
                      <strong>{t("toolResponseUseContextLanguage")}</strong>
                      <small>{t("toolResponseUseContextLanguageHelp")}</small>
                    </span>
                  </label>
                </div>
                <div className="general-toggle-grid">
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.reasoningEnabledByDefault}
                      onChange={(event) =>
                        void updatePreference(
                          "reasoningEnabledByDefault",
                          event.target.checked
                        )
                      }
                    />
                    <span>
                      <strong>{t("reasoningEnabledByDefault")}</strong>
                      <small>{t("reasoningEnabledByDefaultHelp")}</small>
                    </span>
                  </label>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.webSearchByDefault}
                      onChange={(event) =>
                        void updatePreference(
                          "webSearchByDefault",
                          event.target.checked
                        )
                      }
                    />
                    <span>
                      <strong>{t("webSearchByDefault")}</strong>
                      <small>{t("webSearchByDefaultHelp")}</small>
                    </span>
                  </label>
                </div>
                <div className="general-toggle-grid">
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.includePageByDefault}
                      onChange={(event) =>
                        void updatePreference(
                          "includePageByDefault",
                          event.target.checked
                        )
                      }
                    />
                    <span>
                      <strong>{t("includePageByDefault")}</strong>
                      <small>{t("includePageByDefaultHelp")}</small>
                    </span>
                  </label>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={settings.searchAnswerEnabled}
                      onChange={(event) =>
                        void updateSearchAnswerEnabled(event.target.checked)
                      }
                    />
                    <span>
                      <strong>{t("searchAnswerSetting")}</strong>
                      <small>{t("searchAnswerSettingHelp")}</small>
                    </span>
                  </label>
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span className="field-label">{t("modelThinkingTimeout")}</span>
                    <input
                      type="number"
                      min="0"
                      max="86400"
                      step="10"
                      value={settings.modelThinkingTimeoutSeconds}
                      onChange={(event) =>
                        void updatePreference(
                          "modelThinkingTimeoutSeconds",
                          Math.max(0, Math.round(Number(event.target.value) || 0))
                        )
                      }
                    />
                    <small>{t("modelThinkingTimeoutHelp")}</small>
                  </label>
                  <label className="field">
                    <span className="field-label">{t("historyLimit")}</span>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      step="10"
                      value={settings.historyLimit}
                      onChange={(event) =>
                        void updatePreference(
                          "historyLimit",
                          Number(event.target.value)
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            </article>

          </div>
        </section>

        <section className="settings-section">
          <div className="section-heading">
            <div>
              <h2>{t("toolEnable")}</h2>
              <p>{t("toolEnableHelp")}</p>
            </div>
          </div>
          <div className="tool-surface-list">
            {TOOL_SURFACES.map((surface) => (
              <article className="tool-surface-row" key={surface.id}>
                <div className="tool-surface-copy">
                  <strong>{uiText(settings.interfaceLanguage, surface.titleKey)}</strong>
                  <span>{uiText(settings.interfaceLanguage, surface.descriptionKey)}</span>
                </div>
                <SurfaceToolPicker
                  tools={toolsForSurface(surface.id)}
                  selectedIds={settings.enabledToolIds[surface.id] ?? []}
                  language={settings.interfaceLanguage}
                  onChange={(ids) => void updateSurfaceTools(surface.id, ids)}
                />
              </article>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <div className="section-heading">
            <div>
              <h2>{t("articleRecognition")}</h2>
              <p>{t("articleExtractionRulesHelp")}</p>
            </div>
          </div>
          <div className="article-rule-panel">
            <div className="article-rule-panel-head">
              <strong>{t("recognitionRules")}</strong>
              <button
                className="secondary-button compact"
                type="button"
                onClick={() => void addArticleExtractionRule()}
              >
                <CirclePlus />
                {t("add")}
              </button>
            </div>
            <div className="article-rule-list">
              {(settings.articleExtractionRules ?? []).map((rule) => (
                <div className="article-rule-row" key={rule.id}>
                  <input
                    value={rule.urlPattern}
                    onChange={(event) =>
                      void updateArticleExtractionRule(rule.id, {
                        urlPattern: event.target.value
                      })
                    }
                    placeholder={t("articleExtractionUrlPatternPlaceholder")}
                    spellCheck={false}
                  />
                  <input
                    value={rule.selector}
                    onChange={(event) =>
                      void updateArticleExtractionRule(rule.id, {
                        selector: event.target.value
                      })
                    }
                    placeholder={t("articleExtractionSelectorPlaceholder")}
                    spellCheck={false}
                  />
                  <button
                    className="icon-button danger"
                    type="button"
                    title={t("deleteArticleExtractionRule")}
                    onClick={() => void deleteArticleExtractionRule(rule.id)}
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
              {!settings.articleExtractionRules?.length && (
                <div className="empty-band">
                  {t("noArticleExtractionRules")}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-heading">
            <div>
              <h2>{t("dataSync")}</h2>
              <p>{t("dataSyncHelp")}</p>
            </div>
          </div>
          <div className="field sync-field">
            <span className="field-label">{t("chromeAccountSync")}</span>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={settings.chromeSyncEnabled}
                disabled={Boolean(syncBusy)}
                onChange={(event) =>
                  void updateChromeSyncEnabled(event.target.checked)
                }
              />
              <span>
                <strong>{t("autoSyncNonSensitive")}</strong>
                <small>{t("autoSyncNonSensitiveHelp")}</small>
              </span>
            </label>
            <div className="sync-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={Boolean(syncBusy)}
                onClick={() => void pushChromeSync()}
              >
                <CloudUpload />
                {syncBusy === "to" ? t("syncing") : t("syncToChrome")}
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={Boolean(syncBusy)}
                onClick={() => void pullChromeSync()}
              >
                <CloudDownload />
                {syncBusy === "from" ? t("syncing") : t("syncFromChrome")}
              </button>
            </div>
            <small className="sync-note">
              <Cloud />
              {t("syncSecretNote")}
            </small>
          </div>
          <div className="data-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => void exportData()}
            >
              <Download />
              {t("exportSettings")}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => importRef.current?.click()}
            >
              <Upload />
              {t("importSettings")}
            </button>
            <button
              className="secondary-button danger-text"
              type="button"
              onClick={async () => {
                await clearConversations();
                setStatus({ kind: "info", text: t("localHistoryCleared") });
              }}
            >
              <Trash2 />
              {t("clearConversationHistory")}
            </button>
            <input
              ref={importRef}
              hidden
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importData(file);
                event.target.value = "";
              }}
            />
          </div>
        </section>
      </main>

      {editor && (
        <ProviderEditor
          profile={editor}
          language={settings.interfaceLanguage}
          onClose={() => setEditor(null)}
          onSaved={saveProfile}
        />
      )}
    </div>
  );
}
