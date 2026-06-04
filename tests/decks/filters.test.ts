import { describe, expect, it } from "vitest";
import { allCategories, anyDifficulty, deckCategoryOptions, filterWordPairs, wordPairDifficulty } from "../../src/decks/filters";
import type { WordPair } from "../../src/game/types";

const deck: WordPair[] = [
  { id: "france-italy", category: "countries", civilian: "France", undercover: "Italy" },
  { id: "red-carpet", category: "places", civilian: "Red carpet", undercover: "Catwalk" },
  { id: "strawberry-raspberry", category: "food", civilian: "Strawberry", undercover: "Raspberry" },
];

describe("filterWordPairs", () => {
  it("filters by category", () => {
    expect(filterWordPairs(deck, { category: "countries", difficulty: anyDifficulty })).toEqual([deck[0]]);
  });

  it("filters by derived difficulty", () => {
    expect(filterWordPairs(deck, { category: allCategories, difficulty: "tricky" })).toEqual([deck[1]]);
  });
});

describe("deckCategoryOptions", () => {
  it("returns sorted categories with counts", () => {
    expect(deckCategoryOptions(deck)).toEqual([
      { value: "countries", label: "countries", count: 1 },
      { value: "food", label: "food", count: 1 },
      { value: "places", label: "places", count: 1 },
    ]);
  });
});

describe("wordPairDifficulty", () => {
  it("treats short single-word pairs as easy", () => {
    expect(wordPairDifficulty(deck[0])).toBe("easy");
  });

  it("treats multi-word pairs as tricky", () => {
    expect(wordPairDifficulty(deck[1])).toBe("tricky");
  });
});
