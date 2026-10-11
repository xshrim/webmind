import { Parser as HlsParser } from "m3u8-parser";
import { parse as parseMpd } from "mpd-parser";
import { createId } from "../shared/id";
import type {
  CapturedMediaTrack,
  MediaResource,
  MediaSubtitleTrack,
  MediaVariant
} from "../shared/types";

type HlsRendition = {
  groupId: string;
  name: string;
  url?: string;
  language?: string;
  isDefault: boolean;
};

type HlsSegment = {
  url: string;
  duration: number;
};

type CapturedRequest = {
  url: string;
  frameId: number;
  kind: "manifest" | "audio" | "video";
  mimeType?: string;
  bytes?: number;
  time: number;
};

function absolute(url: string, base: string): string {
  try { return new URL(url, base).href; } catch { return url; }
}

function parsedHls(text: string, url: string) {
  const parser = new HlsParser({ uri: url });
  parser.push(text);
  parser.end();
  return parser.manifest;
}

export function parseHlsManifest(text: string, manifestUrl: string) {
  const manifest = parsedHls(text, manifestUrl);
  const renditions: HlsRendition[] = Object.entries(manifest.mediaGroups?.AUDIO ?? {})
    .flatMap(([groupId, group]) => Object.entries(group).map(([name, item]) => ({
      groupId,
      name,
      url: item.uri ? absolute(item.uri, manifestUrl) : undefined,
      language: item.language || undefined,
      isDefault: item.default
    })));
  const subtitles = Object.entries(manifest.mediaGroups?.SUBTITLES ?? {})
    .flatMap(([groupId, group]) => Object.entries(group).map(([name, item]) => ({
      groupId,
      name,
      url: item.uri ? absolute(item.uri, manifestUrl) : undefined,
      language: item.language || undefined,
      isDefault: item.default
    })));
  const variants: MediaVariant[] = (manifest.playlists ?? []).map((playlist, index) => {
    const attrs = playlist.attributes;
    const resolution = attrs.RESOLUTION;
    const audio = renditions.find((item) => item.groupId === attrs.AUDIO && item.url) ??
      renditions.find((item) => item.isDefault && item.url);
    return {
      id: absolute(playlist.uri, manifestUrl) || `${manifestUrl}#${index}`,
      url: absolute(playlist.uri, manifestUrl),
      format: "mp4",
      width: resolution?.width,
      height: resolution?.height,
      bitrate: typeof attrs.BANDWIDTH === "number" ? attrs.BANDWIDTH : undefined,
      quality: resolution?.height ? `${resolution.height}p` : undefined,
      audioUrl: audio?.url,
      subtitleGroupId: typeof attrs.SUBTITLES === "string" ? attrs.SUBTITLES : undefined,
      requestUrls: [absolute(playlist.uri, manifestUrl)]
    };
  }).sort((left, right) => (right.height ?? 0) - (left.height ?? 0) || (right.bitrate ?? 0) - (left.bitrate ?? 0));
  const segments: HlsSegment[] = (manifest.segments ?? []).map((segment) => ({
    url: absolute(segment.uri, manifestUrl),
    duration: Number(segment.duration) || 0
  }));
  const segmentUrls = segments.map((segment) => segment.url);
  const duration = Number(manifest.totalDuration) ||
    segments.reduce((total, segment) => total + segment.duration, 0) || undefined;
  const isLive = !manifest.endList && manifest.playlistType !== "VOD";
  if (!variants.length) variants.push({ id: manifestUrl, url: manifestUrl, format: "mp4" });
  return { variants, audio: renditions, subtitles, segments, segmentUrls, duration, isLive };
}

function capturedBytes(url: string, captured: CapturedRequest[]): number | undefined {
  return captured.find((item) => item.url === url && item.bytes && item.bytes > 0)?.bytes;
}

function estimatedBytes(duration: number | undefined, bitrate: number | undefined): number | undefined {
  return duration && bitrate ? Math.round(duration * bitrate / 8) : undefined;
}

function sampleSegments(segments: HlsSegment[]): HlsSegment[] {
  return [...new Set([0, Math.floor(segments.length / 2), segments.length - 1])]
    .map((index) => segments[index])
    .filter((segment): segment is HlsSegment => Boolean(segment));
}

