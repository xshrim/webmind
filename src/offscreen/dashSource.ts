import { BufferSource, CustomPathedSource, UrlSource } from "mediabunny";
import { addSidxSegmentsToPlaylist, parse } from "mpd-parser";
import parseSidx from "mux.js/lib/tools/parse-sidx";

const VIRTUAL = "https://webmind.invalid/";
type Playlist = {
  attributes: {
    BANDWIDTH?: number;
    CODECS?: string;
    ID?: string;
    NAME?: string;
    RESOLUTION?: { width?: number; height?: number };
  };
  contentProtection?: Record<string, unknown>;
  resolvedUri?: string;
  segments?: Array<{
    resolvedUri: string;
    duration: number;
    discontinuity?: boolean;
    byterange?: { offset?: number; length: number };
    map?: { resolvedUri: string; byterange?: { offset?: number; length: number } };
  }>;
  sidx?: { resolvedUri: string; byterange: { offset: number; length: number } };
  endList?: boolean;
};

function chooseVariants(
  manifest: any,
  maxHeight: number,
  representationId?: string
): { video?: Playlist; audio?: Playlist } {
  const playlists = (manifest.playlists ?? []) as Playlist[];
  const audioUris = new Set(Object.values(manifest.mediaGroups?.AUDIO ?? {})
    .flatMap((group: any) => Object.values(group))
    .flatMap((rendition: any) => rendition.playlists ?? [])
    .map((playlist: Playlist) => playlist.resolvedUri)
    .filter(Boolean));
  const lines = (item: Playlist) => Math.min(
    item.attributes.RESOLUTION?.width ?? 0,
    item.attributes.RESOLUTION?.height ?? 0
  );
  const videoCandidates = playlists.filter((item) =>
    !audioUris.has(item.resolvedUri) && !/^(?:audio\/|mp4a|aac|opus|ac-3|ec-3)/i.test(item.attributes.CODECS ?? "")
  );
  const video = videoCandidates.find((item) =>
    representationId && String(item.attributes.ID ?? item.attributes.NAME ?? "") === representationId
  ) ?? [...videoCandidates].sort((left, right) =>
    (right.attributes.BANDWIDTH ?? 0) - (left.attributes.BANDWIDTH ?? 0)
  ).find((item) => lines(item) <= maxHeight) ??
    [...videoCandidates].sort((left, right) => lines(left) - lines(right))[0];
  const audioPlaylists = Object.values(manifest.mediaGroups?.AUDIO ?? {})
    .flatMap((group: any) => Object.values(group))
    .sort((left: any, right: any) => Number(right.default) - Number(left.default))
    .flatMap((rendition: any) => rendition.playlists ?? []) as Playlist[];
  const audio = audioPlaylists.sort((left, right) =>
    (right.attributes.BANDWIDTH ?? 0) - (left.attributes.BANDWIDTH ?? 0)
  )[0];
  for (const track of [video, audio]) {
    if (track?.contentProtection && Object.keys(track.contentProtection).length) {
      throw new Error("This DASH stream is DRM protected");
    }
  }
  return { video, audio };
}

async function resolveSidx(playlist: Playlist | undefined, requestInit: RequestInit): Promise<void> {
  if (!playlist?.sidx || playlist.segments?.length) return;
  const { resolvedUri, byterange } = playlist.sidx;
  const response = await fetch(resolvedUri, {
    ...requestInit,
    headers: { ...requestInit.headers, Range: `bytes=${byterange.offset}-${byterange.offset + byterange.length - 1}` }
  });
  if (!response.ok) throw new Error(`DASH index request failed (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  addSidxSegmentsToPlaylist(playlist, parseSidx(bytes.subarray(8)), resolvedUri);
}

const attr = (value: string) => `"${value.replace(/"/g, "")}"`;
const range = (value: { offset?: number; length: number }) => `${value.length}@${value.offset ?? 0}`;

