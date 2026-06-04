/**
 * Test plan — src/game/core.ts (core game logic)
 *
 * Functions under test:
 *   - createRound:        config validation + role/word assignment for a round
 *   - assignRoles:        maps the role pool onto players (RNG-shuffled)
 *   - selectWordPair:     draws a pair from the deck via the injected RNG
 *   - validateConfig:     enforces player/role/deck rules (covered via createRound)
 *   - evaluateGameStatus: win/loss/playing evaluation from eliminations
 *   - chooseRandomActiveAssignment: picks the next active turn starter
 *   - isCorrectMrWhiteGuess: case/space-insensitive word match
 *
 * Scenarios: happy paths, every validation/error path, win-condition edge cases
 * (only 1 civilian left, no civilians, Mr. White survival), turn progression
 * (skip eliminated, avoid previous starter, no active players), and RNG
 * determinism/non-determinism. All RNG is injected so tests are deterministic.
 */
import { describe, expect, it } from "vitest";
import {
  assignRoles,
  chooseRandomActiveAssignment,
  createRound,
  evaluateGameStatus,
  isCorrectMrWhiteGuess,
  selectWordPair,
} from "../../src/game/core";
import type { PlayerInput, RoleCounts, WordPair } from "../../src/game/types";

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

  it("rejects a game with no civilians", () => {
    expect(() =>
      createRound({ players, counts: { civilian: 0, undercover: 3, mrWhite: 2 }, deck }),
    ).toThrow("at least 1 civilian");
  });

  it("rejects a game with no undercovers", () => {
    expect(() =>
      createRound({ players, counts: { civilian: 3, undercover: 0, mrWhite: 2 }, deck }),
    ).toThrow("at least 1 undercover");
  });

  it("rejects duplicate player names, ignoring case and surrounding spaces", () => {
    const duplicateNamePlayers: PlayerInput[] = [
      { id: "1", name: "Ada" },
      { id: "2", name: "Ben" },
      { id: "3", name: "Cam" },
      { id: "4", name: "Dee" },
      { id: "5", name: " ada " },
    ];

    expect(() => createRound({ players: duplicateNamePlayers, counts, deck })).toThrow(
      "unique name",
    );
  });

  it("draws a valid word pair from the deck", () => {
    const multiDeck: WordPair[] = [
      { id: "a", category: "x", civilian: "Apple", undercover: "Pear" },
      { id: "b", category: "y", civilian: "Dog", undercover: "Wolf" },
    ];

    const round = createRound({ players, counts, deck: multiDeck });

    expect(multiDeck).toContainEqual(round.wordPair);
    const civilian = round.assignments.find((assignment) => assignment.role === "civilian");
    expect(civilian?.word).toBe(round.wordPair.civilian);
  });

  it("does not always produce the same role arrangement across seeds", () => {
    const arrangements = new Set(
      [0, 0.2, 0.4, 0.6, 0.8, 0.99].map((seed) => {
        const round = createRound({ players, counts, deck }, () => seed);
        return round.assignments.map((assignment) => assignment.role).join(",");
      }),
    );

    // Role assignment is RNG-driven, so different seeds yield different layouts.
    expect(arrangements.size).toBeGreaterThan(1);
  });
});

