import { describe, expect, it } from "vitest";
import { createProviderProfile, DEFAULT_SETTINGS } from "./defaults";
import { modelPurposeForToolId, profileForPurpose } from "./models";

const defaultProfile = createProviderProfile("openai-compatible", {
  id: "default"
});
const translationProfile = createProviderProfile("ollama", {
  id: "translation"
});
const visionProfile = createProviderProfile("gemini", { id: "vision" });

function settings() {
  return {
    ...DEFAULT_SETTINGS,
    profiles: [defaultProfile, translationProfile, visionProfile],
    activeProfileId: defaultProfile.id,
    translationProfileId: translationProfile.id,
    visionProfileId: visionProfile.id
  };
}

describe("model role routing", () => {
  it("selects the model assigned to each purpose", () => {
    expect(profileForPurpose(settings(), "default")?.id).toBe("default");
    expect(profileForPurpose(settings(), "translation")?.id).toBe("translation");
    expect(profileForPurpose(settings(), "vision")?.id).toBe("vision");
  });

  it("falls back specialized purposes to the default model", () => {
    const value = {
      ...settings(),
      translationProfileId: null,
      visionProfileId: null
    };

    expect(profileForPurpose(value, "translation")?.id).toBe("default");
    expect(profileForPurpose(value, "vision")?.id).toBe("default");
  });

  it("uses the current model when no dedicated or default role is set", () => {
    const value = {
      ...settings(),
      defaultProfileId: null,
      translationProfileId: null,
      visionProfileId: null
    };

    expect(profileForPurpose(value, "translation")?.id).toBe("default");
    expect(profileForPurpose(value, "vision")?.id).toBe("default");
  });

  it("honors an explicit model only for regular requests", () => {
    expect(profileForPurpose(settings(), "default", "translation")?.id).toBe(
      "translation"
    );
    expect(
      profileForPurpose(settings(), "translation", "vision")?.id
    ).toBe("translation");
  });

  it("maps built-in specialized tools to model purposes", () => {
    expect(modelPurposeForToolId("translate-text")).toBe("translation");
    expect(modelPurposeForToolId("translate-document")).toBe("translation");
    expect(modelPurposeForToolId("analyze-image")).toBe("vision");
    expect(modelPurposeForToolId("summary")).toBe("default");
  });
});
