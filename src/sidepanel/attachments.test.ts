import { describe, expect, it } from "vitest";
import { screenshotCrop } from "./screenshotCrop";

describe("screenshotCrop", () => {
  it("maps a CSS-pixel selection into a high-density capture", () => {
    expect(
      screenshotCrop(2400, 1600, {
        left: 120,
        top: 80,
        width: 300,
        height: 200,
        viewportWidth: 1200,
        viewportHeight: 800
      })
    ).toEqual({
      sourceX: 240,
      sourceY: 160,
      sourceWidth: 600,
      sourceHeight: 400,
      outputWidth: 600,
      outputHeight: 400
    });
  });

  it("clips an out-of-bounds selection and caps oversized output", () => {
    expect(
      screenshotCrop(6000, 4000, {
        left: -50,
        top: 900,
        width: 1300,
        height: 300,
        viewportWidth: 1200,
        viewportHeight: 1000
      })
    ).toEqual({
      sourceX: 0,
      sourceY: 3600,
      sourceWidth: 6000,
      sourceHeight: 400,
      outputWidth: 2048,
      outputHeight: 137
    });
  });

  it("preserves the original end point when a selection starts outside the viewport", () => {
    expect(
      screenshotCrop(1200, 800, {
        left: -50,
        top: 40,
        width: 100,
        height: 80,
        viewportWidth: 1200,
        viewportHeight: 800
      })
    ).toMatchObject({
      sourceX: 0,
      sourceY: 40,
      sourceWidth: 50,
      sourceHeight: 80
    });
  });
});
