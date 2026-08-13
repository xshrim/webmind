import { describe, expect, it } from "vitest";
import { createProviderProfile, DEFAULT_SETTINGS } from "./defaults";
import {
  clearAllTodos,
  createStoredTodo,
  loadTodos,
  normalizeSettings,
  SETTINGS_EXPORT_FORMAT,
  SETTINGS_EXPORT_VERSION,
  splitStoredTodo
} from "./storage";

const DEPRECATED_SETTINGS_KEYS = [
  "selectedContent",
  "selectionContent",
  "customArticleContext",
  "manualArticleContext",
  "manualArticleScope",
  "contextPreviewScope",
  "immersiveTranslationShortcut",
  "immersiveReadingShortcut",
  "hoverDefinitionHotkey",
  "selectionOverlayHotkey",
  "quickToolsEnabled",
  "edgeDockMenuEnabled",
  "autoReplyEnabled"
];

function sortedKeys(value: object): string[] {
  return Object.keys(value).sort();
}

describe("settings normalization", () => {
  it("keeps normalized empty settings identical to the current defaults", () => {
    expect(normalizeSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps normalized settings and defaults on the same schema keys", () => {
    expect(sortedKeys(normalizeSettings())).toEqual(sortedKeys(DEFAULT_SETTINGS));
  });

  it("keeps explicit settings export schema identifiers centralized", () => {
    expect(SETTINGS_EXPORT_FORMAT).toBe("webmind-settings");
    expect(SETTINGS_EXPORT_VERSION).toBe(3);
  });

  it("does not reintroduce deprecated settings fields", () => {
    const defaultKeys = new Set(Object.keys(DEFAULT_SETTINGS));
    const normalizedKeys = new Set(Object.keys(normalizeSettings()));

    for (const key of DEPRECATED_SETTINGS_KEYS) {
      expect(defaultKeys.has(key)).toBe(false);
      expect(normalizedKeys.has(key)).toBe(false);
    }
  });

  it("uses zero seconds as the model thinking timeout default", () => {
    expect(normalizeSettings().modelThinkingTimeoutSeconds).toBe(0);
  });

  it("defaults the saved chat limit to 100 without replacing an explicit value", () => {
    expect(normalizeSettings().historyLimit).toBe(100);
    expect(normalizeSettings({ historyLimit: 30 }).historyLimit).toBe(30);
  });

  it("preserves the no-context default while rejecting unsupported values", () => {
    expect(normalizeSettings({ defaultContextScope: "none" }).defaultContextScope).toBe(
      "none"
    );
    expect(
      normalizeSettings({ defaultContextScope: "unsupported" as "none" })
        .defaultContextScope
    ).toBe("article");
  });

  it("defaults selection search to Google in a new tab", () => {
    expect(normalizeSettings().selectionSearchEngine).toBe("google");
    expect(normalizeSettings().selectionSearchOpenMode).toBe("new-tab");
    expect(normalizeSettings().selectionOverlayFixedTools).toEqual([
      "copy",
      "search"
    ]);
    expect(
      normalizeSettings({
        selectionSearchEngine: "baidu",
        selectionSearchOpenMode: "current"
      }).selectionSearchEngine
    ).toBe("baidu");
  });

  it("drops removed selection fixed tools from stored settings", () => {
    expect(
      normalizeSettings({
        selectionOverlayFixedTools: ["copy", "bookmark", "share", "qrcode"] as never
      }).selectionOverlayFixedTools
    ).toEqual(["copy", "qrcode"]);
  });

  it("preserves the context-menu tool surface while normalizing settings", () => {
    expect(normalizeSettings().enabledToolIds["context-menu"]).toEqual([
      "translate-text",
      "summary",
      "explain",
      "concise",
      "study-notes",
      "explain-code"
    ]);
    expect(
      normalizeSettings({
        enabledToolIds: {
          ...DEFAULT_SETTINGS.enabledToolIds,
          "context-menu": ["custom-tool", "summary"]
        }
      }).enabledToolIds["context-menu"]
    ).toEqual(["custom-tool", "summary"]);
  });

  it("defaults reasoning mode off and disables it for existing engines without a strategy", () => {
    const legacyGemini = createProviderProfile("gemini", {
      id: "legacy-gemini"
    });
    Reflect.deleteProperty(legacyGemini, "reasoningStrategy");
    const settings = normalizeSettings({ profiles: [legacyGemini] });

    expect(settings.reasoningEnabledByDefault).toBe(false);
    expect(settings.profiles[0].reasoningStrategy).toBe("none");
    expect(
      normalizeSettings({ reasoningEnabledByDefault: true })
        .reasoningEnabledByDefault
    ).toBe(true);
  });

  it("defaults invalid MCP tool authorization modes to ask", () => {
    expect(normalizeSettings().mcpToolApprovalMode).toBe("ask");
    expect(normalizeSettings({ mcpToolApprovalMode: "allow" }).mcpToolApprovalMode).toBe(
      "allow"
    );
    expect(
      normalizeSettings({ mcpToolApprovalMode: "invalid" as "ask" })
        .mcpToolApprovalMode
    ).toBe("ask");
  });

  it("defaults tool answers to the interface language", () => {
    expect(normalizeSettings().toolResponseUseContextLanguage).toBe(false);
    expect(
      normalizeSettings({ toolResponseUseContextLanguage: true })
        .toolResponseUseContextLanguage
    ).toBe(true);
  });

  it("preserves supported European language preferences", () => {
    const settings = normalizeSettings({
      interfaceLanguage: "es",
      translationLanguage: "de"
    });
    expect(settings.interfaceLanguage).toBe("es");
    expect(settings.translationLanguage).toBe("de");
    expect(DEFAULT_SETTINGS.interfaceLanguage).toBe("auto");
    expect(DEFAULT_SETTINGS.translationLanguage).toBe("auto");
  });

  it("marks only the first configured model as default", () => {
    const first = createProviderProfile("openai-compatible", { id: "first" });
    const second = createProviderProfile("ollama", { id: "second" });
    const settings = normalizeSettings({
      profiles: [first, second],
      activeProfileId: first.id
    });

    expect(settings.defaultProfileId).toBe(first.id);
    expect(settings.translationProfileId).toBeNull();
    expect(settings.visionProfileId).toBeNull();
  });

  it("preserves an explicitly configured thinking timeout", () => {
    const settings = normalizeSettings({
      modelThinkingTimeoutSeconds: 20
    });

    expect(settings.modelThinkingTimeoutSeconds).toBe(20);
  });

  it("allows one model to carry all three unique roles", () => {
    const model = createProviderProfile("gemini", { id: "model" });
    const settings = normalizeSettings({
      profiles: [model],
      activeProfileId: model.id,
      translationProfileId: model.id,
      visionProfileId: model.id
    });

    expect(settings.defaultProfileId).toBe(model.id);
    expect(settings.translationProfileId).toBe(model.id);
    expect(settings.visionProfileId).toBe(model.id);
  });

  it("clears missing roles and non-visual vision roles", () => {
    const profile = createProviderProfile("ollama", { id: "text-only" });
    const settings = normalizeSettings({
      profiles: [profile],
      activeProfileId: profile.id,
      translationProfileId: "missing",
      visionProfileId: profile.id
    });

    expect(settings.translationProfileId).toBeNull();
    expect(settings.visionProfileId).toBeNull();
  });

  it("normalizes article extraction rules", () => {
    const settings = normalizeSettings({
      articleExtractionRules: [
        { id: "rule-1", urlPattern: " example.com ", selector: " article " },
        { id: "", urlPattern: "*.example.com/*", selector: "main" },
        { id: "empty-selector", urlPattern: "example.org", selector: "" }
      ]
    });

    expect(settings.articleExtractionRules).toHaveLength(2);
    expect(settings.articleExtractionRules[0]).toEqual({
      id: "rule-1",
      urlPattern: "example.com",
      selector: "article"
    });
    expect(settings.articleExtractionRules[1].id).toBeTruthy();
    expect(settings.articleExtractionRules[1].urlPattern).toBe("*.example.com/*");
    expect(settings.articleExtractionRules[1].selector).toBe("main");
  });
});

describe("todo storage", () => {
  it("replaces the original todo with split items and preserves the source", async () => {
    await clearAllTodos();
    const original = await createStoredTodo({
      content: "Prepare a release\nWrite notes and publish",
      source: {
        kind: "answer",
        url: "https://example.com/article",
        pageTitle: "Article"
      }
    });

    const split = await splitStoredTodo(original.id, [
      "Write release notes",
      "Publish the release"
    ]);
    const stored = await loadTodos();

    expect(split).toHaveLength(2);
    expect(stored.map((todo) => todo.id)).not.toContain(original.id);
    expect(stored.map((todo) => todo.title)).toEqual(
      expect.arrayContaining(["Write release notes", "Publish the release"])
    );
    expect(stored.every((todo) => todo.source?.url === "https://example.com/article")).toBe(
      true
    );
    await clearAllTodos();
  });

  it("rejects invalid split sizes without changing the original todo", async () => {
    await clearAllTodos();
    const original = await createStoredTodo({ content: "Keep this todo" });

    await expect(splitStoredTodo(original.id, ["Only one"])).rejects.toThrow(
      "between 2 and 20"
    );
    expect((await loadTodos()).map((todo) => todo.id)).toEqual([original.id]);
    await clearAllTodos();
  });
});
