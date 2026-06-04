/**
 * Test plan — src/decks/wordDescriptions.ts (word help lookup)
 *
 * Function under test:
 *   - getWordDescription: looks up a word's multi-language description.
 *
 * Scenarios: a known word returns a description covering every supported
 * language; lookups are case-insensitive and trimmed; unknown words and
 * undefined return null. A known word is derived from the data itself so the
 * test stays valid as the deck grows.
 */
import { describe, expect, it } from "vitest";
import {
  getWordDescription,
  supportedLanguages,
  wordDescriptions,
} from "../../src/decks/wordDescriptions";

const knownWord = Object.keys(wordDescriptions)[0];

describe("getWordDescription", () => {
  it("has at least one word in the dataset to look up", () => {
    expect(knownWord).toBeTruthy();
  });

  it("returns a description covering every supported language", () => {
    const description = getWordDescription(knownWord);

    expect(description).not.toBeNull();
    for (const language of supportedLanguages) {
      expect(description?.[language]?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it("looks up words case-insensitively and trims surrounding spaces", () => {
    const expected = getWordDescription(knownWord);

    expect(getWordDescription(knownWord.toUpperCase())).toEqual(expected);
    expect(getWordDescription(`  ${knownWord}  `)).toEqual(expected);
  });

  it("returns null for an unknown word", () => {
    expect(getWordDescription("definitely-not-a-deck-word")).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(getWordDescription(undefined)).toBeNull();
  });
});
