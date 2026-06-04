import { describe, expect, it } from "vitest";
import {
  chooseRandomActiveAssignment,
  createRound,
  evaluateGameStatus,
  isCorrectMrWhiteGuess,
} from "./core";
import type { PlayerInput, RoleCounts, WordPair } from "./types";

const players: PlayerInput[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Ben" },
  { id: "3", name: "Cam" },
  { id: "4", name: "Dee" },
  { id: "5", name: "Eli" },
];

const counts: RoleCounts = {
  civilian: 3,
  undercover: 1,
  mrWhite: 1,
};

const deck: WordPair[] = [
  {
    id: "france-italy",
    category: "countries",
    civilian: "France",
    undercover: "Italy",
  },
];

const fixedRng = () => 0;

describe("createRound", () => {
  it("assigns the exact requested role counts", () => {
    const round = createRound({ players, counts, deck }, fixedRng);

    expect(round.assignments.filter((assignment) => assignment.role === "civilian")).toHaveLength(3);
    expect(round.assignments.filter((assignment) => assignment.role === "undercover")).toHaveLength(1);
    expect(round.assignments.filter((assignment) => assignment.role === "mrWhite")).toHaveLength(1);
  });

  it("gives civilians and undercovers different words", () => {
    const round = createRound({ players, counts, deck }, fixedRng);
    const civilian = round.assignments.find((assignment) => assignment.role === "civilian");
    const undercover = round.assignments.find((assignment) => assignment.role === "undercover");

    expect(civilian?.word).toBe("France");
    expect(undercover?.word).toBe("Italy");
  });

  it("does not give Mr. White a word", () => {
    const round = createRound({ players, counts, deck }, fixedRng);
    const mrWhite = round.assignments.find((assignment) => assignment.role === "mrWhite");

    expect(mrWhite?.word).toBeUndefined();
  });

  it("rejects role counts that do not match the player count", () => {
    expect(() =>
      createRound({
        players,
        counts: { civilian: 2, undercover: 1, mrWhite: 1 },
        deck,
      }),
    ).toThrow("Role counts must match");
  });

  it("rejects an empty deck", () => {
    expect(() => createRound({ players, counts, deck: [] })).toThrow("empty");
  });
});

describe("evaluateGameStatus", () => {
  it("lets civilians win when every non-civilian is eliminated", () => {
    const round = createRound({ players, counts, deck }, fixedRng);
    const eliminatedIds = new Set(
      round.assignments
        .filter((assignment) => assignment.role !== "civilian")
        .map((assignment) => assignment.player.id),
    );

    expect(evaluateGameStatus(round.assignments, eliminatedIds)).toMatchObject({
      state: "won",
      winner: "civilians",
    });
  });

  it("keeps playing when infiltrators reach parity with multiple civilians", () => {
    const round = createRound({
      players: players.slice(0, 4),
      counts: { civilian: 2, undercover: 2, mrWhite: 0 },
      deck,
    }, fixedRng);

    expect(evaluateGameStatus(round.assignments, new Set())).toMatchObject({
      state: "playing",
    });
  });

  it("keeps playing when 1 civilian and 1 undercover remain", () => {
    const round = createRound({ players, counts, deck }, fixedRng);
    const eliminatedIds = new Set(
      round.assignments
        .filter((assignment) => assignment.role === "civilian")
        .slice(0, 2)
        .map((assignment) => assignment.player.id),
    );

    expect(evaluateGameStatus(round.assignments, eliminatedIds)).toMatchObject({
      state: "playing",
    });
  });

  it("lets undercovers win when no civilians remain", () => {
    const round = createRound({ players, counts, deck }, fixedRng);
    const eliminatedIds = new Set(
      round.assignments
        .filter((assignment) => assignment.role === "civilian")
        .map((assignment) => assignment.player.id),
    );

    expect(evaluateGameStatus(round.assignments, eliminatedIds)).toMatchObject({
      state: "won",
      winner: "infiltrators",
    });
  });

  it("lets civilians win when the final undercover is eliminated with 1 civilian left", () => {
    const round = createRound({
      players: players.slice(0, 3),
      counts: { civilian: 2, undercover: 1, mrWhite: 0 },
      deck,
    }, fixedRng);
    const eliminatedIds = new Set(
      round.assignments
        .filter((assignment) => assignment.role === "civilian" || assignment.role === "undercover")
        .slice(0, 2)
        .map((assignment) => assignment.player.id),
    );

    expect(evaluateGameStatus(round.assignments, eliminatedIds)).toMatchObject({
      state: "won",
      winner: "civilians",
    });
  });

  it("lets Mr. White win when undercovers are eliminated and Mr. White remains", () => {
    const round = createRound({
      players: players.slice(0, 3),
      counts: { civilian: 1, undercover: 1, mrWhite: 1 },
      deck,
    }, fixedRng);
    const eliminatedIds = new Set(
      round.assignments
        .filter((assignment) => assignment.role === "undercover")
        .map((assignment) => assignment.player.id),
    );

    expect(evaluateGameStatus(round.assignments, eliminatedIds)).toMatchObject({
      state: "won",
      winner: "mrWhite",
    });
  });
});

describe("chooseRandomActiveAssignment", () => {
  it("chooses only from players who are still active", () => {
    const round = createRound({ players, counts, deck }, fixedRng);
    const firstAssignment = round.assignments[0];
    const eliminatedIds = new Set(round.assignments.slice(1).map((assignment) => assignment.player.id));

    expect(chooseRandomActiveAssignment(round.assignments, eliminatedIds, fixedRng)).toBe(firstAssignment);
  });

  it("avoids the previous starter when another active player can start", () => {
    const round = createRound({ players, counts, deck }, fixedRng);

    expect(chooseRandomActiveAssignment(round.assignments, new Set(), fixedRng, "1").player.id).toBe("2");
  });

  it("rejects a turn with no active players", () => {
    const round = createRound({ players, counts, deck }, fixedRng);
    const eliminatedIds = new Set(round.assignments.map((assignment) => assignment.player.id));

    expect(() => chooseRandomActiveAssignment(round.assignments, eliminatedIds)).toThrow("no active players");
  });
});

describe("isCorrectMrWhiteGuess", () => {
  it("matches guesses without case or surrounding spaces", () => {
    expect(isCorrectMrWhiteGuess(" france ", "France")).toBe(true);
  });

  it("rejects the wrong word", () => {
    expect(isCorrectMrWhiteGuess("Italy", "France")).toBe(false);
  });
});