async function segmentBytes(url: string): Promise<number | undefined> {
  try {
    let response = await fetch(url, { method: "HEAD", credentials: "include" });
    let bytes = Number(response.headers.get("content-length")) || undefined;
    if (!response.ok || !bytes) {
      response = await fetch(url, {
        headers: { Range: "bytes=0-0" },
        credentials: "include"
      });
      bytes = Number(response.headers.get("content-range")?.split("/")[1]) ||
        Number(response.headers.get("content-length")) || undefined;
    }
    return bytes;
  } catch {
    return undefined;
  }
}

async function sampledHlsBitrate(segments: HlsSegment[], captured: CapturedRequest[]): Promise<number | undefined> {
  let bytes = 0;
  let duration = 0;
  for (const segment of sampleSegments(segments)) {
    const size = capturedBytes(segment.url, captured) ?? await segmentBytes(segment.url);
    if (!size || !segment.duration) continue;
    bytes += size;
    duration += segment.duration;
  }
  return duration > 0 ? Math.round(bytes * 8 / duration) : undefined;
}

function parseDuration(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== "string") return undefined;
  const match = value.match(/^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
  return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : undefined;
}

export function parseDashManifest(text: string, manifestUrl: string) {
  const manifest = parseMpd(text, { manifestUri: manifestUrl });
  const playlists = (manifest.playlists ?? []) as Array<{
    uri: string;
    attributes: Record<string, unknown>;
    contentProtection?: Record<string, unknown>;
    resolvedUri?: string;
    segments?: Array<{ resolvedUri?: string }>;
    sidx?: { resolvedUri?: string };
  }>;
  const audioGroups = Object.values(manifest.mediaGroups?.AUDIO ?? {}) as Array<Record<string, {
    default?: boolean;
    playlists?: Array<{ uri?: string; resolvedUri?: string; attributes?: Record<string, unknown> }>;
    uri?: string;
    language?: string;
  }>>;
  const audioPlaylists = audioGroups.flatMap((group) => Object.values(group))
    .flatMap((rendition) => rendition.playlists ?? [])
    .sort((left, right) => Number(right.attributes?.DEFAULT) - Number(left.attributes?.DEFAULT));
  const audio = audioPlaylists[0];
  const variants = playlists.map((playlist, index) => {
    const attrs = playlist.attributes;
      const resolution = attrs.RESOLUTION as { width?: number; height?: number } | undefined;
      const representationId = String(attrs.ID ?? attrs.NAME ?? attrs.BANDWIDTH ?? index);
    return {
      id: representationId,
      representationId,
      url: manifestUrl,
      format: "mp4",
      width: resolution?.width,
      height: resolution?.height,
      bitrate: Number(attrs.BANDWIDTH) || undefined,
      quality: resolution?.height ? `${resolution.height}p` : undefined,
      audioUrl: audio ? manifestUrl : undefined,
      audioRepresentationId: audio ? String(audio.attributes?.ID ?? "") || undefined : undefined,
      requestUrls: [playlist.resolvedUri, ...(playlist.segments ?? []).map((segment) => segment.resolvedUri)]
        .filter((url): url is string => Boolean(url))
    } satisfies MediaVariant;
  }).sort((left, right) => (right.height ?? 0) - (left.height ?? 0) || (right.bitrate ?? 0) - (left.bitrate ?? 0));
  const audioUris = new Set(audioPlaylists.map((playlist) => playlist.resolvedUri).filter(Boolean));
  const audioRepresentationIds = new Set(audioPlaylists.map((playlist) => String(
    playlist.attributes?.ID ?? playlist.attributes?.NAME ?? playlist.attributes?.BANDWIDTH ?? ""
  )));
  const videoVariants = variants.filter((variant) => {
    const playlist = playlists.find((item) => String(item.attributes.ID ?? item.attributes.NAME ?? item.attributes.BANDWIDTH) === variant.representationId);
    return !audioRepresentationIds.has(variant.representationId) &&
      (playlist?.resolvedUri ? !audioUris.has(playlist.resolvedUri) : true);
  });
  const audioOnly = audioPlaylists[0];
  const segments = playlists.flatMap((playlist) => [
    playlist.resolvedUri,
    ...(playlist.segments ?? []).map((segment) => segment.resolvedUri).filter((url): url is string => Boolean(url)),
    playlist.sidx?.resolvedUri
  ]).filter((url): url is string => Boolean(url));
  return {
    variants: videoVariants,
    audioOnly: audioOnly ? String(audioOnly.attributes?.ID ?? audioOnly.attributes?.NAME ?? "audio") : undefined,
    audioBitrate: Number(audioOnly?.attributes?.BANDWIDTH) || undefined,
    audioUrl: audio ? manifestUrl : undefined,
    audioRepresentationId: audio ? String(audio.attributes?.ID ?? audio.attributes?.NAME ?? "") || undefined : undefined,
    subtitles: [] as MediaSubtitleTrack[],
    duration: parseDuration(manifest.duration) || parseDuration(manifest.mediaPresentationDuration),
    isLive: manifest.endList !== true && manifest.type === "dynamic",
    segmentUrls: segments
  };
}

