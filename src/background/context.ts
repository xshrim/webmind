import { uiText } from "../shared/i18n";
import type { AppLanguage, PageContext } from "../shared/types";
import { truncateText } from "../shared/utils";

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name?: { simpleText?: string; runs?: Array<{ text?: string }> };
  kind?: string;
}

function findJsonObject(source: string, marker: string): string | null {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = source.indexOf("{", markerIndex + marker.length);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}

function timestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function trackName(track: CaptionTrack): string {
  return (
    track.name?.simpleText ??
    track.name?.runs?.map((run) => run.text ?? "").join("") ??
    track.languageCode
  );
}

export async function fetchYouTubeTranscript(
  pageUrl: string,
  preferredLanguage?: string,
  interfaceLanguage?: AppLanguage
): Promise<PageContext> {
  const response = await fetch(pageUrl, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`${uiText(interfaceLanguage, "readUrlFailed")} (${response.status})`);
  }
  const html = await response.text();
  const jsonText =
    findJsonObject(html, "ytInitialPlayerResponse") ??
    findJsonObject(html, '"playerResponse":');
  if (!jsonText) throw new Error(uiText(interfaceLanguage, "videoInfoNotFound"));
  const playerResponse = JSON.parse(jsonText);
  const tracks: CaptionTrack[] =
    playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks ??
    [];
  if (!tracks.length) throw new Error(uiText(interfaceLanguage, "noCaptionsAvailable"));
  const preferred = preferredLanguage?.toLowerCase();
  const track =
    tracks.find((item) => item.languageCode.toLowerCase() === preferred) ??
    tracks.find((item) => item.languageCode.toLowerCase().startsWith(preferred ?? "")) ??
    tracks.find((item) => item.kind !== "asr") ??
    tracks[0];
  const captionsUrl = new URL(track.baseUrl);
  captionsUrl.searchParams.set("fmt", "json3");
  const captionsResponse = await fetch(captionsUrl, { credentials: "include" });
  if (!captionsResponse.ok) {
    throw new Error(`${uiText(interfaceLanguage, "captionsReadFailed")} (${captionsResponse.status})`);
  }
  const captions = await captionsResponse.json();
  const lines = (captions.events ?? [])
    .filter((event: { segs?: unknown[] }) => Array.isArray(event.segs))
    .map(
      (event: {
        tStartMs?: number;
        segs: Array<{ utf8?: string }>;
      }) => {
        const text = event.segs
          .map((segment) => segment.utf8 ?? "")
          .join("")
          .replace(/\s+/g, " ")
          .trim();
        return text ? `[${timestamp(event.tStartMs ?? 0)}] ${text}` : "";
      }
    )
    .filter(Boolean)
    .join("\n");
  const title =
    playerResponse.videoDetails?.title ?? new URL(pageUrl).searchParams.get("v");
  return {
    kind: "youtube",
    title: title || uiText(interfaceLanguage, "youtubeVideoTitle"),
    url: pageUrl,
    language: track.languageCode,
    description: `${uiText(interfaceLanguage, "captionsLabel")}：${trackName(track)}`,
    text: truncateText(lines, 120000, interfaceLanguage)
  };
}
