import { describe, expect, it } from "vitest";
import { createProviderProfile } from "./defaults";
import { normalizeSettings } from "./storage";

describe("settings normalization", () => {
  it("uses zero seconds as the model thinking timeout default", () => {
    expect(normalizeSettings().modelThinkingTimeoutSeconds).toBe(0);
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

  it("migrates the legacy twenty-second default to zero", () => {
    const settings = normalizeSettings({
      modelThinkingTimeoutSeconds: 20
    });

    expect(settings.modelThinkingTimeoutSeconds).toBe(0);
    expect(settings.modelThinkingTimeoutCustomized).toBe(false);
  });

  it("keeps an explicitly configured twenty-second timeout", () => {
    const settings = normalizeSettings({
      modelThinkingTimeoutSeconds: 20,
      modelThinkingTimeoutCustomized: true
    });

    expect(settings.modelThinkingTimeoutSeconds).toBe(20);
    expect(settings.modelThinkingTimeoutCustomized).toBe(true);
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
});