function pageName(resource: MediaResource): string {
  return resource.name.replace(/\.(?:m3u8|mpd|m4s)$/i, "").trim() || "media";
}

async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(url, {
    credentials: "include",
    ...(signal ? { signal } : {})
  });
  if (!response.ok) throw new Error(`Manifest request failed (${response.status})`);
  return response.text();
}

function hlsSubtitleTracks(renditions: HlsRendition[]): MediaSubtitleTrack[] {
  return renditions.filter((item) => item.url).map((item) => ({
    id: item.url!,
    name: item.name,
    url: item.url!,
    format: "vtt",
    language: item.language,
    groupId: item.groupId,
    streamType: "hls"
  }));
}

function capturedManifestFormat(item: CapturedRequest): "m3u8" | "mpd" | null {
  const pathname = new URL(item.url).pathname.toLowerCase();
  if (/\.m3u8$/.test(pathname) || /mpegurl/.test(item.mimeType ?? "")) return "m3u8";
  if (/\.mpd$/.test(pathname) || /dash\+xml/.test(item.mimeType ?? "")) return "mpd";
  return null;
}

function capturedManifestResources(
  resources: MediaResource[],
  captured: CapturedRequest[]
): MediaResource[] {
  const known = new Set(resources.map((resource) => resource.url));
  const pageVideo = resources.find((resource) => resource.kind === "video" && /^blob:/i.test(resource.url)) ||
    resources.find((resource) => resource.kind === "video");
  const name = pageVideo?.name || "media";
  return captured.flatMap((item) => {
    const format = item.kind === "manifest" ? capturedManifestFormat(item) : null;
    if (!format || known.has(item.url)) return [];
    known.add(item.url);
    return [{
      id: createId("media-manifest"),
      kind: "video" as const,
      name,
      url: item.url,
      format,
      mimeType: item.mimeType,
      width: pageVideo?.width,
      height: pageVideo?.height,
      duration: pageVideo?.duration,
      bytes: item.bytes,
      detail: "Captured media manifest",
      frameId: item.frameId
    }];
  });
}

function attachCapturedTracks(resources: MediaResource[], captured: CapturedRequest[]): MediaResource[] {
  const known = new Set(resources.map((resource) => resource.url));
  const output = resources.map((resource) => {
    if (resource.kind !== "video" || !/^blob:/i.test(resource.url)) return resource;
    const candidates: CapturedMediaTrack[] = captured
      .filter((item): item is CapturedRequest & { kind: "audio" | "video" } =>
        item.kind !== "manifest" && item.frameId === (resource.frameId ?? 0)
      )
      .slice(0, 12)
      .map((item) => ({
      url: item.url,
      kind: item.kind,
      mimeType: item.mimeType,
      bytes: item.bytes,
      frameId: item.frameId
    }));
    return candidates.length ? { ...resource, capturedTracks: candidates, isComposite: true } : resource;
  });
  for (const item of captured) {
    if (item.kind === "manifest" || known.has(item.url)) continue;
    const extension = new URL(item.url).pathname.match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase();
    const kind = item.kind;
    const format = extension || formatFromMime(item.mimeType, kind);
    if (!format) continue;
    if (extension === "m4s") continue;
    output.push({
      id: createId("media-captured"),
      kind,
      name: resources.find((resource) => resource.kind === "video")?.name || "media",
      url: item.url,
      format,
      mimeType: item.mimeType,
      bytes: item.bytes,
      detail: "Captured from page network requests",
      frameId: item.frameId
    });
    known.add(item.url);
  }
  return output;
}

