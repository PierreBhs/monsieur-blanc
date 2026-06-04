/**
 * Test plan — src/App.tsx (game orchestration / state machine)
 *
 * Component under test: <App /> (the full setup -> round flow). App owns all the
 * state the instruction calls out as separate "modules": player management,
 * phase transitions, voting/elimination, and the Mr. White final guess.
 *
 * Scenarios:
 *   - Module 1 (players): starts in the setup/lobby; adding grows the roster;
 *     removing below three is blocked with an error; empty names block start.
 *   - Module 8 (state): setup has no round UI; starting moves to the private
 *     reveal; "Back to setup" resets.
 *   - Module 9 (turns): revealing every player advances to the turn phase.
 *   - Modules 5/6 (vote + final guess): voting out Mr. White opens the guess
 *     prompt, and a correct guess wins the game for Mr. White.
 *
 * Determinism: Math.random is stubbed to 0 so role/word assignment is fixed; the
 * same round is reproduced with createRound(..., () => 0) to locate Mr. White.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { createRound } from "../../src/game/core";
import { wordPairs } from "../../src/decks/wordPairs";
import type { PlayerInput, RoleCounts } from "../../src/game/types";

const seededPlayers: PlayerInput[] = [
  { id: "p1", name: "Ada" },
  { id: "p2", name: "Ben" },
  { id: "p3", name: "Cam" },
];
const seededCounts: RoleCounts = { civilian: 1, undercover: 1, mrWhite: 1 };
const fourPlayerGame: PlayerInput[] = [
  { id: "p1", name: "Ada" },
  { id: "p2", name: "Ben" },
  { id: "p3", name: "Cam" },
  { id: "p4", name: "Dee" },
];
const fourPlayerCounts: RoleCounts = { civilian: 2, undercover: 1, mrWhite: 1 };

function seedNamedGame(gamePlayers = seededPlayers, gameCounts = seededCounts) {
  localStorage.setItem("mr-white.players", JSON.stringify(gamePlayers));
  localStorage.setItem("mr-white.counts", JSON.stringify(gameCounts));
}

// Reproduce the exact round App builds under the stubbed RNG (full deck, seed 0).
function expectedRound(gamePlayers = seededPlayers, gameCounts = seededCounts) {
  return createRound({ players: gamePlayers, counts: gameCounts, deck: wordPairs }, () => 0);
}

async function revealEveryPlayer(user: ReturnType<typeof userEvent.setup>, count: number) {
  for (let index = 0; index < count; index += 1) {
    await user.click(screen.getByRole("button", { name: "Reveal word" }));
    await user.click(screen.getByRole("button", { name: "Hide and continue" }));
  }
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App — setup / player management", () => {
  it("starts on the setup screen with no round UI", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Players" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start round" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reveal word" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Vote after discussion" })).toBeNull();
  });

  it("adds a player to the roster", async () => {
    const user = userEvent.setup();
    seedNamedGame();
    render(<App />);

    expect(screen.getAllByPlaceholderText(/^Player \d+$/)).toHaveLength(3);
    await user.click(screen.getByTitle("Add player"));

    expect(screen.getAllByPlaceholderText(/^Player \d+$/)).toHaveLength(4);
  });

  it("blocks removing a player below the three-player minimum", async () => {
    const user = userEvent.setup();
    seedNamedGame();
    render(<App />);

    await user.click(screen.getByTitle("Remove Ben"));

    expect(screen.getByText("Keep at least 3 players.")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText(/^Player \d+$/)).toHaveLength(3);
  });

  it("refuses to start a round when a player name is blank", async () => {
    const user = userEvent.setup();
    render(<App />); // default players have empty names

    await user.click(screen.getByRole("button", { name: "Start round" }));

    expect(screen.getByText(/Every player needs a name/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reveal word" })).toBeNull();
  });
});

describe("App — round flow", () => {
  it("transitions from setup to the private reveal when a round starts", async () => {
    const user = userEvent.setup();
    seedNamedGame();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Start round" }));

    expect(screen.getByText("Private reveal")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Players" })).toBeNull();
  });

  it("advances to the turn phase after every player has revealed", async () => {
    const user = userEvent.setup();
    seedNamedGame();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Start round" }));
    await revealEveryPlayer(user, seededPlayers.length);

    expect(screen.getByRole("button", { name: "Vote after discussion" })).toBeInTheDocument();
    expect(screen.getByText(/give one clue word/i)).toBeInTheDocument();
  });

  it("returns to setup via Back to setup", async () => {
    const user = userEvent.setup();
    seedNamedGame();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Start round" }));
    await user.click(screen.getByRole("button", { name: "Back to setup" }));

    expect(screen.getByRole("heading", { name: "Players" })).toBeInTheDocument();
  });

  it("adds a mid-round player with a random role and sends them to reveal", async () => {
    const user = userEvent.setup();
    seedNamedGame(fourPlayerGame, fourPlayerCounts);
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Start round" }));
    await revealEveryPlayer(user, fourPlayerGame.length);

    await user.click(screen.getByRole("button", { name: "Add player" }));
    await user.type(screen.getByLabelText("New player name"), "Eve");
    await user.click(screen.getByRole("button", { name: "Add and reveal" }));

    expect(screen.getByRole("button", { name: "Reveal word" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Eve" })).toBeInTheDocument();
    expect(screen.getByText("5/5")).toBeInTheDocument();
  });

  it("lets an eliminated undercover keep playing after a correct civilian-word guess", async () => {
    const user = userEvent.setup();
    seedNamedGame(fourPlayerGame, fourPlayerCounts);
    const round = expectedRound(fourPlayerGame, fourPlayerCounts);
    const undercoverName = round.assignments.find((assignment) => assignment.role === "undercover")!.player.name;

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Start round" }));
    await revealEveryPlayer(user, fourPlayerGame.length);
    await user.click(screen.getByRole("button", { name: "Vote after discussion" }));

    const eliminateUndercover = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes(undercoverName) && button.textContent?.includes("Select"));
    await user.click(eliminateUndercover!);
    await user.click(screen.getByRole("button", { name: `Vote out ${undercoverName}` }));

    await user.type(screen.getByLabelText("Undercover word guess"), round.wordPair.civilian);
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(screen.getByRole("status")).toHaveTextContent("+1 point");
    expect(screen.getByText(/Correct civilian word/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /win/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Vote after discussion" })).toBeInTheDocument();
  });

  it("lets Mr. White win the game with a correct final guess", async () => {
    const user = userEvent.setup();
    seedNamedGame();
    const round = expectedRound();
    const mrWhiteName = round.assignments.find((a) => a.role === "mrWhite")!.player.name;

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Start round" }));
    await revealEveryPlayer(user, seededPlayers.length);
    await user.click(screen.getByRole("button", { name: "Vote after discussion" }));

    // Vote out Mr. White -> the final-guess prompt opens.
    const eliminateMrWhite = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes(mrWhiteName) && button.textContent?.includes("Select"));
    await user.click(eliminateMrWhite!);
    await user.click(screen.getByRole("button", { name: `Vote out ${mrWhiteName}` }));

    const guessInput = screen.getByLabelText("Mr. White word guess");
    await user.type(guessInput, round.wordPair.civilian);
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(screen.getByRole("heading", { name: /Mr\. White win/i })).toBeInTheDocument();
  });

  it("removes players after finishing a game and returning to the menu", async () => {
    const user = userEvent.setup();
    seedNamedGame(fourPlayerGame, fourPlayerCounts);
    const round = expectedRound(fourPlayerGame, fourPlayerCounts);
    const mrWhiteName = round.assignments.find((a) => a.role === "mrWhite")!.player.name;

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Start round" }));
    await revealEveryPlayer(user, fourPlayerGame.length);
    await user.click(screen.getByRole("button", { name: "Vote after discussion" }));

    const eliminateMrWhite = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes(mrWhiteName) && button.textContent?.includes("Select"));
    await user.click(eliminateMrWhite!);
    await user.click(screen.getByRole("button", { name: `Vote out ${mrWhiteName}` }));
    await user.type(screen.getByLabelText("Mr. White word guess"), round.wordPair.civilian);
    await user.click(screen.getByRole("button", { name: "Submit guess" }));
    await user.click(screen.getByRole("button", { name: "Back to menu" }));

    await user.click(screen.getByTitle("Remove Ben"));

    await waitFor(() => expect(screen.getAllByPlaceholderText(/^Player \d+$/)).toHaveLength(3));
  });
});
