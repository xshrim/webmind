import {
  ALL_FORMATS,
  Conversion,
  ConversionCanceledError,
  HLS_FORMATS,
  Input,
  Logging,
  LogLevel,
  Mp4OutputFormat,
  Output,
  StreamTarget,
  TextSubtitleSource,
  UrlSource,
  type InputAudioTrack,
  type InputTrack,
  type InputVideoTrack
} from "mediabunny";
import type { CapturedMediaTrack, MediaResource, MediaVariant } from "../shared/types";
import type { MediaSubtitleTrack } from "../shared/types";
import { Parser as HlsParser } from "m3u8-parser";
import { dashSource } from "./dashSource";
import { downloadYouTube } from "./youtube";

type JobMessage = {
  jobId: string;
  resource: MediaResource;
  name: string;
  referer: string;
  resourceId: string;
};

type YouTubeJobMessage = {
  jobId: string;
  pageUrl: string;
  name: string;
  resourceId: string;
  poBodies: string[];
};

type DirectFileJobMessage = {
  jobId: string;
  url: string;
  name: string;
  resourceId: string;
  expectedBytes?: number;
  format?: string;
  mimeType?: string;
};

const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
const requestInit: RequestInit = { credentials: "include" };
const sourceOptions = {
  requestInit,
  fetchFn: async (url: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(url, init);
    if (retryableStatuses.has(response.status)) throw new Error(`HTTP ${response.status}`);
    return response;
  },
  // HLS is network-bound. Six requests stays well below the browser's normal
  // per-origin limit while avoiding the two-request bottleneck on long VODs.
  parallelism: 6,
  getRetryDelay: (attempts: number) => attempts <= 3 ? 2 ** (attempts - 1) : null
};
const activeJobs = new Map<string, {
  pause: () => void;
  resume: () => void;
  stop: () => void;
}>();
const completedOutputs = new Map<string, { file: string; url: string }>();
const lastProgressReports = new Map<string, { phase: "processing" | "downloading"; progress?: number; time: number }>();
const opfs = navigator.storage.getDirectory();
Logging.level = LogLevel.Errors;

async function clearTemporaryMediaFiles(jobId?: string): Promise<void> {
  const directory = await opfs;
  const iterableDirectory = directory as FileSystemDirectoryHandle & {
    values(): AsyncIterable<FileSystemHandle>;
  };
  for await (const handle of iterableDirectory.values()) {
    const name = handle.name;
    if (handle.kind !== "file" || !/^media-job-.*(?:\.[a-z0-9]{1,16}|\.youtube-\d+\.part)$/i.test(name)) continue;
    if (!jobId || name.startsWith(`${jobId}.`)) {
      await directory.removeEntry(name).catch(() => undefined);
    }
  }
}

function directFileExtension(job: DirectFileJobMessage): string {
  const extension = job.format || job.name.match(/\.([a-z0-9]{1,16})$/i)?.[1];
  return extension?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
}

