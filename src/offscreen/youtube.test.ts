import { describe, expect, it } from "vitest";
import { chooseYouTubeFormats, youtubeVideoId, type YouTubeFormat } from "./youtube";

const format = (overrides: Partial<YouTubeFormat>): YouTubeFormat => ({
  mime_type: "video/mp4",
  url: "https://example.test/media",
  has_audio: false,
  has_video: false,
  decipher: async () => "https://example.test/media",
  ...overrides
});

describe("YouTube download helpers", () => {
  it("recognizes ordinary, short and shared YouTube URLs", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=abcDEF_1234")).toBe("abcDEF_1234");
    expect(youtubeVideoId("https://youtu.be/abcDEF_1234?t=2")).toBe("abcDEF_1234");
    expect(youtubeVideoId("https://www.youtube.com/shorts/abcDEF_1234")).toBe("abcDEF_1234");
    expect(youtubeVideoId("https://example.com/watch?v=abcDEF_1234")).toBeUndefined();
  });

  it("chooses the best video and a separate audio track", () => {
    const selected = chooseYouTubeFormats({
      streaming_data: {
        adaptive_formats: [
          format({ has_video: true, width: 1280, height: 720, bitrate: 1_000 }),
          format({ has_video: true, width: 1920, height: 1080, bitrate: 2_000 }),
          format({ has_audio: true, bitrate: 128 })
        ]
      },
      basic_info: {}
    });
    expect(selected).toHaveLength(2);
    expect(selected[0].height).toBe(1080);
    expect(selected[1].has_audio).toBe(true);
  });
});
