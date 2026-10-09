import type { MediaResource, MediaResourceKind } from "../shared/types";

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
    return value || fallback;
  } catch {
    return fallback;
  }
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
  return label?.trim() || fileName(url, kind);
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
  if (initiatorType === "img" || /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)$/.test(pathname)) {
    return "image";
  }
  if (initiatorType === "audio" || /\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav)$/.test(pathname)) {
    return "audio";
  }
  if (
    initiatorType === "video" ||
    /\.(?:3gp|m4v|mkv|mov|mp4|mpeg|mpg|ogv|webm|m3u8|mpd)$/.test(pathname)
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
  const resource: MediaResource = {
    id: crypto.randomUUID(),
    kind,
    name: resourceName(element, url, kind),
    url,
    mimeType: element.getAttribute("type") || undefined,
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
    detail: element instanceof HTMLMediaElement ? element.getAttribute("type") || undefined : undefined
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
      id: crypto.randomUUID(),
      kind,
      name: fileName(entry.name, kind),
      url: entry.name,
      bytes: entry.encodedBodySize || entry.decodedBodySize || entry.transferSize || undefined,
      detail: manifest ? "HLS/DASH manifest" : undefined
    });
  });
  cachedResources = Array.from(resources.values());
  return cachedResources;
}

export function cachedMediaResources(): MediaResource[] {
  return cachedResources;
}

export function downloadPageMedia(url: string, name: string): boolean {
  if (!/^blob:|^data:/i.test(url)) return false;
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