function masterPlaylist({ video, audio }: { video?: Playlist; audio?: Playlist }): string {
  const lines = ["#EXTM3U", "#EXT-X-INDEPENDENT-SEGMENTS"];
  if (audio && video) {
    lines.push('#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="audio",DEFAULT=YES,AUTOSELECT=YES,URI="audio.m3u8"');
  }
  const main = video ?? audio;
  if (!main) throw new Error("DASH manifest has no audio or video tracks");
  const attrs = [`BANDWIDTH=${main.attributes.BANDWIDTH ?? 1}`];
  const codecs = [video?.attributes.CODECS, audio?.attributes.CODECS].filter(Boolean).join(",");
  if (codecs) attrs.push(`CODECS=${attr(codecs)}`);
  const size = video?.attributes.RESOLUTION;
  if (size?.width && size.height) attrs.push(`RESOLUTION=${size.width}x${size.height}`);
  if (audio && video) attrs.push('AUDIO="audio"');
  lines.push(`#EXT-X-STREAM-INF:${attrs.join(",")}`, video ? "video.m3u8" : "audio.m3u8");
  return `${lines.join("\n")}\n`;
}

function mediaPlaylist(playlist: Playlist, sequences: Map<string, number>): string {
  const segments = playlist.segments ?? [];
  for (const segment of segments) {
    if (!sequences.has(segment.resolvedUri)) sequences.set(segment.resolvedUri, sequences.size);
  }
  const target = Math.ceil(Math.max(1, ...segments.map((segment) => segment.duration)));
  const lines = [
    "#EXTM3U",
    "#EXT-X-VERSION:7",
    `#EXT-X-TARGETDURATION:${target}`,
    `#EXT-X-MEDIA-SEQUENCE:${segments.length ? sequences.get(segments[0].resolvedUri) : 0}`
  ];
  let currentMap = "";
  for (const segment of segments) {
    if (segment.discontinuity) lines.push("#EXT-X-DISCONTINUITY");
    const mapKey = segment.map && `${segment.map.resolvedUri}|${segment.map.byterange ? range(segment.map.byterange) : ""}`;
    if (segment.map && mapKey !== currentMap) {
      currentMap = mapKey ?? "";
      lines.push(`#EXT-X-MAP:URI=${attr(segment.map.resolvedUri)}${segment.map.byterange ? `,BYTERANGE=${attr(range(segment.map.byterange))}` : ""}`);
    }
    lines.push(`#EXTINF:${segment.duration.toFixed(6)},`);
    if (segment.byterange) lines.push(`#EXT-X-BYTERANGE:${range(segment.byterange)}`);
    lines.push(segment.resolvedUri);
  }
  if (playlist.endList) lines.push("#EXT-X-ENDLIST");
  return `${lines.join("\n")}\n`;
}

export function dashSource(
  mpdUrl: string,
  initialText: string,
  requestInit: RequestInit,
  sourceOptions: ConstructorParameters<typeof UrlSource>[1],
  maxHeight = Number.POSITIVE_INFINITY,
  representationId?: string
) {
  let text = initialText;
  let fetchedAt = Date.now();
  let serverOffset = 0;
  const sequences = { video: new Map<string, number>(), audio: new Map<string, number>() };

  async function load() {
    if (Date.now() - fetchedAt > 1000) {
      const response = await fetch(mpdUrl, requestInit);
      if (!response.ok) throw new Error(`DASH manifest request failed (${response.status})`);
      text = await response.text();
      fetchedAt = Date.now();
      const serverDate = Date.parse(response.headers.get("date") ?? "");
      if (serverDate) serverOffset = serverDate - fetchedAt;
    }
    const manifest = parse(text, { manifestUri: mpdUrl, NOW: Date.now(), clientOffset: serverOffset });
    const variants = chooseVariants(manifest, maxHeight, representationId);
    await Promise.all([resolveSidx(variants.video, requestInit), resolveSidx(variants.audio, requestInit)]);
    return variants;
  }

  const playlist = (value: string) => new BufferSource(new TextEncoder().encode(value));
  return new CustomPathedSource(`${VIRTUAL}master.m3u8`, async ({ path }) => {
    if (!path.startsWith(VIRTUAL)) return new UrlSource(path, sourceOptions);
    const variants = await load();
    switch (path.slice(VIRTUAL.length)) {
      case "master.m3u8": return playlist(masterPlaylist(variants));
      case "video.m3u8": return playlist(mediaPlaylist(variants.video ?? variants.audio!, sequences.video));
      case "audio.m3u8":
        if (!variants.audio) throw new Error("DASH audio track is missing");
        return playlist(mediaPlaylist(variants.audio, sequences.audio));
      default: throw new Error(`Unknown DASH virtual path: ${path}`);
    }
  });
}