function isStreamSegment(url: string): boolean {
  try {
    return /\.(?:m4s|ts)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function formatFromMime(mimeType: string | undefined, kind: "audio" | "video"): string | undefined {
  const subtype = mimeType?.split("/", 2)[1]?.split(";", 1)[0].trim().toLowerCase();
  if (!subtype || ["octet-stream", "binary", "x-download"].includes(subtype)) return undefined;
  if (subtype === "mpeg") return kind === "audio" ? "mp3" : "mpeg";
  if (subtype === "mp4") return kind === "audio" ? "m4a" : "mp4";
  return { "ogg": "ogg", "webm": "webm", "aac": "aac", "wav": "wav", "flac": "flac" }[subtype];
}

export async function inspectStreamingResources(
  resources: MediaResource[],
  _referer: string,
  captured: CapturedRequest[] = []
): Promise<MediaResource[]> {
  const output: MediaResource[] = [];
  const childManifests = new Set<string>();
  const streamSegments = new Set<string>();
  for (const resource of [...resources, ...capturedManifestResources(resources, captured)]) {
    const format = resource.format.toLowerCase();
    if (format !== "m3u8" && format !== "mpd") {
      output.push({ ...resource, bytes: capturedBytes(resource.url, captured) ?? resource.bytes });
      continue;
    }
    try {
      const text = await fetchText(resource.url);
      if (format === "m3u8") {
        const parsed = parseHlsManifest(text, resource.url);
        parsed.segmentUrls.forEach((url) => streamSegments.add(url));
        const playlistUrls = [...new Set([
          ...parsed.variants.map((variant) => variant.url),
          ...parsed.audio.map((rendition) => rendition.url)
        ].filter((url): url is string => Boolean(url) && url !== resource.url))];
        const childPlaylists = new Map<string, ReturnType<typeof parseHlsManifest>>();
        await Promise.all(playlistUrls.slice(0, 32).map(async (url) => {
          childManifests.add(url);
          try {
            const child = parseHlsManifest(await fetchText(url), url);
            child.segmentUrls.forEach((segment) => streamSegments.add(segment));
            childPlaylists.set(url, child);
          } catch {
            // Keep the master manifest usable when a non-selected rendition is unavailable.
          }
        }));
        const firstChild = parsed.variants
          .map((variant) => childPlaylists.get(variant.url))
          .find(Boolean);
        const live = firstChild?.isLive ?? parsed.isLive;
        const duration = parsed.duration || firstChild?.duration;
        // A media playlist has no EXT-X-STREAM-INF resolution metadata, but can
        // still contain multiplexed video and audio TS segments.
        const audioOnly = resource.kind === "audio";
        const variants = await Promise.all(parsed.variants.map(async (variant) => {
          const child = childPlaylists.get(variant.url);
          const variantDuration = child?.duration || duration;
          const bitrate = variant.bitrate || await sampledHlsBitrate(child?.segments ?? parsed.segments, captured);
          return {
            ...variant,
            width: variant.width ?? resource.width,
            height: variant.height ?? resource.height,
            quality: variant.quality ?? (resource.height ? `${resource.height}p` : undefined),
            bitrate,
            bytes: estimatedBytes(variantDuration, bitrate),
            format: audioOnly ? "m4a" : "mp4",
            requestUrls: [...new Set([variant.url, ...(child?.segmentUrls ?? [])])]
          };
        }));
        const subtitles = hlsSubtitleTracks(parsed.subtitles);
        output.push({
          ...resource,
          kind: audioOnly ? "audio" : "video",
          name: pageName(resource),
          format: audioOnly ? "m4a" : "mp4",
          mimeType: audioOnly ? "audio/mp4" : "video/mp4",
          manifestUrl: resource.url,
          streamType: "hls",
          requestUrls: [...new Set([
            resource.url,
            ...variants.flatMap((variant) => variant.requestUrls ?? []),
            ...parsed.audio.flatMap((rendition) => [
              rendition.url,
              ...(childPlaylists.get(rendition.url ?? "")?.segmentUrls ?? [])
            ]),
            ...parsed.segmentUrls
          ].filter((url): url is string => Boolean(url)))],
          variants,
          bytes: variants[0]?.bytes,
          duration: resource.duration || duration,
          isLive: live,
          audioUrl: variants[0]?.audioUrl,
          subtitles
        });
        // Independent HLS audio renditions are not visible DOM media elements.
        // Expose them so they can be inspected and downloaded on their own.
        if (!audioOnly) {
          for (const rendition of parsed.audio) {
            if (!rendition.url) continue;
            const playlist = childPlaylists.get(rendition.url);
            const audioDuration = playlist?.duration || duration;
            const bitrate = await sampledHlsBitrate(playlist?.segments ?? [], captured);
            output.push({
              id: createId("media-hls-audio"),
              kind: "audio",
              name: `${pageName(resource)}${rendition.name ? ` - ${rendition.name}` : ""}`,
              url: rendition.url,
              format: "m4a",
              mimeType: "audio/mp4",
              manifestUrl: rendition.url,
              streamType: "hls",
              requestUrls: [...new Set([
                rendition.url,
                ...(playlist?.segmentUrls ?? [])
              ])],
              duration: audioDuration,
              bytes: estimatedBytes(audioDuration, bitrate),
              isLive: playlist?.isLive ?? live
            });
          }
        }
      } else {
        const parsed = parseDashManifest(text, resource.url);
        parsed.segmentUrls.forEach((url) => streamSegments.add(url));
        const videos = parsed.variants.filter((item) => Boolean(item.height));
        const video = videos[0];
        const duration = resource.duration || parsed.duration;
        if (video) {
          const variants = videos.map((variant) => ({
            ...variant,
            bytes: estimatedBytes(duration, variant.bitrate)
          }));
          output.push({
            ...resource,
            kind: "video",
            name: pageName(resource),
            format: "mp4",
            mimeType: "video/mp4",
            manifestUrl: resource.url,
            streamType: "dash",
            requestUrls: [...new Set(parsed.segmentUrls)],
            representationId: video.representationId,
            audioRepresentationId: parsed.audioRepresentationId,
            audioUrl: parsed.audioUrl,
            width: video.width,
            height: video.height,
            duration,
            isLive: parsed.isLive,
            variants,
            bytes: variants[0]?.bytes
          });
        } else if (parsed.audioOnly) {
          output.push({
            ...resource,
            kind: "audio",
            name: pageName(resource),
            format: "m4a",
            mimeType: "audio/mp4",
            manifestUrl: resource.url,
            streamType: "dash",
            requestUrls: [...new Set(parsed.segmentUrls)],
            representationId: parsed.audioOnly,
            duration,
            bytes: estimatedBytes(duration, parsed.audioBitrate),
            isLive: parsed.isLive
          });
        } else {
          throw new Error("DASH manifest contains no downloadable audio or video representation");
        }
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      output.push({
        ...resource,
        streamType: format === "mpd" ? "dash" : "hls",
        processingError: detail
      });
    }
  }
  const withoutSegments = output.filter((resource) =>
    !streamSegments.has(resource.url) &&
    !isStreamSegment(resource.url) &&
    (!childManifests.has(resource.url) || (resource.kind === "audio" && resource.streamType === "hls"))
  );
  const merged = attachCapturedTracks(withoutSegments, captured);
  const hasPlayableVideoStream = merged.some(
    (resource) => resource.kind === "video" && resource.streamType && !resource.processingError
  );
  return hasPlayableVideoStream
    ? merged.filter((resource) => !(resource.kind === "video" && /^blob:/i.test(resource.url)))
    : merged;
}

export async function downloadStreamingMedia(
  resource: MediaResource,
  name: string,
  referer: string,
  signal?: AbortSignal,
  tabId?: number
): Promise<void> {
  if (signal?.aborted) throw new Error("Download cancelled");
  const jobId = createId("media-job");
  return new Promise<void>(async (resolve, reject) => {
    let settled = false;
    const finish = (error?: string) => {
      if (settled) return;
      settled = true;
      chrome.runtime.onMessage.removeListener(onMessage);
      signal?.removeEventListener("abort", stop);
      error ? reject(new Error(error)) : resolve();
    };
    const onMessage = (message: { type?: string; jobId?: string; error?: string }) => {
      if (message?.type !== "media.stream.result" || message.jobId !== jobId) return;
      finish(message.error);
    };
    const stop = () => {
      void chrome.runtime.sendMessage({ type: "media.stream.stop", payload: { jobId } });
      finish("Download cancelled");
    };
    chrome.runtime.onMessage.addListener(onMessage);
    signal?.addEventListener("abort", stop, { once: true });
    try {
      const response = await chrome.runtime.sendMessage({
        type: isYouTubeVideo(referer, resource) ? "media.youtube.start" : "media.stream.start",
        payload: isYouTubeVideo(referer, resource)
          ? { jobId, pageUrl: referer, name, tabId, resourceId: resource.id }
          : { jobId, resource, name, referer, tabId, resourceId: resource.id }
      });
      if (!response?.ok) finish(response?.error || "Could not start media processing");
      else if (signal?.aborted) stop();
    } catch (error) {
      finish(error instanceof Error ? error.message : String(error));
    }
  });
}

function isYouTubeVideo(pageUrl: string, resource: MediaResource): boolean {
  if (resource.kind !== "video") return false;
  try {
    const host = new URL(pageUrl).hostname.toLowerCase();
    return host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
  } catch {
    return false;
  }
}
