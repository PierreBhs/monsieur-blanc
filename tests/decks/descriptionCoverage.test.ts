import { describe, expect, it } from "vitest";
import { wordPairs } from "../../src/decks/wordPairs";
import {
  getWordDescription,
  supportedLanguages,
} from "../../src/decks/wordDescriptions";

// Every word a player can be dealt (both the civilian and the undercover word of
// each pair) must have a help description in every supported language. A missing
// translation would show the "no description available" fallback in the UI.
describe("deck description coverage", () => {
  const deckWords = Array.from(
    new Set(wordPairs.flatMap((pair) => [pair.civilian, pair.undercover])),
  );

  it("covers every deck word in all supported languages", () => {
    const missing: string[] = [];

    for (const word of deckWords) {
      const description = getWordDescription(word);

      if (!description) {
        missing.push(`"${word}": no description at all`);
        continue;
      }

      for (const language of supportedLanguages) {
        if (!description[language] || description[language].trim().length === 0) {
          missing.push(`"${word}": missing ${language}`);
        }
      }
    }

    expect(missing, `Untranslated deck words:\n${missing.join("\n")}`).toEqual([]);
  });
});
