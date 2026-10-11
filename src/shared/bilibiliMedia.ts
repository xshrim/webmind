import { createId } from "./id";
import type { MediaResource, MediaVariant } from "./types";

export interface BilibiliDashInfo {
  title: string;
  duration?: number;
  video: MediaVariant[];
  audio: MediaVariant[];
}

function estimatedBytes(bytes: number | undefined, duration: number | undefined, bitrate: number | undefined): number | undefined {
  return bytes ?? (duration && bitrate ? Math.round(duration * bitrate / 8) : undefined);
}

export function createBilibiliMediaResource(
  resources: MediaResource[],
  dash: BilibiliDashInfo
): MediaResource[] {
  const sortedVariants = [...dash.video].sort(
    (left, right) =>
      (right.height ?? 0) - (left.height ?? 0) ||
      (right.bitrate ?? 0) - (left.bitrate ?? 0)
  );
  const seenResolutions = new Set<string>();
  const variants = sortedVariants.map((variant) => ({
    ...variant,
    bytes: estimatedBytes(
      variant.bytes ?? resources.find((item) => item.url === variant.url)?.bytes,
      dash.duration,
      variant.bitrate
    )
  })).filter((variant) => {
    const resolution = variant.height
      ? `${variant.width ?? 0}x${variant.height}`
      : variant.quality || variant.url;
    if (seenResolutions.has(resolution)) return false;
    seenResolutions.add(resolution);
    return true;
  });
  const audioVariants = [...dash.audio]
    .filter((variant, index, source) =>
      Boolean(variant.url) && source.findIndex((item) => item.url === variant.url) === index
    )
    .map((variant) => ({
      ...variant,
      bytes: estimatedBytes(
        variant.bytes ?? resources.find((item) => item.url === variant.url)?.bytes,
        dash.duration,
        variant.bitrate
      )
    }))
    .sort((left, right) => (right.bitrate ?? 0) - (left.bitrate ?? 0));
  if (!variants.length || !audioVariants.length) return resources;
  const preferred = variants[0];
  const preferredAudio = audioVariants[0];
  const video: MediaResource = {
    id: createId("media-bili"),
    kind: "video",
    name: dash.title.trim() || "video",
    url: preferred.url,
    format: "mp4",
    mimeType: preferred.mimeType || "video/mp4",
    width: preferred.width,
    height: preferred.height,
    duration: dash.duration,
    bytes: preferred.bytes,
    detail: "Bilibili DASH",
    variants,
    audioUrl: preferredAudio.url,
    isComposite: true
  };
  const audio: MediaResource = {
    id: createId("media-bili-audio"),
    kind: "audio",
    name: dash.title.trim() || "audio",
    url: preferredAudio.url,
    format: "m4a",
    mimeType: preferredAudio.mimeType || "audio/mp4",
    duration: dash.duration,
    bytes: preferredAudio.bytes,
    detail: "Bilibili DASH",
    variants: audioVariants,
    isComposite: true
  };
  const isPlayerResource = (item: MediaResource): boolean => {
    if (item.kind === "image") return false;
    if (/^blob:/i.test(item.url) || /\.m4s(?:[?#]|$)/i.test(item.url)) return true;
    try {
      return /(?:^|\.)bilivideo\.(?:com|cn)$/i.test(new URL(item.url).hostname);
    } catch {
      return false;
    }
  };
  return [video, audio, ...resources.filter((item) => !isPlayerResource(item))];
}