function directFileMimeType(job: DirectFileJobMessage, response: Response): string {
  const fromJob = job.mimeType?.split(";", 1)[0].trim().toLowerCase();
  const fromResponse = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (/^(?:audio|video|image)\//.test(fromJob || "")) return fromJob!;
  if (/^(?:audio|video|image)\//.test(fromResponse || "")) return fromResponse!;
  const formats: Record<string, string> = {
    aac: "audio/aac", avi: "video/x-msvideo", flac: "audio/flac", gif: "image/gif",
    jpg: "image/jpeg", jpeg: "image/jpeg", m4a: "audio/mp4", m4v: "video/x-m4v",
    mkv: "video/x-matroska", mov: "video/quicktime", mp3: "audio/mpeg", mp4: "video/mp4",
    ogg: "audio/ogg", opus: "audio/ogg", png: "image/png", ts: "video/mp2t",
    wav: "audio/wav", webm: job.mimeType?.startsWith("audio/") ? "audio/webm" : "video/webm"
  };
  return formats[directFileExtension(job)] || "application/octet-stream";
}

// OPFS persists across browser restarts. A fresh offscreen document has no
// active jobs, so every previous temporary stream file is safe to remove.
void clearTemporaryMediaFiles();

function reportProgress(
  job: Pick<JobMessage, "jobId" | "resourceId">,
  phase: "processing" | "downloading",
  progress?: number,
  speed?: number
): void {
  const now = performance.now();
  const previous = lastProgressReports.get(job.jobId);
  const normalized = typeof progress === "number" ? Math.max(0, Math.min(1, progress)) : undefined;
  if (
    previous &&
    previous.phase === phase &&
    now - previous.time < 250
  ) return;
  lastProgressReports.set(job.jobId, { phase, progress: normalized, time: now });
  void chrome.runtime.sendMessage({
    type: "media.stream.progress",
    payload: { jobId: job.jobId, resourceId: job.resourceId, phase, progress: normalized, speed }
  });
}

async function releaseOutput(jobId: string): Promise<void> {
  const output = completedOutputs.get(jobId);
  if (!output) return;
  completedOutputs.delete(jobId);
  URL.revokeObjectURL(output.url);
  const directory = await opfs;
  await directory.removeEntry(output.file).catch(() => undefined);
}

function selectedVariant(resource: MediaResource): MediaVariant | undefined {
  return resource.variants?.find((variant) =>
    variant.id === resource.representationId ||
    variant.representationId === resource.representationId ||
    variant.url === resource.url
  ) ?? resource.variants?.[0];
}

function hlsInputUrl(resource: MediaResource, variant?: MediaVariant): { url: string; revoke?: string } {
  if (!variant) return { url: resource.manifestUrl || resource.url };
  const audioUrl = variant.audioUrl || resource.audioUrl;
  if ((!resource.variants || resource.variants.length < 2) && !audioUrl) return { url: variant.url };
  const lines = ["#EXTM3U", "#EXT-X-VERSION:3"];
  if (audioUrl) {
    lines.push(`#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="webmind",NAME="Audio",DEFAULT=YES,AUTOSELECT=YES,URI="${audioUrl}"`);
  }
  const attributes = [`BANDWIDTH=${variant.bitrate || 1_000_000}`];
  if (variant.width && variant.height) attributes.push(`RESOLUTION=${variant.width}x${variant.height}`);
  if (audioUrl) attributes.push('AUDIO="webmind"');
  lines.push(`#EXT-X-STREAM-INF:${attributes.join(",")}`, variant.url);
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "application/vnd.apple.mpegurl" }));
  return { url, revoke: url };
}

async function fetchMpd(url: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, { ...requestInit, signal });
  if (!response.ok) throw new Error(`DASH manifest request failed (${response.status})`);
  return response.text();
}

function normalizeWebVtt(text: string): string {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (/^WEBVTT(?:\s|$)/i.test(cleaned)) return cleaned;
  return `WEBVTT\n\n${cleaned.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}`;
}

