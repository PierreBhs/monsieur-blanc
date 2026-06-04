import type { GameStatus, GameWinner, PlayerAssignment } from "./types";

export type RoundHistoryEntry = {
  id: string;
  completedAt: string;
  winner: GameWinner;
  reason: string;
  word: string;
  winners: string[];
};

export type PlayerScore = {
  name: string;
  wins: number;
};

export type SessionStats = {
  roundsPlayed: number;
  wins: Record<GameWinner, number>;
  players: PlayerScore[];
};

const emptyWins: Record<GameWinner, number> = {
  civilians: 0,
  infiltrators: 0,
  mrWhite: 0,
};

export function createRoundHistoryEntry(
  assignments: PlayerAssignment[],
  status: Exclude<GameStatus, { state: "playing" }>,
  completedAt: string,
): RoundHistoryEntry {
  return {
    id: `${completedAt}-${status.winner}`,
    completedAt,
    winner: status.winner,
    reason: status.reason,
    word: assignments.find((assignment) => assignment.role === "civilian")?.word ?? "",
    winners: winningPlayerNames(assignments, status.winner),
  };
}

export function appendRoundHistory(
  history: RoundHistoryEntry[],
  entry: RoundHistoryEntry,
  limit = 12,
): RoundHistoryEntry[] {
  return [entry, ...history].slice(0, limit);
}

export function calculateSessionStats(history: RoundHistoryEntry[]): SessionStats {
  const playerWins = new Map<string, number>();
  const wins = { ...emptyWins };

  for (const entry of history) {
    wins[entry.winner] += 1;

    for (const name of entry.winners) {
      playerWins.set(name, (playerWins.get(name) ?? 0) + 1);
    }
  }

  return {
    roundsPlayed: history.length,
    wins,
    players: Array.from(playerWins.entries())
      .map(([name, playerWins]) => ({ name, wins: playerWins }))
      .sort((left, right) => right.wins - left.wins || left.name.localeCompare(right.name)),
  };
}

function winningPlayerNames(assignments: PlayerAssignment[], winner: GameWinner): string[] {
  return assignments
    .filter((assignment) => {
      if (winner === "civilians") {
        return assignment.role === "civilian";
      }

      if (winner === "mrWhite") {
        return assignment.role === "mrWhite";
      }

      return assignment.role === "undercover" || assignment.role === "mrWhite";
    })
    .map((assignment) => assignment.player.name);
}
