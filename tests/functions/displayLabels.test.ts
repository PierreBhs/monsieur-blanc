/**
 * Test plan — pure display/formatting helpers from src/components/gameUi.tsx
 *
 * Functions under test (no rendering required — these are plain functions):
 *   - roleLabel:   human label for a role
 *   - winnerLabel: human label for a winning side
 *   - formatTimer: seconds -> "m:ss"
 *   - roleTotal:   sum of the role counts
 *
 * Scenarios: every role/winner branch, timer padding and minute rollover,
 * and additive role totals.
 */
import { describe, expect, it } from "vitest";
import { formatTimer, roleLabel, roleTotal, winnerLabel } from "../../src/components/gameUi";

describe("roleLabel", () => {
  it("labels each role", () => {
    expect(roleLabel("civilian")).toBe("Civilian");
    expect(roleLabel("undercover")).toBe("Undercover");
    expect(roleLabel("mrWhite")).toBe("Mr. White");
  });
});

describe("winnerLabel", () => {
  it("labels each winning side", () => {
    expect(winnerLabel("civilians")).toBe("Civilians");
    expect(winnerLabel("infiltrators")).toBe("Infiltrators");
    expect(winnerLabel("mrWhite")).toBe("Mr. White");
  });
});

describe("formatTimer", () => {
  it("formats seconds as m:ss with zero padding", () => {
    expect(formatTimer(0)).toBe("0:00");
    expect(formatTimer(9)).toBe("0:09");
    expect(formatTimer(75)).toBe("1:15");
    expect(formatTimer(600)).toBe("10:00");
  });
});

describe("roleTotal", () => {
  it("sums the three role counts", () => {
    expect(roleTotal({ civilian: 3, undercover: 1, mrWhite: 1 })).toBe(5);
    expect(roleTotal({ civilian: 0, undercover: 0, mrWhite: 0 })).toBe(0);
  });
});
