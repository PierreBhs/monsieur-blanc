import { describe, expect, it } from "vitest";
import {
  appendRoundHistory,
  calculateSessionStats,
  createRoundHistoryEntry,
  type RoundHistoryEntry,
} from "./session";
import type { PlayerAssignment } from "./types";

const assignments: PlayerAssignment[] = [
  { player: { id: "1", name: "Ada" }, role: "civilian", word: "France" },
  { player: { id: "2", name: "Ben" }, role: "civilian", word: "France" },
  { player: { id: "3", name: "Cam" }, role: "undercover", word: "Italy" },
  { player: { id: "4", name: "Dee" }, role: "mrWhite" },
];

describe("createRoundHistoryEntry", () => {
  it("records civilian winners and the civilian word", () => {
    const entry = createRoundHistoryEntry(
      assignments,
      { state: "won", winner: "civilians", reason: "All infiltrators are out." },
      "2026-06-04T12:00:00.000Z",
    );

    expect(entry).toMatchObject({
      winner: "civilians",
      word: "France",
      winners: ["Ada", "Ben"],
    });
  });

  it("records only Mr. White for a Mr. White guess win", () => {
    const entry = createRoundHistoryEntry(
      assignments,
      { state: "won", winner: "mrWhite", reason: "Dee guessed France." },
      "2026-06-04T12:00:00.000Z",
    );

    expect(entry.winners).toEqual(["Dee"]);
  });
});

describe("appendRoundHistory", () => {
  it("keeps the newest entries first and applies the limit", () => {
    const previous = [historyEntry("1"), historyEntry("2")];

    expect(appendRoundHistory(previous, historyEntry("3"), 2).map((entry) => entry.id)).toEqual(["3", "1"]);
  });
});

describe("calculateSessionStats", () => {
  it("counts team wins and ranks player wins", () => {
    const stats = calculateSessionStats([
      { ...historyEntry("1"), winner: "civilians", winners: ["Ada", "Ben"] },
      { ...historyEntry("2"), winner: "mrWhite", winners: ["Dee"] },
      { ...historyEntry("3"), winner: "civilians", winners: ["Ada", "Ben"] },
    ]);

    expect(stats.roundsPlayed).toBe(3);
    expect(stats.wins).toEqual({ civilians: 2, infiltrators: 0, mrWhite: 1 });
    expect(stats.players.slice(0, 2)).toEqual([
      { name: "Ada", wins: 2 },
      { name: "Ben", wins: 2 },
    ]);
  });
});

function historyEntry(id: string): RoundHistoryEntry {
  return {
    id,
    completedAt: `2026-06-04T12:00:0${id}.000Z`,
    winner: "infiltrators",
    reason: "Only 1 civilian remains.",
    word: "France",
    winners: ["Cam", "Dee"],
  };
}
