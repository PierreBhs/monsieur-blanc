/**
 * Test plan — src/decks/filters.ts (deck category/difficulty filtering)
 *
 * Functions under test:
 *   - filterWordPairs:     filters a deck by category and derived difficulty
 *   - deckCategoryOptions: builds sorted {value,label,count} category options
 *   - wordPairDifficulty:  derives "easy"/"tricky" from word shape
 *
 * Scenarios: each filter axis alone, both combined, the "all"/"any" pass-through
 * sentinels, no-match and empty-deck results, and every difficulty heuristic
 * branch (multi-word, hyphenated, long, and short single words).
 */
import { describe, expect, it } from "vitest";
import {
  allCategories,
  anyDifficulty,
  categoryGroupLabel,
  deckCategoryOptions,
  filterWordPairs,
  wordPairDifficulty,
} from "../../src/decks/filters";
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

  it("filters by broad category group", () => {
    expect(filterWordPairs(deck, { category: "Places & Travel", difficulty: anyDifficulty })).toEqual([
      deck[0],
      deck[1],
    ]);
  });

  it("filters by derived difficulty", () => {
    expect(filterWordPairs(deck, { category: allCategories, difficulty: "tricky" })).toEqual([deck[1]]);
  });

  it("returns the whole deck for the all/any sentinels", () => {
    expect(filterWordPairs(deck, { category: allCategories, difficulty: anyDifficulty })).toEqual(deck);
  });

  it("applies category and difficulty together", () => {
    expect(filterWordPairs(deck, { category: "places", difficulty: "tricky" })).toEqual([deck[1]]);
    expect(filterWordPairs(deck, { category: "countries", difficulty: "tricky" })).toEqual([]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterWordPairs(deck, { category: "nonexistent", difficulty: anyDifficulty })).toEqual([]);
  });
});

describe("deckCategoryOptions", () => {
  it("returns sorted broad categories with counts", () => {
    expect(deckCategoryOptions(deck)).toEqual([
      { value: "Food & Drink", label: "Food & Drink", count: 1 },
      { value: "Places & Travel", label: "Places & Travel", count: 2 },
    ]);
  });

  it("tallies multiple pairs that share a broad category", () => {
    const grouped: WordPair[] = [
      ...deck,
      { id: "spain-portugal", category: "countries", civilian: "Spain", undercover: "Portugal" },
    ];

    expect(deckCategoryOptions(grouped)[1]).toEqual({ value: "Places & Travel", label: "Places & Travel", count: 3 });
  });

  it("returns no options for an empty deck", () => {
    expect(deckCategoryOptions([])).toEqual([]);
  });
});

describe("categoryGroupLabel", () => {
  it("maps fine-grained deck labels to broader groups", () => {
    expect(categoryGroupLabel("sweets")).toBe("Food & Drink");
    expect(categoryGroupLabel("security")).toBe("Mystery & Danger");
  });

  it("falls back to the objects group for unknown categories", () => {
    expect(categoryGroupLabel("unknown")).toBe("Objects & Tech");
  });
});

describe("wordPairDifficulty", () => {
  it("treats short single-word pairs as easy", () => {
    expect(wordPairDifficulty(deck[0])).toBe("easy");
    expect(wordPairDifficulty(deck[2])).toBe("easy");
  });

  it("treats multi-word pairs as tricky", () => {
    expect(wordPairDifficulty(deck[1])).toBe("tricky");
  });

  it("treats hyphenated words as tricky", () => {
    expect(
      wordPairDifficulty({ id: "x", category: "c", civilian: "Mother-in-law", undercover: "Cat" }),
    ).toBe("tricky");
  });

  it("treats long single words (over 12 chars) as tricky", () => {
    expect(
      wordPairDifficulty({ id: "x", category: "c", civilian: "Constantinople", undercover: "Cat" }),
    ).toBe("tricky");
  });
});
