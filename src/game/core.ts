import type {
  GameStatus,
  PlayerAssignment,
  PlayerInput,
  Role,
  RoleCounts,
  Round,
  RoundConfig,
  WordPair,
} from "./types";

type Rng = () => number;

const roles: Role[] = ["civilian", "undercover", "mrWhite"];

export function createRound(config: RoundConfig, rng: Rng = Math.random): Round {
  validateConfig(config);

  const wordPair = selectWordPair(config.deck, rng);
  const assignedRoles = assignRoles(config.players, config.counts, rng);

  return {
    wordPair,
    assignments: assignedRoles.map(({ player, role }) => ({
      player,
      role,
      word: role === "mrWhite" ? undefined : wordForRole(role, wordPair),
    })),
  };
}

export function assignRoles(
  players: PlayerInput[],
  counts: RoleCounts,
  rng: Rng = Math.random,
): Pick<PlayerAssignment, "player" | "role">[] {
  const rolePool = roles.flatMap((role) => Array.from({ length: counts[role] }, () => role));
  const shuffledRoles = shuffle(rolePool, rng);

  return players.map((player, index) => ({
    player,
    role: shuffledRoles[index],
  }));
}

export function selectWordPair(deck: WordPair[], rng: Rng = Math.random): WordPair {
  if (deck.length === 0) {
    throw new Error("The word deck is empty.");
  }

  return deck[Math.floor(rng() * deck.length)];
}

export function validateConfig(config: RoundConfig): void {
  const playerNames = config.players.map((player) => player.name.trim());
  const totalRoles = roles.reduce((total, role) => total + config.counts[role], 0);

  if (config.players.length < 3) {
    throw new Error("Add at least 3 players.");
  }

  if (playerNames.some((name) => name.length === 0)) {
    throw new Error("Every player needs a name.");
  }

  if (roles.some((role) => !Number.isInteger(config.counts[role]) || config.counts[role] < 0)) {
    throw new Error("Role counts must be whole numbers.");
  }

  if (config.counts.civilian < 1) {
    throw new Error("Add at least 1 civilian.");
  }

  if (config.counts.undercover + config.counts.mrWhite < 1) {
    throw new Error("Add at least 1 undercover or Mr. White.");
  }

  if (totalRoles !== config.players.length) {
    throw new Error("Role counts must match the number of players.");
  }

  if (config.deck.length === 0) {
    throw new Error("The word deck is empty.");
  }
}

export function evaluateGameStatus(assignments: PlayerAssignment[], eliminatedIds: Set<string>): GameStatus {
  const activeAssignments = assignments.filter((assignment) => !eliminatedIds.has(assignment.player.id));
  const activeCivilians = activeAssignments.filter((assignment) => assignment.role === "civilian").length;
  const activeUndercovers = activeAssignments.filter((assignment) => assignment.role === "undercover").length;
  const activeMrWhites = activeAssignments.filter((assignment) => assignment.role === "mrWhite").length;

  if (activeUndercovers === 0 && activeMrWhites === 0) {
    return {
      state: "won",
      winner: "civilians",
      reason: "All undercovers and Mr. Whites are out.",
    };
  }

  if (activeUndercovers > 0 && activeUndercovers >= activeCivilians) {
    return {
      state: "won",
      winner: "undercovers",
      reason: "Undercovers reached parity with civilians.",
    };
  }

  if (activeMrWhites > 0 && activeCivilians === 0) {
    return {
      state: "won",
      winner: "mrWhite",
      reason: "Mr. White survived after the civilians were eliminated.",
    };
  }

  return { state: "playing" };
}

export function chooseRandomActiveAssignment(
  assignments: PlayerAssignment[],
  eliminatedIds: Set<string>,
  rng: Rng = Math.random,
  excludedPlayerId?: string,
): PlayerAssignment {
  const activeAssignments = assignments.filter((assignment) => !eliminatedIds.has(assignment.player.id));

  if (activeAssignments.length === 0) {
    throw new Error("There are no active players.");
  }

  const eligibleAssignments =
    excludedPlayerId && activeAssignments.length > 1
      ? activeAssignments.filter((assignment) => assignment.player.id !== excludedPlayerId)
      : activeAssignments;

  return eligibleAssignments[Math.floor(rng() * eligibleAssignments.length)];
}

export function isCorrectMrWhiteGuess(guess: string, civilianWord: string): boolean {
  return normalizeGuess(guess) === normalizeGuess(civilianWord);
}

function wordForRole(role: Role, wordPair: WordPair): string {
  return role === "undercover" ? wordPair.undercover : wordPair.civilian;
}

function normalizeGuess(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}
