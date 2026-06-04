export type Role = "civilian" | "undercover" | "mrWhite";

export type PlayerInput = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type RoleCounts = Record<Role, number>;

export type WordPair = {
  id: string;
  category: string;
  civilian: string;
  undercover: string;
};

export type RoundConfig = {
  players: PlayerInput[];
  counts: RoleCounts;
  deck: WordPair[];
};

export type PlayerAssignment = {
  player: PlayerInput;
  role: Role;
  word?: string;
};

export type Round = {
  wordPair: WordPair;
  assignments: PlayerAssignment[];
};

export type GameWinner = "civilians" | "infiltrators" | "mrWhite";

export type GameStatus =
  | {
      state: "playing";
    }
  | {
      state: "won";
      winner: GameWinner;
      reason: string;
    };
