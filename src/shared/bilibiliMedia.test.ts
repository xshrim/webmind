import { describe, expect, it } from "vitest";
import { createBilibiliMediaResource } from "./bilibiliMedia";
import type { MediaResource } from "./types";

const resource = (kind: MediaResource["kind"], url: string): MediaResource => ({
  id: `${kind}-${url}`,
  kind,
  name: url,
  url,
  format: "m4s"
});

describe("createBilibiliMediaResource", () => {
  it("keeps DASH audio visible and groups audio qualities into one item", () => {
    const resources = [
      resource("video", "blob:https://www.bilibili.com/video"),
      resource("video", "https://video.bilivideo.com/low.m4s"),
      resource("audio", "https://audio.bilivideo.com/audio.m4s"),
      resource("image", "https://i0.hdslb.com/cover.jpg")
    ];
    const result = createBilibiliMediaResource(resources, {
      title: "Test video",
      duration: 120,
      video: [
        { url: "https://video.bilivideo.com/720.m4s", format: "mp4", height: 720, width: 1280, bitrate: 1_000_000 },
        { url: "https://video.bilivideo.com/1080.m4s", format: "mp4", height: 1080, width: 1920, bitrate: 2_000_000 },
        { url: "https://video.bilivideo.com/1080-alt.m4s", format: "mp4", height: 1080, width: 1920, bitrate: 20 }
      ],
      audio: [
        { url: "https://audio.bilivideo.com/low.m4s", format: "m4a", bitrate: 64000 },
        { url: "https://audio.bilivideo.com/high.m4s", format: "m4a", bitrate: 192000 }
      ]
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      kind: "video",
      name: "Test video",
      format: "mp4",
      url: "https://video.bilivideo.com/1080.m4s",
      audioUrl: "https://audio.bilivideo.com/high.m4s",
      isComposite: true,
      duration: 120
    });
    expect(result[0].variants?.map((variant) => variant.height)).toEqual([1080, 720]);
    expect(result[0].bytes).toBe(30_000_000);
    expect(result[1]).toMatchObject({
      kind: "audio",
      format: "m4a",
      url: "https://audio.bilivideo.com/high.m4s",
      isComposite: true
    });
    expect(result[1].variants?.map((variant) => variant.bitrate)).toEqual([192000, 64000]);
    expect(result[2].kind).toBe("image");
  });

  it("leaves ordinary media unchanged without both DASH tracks", () => {
    const resources = [resource("video", "https://example.com/video.mp4")];
    expect(createBilibiliMediaResource(resources, {
      title: "",
      video: [],
      audio: []
    })).toBe(resources);
  });
});