async function fetchSubtitle(track: MediaSubtitleTrack, signal: AbortSignal): Promise<string> {
  const response = await fetch(track.url, { ...requestInit, signal });
  if (!response.ok) throw new Error(`Subtitle request failed (${response.status})`);
  const text = await response.text();
  if (!/^#EXTM3U/m.test(text)) return normalizeWebVtt(text);
  const parser = new HlsParser({ uri: track.url });
  parser.push(text);
  parser.end();
  const segments = parser.manifest.segments ?? [];
  const parts: string[] = [];
  for (const segment of segments) {
    const segmentUrl = new URL(segment.uri, track.url).href;
    const segmentResponse = await fetch(segmentUrl, { ...requestInit, signal });
    if (!segmentResponse.ok) throw new Error(`Subtitle segment request failed (${segmentResponse.status})`);
    parts.push((await segmentResponse.text())
      .replace(/^\uFEFF?WEBVTT[^\n]*\n(?:X-TIMESTAMP-MAP[^\n]*\n)?/i, "")
      .trim());
  }
  return normalizeWebVtt(parts.filter(Boolean).join("\n\n"));
}

async function openInputs(resource: MediaResource, signal: AbortSignal, temporaryUrls: string[]): Promise<Input[]> {
  const variant = selectedVariant(resource);
  if (resource.streamType === "hls") {
    const selected = hlsInputUrl(resource, variant);
    const input = new Input({
      source: new UrlSource(selected.url, sourceOptions),
      formats: HLS_FORMATS,
      formatOptions: { hls: { offsetTimestampsByDateTime: false } }
    });
    if (selected.revoke) temporaryUrls.push(selected.revoke);
    return [input];
  }
  if (resource.streamType === "dash") {
    const url = resource.manifestUrl || resource.url;
    const text = await fetchMpd(url, signal);
    const maxHeight = variant?.height ?? resource.height ?? Number.POSITIVE_INFINITY;
    const source = dashSource(
      url,
      text,
      requestInit,
      sourceOptions,
      maxHeight,
      variant?.representationId || resource.representationId
    );
    return [new Input({ source, formats: ALL_FORMATS })];
  }

  const tracks: CapturedMediaTrack[] = resource.capturedTracks?.length
    ? resource.capturedTracks.slice(0, 12)
    : [
        ...(resource.url && /^https?:/i.test(resource.url)
          ? [{ url: variant?.url || resource.url, kind: "video" as const, mimeType: resource.mimeType }]
          : []),
        ...(resource.audioUrl ? [{ url: resource.audioUrl, kind: "audio" as const }] : [])
      ];
  const uniqueTracks = tracks.filter((track, index) =>
    /^https?:/i.test(track.url) && tracks.findIndex((candidate) => candidate.url === track.url) === index
  );
  if (!uniqueTracks.length) throw new Error("No downloadable media tracks were found");
  const inputs: Input[] = [];
  for (const track of uniqueTracks) {
    if (signal.aborted) throw new Error("Download cancelled");
    const input = new Input({ source: new UrlSource(track.url, sourceOptions), formats: ALL_FORMATS });
    if (resource.isComposite && resource.duration) {
      try {
        const duration = await input.computeDuration();
        const tolerance = Math.max(2, resource.duration * 0.02);
        if (Number.isFinite(duration) && Math.abs(duration - resource.duration) > tolerance) {
          input.dispose();
          continue;
        }
      } catch {
        // Retain a readable candidate when the container has no duration metadata.
      }
    }
    inputs.push(input);
  }
  return inputs;
}

async function availableTracks(inputs: Input[], resource: MediaResource, signal: AbortSignal) {
  const groups = await Promise.all(inputs.map(async (input, index) => {
    if (signal.aborted) throw new Error("Download cancelled");
    const [videoTracks, audioTracks] = await Promise.all([input.getVideoTracks(), input.getAudioTracks()]);
    return { input, index, videoTracks, audioTracks };
  }));
  const videoCandidates = groups.flatMap((group) => group.videoTracks.map((track) => ({ ...group, track })));
  const audioCandidates = groups.flatMap((group) => group.audioTracks.map((track) => ({ ...group, track })));
  const sizedVideos = await Promise.all(videoCandidates.map(async (candidate) => ({
    candidate,
    lines: Math.min(await candidate.track.getDisplayWidth(), await candidate.track.getDisplayHeight())
  })));
  const video = resource.kind === "audio" ? null :
    sizedVideos.sort((left, right) => right.lines - left.lines)[0]?.candidate ?? null;
  const audio = audioCandidates.find((candidate) => candidate.input === video?.input) ??
    audioCandidates.find((candidate) => !video || candidate.track.canBePairedWith(video.track)) ??
    audioCandidates[0] ?? null;
  if (resource.kind === "video" && !video) throw new Error("No readable video track was found in the captured media");
  if (resource.kind === "audio" && !audio) throw new Error("No readable audio track was found in the captured media");
  return { video, audio };
}

function safeFilename(name: string, extension: "mp4" | "m4a"): string {
  const base = name.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "media";
  return new RegExp(`\\.${extension}$`, "i").test(base)
    ? base
    : `${base.replace(/\.[a-z0-9]{1,8}$/i, "")}.${extension}`;
}

async function processJob(job: JobMessage): Promise<void> {
  const cancel = new AbortController();
  let pause = new AbortController();
  const conversions: Conversion[] = [];
  let stopped = false;
  let paused = false;
  let wakeResume: () => void = () => {};
  const pauseJob = () => {
    if (stopped || paused) return;
    paused = true;
    pause.abort();
  };
  const resumeJob = () => {
    if (stopped || !paused) return;
    paused = false;
    wakeResume();
  };
  const stop = () => {
    stopped = true;
    cancel.abort();
    pause.abort();
    wakeResume();
    void Promise.all(conversions.map((conversion) => conversion.cancel()));
  };
  activeJobs.set(job.jobId, { pause: pauseJob, resume: resumeJob, stop });
  const inputs: Input[] = [];
  const temporaryUrls: string[] = [];
  let output: Output | undefined;
  let filename = `${crypto.randomUUID()}.mp4`;
  try {
    const resource = job.resource;
    reportProgress(job, "processing", 0);
    inputs.push(...await openInputs(resource, cancel.signal, temporaryUrls));
    const subtitle = resource.subtitles?.find((track) => track.id === resource.selectedSubtitleId);
    const subtitleText = subtitle ? await fetchSubtitle(subtitle, cancel.signal) : undefined;
    const { video, audio } = await availableTracks(inputs, resource, cancel.signal);
    const selectedTracks = [video?.track, audio?.track].filter(Boolean) as InputTrack[];
    if (!selectedTracks.length) throw new Error("The media contains no readable audio or video tracks");
    const audioOnly = !video;
    filename = safeFilename(job.name, audioOnly ? "m4a" : "mp4");
    const live = resource.isLive || (await Promise.all(selectedTracks.map((track) => track.isLive()))).every(Boolean);
    const trim = live && resource.isLive
      ? { start: await inputs[0].computeDuration(selectedTracks, { skipLiveWait: true }) }
      : undefined;
    const directory = await opfs;
    const temporaryFile = `${job.jobId}.${audioOnly ? "m4a" : "mp4"}`;
    const fileHandle = await directory.getFileHandle(temporaryFile, { create: true });
    const target = new StreamTarget(await fileHandle.createWritable(), { chunked: true });
    output = new Output({ format: new Mp4OutputFormat({ fastStart: false }), target });
    const subtitleSource = subtitleText ? new TextSubtitleSource("webvtt") : undefined;
    if (subtitleSource) output.addSubtitleTrack(subtitleSource, { languageCode: subtitle?.language, name: subtitle?.name });
    for (const input of inputs) {
      const tracks = await input.getTracks();
      const belongs = tracks.filter((track) => track === video?.track || track === audio?.track);
      if (!belongs.length) continue;
      const conversion = await Conversion.init({
        input,
        output,
        composable: true,
        tracks: "all",
        showWarnings: false,
        ...(input === inputs[0] ? { trim } : {}),
        video: (track: InputVideoTrack) => belongs.includes(track) ? {} : { discard: true },
        audio: (track: InputAudioTrack) => belongs.includes(track) ? {} : { discard: true }
      });
      conversion.onProgress = (progress) => reportProgress(job, "processing", progress);
      conversions.push(conversion);
    }
    if (conversions.every((item) => !item.utilizedTracks.length)) {
      throw new Error("当前浏览器无法将此编码封装为 MP4。请尝试下载原始资源或在支持该编码的浏览器中重试。");
    }
    await output.start();
    const addSubtitle = subtitleSource && subtitleText
      ? subtitleSource.add(subtitleText).then(() => subtitleSource.close())
      : Promise.resolve();
    const runConversions = async () => {
      while (!stopped) {
        if (paused) {
          await new Promise<void>((resolve) => { wakeResume = resolve; });
          continue;
        }
        pause = new AbortController();
        await Promise.all(conversions.map((conversion) => conversion.execute({ pauseSignal: pause.signal })));
        if (stopped) throw new ConversionCanceledError();
        if (conversions.every((conversion) => conversion.state === "done")) return;
      }
      throw new ConversionCanceledError();
    };
    await Promise.all([runConversions(), addSubtitle]);
    if (stopped) throw new ConversionCanceledError();
    await output.finalize();
    const file = await fileHandle.getFile();
    if (!file.size) throw new Error("No media data was written");
    const url = URL.createObjectURL(file);
    completedOutputs.set(job.jobId, { file: temporaryFile, url });
    reportProgress(job, "downloading", 0);
    await chrome.runtime.sendMessage({
      type: "media.stream.finished",
      payload: { jobId: job.jobId, resourceId: job.resourceId, url, filename }
    });
  } catch (error) {
    await output?.cancel().catch(() => undefined);
    await releaseOutput(job.jobId);
    await clearTemporaryMediaFiles(job.jobId);
    if (!stopped) {
      await chrome.runtime.sendMessage({
        type: "media.stream.failed",
        payload: { jobId: job.jobId, error: error instanceof Error ? error.message : String(error) }
      });
    }
  } finally {
    inputs.forEach((input) => input.dispose());
    temporaryUrls.forEach((url) => URL.revokeObjectURL(url));
    lastProgressReports.delete(job.jobId);
    activeJobs.delete(job.jobId);
  }
}

async function processYouTubeJob(job: YouTubeJobMessage): Promise<void> {
  const cancel = new AbortController();
  let stopped = false;
  let paused = false;
  let wakeResume: () => void = () => {};
  const pause = () => { paused = true; };
  const resume = () => {
    if (!paused) return;
    paused = false;
    wakeResume();
  };
  const stop = () => {
    stopped = true;
    cancel.abort();
    wakeResume();
  };
  const waitForResume = () => paused
    ? new Promise<void>((resolve) => { wakeResume = resolve; })
    : Promise.resolve();
  activeJobs.set(job.jobId, { pause, resume, stop });
  try {
    reportProgress(job, "processing", 0);
    const directory = await opfs;
    const result = await downloadYouTube({
      ...job,
      directory,
      signal: cancel.signal,
      waitForResume,
      onProgress: (progress) => reportProgress(job, "processing", progress)
    });
    if (stopped) return;
    const media = await (await directory.getFileHandle(result.file)).getFile();
    if (!media.size) throw new Error("No YouTube media data was written");
    const url = URL.createObjectURL(media);
    completedOutputs.set(job.jobId, { file: result.file, url });
    reportProgress(job, "downloading", 0);
    await chrome.runtime.sendMessage({
      type: "media.stream.finished",
      payload: { jobId: job.jobId, resourceId: job.resourceId, url, filename: result.filename }
    });
  } catch (error) {
    await releaseOutput(job.jobId);
    await clearTemporaryMediaFiles(job.jobId);
    if (!stopped) {
      await chrome.runtime.sendMessage({
        type: "media.stream.failed",
        payload: { jobId: job.jobId, error: error instanceof Error ? error.message : String(error) }
      });
    }
  } finally {
    lastProgressReports.delete(job.jobId);
    activeJobs.delete(job.jobId);
  }
}

async function processDirectFileJob(job: DirectFileJobMessage): Promise<void> {
  const cancel = new AbortController();
  let stopped = false;
  let paused = false;
  let wakeResume: () => void = () => {};
  const pause = () => { paused = true; };
  const resume = () => {
    if (!paused) return;
    paused = false;
    wakeResume();
  };
  const stop = () => {
    stopped = true;
    cancel.abort();
    wakeResume();
  };
  const waitForResume = () => paused
    ? new Promise<void>((resolve) => { wakeResume = resolve; })
    : Promise.resolve();
  activeJobs.set(job.jobId, { pause, resume, stop });
  try {
    const response = await fetch(job.url, { credentials: "include", signal: cancel.signal });
    if (!response.ok || !response.body) throw new Error(`Direct media request failed (${response.status})`);
    const total = Number(response.headers.get("content-length")) || job.expectedBytes;
    const directory = await opfs;
    const file = `${job.jobId}.${directFileExtension(job)}`;
    const handle = await directory.getFileHandle(file, { create: true });
    const output = await handle.createWritable();
    const reader = response.body.getReader();
    let received = 0;
    let sample = { bytes: 0, time: performance.now() };
    try {
      while (true) {
        await waitForResume();
        if (cancel.signal.aborted) throw new DOMException("Download cancelled", "AbortError");
        const chunk = await reader.read();
        if (chunk.done) break;
        await output.write(chunk.value);
        received += chunk.value.byteLength;
        const now = performance.now();
        const elapsed = now - sample.time;
        const speed = elapsed > 0 ? (received - sample.bytes) * 1000 / elapsed : undefined;
        if (elapsed >= 250) sample = { bytes: received, time: now };
        reportProgress(job, "downloading", total ? received / total : undefined, speed);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      await output.close();
    }
    if (stopped) return;
    const media = await handle.getFile();
    if (!media.size) throw new Error("No media data was written");
    const url = URL.createObjectURL(new Blob([media], { type: directFileMimeType(job, response) }));
    completedOutputs.set(job.jobId, { file, url });
    reportProgress(job, "downloading", 1, 0);
    await chrome.runtime.sendMessage({
      type: "media.stream.finished",
      payload: { jobId: job.jobId, resourceId: job.resourceId, url, filename: job.name, localOnly: true }
    });
  } catch (error) {
    await releaseOutput(job.jobId);
    await clearTemporaryMediaFiles(job.jobId);
    if (!stopped) {
      await chrome.runtime.sendMessage({
        type: "media.stream.failed",
        payload: { jobId: job.jobId, error: error instanceof Error ? error.message : String(error) }
      });
    }
  } finally {
    lastProgressReports.delete(job.jobId);
    activeJobs.delete(job.jobId);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "webmind.offscreen") return;
  if (message.type === "media.offscreen.start") {
    const job = message as JobMessage;
    if (!activeJobs.has(job.jobId)) void processJob(job);
    sendResponse({ accepted: true });
  } else if (message.type === "media.offscreen.youtube") {
    const job = message as YouTubeJobMessage;
    if (!activeJobs.has(job.jobId)) void processYouTubeJob(job);
    sendResponse({ accepted: true });
  } else if (message.type === "media.offscreen.file") {
    const job = message as DirectFileJobMessage;
    if (!activeJobs.has(job.jobId)) void processDirectFileJob(job);
    sendResponse({ accepted: true });
  } else if (message.type === "media.offscreen.stop") {
    activeJobs.get(String(message.jobId))?.stop();
    sendResponse({ stopping: true });
  } else if (message.type === "media.offscreen.pause") {
    activeJobs.get(String(message.jobId))?.pause();
    sendResponse({ paused: true });
  } else if (message.type === "media.offscreen.resume") {
    activeJobs.get(String(message.jobId))?.resume();
    sendResponse({ resumed: true });
  } else if (message.type === "media.offscreen.release") {
    void releaseOutput(String(message.jobId));
    sendResponse({ released: true });
  } else if (message.type === "media.offscreen.cleanup") {
    activeJobs.forEach((job) => job.stop());
    void clearTemporaryMediaFiles().then(() => sendResponse({ cleared: true }));
    return true;
  }
});
