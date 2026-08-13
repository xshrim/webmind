import { describe, expect, it } from "vitest";
import {
  candidateFloatingResultPosition,
  shouldCloseFloatingResult,
  type FloatingResultAnchor
} from "./floatingResult";

const anchor = (left: number, top: number): FloatingResultAnchor => ({
  left,
  top,
  right: left + 20,
  bottom: top + 20,
  width: 20,
  height: 20
});

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

  it("follows the requested placement priority", () => {
    expect(candidateFloatingResultPosition(anchor(100, 100), 100, 100, 400, 400)).toEqual({
      left: 100,
      top: 130
    });
    expect(candidateFloatingResultPosition(anchor(100, 280), 100, 100, 400, 400)).toEqual({
      left: 130,
      top: 240
    });
    expect(candidateFloatingResultPosition(anchor(280, 280), 100, 100, 400, 400)).toEqual({
      left: 280,
      top: 170
    });
    expect(candidateFloatingResultPosition(anchor(100, 280), 300, 100, 400, 400)).toEqual({
      left: 50,
      top: 150
    });
  });

  it("does not choose a partially clipped prioritized placement", () => {
    expect(
      candidateFloatingResultPosition(anchor(190, 190), 180, 180, 400, 400)
    ).toEqual({ left: 110, top: 110 });
  });
});
