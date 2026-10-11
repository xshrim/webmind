import { afterEach, describe, expect, it, vi } from "vitest";
import { inspectStreamingResources, parseDashManifest, parseHlsManifest } from "./streamingMedia";

afterEach(() => vi.unstubAllGlobals());

describe("HLS manifest parsing", () => {
  it("resolves variant, audio, resolution, and subtitle renditions", () => {
    const manifest = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",LANGUAGE="en",DEFAULT=YES,URI="audio/en.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",LANGUAGE="en",URI="subs/en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=2400000,RESOLUTION=1280x720,AUDIO="audio",SUBTITLES="subs"
video/720.m3u8`;
    const parsed = parseHlsManifest(manifest, "https://cdn.example/master.m3u8");

    expect(parsed.variants).toEqual([expect.objectContaining({
      height: 720,
      width: 1280,
      bitrate: 2400000,
      url: "https://cdn.example/video/720.m3u8",
      audioUrl: "https://cdn.example/audio/en.m3u8"
    })]);
    expect(parsed.audio[0]?.language).toBe("en");
    expect(parsed.subtitles[0]?.url).toBe("https://cdn.example/subs/en.m3u8");
    expect(parsed.variants[0]?.requestUrls).toEqual([
      "https://cdn.example/video/720.m3u8"
    ]);
  });

  it("collects VOD segment URLs and duration, and identifies ended playlists", () => {
    const manifest = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXTINF:5.5,
seg-1.ts
#EXTINF:5.25,
seg-2.ts
#EXT-X-ENDLIST`;
    const parsed = parseHlsManifest(manifest, "https://cdn.example/path/index.m3u8");

    expect(parsed.duration).toBe(10.75);
    expect(parsed.isLive).toBe(false);
    expect(parsed.segmentUrls).toEqual([
      "https://cdn.example/path/seg-1.ts",
      "https://cdn.example/path/seg-2.ts"
    ]);
  });

  it("estimates a media-playlist size from captured segment responses", async () => {
    const manifest = `#EXTM3U
#EXT-X-TARGETDURATION:5
#EXTINF:5,
one.ts
#EXTINF:5,
two.ts
#EXT-X-ENDLIST`;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(manifest)));

    const [resource] = await inspectStreamingResources([{
      id: "stream",
      kind: "video",
      name: "Example",
      url: "https://cdn.example/video.m3u8",
      format: "m3u8"
    }], "", [
      { url: "https://cdn.example/one.ts", frameId: 0, kind: "video", bytes: 1_000, time: 1 },
      { url: "https://cdn.example/two.ts", frameId: 0, kind: "video", bytes: 1_000, time: 1 }
    ]);

    expect(resource?.variants?.[0]).toMatchObject({ bitrate: 1_600, bytes: 2_000 });
    expect(resource?.bytes).toBe(2_000);
  });

  it("uses fixed HLS samples so size does not change as more segments are captured", async () => {
    const manifest = `#EXTM3U
#EXT-X-TARGETDURATION:5
#EXTINF:5,
one.ts
#EXTINF:5,
two.ts
#EXTINF:5,
three.ts
#EXTINF:5,
four.ts
#EXT-X-ENDLIST`;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(manifest)));

    const [resource] = await inspectStreamingResources([{
      id: "stream",
      kind: "video",
      name: "Example",
      url: "https://cdn.example/video.m3u8",
      format: "m3u8"
    }], "", [
      { url: "https://cdn.example/one.ts", frameId: 0, kind: "video", bytes: 1_000, time: 1 },
      { url: "https://cdn.example/two.ts", frameId: 0, kind: "video", bytes: 10_000, time: 1 },
      { url: "https://cdn.example/three.ts", frameId: 0, kind: "video", bytes: 1_000, time: 1 },
      { url: "https://cdn.example/four.ts", frameId: 0, kind: "video", bytes: 1_000, time: 1 }
    ]);

    expect(resource?.variants?.[0]).toMatchObject({ bitrate: 1_600, bytes: 4_000 });
  });

  it("promotes a captured media playlist and replaces an MSE blob video", async () => {
    const manifest = `#EXTM3U
#EXT-X-TARGETDURATION:5
#EXTINF:5,
one.ts
#EXT-X-ENDLIST`;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(manifest)));

    const resources = await inspectStreamingResources([{
      id: "mse",
      kind: "video",
      name: "Example",
      url: "blob:https://page.example/video",
      format: "video",
      width: 1920,
      height: 1080
    }], "", [{
      url: "https://cdn.example/video.m3u8",
      frameId: 2,
      kind: "manifest",
      mimeType: "application/vnd.apple.mpegurl",
      time: 1
    }, {
      url: "https://cdn.example/audio.m4a",
      frameId: 2,
      kind: "audio",
      mimeType: "audio/mp4",
      bytes: 120_000_000,
      time: 1
    }]);

    expect(resources).toEqual(expect.arrayContaining([expect.objectContaining({
      kind: "video",
      streamType: "hls",
      manifestUrl: "https://cdn.example/video.m3u8",
      format: "mp4",
      width: 1920,
      height: 1080,
      variants: [expect.objectContaining({ height: 1080, width: 1920, quality: "1080p" })]
    }), expect.objectContaining({
      kind: "audio",
      url: "https://cdn.example/audio.m4a",
      format: "m4a"
    })]));
  });

  it("keeps the captured MSE tracks available for preview and muxing", async () => {
    const resources = await inspectStreamingResources([{
      id: "mse",
      kind: "video",
      name: "Example",
      url: "blob:https://page.example/video",
      format: "video"
    }], "", [{
      url: "https://cdn.example/videoplayback?itag=137",
      frameId: 0,
      kind: "video",
      mimeType: "video/mp4",
      time: 1
    }, {
      url: "https://cdn.example/videoplayback?itag=140",
      frameId: 0,
      kind: "audio",
      mimeType: "audio/mp4",
      time: 1
    }]);

    expect(resources.find((resource) => resource.id === "mse")).toMatchObject({
      isComposite: true,
      capturedTracks: [
        { kind: "video", url: "https://cdn.example/videoplayback?itag=137" },
        { kind: "audio", url: "https://cdn.example/videoplayback?itag=140" }
      ]
    });
  });

  it("shows an independent HLS audio rendition as an audio resource", async () => {
    const manifest = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Main audio",URI="audio/index.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=2400000,RESOLUTION=1280x720,AUDIO="audio"
video/index.m3u8`;
    const audioPlaylist = `#EXTM3U
#EXT-X-TARGETDURATION:5
#EXTINF:5,
audio-1.ts
#EXT-X-ENDLIST`;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(
      url.includes("audio/index.m3u8") ? audioPlaylist : manifest
    )));

    const resources = await inspectStreamingResources([{
      id: "stream",
      kind: "video",
      name: "Example",
      url: "https://cdn.example/master.m3u8",
      format: "m3u8"
    }], "");

    expect(resources).toEqual(expect.arrayContaining([expect.objectContaining({
      kind: "audio",
      manifestUrl: "https://cdn.example/audio/index.m3u8",
      streamType: "hls",
      format: "m4a"
    })]));
  });

  it("does not expose transport stream segments as media resources", async () => {
    const resources = await inspectStreamingResources([{
      id: "segment",
      kind: "video",
      name: "Segment",
      url: "https://cdn.example/part-001.ts",
      format: "ts"
    }], "");

    expect(resources).toEqual([]);
  });
});

