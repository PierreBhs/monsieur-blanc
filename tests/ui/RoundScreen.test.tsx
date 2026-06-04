/**
 * Test plan — src/components/RoundScreen.tsx (in-progress round UI)
 *
 * Component under test: <RoundScreen {...props} /> (presentational — the phase
 * machine lives in App.tsx; here we assert each phase renders the right UI and
 * wires the right callback).
 *
 * Scenarios (instruction modules 5/6/8/9 at the view layer):
 *   - reveal:            shows the reveal button, then the word + continue.
 *   - turn:              shows the clue prompt and starts the vote.
 *   - vote:              one elimination choice per active player.
 *   - mrWhiteGuess:        guess input wired to submit/skip.
 *   - undercoverGuess:     guess input wired to submit/skip.
 *   - eliminationReveal: announces who is out and continues.
 *   - gameOver:          shows the winner and reason.
 */
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoundScreen } from "../../src/components/RoundScreen";
import type { PlayerAssignment, Round } from "../../src/game/types";

const assignments: PlayerAssignment[] = [
  { player: { id: "1", name: "Ada" }, role: "civilian", word: "France" },
  { player: { id: "2", name: "Ben" }, role: "undercover", word: "Italy" },
  { player: { id: "3", name: "Cam" }, role: "mrWhite" },
];

const round: Round = {
  wordPair: { id: "france-italy", category: "countries", civilian: "France", undercover: "Italy" },
  assignments,
};

function makeProps(overrides: Partial<ComponentProps<typeof RoundScreen>> = {}) {
  return {
    round,
    phase: "reveal",
    activeAssignment: assignments[0],
    activeIndex: 0,
    activeAssignments: assignments,
    eliminatedIds: new Set<string>(),
    turnStarter: null,
    isRevealed: false,
    showRoles: false,
    timerEnabled: false,
    timerRunning: false,
    timerSeconds: 120,
    remainingSeconds: 120,
    lastElimination: "",
    undercoverBonusPoints: 0,
    selectedElimination: null,
    pendingElimination: null,
    mrWhiteGuess: "",
    undercoverGuess: "",
    addPlayerName: "",
    roundError: "",
    gameStatus: { state: "playing" },
    roundHistory: [],
    sessionStats: { roundsPlayed: 0, wins: { civilians: 0, infiltrators: 0, mrWhite: 0 }, players: [] },
    onBackToSetup: vi.fn(),
    onContinuePlaying: vi.fn(),
    onReveal: vi.fn(),
    onNextPlayer: vi.fn(),
    onStartVote: vi.fn(),
    onSelectElimination: vi.fn(),
    onConfirmElimination: vi.fn(),
    onMrWhiteGuessChange: vi.fn(),
    onSubmitMrWhiteGuess: vi.fn(),
    onSkipMrWhiteGuess: vi.fn(),
    onUndercoverGuessChange: vi.fn(),
    onSubmitUndercoverGuess: vi.fn(),
    onSkipUndercoverGuess: vi.fn(),
    onOpenAddPlayer: vi.fn(),
    onCancelAddPlayer: vi.fn(),
    onAddPlayerNameChange: vi.fn(),
    onConfirmAddPlayer: vi.fn(),
    onContinueAfterElimination: vi.fn(),
    onTimerPause: vi.fn(),
    onTimerReset: vi.fn(),
    onTimerStart: vi.fn(),
    ...overrides,
  } satisfies ComponentProps<typeof RoundScreen>;
}

