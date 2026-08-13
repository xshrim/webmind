import { describe, expect, it } from "vitest";
import { selectionQrCodeSvg } from "./selectionQrCode";

describe("selectionQrCodeSvg", () => {
  it("generates an SVG QR code for selected text", async () => {
    await expect(selectionQrCodeSvg("WebMind")).resolves.toContain("<svg");
  });

  it("rejects empty selections", async () => {
    await expect(selectionQrCodeSvg("   ")).rejects.toThrow(
      "Selected text is empty"
    );
  });
});
