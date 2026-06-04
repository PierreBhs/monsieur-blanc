/**
 * Test plan — src/components/SetupScreen.tsx (lobby / player management UI)
 *
 * Component under test: <SetupScreen {...props} /> (presentational — all state
 * lives in App.tsx and is exercised through the injected callbacks).
 *
 * Scenarios (instruction module 1 — player management, + role setup):
 *   - Renders one name field per player and the role/player tally.
 *   - "Add player" and per-row remove buttons invoke their callbacks.
 *   - Editing a name and bumping role counters invoke their callbacks.
 *   - "Start round" is disabled on a role/player mismatch or an empty deck,
 *     and enabled + clickable otherwise.
 *   - A validation error message is rendered when provided.
 */
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetupScreen } from "../../src/components/SetupScreen";
import type { PlayerInput, RoleCounts } from "../../src/game/types";

const players: PlayerInput[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Ben" },
  { id: "3", name: "Cam" },
];

const counts: RoleCounts = { civilian: 1, undercover: 1, mrWhite: 1 };

function makeProps(overrides: Partial<ComponentProps<typeof SetupScreen>> = {}) {
  return {
    players,
    counts,
    showRoles: false,
    timerEnabled: false,
    timerSeconds: 120,
    deckCategory: "all",
    deckDifficulty: "any" as const,
    categoryOptions: [],
    filteredWordCount: 50,
    totalWordCount: 50,
    deckStats: "50 pairs across 5 categories",
    roleMismatch: false,
    totalRoles: 3,
    deckEmpty: false,
    error: "",
    leavingId: null,
    draggingPlayerId: null,
    dropInsertionIndex: null,
    roundHistory: [],
    sessionStats: { roundsPlayed: 0, wins: { civilians: 0, infiltrators: 0, mrWhite: 0 }, players: [] },
    onAddPlayer: vi.fn(),
    onRemovePlayer: vi.fn(),
    onPlayerNameChange: vi.fn(),
    onPlayerAvatarChange: vi.fn(),
    onPlayerDragStart: vi.fn(),
    onPlayerDragMove: vi.fn(),
    onPlayerDragEnd: vi.fn(),
    onRoleCountChange: vi.fn(),
    onShowRolesChange: vi.fn(),
    onTimerEnabledChange: vi.fn(),
    onTimerSecondsChange: vi.fn(),
    onDeckCategoryChange: vi.fn(),
    onDeckDifficultyChange: vi.fn(),
    onStartRound: vi.fn(),
    onClearRoundHistory: vi.fn(),
    ...overrides,
  } satisfies ComponentProps<typeof SetupScreen>;
}

describe("SetupScreen", () => {
  it("renders a name field per player and the role tally", () => {
    render(<SetupScreen {...makeProps()} />);

    expect(screen.getByLabelText("Player 1 name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Player 2 name")).toHaveValue("Ben");
    expect(screen.getByLabelText("Player 3 name")).toHaveValue("Cam");
    expect(screen.getByText("3/3")).toBeInTheDocument();
  });

  it("adds a player via the add button", async () => {
    const user = userEvent.setup();
    const onAddPlayer = vi.fn();
    render(<SetupScreen {...makeProps({ onAddPlayer })} />);

    await user.click(screen.getByTitle("Add player"));

    expect(onAddPlayer).toHaveBeenCalledTimes(1);
  });

  it("removes a specific player via its remove button", async () => {
    const user = userEvent.setup();
    const onRemovePlayer = vi.fn();
    render(<SetupScreen {...makeProps({ onRemovePlayer })} />);

    await user.click(screen.getByTitle("Remove Ben"));

    expect(onRemovePlayer).toHaveBeenCalledWith("2");
  });

  it("reports name edits and role counter changes", async () => {
    const user = userEvent.setup();
    const onPlayerNameChange = vi.fn();
    const onRoleCountChange = vi.fn();
    render(<SetupScreen {...makeProps({ onPlayerNameChange, onRoleCountChange })} />);

    await user.type(screen.getByLabelText("Player 1 name"), "x");
    expect(onPlayerNameChange).toHaveBeenCalledWith("1", "Adax");

    await user.click(screen.getByTitle("Increase Undercovers"));
    expect(onRoleCountChange).toHaveBeenCalledWith("undercover", 1);

    await user.click(screen.getByTitle("Decrease Civilians"));
    expect(onRoleCountChange).toHaveBeenCalledWith("civilian", -1);
  });

  it("disables Start round on a role/player mismatch", () => {
    render(<SetupScreen {...makeProps({ roleMismatch: true, totalRoles: 4 })} />);

    expect(screen.getByRole("button", { name: "Start round" })).toBeDisabled();
  });

  it("disables Start round when the deck is empty", () => {
    render(<SetupScreen {...makeProps({ deckEmpty: true })} />);

    expect(screen.getByRole("button", { name: "Start round" })).toBeDisabled();
  });

  it("starts the round when valid", async () => {
    const user = userEvent.setup();
    const onStartRound = vi.fn();
    render(<SetupScreen {...makeProps({ onStartRound })} />);

    const start = screen.getByRole("button", { name: "Start round" });
    expect(start).toBeEnabled();
    await user.click(start);

    expect(onStartRound).toHaveBeenCalledTimes(1);
  });

  it("renders a validation error when provided", () => {
    render(<SetupScreen {...makeProps({ error: "Keep at least 3 players." })} />);

    expect(screen.getByText("Keep at least 3 players.")).toBeInTheDocument();
  });

  it("shows an insertion marker between players while dragging", () => {
    const { container } = render(<SetupScreen {...makeProps({ draggingPlayerId: "1", dropInsertionIndex: 1 })} />);

    expect(container.querySelectorAll(".player-insert-marker")).toHaveLength(1);
  });

  it("hides the insertion marker when no meaningful drop position is selected", () => {
    const { container } = render(<SetupScreen {...makeProps({ draggingPlayerId: "1", dropInsertionIndex: null })} />);

    expect(container.querySelector(".player-insert-marker")).toBeNull();
  });

  it("wires player reordering through pointer events", () => {
    const onPlayerDragStart = vi.fn();
    const onPlayerDragMove = vi.fn();
    const onPlayerDragEnd = vi.fn();
    render(<SetupScreen {...makeProps({ onPlayerDragStart, onPlayerDragMove, onPlayerDragEnd })} />);

    const handle = screen.getByRole("button", { name: "Move Ada" });
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 10 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 40 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 40 });

    expect(onPlayerDragStart).toHaveBeenCalledWith("1", expect.anything());
    expect(onPlayerDragMove).toHaveBeenCalledTimes(1);
    expect(onPlayerDragEnd).toHaveBeenCalledTimes(1);
  });
});
