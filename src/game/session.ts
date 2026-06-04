import type { GameStatus, GameWinner, PlayerAssignment, PlayerInput, Role } from "./types";

export type PlayerRoundScore = {
  name: string;
  points: number;
};

export type RoundHistoryEntry = {
  id: string;
  completedAt: string;
  winner: GameWinner;
  reason: string;
  word: string;
  winners: string[];
  scores: PlayerRoundScore[];
};

export type PlayerScore = {
  name: string;
  points: number;
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

export const undercoverCorrectGuessPoints = 1;

export function createRoundHistoryEntry(
  assignments: PlayerAssignment[],
  status: Exclude<GameStatus, { state: "playing" }>,
  completedAt: string,
  bonusScores: PlayerRoundScore[] = [],
): RoundHistoryEntry {
  return {
    id: `${completedAt}-${status.winner}`,
    completedAt,
    winner: status.winner,
    reason: status.reason,
    word: assignments.find((assignment) => assignment.role === "civilian")?.word ?? "",
    winners: winningPlayerNames(assignments, status.winner),
    scores: mergeRoundScores(winningScores(assignments, status.winner), bonusScores),
  };
}

function mergeRoundScores(baseScores: PlayerRoundScore[], bonusScores: PlayerRoundScore[]): PlayerRoundScore[] {
  const totals = new Map<string, number>();

  for (const score of baseScores) {
    totals.set(score.name, (totals.get(score.name) ?? 0) + score.points);
  }

  for (const score of bonusScores) {
    totals.set(score.name, (totals.get(score.name) ?? 0) + score.points);
  }

  return Array.from(totals.entries())
    .map(([name, points]) => ({ name, points }))
    .filter((score) => score.points > 0);
}

export function appendRoundHistory(
  history: RoundHistoryEntry[],
  entry: RoundHistoryEntry,
  limit = 12,
): RoundHistoryEntry[] {
  return [entry, ...history].slice(0, limit);
}

export function calculateSessionStats(history: RoundHistoryEntry[], players: PlayerInput[] = []): SessionStats {
  const playerScores = new Map<string, { points: number; wins: number; order: number }>();
  const wins = { ...emptyWins };

  players.forEach((player, order) => {
    const name = player.name.trim();
    if (name) {
      playerScores.set(name, { points: 0, wins: 0, order });
    }
  });

  for (const entry of history) {
    wins[entry.winner] += 1;

    for (const score of roundScores(entry)) {
      const previous = playerScores.get(score.name) ?? { points: 0, wins: 0, order: playerScores.size };
      playerScores.set(score.name, {
        ...previous,
        points: previous.points + score.points,
        wins: previous.wins + 1,
      });
    }
  }

  return {
    roundsPlayed: history.length,
    wins,
    players: Array.from(playerScores.entries())
      .map(([name, score]) => ({ name, points: score.points, wins: score.wins, order: score.order }))
      .sort((left, right) => right.points - left.points || right.wins - left.wins || left.order - right.order)
      .map(({ name, points, wins }) => ({ name, points, wins })),
  };
}

function roundScores(entry: RoundHistoryEntry): PlayerRoundScore[] {
  if (entry.scores) {
    return entry.scores;
  }

  return entry.winners.map((name) => ({ name, points: 1 }));
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

function winningScores(assignments: PlayerAssignment[], winner: GameWinner): PlayerRoundScore[] {
  return assignments
    .map((assignment) => ({
      name: assignment.player.name,
      points: pointsForRole(assignment.role, winner),
    }))
    .filter((score) => score.points > 0);
}

function pointsForRole(role: Role, winner: GameWinner): number {
  if (winner === "civilians") {
    return role === "civilian" ? 2 : 0;
  }

  if (winner === "mrWhite") {
    return role === "mrWhite" ? 6 : 0;
  }

  if (role === "undercover") {
    return 10;
  }

  return role === "mrWhite" ? 6 : 0;
}
