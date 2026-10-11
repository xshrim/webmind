import { describe, expect, it } from "vitest";
import { createId } from "./id";

describe("createId", () => {
  it("creates a prefixed UUID-shaped identifier", () => {
    expect(createId("media")).toMatch(
      /^media-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("falls back when randomUUID is unavailable", () => {
    const id = createId("media", {
      getRandomValues: (bytes) => {
        bytes.fill(0);
        return bytes;
      }
    });
    expect(id).toBe("media-00000000-0000-4000-8000-000000000000");
  });
});
