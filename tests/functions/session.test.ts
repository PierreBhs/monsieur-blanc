/**
 * Test plan — src/game/session.ts (scoring, history, ranking)
 *
 * Functions under test:
 *   - createRoundHistoryEntry: builds a history record + per-player scores
 *   - appendRoundHistory:      prepends newest, trims to the limit
 *   - calculateSessionStats:   tallies team wins and ranks players by points
 *
 * Scenarios: each win type's scoring, the history limit, ranking with
 * tie-breaks, the legacy entry fallback (no `scores` field), and empty input.
 */
import { describe, expect, it } from "vitest";
import {
  appendRoundHistory,
  calculateSessionStats,
  createRoundHistoryEntry,
  type RoundHistoryEntry,
} from "../../src/game/session";
import type { PlayerAssignment } from "../../src/game/types";

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
      scores: [
        { name: "Ada", points: 2 },
        { name: "Ben", points: 2 },
      ],
    });
  });

  it("records only Mr. White for a Mr. White guess win", () => {
    const entry = createRoundHistoryEntry(
      assignments,
      { state: "won", winner: "mrWhite", reason: "Dee guessed France." },
      "2026-06-04T12:00:00.000Z",
    );

    expect(entry.winners).toEqual(["Dee"]);
    expect(entry.scores).toEqual([{ name: "Dee", points: 6 }]);
  });

  it("awards undercover and Mr. White points for an infiltrator win", () => {
    const entry = createRoundHistoryEntry(
      assignments,
      { state: "won", winner: "infiltrators", reason: "Only 1 civilian remains." },
      "2026-06-04T12:00:00.000Z",
    );

    expect(entry.scores).toEqual([
      { name: "Cam", points: 10 },
      { name: "Dee", points: 6 },
    ]);
  });
});

describe("appendRoundHistory", () => {
  it("keeps the newest entries first and applies the limit", () => {
    const previous = [historyEntry("1"), historyEntry("2")];

    expect(appendRoundHistory(previous, historyEntry("3"), 2).map((entry) => entry.id)).toEqual(["3", "1"]);
  });
});

describe("calculateSessionStats", () => {
  it("counts team wins and ranks all players by points", () => {
    const stats = calculateSessionStats(
      [
        {
          ...historyEntry("1"),
          winner: "civilians",
          winners: ["Ada", "Ben"],
          scores: [
            { name: "Ada", points: 2 },
            { name: "Ben", points: 2 },
          ],
        },
        { ...historyEntry("2"), winner: "mrWhite", winners: ["Dee"], scores: [{ name: "Dee", points: 6 }] },
        {
          ...historyEntry("3"),
          winner: "civilians",
          winners: ["Ada", "Ben"],
          scores: [
            { name: "Ada", points: 2 },
            { name: "Ben", points: 2 },
          ],
        },
      ],
      [
        { id: "1", name: "Ada" },
        { id: "2", name: "Ben" },
        { id: "3", name: "Cam" },
        { id: "4", name: "Dee" },
      ],
    );

    expect(stats.roundsPlayed).toBe(3);
    expect(stats.wins).toEqual({ civilians: 2, infiltrators: 0, mrWhite: 1 });
    expect(stats.players).toEqual([
      { name: "Dee", points: 6, wins: 1 },
      { name: "Ada", points: 4, wins: 2 },
      { name: "Ben", points: 4, wins: 2 },
      { name: "Cam", points: 0, wins: 0 },
    ]);
  });

  it("returns empty totals for no history and no players", () => {
    expect(calculateSessionStats([])).toEqual({
      roundsPlayed: 0,
      wins: { civilians: 0, infiltrators: 0, mrWhite: 0 },
      players: [],
    });
  });

  it("falls back to 1 point per winner for legacy entries without scores", () => {
    const legacyEntry = {
      id: "legacy",
      completedAt: "2026-06-04T12:00:00.000Z",
      winner: "civilians",
      reason: "All infiltrators are out.",
      word: "France",
      winners: ["Ada", "Ben"],
    } as unknown as RoundHistoryEntry;

    const stats = calculateSessionStats([legacyEntry]);

    expect(stats.players).toEqual([
      { name: "Ada", points: 1, wins: 1 },
      { name: "Ben", points: 1, wins: 1 },
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
    scores: [
      { name: "Cam", points: 10 },
      { name: "Dee", points: 6 },
    ],
  };
}
