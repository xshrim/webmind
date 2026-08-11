import { describe, expect, it } from "vitest";
import { createProviderProfile, DEFAULT_SETTINGS } from "./defaults";
import {
  normalizeSettings,
  SETTINGS_EXPORT_FORMAT,
  SETTINGS_EXPORT_VERSION
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
