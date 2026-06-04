import { describe, expect, it } from "vitest";
import { wordPairs } from "../../src/decks/wordPairs";

describe("wordPairs", () => {
  it("exports decoded word pairs", () => {
    const decodeFixture = (value: string) =>
      value.replace(/[a-z]/gi, (letter) => {
        const alphabetStart = letter >= "a" && letter <= "z" ? 97 : 65;
        const charOffset = letter.charCodeAt(0) - alphabetStart;

        return String.fromCharCode(alphabetStart + ((charOffset - 7 + 26) % 26));
      });

    expect(wordPairs[0]).toEqual({
      id: decodeFixture("myhujl-pahsf"),
      category: decodeFixture("jvbuayplz"),
      civilian: decodeFixture("Myhujl"),
      undercover: decodeFixture("Pahsf"),
    });
  });
});
