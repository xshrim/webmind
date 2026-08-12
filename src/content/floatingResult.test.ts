import { describe, expect, it } from "vitest";
import { shouldCloseFloatingResult } from "./floatingResult";

describe("floating result dismissal", () => {
  it("closes for a primary pointer press outside the result", () => {
    expect(
      shouldCloseFloatingResult({ isPrimary: true, button: 0 }, false)
    ).toBe(true);
  });

  it("keeps the result open for presses inside it", () => {
    expect(
      shouldCloseFloatingResult({ isPrimary: true, button: 0 }, true)
    ).toBe(false);
  });

  it("does not close for secondary or non-primary pointer presses", () => {
    expect(
      shouldCloseFloatingResult({ isPrimary: true, button: 2 }, false)
    ).toBe(false);
    expect(
      shouldCloseFloatingResult({ isPrimary: false, button: 0 }, false)
    ).toBe(false);
  });
});
