// Adapted from subdiox/video-downloader-extension (MIT). This module keeps
// YouTube-specific fetching isolated from ordinary HTTP/HLS/DASH downloads.
import { VideoPlaybackAbrRequest } from "googlevideo/protos";
import { Innertube, Platform } from "youtubei.js/web";
import {
  ALL_FORMATS,
  BlobSource,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  StreamTarget
} from "mediabunny";
import { evaluateYouTubePlayer } from "./sandboxBridge";

const RANGE_BYTES = 10 * 1024 * 1024;

export type YouTubeFormat = {
  url?: string;
  signature_cipher?: string;
  cipher?: string;
  width?: number;
  height?: number;
  bitrate?: number;
  content_length?: number;
  mime_type: string;
  has_audio: boolean;
  has_video: boolean;
  decipher(player?: unknown): Promise<string>;
};

type YouTubeInfo = {
  streaming_data?: { formats?: YouTubeFormat[]; adaptive_formats?: YouTubeFormat[] };
  playability_status?: { status?: string; reason?: string };
  basic_info: { title?: string; is_live?: boolean };
};

type YouTubeSession = { session: { player?: unknown } };

export function youtubeVideoId(pageUrl: string): string | undefined {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return undefined;
  }
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be" || host.endsWith(".youtu.be")) return url.pathname.split("/").filter(Boolean)[0];
  if (host !== "youtube.com" && !host.endsWith(".youtube.com")) return undefined;
  if (url.pathname === "/watch") return url.searchParams.get("v") || undefined;
  return url.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})/)?.[1];
}