describe("assignRoles", () => {
  it("produces exactly one entry per player", () => {
    const assignments = assignRoles(players, counts, fixedRng);

    expect(assignments).toHaveLength(players.length);
    expect(assignments.map((assignment) => assignment.player.id).sort()).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("hands out exactly the requested number of each role", () => {
    const assignments = assignRoles(players, counts, fixedRng);
    const roleOf = (role: string) => assignments.filter((assignment) => assignment.role === role).length;

    expect(roleOf("civilian")).toBe(3);
    expect(roleOf("undercover")).toBe(1);
    expect(roleOf("mrWhite")).toBe(1);
  });

  it("is deterministic for a fixed RNG seed", () => {
    const first = assignRoles(players, counts, () => 0.5).map((assignment) => assignment.role);
    const second = assignRoles(players, counts, () => 0.5).map((assignment) => assignment.role);

    expect(first).toEqual(second);
  });
});

describe("selectWordPair", () => {
  const multiDeck: WordPair[] = [
    { id: "a", category: "x", civilian: "Apple", undercover: "Pear" },
    { id: "b", category: "y", civilian: "Dog", undercover: "Wolf" },
    { id: "c", category: "z", civilian: "Sun", undercover: "Moon" },
  ];

  it("selects the pair addressed by the RNG", () => {
    expect(selectWordPair(multiDeck, () => 0)).toBe(multiDeck[0]);
    expect(selectWordPair(multiDeck, () => 0.5)).toBe(multiDeck[1]);
    expect(selectWordPair(multiDeck, () => 0.99)).toBe(multiDeck[2]);
  });

  it("throws on an empty deck", () => {
    expect(() => selectWordPair([], fixedRng)).toThrow("empty");
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
      players,
      counts: { civilian: 2, undercover: 2, mrWhite: 1 },
      deck,
    }, fixedRng);

    expect(evaluateGameStatus(round.assignments, new Set())).toMatchObject({
      state: "playing",
    });
  });

  it("lets infiltrators win when only 1 civilian and undercovers remain", () => {
    const round = createRound({
      players,
      counts: { civilian: 3, undercover: 2, mrWhite: 0 },
      deck,
    }, fixedRng);
    const eliminatedIds = new Set(
      round.assignments
        .filter((assignment) => assignment.role === "civilian")
        .slice(0, 2)
        .map((assignment) => assignment.player.id),
    );

    expect(evaluateGameStatus(round.assignments, eliminatedIds)).toMatchObject({
      state: "won",
      winner: "infiltrators",
    });
  });

  it("keeps playing when Mr. White remains with more than 1 civilian and no undercovers", () => {
    const round = createRound({ players, counts, deck }, fixedRng);
    const eliminatedIds = new Set(
      round.assignments
        .filter((assignment) => assignment.role === "undercover")
        .map((assignment) => assignment.player.id),
    );

    expect(evaluateGameStatus(round.assignments, eliminatedIds)).toMatchObject({
      state: "playing",
    });
  });

  it("lets Mr. White win when the final 3 players are a civilian, an undercover, and Mr. White", () => {
    const round = createRound({ players, counts, deck }, fixedRng);
    const eliminatedIds = new Set(
      round.assignments
        .filter((assignment) => assignment.role === "civilian")
        .slice(0, 2)
        .map((assignment) => assignment.player.id),
    );

    expect(evaluateGameStatus(round.assignments, eliminatedIds)).toMatchObject({
      state: "won",
      winner: "mrWhite",
    });
  });

  it("keeps playing in the 3-player civilian undercover Mr. White setup", () => {
    const round = createRound({
      players: players.slice(0, 3),
      counts: { civilian: 1, undercover: 1, mrWhite: 1 },
      deck,
    }, fixedRng);

    expect(evaluateGameStatus(round.assignments, new Set())).toMatchObject({
      state: "playing",
    });
  });

  it("lets infiltrators win with 1 civilian in larger rounds", () => {
    const round = createRound({
      players: players.slice(0, 4),
      counts: { civilian: 1, undercover: 2, mrWhite: 1 },
      deck,
    }, fixedRng);

    expect(evaluateGameStatus(round.assignments, new Set())).toMatchObject({
      state: "won",
      winner: "infiltrators",
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

  it("matches regardless of which side carries the casing", () => {
    expect(isCorrectMrWhiteGuess("FRANCE", "france")).toBe(true);
  });

  it("rejects the wrong word", () => {
    expect(isCorrectMrWhiteGuess("Italy", "France")).toBe(false);
  });

  it("rejects an empty or whitespace-only guess against a real word", () => {
    expect(isCorrectMrWhiteGuess("", "France")).toBe(false);
    expect(isCorrectMrWhiteGuess("   ", "France")).toBe(false);
  });
});
