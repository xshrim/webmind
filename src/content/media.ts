import type { MediaResource, MediaResourceKind } from "../shared/types";
import { createId } from "../shared/id";

let cachedResources: MediaResource[] = [];

function absoluteUrl(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new URL(value, location.href).href;
  } catch {
    return "";
  }
}

function fileName(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    const value = decodeURIComponent(pathname.split("/").pop() ?? "").trim();
    return value && !/^blob$|^data$/i.test(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function isGenericMediaName(value: string): boolean {
  return /^original(?:\.[a-z0-9]{1,8})?$/i.test(value.trim());
}

function pageTitleFallback(kind: MediaResourceKind): string {
  return document.title.trim() || kind;
}

function nameFromUrl(url: string, kind: MediaResourceKind): string {
  const candidate = fileName(url, "");
  if (isGenericMediaName(candidate) || /\.(?:m4s|m3u8|mpd)$/i.test(candidate)) return pageTitleFallback(kind);
  return /\.[a-z0-9]{1,8}$/i.test(candidate) ? candidate : pageTitleFallback(kind);
}

function numberAttribute(element: Element, name: string): number | undefined {
  const value = Number(element.getAttribute(name));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function resourceName(element: Element, url: string, kind: MediaResourceKind): string {
  const label = [
    element.getAttribute("alt"),
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.getAttribute("download")
  ].find((value) => value?.trim());
  if (label?.trim() && !isGenericMediaName(label)) return label.trim();
  return nameFromUrl(url, kind);
}

function mediaFormat(
  url: string,
  mimeType: string | undefined,
  kind: MediaResourceKind
): string {
  const pathname = url.split(/[?#]/, 1)[0];
  const extension = pathname.match(/\.([a-z0-9]{1,8})$/i)?.[1];
  if (extension) return extension.toLowerCase();
  const subtype = mimeType?.split("/", 2)[1]?.split(";", 1)[0].trim();
  if (subtype) {
    const normalized = subtype.toLowerCase();
    if (["octet-stream", "binary", "x-download"].includes(normalized)) return kind;
    const aliases: Record<string, string> = {
      jpeg: "jpg",
      "svg+xml": "svg",
      mpeg: kind === "audio" ? "mp3" : "mpeg",
      mp4: kind === "audio" ? "m4a" : "mp4",
      quicktime: "mov",
      "x-matroska": "mkv",
      "x-msvideo": "avi",
      "x-mpegurl": "m3u8",
      "vnd.apple.mpegurl": "m3u8",
      "dash+xml": "mpd"
    };
    return aliases[normalized] || normalized;
  }
  return kind;
}

function filenameFormat(value: string | null | undefined): string {
  const match = value?.match(/\.([a-z0-9]{1,8})(?:[?#]|$)/i);
  return match?.[1]?.toLowerCase() || "";
}

function contentDispositionFilename(value: string | null): string {
  if (!value) return "";
  const encoded = value.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.replace(/^"|"$/g, ""));
    } catch {
      return encoded.replace(/^"|"$/g, "");
    }
  }
  return value.match(/filename\s*=\s*"([^"]+)"/i)?.[1] ||
    value.match(/filename\s*=\s*([^;]+)/i)?.[1]?.trim() || "";
}

function sourceTypeFor(
  element: Element,
  url: string,
  rawUrl: string
): string | undefined {
  const ownType = element.getAttribute("type") || undefined;
  if (ownType || !(element instanceof HTMLMediaElement)) return ownType;
  const source = Array.from(element.querySelectorAll("source")).find((item) => {
    const sourceUrl = absoluteUrl(item.getAttribute("src"));
    return sourceUrl === url || item.getAttribute("src") === rawUrl;
  });
  return (
    source?.getAttribute("type") ||
    element.querySelector("source[type]")?.getAttribute("type") ||
    undefined
  );
}

function timingBytes(url: string): number | undefined {
  const entry = performance
    .getEntriesByName(url)
    .find((item): item is PerformanceResourceTiming =>
      "transferSize" in item
    );
  return entry?.encodedBodySize || entry?.decodedBodySize || entry?.transferSize || undefined;
}

function kindFromResourceUrl(url: string, initiatorType: string): MediaResourceKind | null {
  const pathname = url.split(/[?#]/, 1)[0].toLowerCase();
  if (initiatorType === "track" || /\.(?:srt|vtt|ttml)$/.test(pathname)) {
    return "subtitle";
  }
  if (initiatorType === "img" || /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)$/.test(pathname)) {
    return "image";
  }
  if (initiatorType === "audio" || /\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav)$/.test(pathname)) {
    return "audio";
  }
  if (/\.(?:m4s)$/.test(pathname)) {
    if (/[?&](?:mime|type)=audio(?:%2f|\/)/.test(url.toLowerCase())) return "audio";
    if (/(?:audio|sound|30216|30232)(?:[-_.]|$)/.test(pathname)) return "audio";
    return "video";
  }
  if (
    initiatorType === "video" ||
    /\.(?:3gp|m4v|mkv|mov|mp4|mpeg|mpg|ogv|webm|m3u8|mpd|ts|f4v)$/.test(pathname)
  ) {
    return "video";
  }
  return null;
}

function addResource(
  resources: Map<string, MediaResource>,
  element: Element,
  kind: MediaResourceKind,
  rawUrl: string
): void {
  const url = absoluteUrl(rawUrl);
  if (!url || url.startsWith("javascript:") || url.startsWith("about:")) return;
  const key = `${kind}:${url}`;
  if (resources.has(key)) return;
  const media = element as HTMLMediaElement;
  const mimeType = sourceTypeFor(element, url, rawUrl);
  const resource: MediaResource = {
    id: createId("media"),
    kind,
    name: resourceName(element, url, kind),
    url,
    format: mediaFormat(url, mimeType, kind),
    mimeType,
    width:
      element instanceof HTMLImageElement
        ? element.naturalWidth || numberAttribute(element, "width")
        : element instanceof HTMLVideoElement
          ? element.videoWidth || numberAttribute(element, "width")
          : undefined,
    height:
      element instanceof HTMLImageElement
        ? element.naturalHeight || numberAttribute(element, "height")
        : element instanceof HTMLVideoElement
          ? element.videoHeight || numberAttribute(element, "height")
          : undefined,
    duration:
      (element instanceof HTMLAudioElement || element instanceof HTMLVideoElement) &&
      Number.isFinite(element.duration) &&
      element.duration > 0
        ? element.duration
        : undefined,
    bytes: timingBytes(url),
    detail: mimeType,
    frameId: 0
  };
  resources.set(key, resource);
}

export function detectMediaResources(): MediaResource[] {
  const resources = new Map<string, MediaResource>();
  document.querySelectorAll("img").forEach((element) => {
    addResource(resources, element, "image", element.currentSrc || element.src);
  });
  document.querySelectorAll("audio, video").forEach((element) => {
    const media = element as HTMLMediaElement;
    addResource(resources, element, element.tagName.toLowerCase() as "audio" | "video", media.currentSrc || media.src);
  });
  document.querySelectorAll("audio source, video source").forEach((element) => {
    const parent = element.parentElement;
    const kind = parent?.tagName.toLowerCase();
    if (kind === "audio" || kind === "video") {
      addResource(resources, element, kind, element.getAttribute("src") ?? "");
    }
  });
  performance.getEntriesByType("resource").forEach((entry) => {
    if (!(entry instanceof PerformanceResourceTiming)) return;
    const kind = kindFromResourceUrl(entry.name, entry.initiatorType);
    if (!kind) return;
    const key = `${kind}:${entry.name}`;
    if (resources.has(key)) return;
    const manifest = /\.(?:m3u8|mpd)(?:[?#]|$)/i.test(entry.name);
    resources.set(key, {
      id: createId("media"),
      kind,
      name: nameFromUrl(entry.name, kind),
      url: entry.name,
      format: mediaFormat(entry.name, undefined, kind),
      bytes: entry.encodedBodySize || entry.decodedBodySize || entry.transferSize || undefined,
      detail: manifest ? "HLS/DASH manifest" : undefined,
      frameId: 0
    });
  });
  cachedResources = Array.from(resources.values());
  return cachedResources;
}

export function cachedMediaResources(): MediaResource[] {
  return cachedResources;
}

export async function downloadPageMedia(url: string, name: string): Promise<boolean> {
  if (!/^(?:https?|blob|data):/i.test(url)) return false;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  (document.body ?? document.documentElement).append(anchor);
  anchor.click();
  anchor.remove();
  return true;
}

export interface MediaPreview {
  dataUrl: string;
  mimeType?: string;
  format?: string;
}

export async function previewPageMedia(
  url: string,
  kind: MediaResourceKind
): Promise<MediaPreview | null> {
  try {
    if (/^data:/i.test(url)) {
      const mimeType = url.slice(5, url.indexOf(",")).split(";", 1)[0] || undefined;
      return { dataUrl: url, mimeType, format: mediaFormat("", mimeType, kind) };
    }
    if (!/^blob:/i.test(url)) {
      const response = await fetch(url, {
        method: "HEAD",
        credentials: "include"
      });
      const mimeType = response.headers.get("content-type")?.split(";", 1)[0] || undefined;
      return mimeType
        ? { dataUrl: "", mimeType, format: mediaFormat(url, mimeType, kind) }
        : null;
    }
    const response = await fetch(url);
    if (!response.ok) return null;
    const responseMimeType = response.headers.get("content-type")?.split(";", 1)[0] || "";
    const blob = await response.blob();
    const blobMimeType = blob.type || responseMimeType || undefined;
    const blobKind: MediaResourceKind = blobMimeType?.startsWith("audio/")
      ? "audio"
      : blobMimeType?.startsWith("video/")
        ? "video"
        : kind;
    if (!blob.size) return null;
    if (blob.size > 64 * 1024 * 1024) {
      return {
        dataUrl: "",
        mimeType: blobMimeType,
        format: mediaFormat("", blobMimeType, blobKind)
      };
    }
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    return {
      dataUrl,
      mimeType: blobMimeType,
      format: mediaFormat("", blobMimeType, blobKind)
    };
  } catch {
    return null;
  }
}

export interface MediaProbe {
  mimeType?: string;
  format?: string;
  name?: string;
  bytes?: number;
}

export async function probePageMedia(
  url: string,
  kind: MediaResourceKind
): Promise<MediaProbe | null> {
  if (!url || /^blob:|^data:/i.test(url)) return null;
  try {
    const response = await fetch(url, {
      method: "HEAD",
      credentials: "include",
      redirect: "follow"
    });
    const mimeType = response.headers.get("content-type")?.split(";", 1)[0] || undefined;
    const headerName = contentDispositionFilename(response.headers.get("content-disposition"));
    const format = filenameFormat(headerName) || mediaFormat(url, mimeType, kind);
    const bytes = Number(response.headers.get("content-length")) || undefined;
    return {
      mimeType,
      format: format === kind ? undefined : format,
      name: headerName || undefined,
      bytes
    };
  } catch {
    return null;
  }
}