export function chooseYouTubeFormats(info: YouTubeInfo): YouTubeFormat[] {
  const formats = [...(info.streaming_data?.formats ?? []), ...(info.streaming_data?.adaptive_formats ?? [])]
    .filter((format) => Boolean(format.url || format.signature_cipher || format.cipher));
  const resolution = (format: YouTubeFormat) => Math.min(format.width ?? 0, format.height ?? 0);
  const video = formats.filter((format) => format.has_video)
    .sort((left, right) => resolution(right) - resolution(left) || (right.bitrate ?? 0) - (left.bitrate ?? 0))[0];
  if (!video) throw new Error("YouTube did not provide a downloadable video track");
  if (video.has_audio) return [video];
  const audio = formats.filter((format) => format.has_audio && !format.has_video)
    .sort((left, right) => (right.bitrate ?? 0) - (left.bitrate ?? 0))[0];
  if (!audio) throw new Error("YouTube did not provide a downloadable audio track");
  return [video, audio];
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function poTokenFromBodies(bodies: string[]): string | undefined {
  let token: Uint8Array | undefined;
  for (const body of bodies) {
    try {
      const binary = atob(body);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const candidate = VideoPlaybackAbrRequest.decode(bytes).streamerContext?.poToken;
      if (candidate?.length && (!token || candidate.length > token.length)) token = candidate;
    } catch {
      // SABR request bodies may use a format unrelated to video playback.
    }
  }
  return token ? base64Url(token) : undefined;
}

function safeFilename(name: string): string {
  const base = name.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "YouTube video";
  return `${base.replace(/\.[a-z0-9]{1,8}$/i, "")}.mp4`;
}

async function contentLength(url: string, signal: AbortSignal): Promise<number> {
  const response = await fetch(url, { headers: { Range: "bytes=0-0" }, signal });
  const size = Number(response.headers.get("content-range")?.split("/")[1]);
  await response.body?.cancel();
  if (!response.ok || !size) throw new Error(`Could not determine YouTube track size (${response.status})`);
  return size;
}

async function waitForResume(wait: () => Promise<void>, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw new DOMException("Download cancelled", "AbortError");
  await wait();
  if (signal.aborted) throw new DOMException("Download cancelled", "AbortError");
}

async function downloadTrack(
  url: string,
  size: number,
  handle: FileSystemFileHandle,
  signal: AbortSignal,
  wait: () => Promise<void>,
  onBytes: (bytes: number) => void
): Promise<void> {
  const output = await handle.createWritable();
  try {
    for (let start = 0; start < size; start += RANGE_BYTES) {
      await waitForResume(wait, signal);
      const end = Math.min(start + RANGE_BYTES, size) - 1;
      const response = await fetch(url, { headers: { Range: `bytes=${start}-${end}` }, signal });
      if (!response.ok || (response.status !== 200 && response.status !== 206)) {
        throw new Error(`YouTube track request failed (${response.status})`);
      }
      const data = new Uint8Array(await response.arrayBuffer());
      await output.write(data);
      onBytes(data.byteLength);
    }
  } finally {
    await output.close();
  }
}

export type YouTubeDownloadOptions = {
  jobId: string;
  pageUrl: string;
  name: string;
  poBodies: string[];
  directory: FileSystemDirectoryHandle;
  signal: AbortSignal;
  waitForResume: () => Promise<void>;
  onProgress: (progress: number) => void;
};

export async function downloadYouTube(options: YouTubeDownloadOptions): Promise<{ file: string; filename: string }> {
  const videoId = youtubeVideoId(options.pageUrl);
  if (!videoId) throw new Error("Could not identify the YouTube video from this page");
  Platform.shim.eval = async (data) => evaluateYouTubePlayer(data.output) as Promise<unknown>;
  const poToken = poTokenFromBodies(options.poBodies);
  const youtube = await Innertube.create({
    po_token: poToken,
    retrieve_player: true,
    fetch: (input, init) => fetch(input, init)
  }) as unknown as YouTubeSession & { getBasicInfo(videoId: string, settings: { client: "MWEB" }): Promise<YouTubeInfo> };
  const info = await youtube.getBasicInfo(videoId, { client: "MWEB" });
  if (info.playability_status?.status !== "OK") {
    throw new Error(info.playability_status?.reason || "This YouTube video is not available for download");
  }
  if (info.basic_info.is_live) throw new Error("Live YouTube recording is not available yet");

  const formats = chooseYouTubeFormats(info);
  const urls = await Promise.all(formats.map((format) => format.decipher(youtube.session.player)));
  const sizes = await Promise.all(formats.map((format, index) =>
    Number(format.content_length) || contentLength(urls[index], options.signal)
  ));
  const total = sizes.reduce((sum, size) => sum + size, 0);
  let downloaded = 0;
  const partFiles: string[] = [];
  try {
    for (let index = 0; index < formats.length; index += 1) {
      const file = `${options.jobId}.youtube-${index}.part`;
      partFiles.push(file);
      const handle = await options.directory.getFileHandle(file, { create: true });
      await downloadTrack(urls[index], sizes[index], handle, options.signal, options.waitForResume, (bytes) => {
        downloaded += bytes;
        options.onProgress(total ? downloaded / total : 0);
      });
    }

    const file = `${options.jobId}.mp4`;
    const handle = await options.directory.getFileHandle(file, { create: true });
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: false }),
      target: new StreamTarget(await handle.createWritable(), { chunked: true })
    });
    const inputs = await Promise.all(partFiles.map(async (part) =>
      new Input({ source: new BlobSource(await (await options.directory.getFileHandle(part)).getFile()), formats: ALL_FORMATS })
    ));
    try {
      const conversions = await Promise.all(inputs.map((input) =>
        Conversion.init({ input, output, composable: true, showWarnings: false })
      ));
      await output.start();
      await Promise.all(conversions.map((conversion) => conversion.execute()));
      await output.finalize();
    } catch (error) {
      await output.cancel().catch(() => undefined);
      throw error;
    } finally {
      inputs.forEach((input) => input.dispose());
    }
    return { file, filename: safeFilename(info.basic_info.title || options.name) };
  } finally {
    await Promise.all(partFiles.map((part) => options.directory.removeEntry(part).catch(() => undefined)));
  }
}
