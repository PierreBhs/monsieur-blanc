/**
 * Test plan — src/WordHelp.tsx (per-word help modal)
 *
 * Component under test: <WordHelp word="..." />
 *
 * Scenarios:
 *   - The help button opens a modal dialog.
 *   - The modal shows the word and its English description by default.
 *   - Selecting a language flag switches the description text.
 *   - The close button dismisses the modal.
 *   - An unknown word shows the fallback message.
 *
 * A known word is derived from the description data so the test stays valid as
 * the deck grows.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WordHelp } from "../../src/WordHelp";
import { getWordDescription, wordDescriptions } from "../../src/decks/wordDescriptions";

const knownWord = Object.keys(wordDescriptions)[0];
const description = getWordDescription(knownWord)!;

describe("WordHelp", () => {
  it("opens a dialog showing the word and its English description", async () => {
    const user = userEvent.setup();
    render(<WordHelp word={knownWord} />);

    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Explain this word" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: knownWord })).toBeInTheDocument();
    expect(screen.getByText(description.en)).toBeInTheDocument();
  });

  it("switches the description when another language flag is chosen", async () => {
    const user = userEvent.setup();
    render(<WordHelp word={knownWord} />);

    await user.click(screen.getByRole("button", { name: "Explain this word" }));
    await user.click(screen.getByRole("button", { name: "Italiano" }));

    expect(screen.getByText(description.it)).toBeInTheDocument();
  });

  it("closes the dialog with the close button", async () => {
    const user = userEvent.setup();
    render(<WordHelp word={knownWord} />);

    await user.click(screen.getByRole("button", { name: "Explain this word" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows a fallback message for a word with no description", async () => {
    const user = userEvent.setup();
    render(<WordHelp word="definitely-not-a-deck-word" />);

    await user.click(screen.getByRole("button", { name: "Explain this word" }));

    expect(screen.getByText(/No simple description is available/i)).toBeInTheDocument();
  });
});