describe("RoundScreen", () => {
  it("reveal phase hides the word until the reveal button is pressed", async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();
    render(<RoundScreen {...makeProps({ onReveal })} />);

    expect(screen.queryByText("France")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Reveal word" }));

    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("reveal phase shows the word and advances on continue", async () => {
    const user = userEvent.setup();
    const onNextPlayer = vi.fn();
    render(<RoundScreen {...makeProps({ isRevealed: true, onNextPlayer })} />);

    expect(screen.getAllByText("France").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Hide and continue" }));

    expect(onNextPlayer).toHaveBeenCalledTimes(1);
  });

  it("turn phase prompts for a clue and starts the vote", async () => {
    const user = userEvent.setup();
    const onStartVote = vi.fn();
    render(<RoundScreen {...makeProps({ phase: "turn", turnStarter: assignments[0], onStartVote })} />);

    expect(screen.getByText(/give one clue word/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Vote after discussion" }));

    expect(onStartVote).toHaveBeenCalledTimes(1);
  });

  it("vote phase selects a player before showing the vote-out action", async () => {
    const user = userEvent.setup();
    const onSelectElimination = vi.fn();
    render(<RoundScreen {...makeProps({ phase: "vote", onSelectElimination })} />);

    expect(screen.queryByRole("button", { name: /Vote out/i })).toBeNull();

    const voteButtons = screen.getAllByText("Select");
    expect(voteButtons).toHaveLength(assignments.length);

    await user.click(voteButtons[1].closest("button")!);
    expect(onSelectElimination).toHaveBeenCalledWith(assignments[1]);
  });

  it("vote phase confirms the selected player", async () => {
    const user = userEvent.setup();
    const onConfirmElimination = vi.fn();
    render(
      <RoundScreen
        {...makeProps({
          phase: "vote",
          selectedElimination: assignments[1],
          onConfirmElimination,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Vote out Ben" }));

    expect(onConfirmElimination).toHaveBeenCalledTimes(1);
  });

  it("mrWhiteGuess phase wires the guess input to submit and skip", async () => {
    const user = userEvent.setup();
    const onMrWhiteGuessChange = vi.fn();
    const onSubmitMrWhiteGuess = vi.fn();
    const onSkipMrWhiteGuess = vi.fn();
    render(
      <RoundScreen
        {...makeProps({
          phase: "mrWhiteGuess",
          pendingElimination: assignments[2],
          onMrWhiteGuessChange,
          onSubmitMrWhiteGuess,
          onSkipMrWhiteGuess,
        })}
      />,
    );

    await user.type(screen.getByLabelText("Mr. White word guess"), "x");
    expect(onMrWhiteGuessChange).toHaveBeenCalledWith("x");

    await user.click(screen.getByRole("button", { name: "Submit guess" }));
    expect(onSubmitMrWhiteGuess).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Skip guess" }));
    expect(onSkipMrWhiteGuess).toHaveBeenCalledWith(assignments[2]);
  });

  it("addPlayer phase wires name and confirm actions", async () => {
    const user = userEvent.setup();
    const onAddPlayerNameChange = vi.fn();
    const onConfirmAddPlayer = vi.fn();
    const onCancelAddPlayer = vi.fn();
    render(
      <RoundScreen
        {...makeProps({
          phase: "addPlayer",
          onAddPlayerNameChange,
          onConfirmAddPlayer,
          onCancelAddPlayer,
        })}
      />,
    );

    await user.type(screen.getByLabelText("New player name"), "Eve");
    expect(onAddPlayerNameChange).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Add and reveal" }));
    expect(onConfirmAddPlayer).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancelAddPlayer).toHaveBeenCalledTimes(1);
  });

  it("shows the add-player control while the round is still playing", () => {
    const onOpenAddPlayer = vi.fn();
    render(<RoundScreen {...makeProps({ phase: "turn", onOpenAddPlayer })} />);

    expect(screen.getByRole("button", { name: "Add player" })).toBeInTheDocument();
  });

  it("undercoverGuess phase wires the guess input to submit and skip", async () => {
    const user = userEvent.setup();
    const onUndercoverGuessChange = vi.fn();
    const onSubmitUndercoverGuess = vi.fn();
    const onSkipUndercoverGuess = vi.fn();
    render(
      <RoundScreen
        {...makeProps({
          phase: "undercoverGuess",
          pendingElimination: assignments[1],
          onUndercoverGuessChange,
          onSubmitUndercoverGuess,
          onSkipUndercoverGuess,
        })}
      />,
    );

    await user.type(screen.getByLabelText("Undercover word guess"), "x");
    expect(onUndercoverGuessChange).toHaveBeenCalledWith("x");

    await user.click(screen.getByRole("button", { name: "Submit guess" }));
    expect(onSubmitUndercoverGuess).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Skip guess" }));
    expect(onSkipUndercoverGuess).toHaveBeenCalledWith(assignments[1]);
  });

  it("eliminationReveal phase highlights an undercover bonus point", () => {
    render(
      <RoundScreen
        {...makeProps({
          phase: "eliminationReveal",
          pendingElimination: assignments[1],
          undercoverBonusPoints: 1,
        })}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("+1 point");
    expect(screen.getByText("Bonus earned")).toBeInTheDocument();
  });

  it("eliminationReveal phase announces who is out and continues", async () => {
    const user = userEvent.setup();
    const onContinueAfterElimination = vi.fn();
    render(
      <RoundScreen
        {...makeProps({
          phase: "eliminationReveal",
          pendingElimination: assignments[1],
          lastElimination: "Ben is out.",
          onContinueAfterElimination,
        })}
      />,
    );

    expect(screen.getByText("Ben is eliminated")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onContinueAfterElimination).toHaveBeenCalledTimes(1);
  });

  it("gameOver phase shows the winning side and reason", () => {
    render(
      <RoundScreen
        {...makeProps({
          phase: "gameOver",
          gameStatus: { state: "won", winner: "civilians", reason: "All infiltrators are out." },
        })}
      />,
    );

    expect(screen.getByRole("heading", { name: /Civilians win/i })).toBeInTheDocument();
    expect(screen.getByText("All infiltrators are out.")).toBeInTheDocument();
  });
});
