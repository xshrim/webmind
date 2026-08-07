import type {
  AppSettings,
  ModelPurpose,
  ProviderProfile
} from "./types";

export function profileForPurpose(
  settings: AppSettings,
  purpose: ModelPurpose = "default",
  requestedProfileId?: string
): ProviderProfile | null {
  const byId = (profileId?: string | null) =>
    profileId
      ? settings.profiles.find((profile) => profile.id === profileId) ?? null
      : null;

  if (purpose === "translation") {
    return (
      byId(settings.translationProfileId) ??
      byId(settings.defaultProfileId) ??
      byId(settings.activeProfileId)
    );
  }
  if (purpose === "vision") {
    return (
      byId(settings.visionProfileId) ??
      byId(settings.defaultProfileId) ??
      byId(settings.activeProfileId)
    );
  }
  return byId(requestedProfileId) ?? byId(settings.activeProfileId);
}

export function modelPurposeForToolId(toolId?: string): ModelPurpose {
  if (toolId === "translate-text" || toolId === "translate-document") {
    return "translation";
  }
  if (toolId === "analyze-image") return "vision";
  return "default";
}