describe("DASH manifest parsing", () => {
  it("extracts video representations and the paired audio rendition", () => {
    const manifest = `<MPD type="static" mediaPresentationDuration="PT60S">
      <Period>
        <AdaptationSet mimeType="video/mp4">
          <Representation id="video-1080" bandwidth="2400000" width="1920" height="1080"><BaseURL>v1080.m4s</BaseURL></Representation>
          <Representation id="video-720" bandwidth="1200000" width="1280" height="720"><BaseURL>v720.m4s</BaseURL></Representation>
        </AdaptationSet>
        <AdaptationSet mimeType="audio/mp4">
          <Representation id="audio-main" bandwidth="128000"><BaseURL>a.m4s</BaseURL></Representation>
        </AdaptationSet>
      </Period>
    </MPD>`;
    const parsed = parseDashManifest(manifest, "https://cdn.example/media.mpd");

    expect(parsed.variants.map((variant) => variant.representationId)).toEqual([
      "video-1080",
      "video-720"
    ]);
    expect(parsed.audioRepresentationId).toBe("audio-main");
    expect(parsed.duration).toBe(60);
    expect(parsed.isLive).toBe(false);
    expect(parsed.segmentUrls).toContain("https://cdn.example/v1080.m4s");
    expect(parsed.variants[0]?.requestUrls).toContain("https://cdn.example/v1080.m4s");
  });
});
