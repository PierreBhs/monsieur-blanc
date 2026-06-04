// Central catalog of log tokens -> human descriptions.
//
// Call sites reference only the TOKEN (e.g. logger.log("ADD_PLAYER", {...})).
// All wording lives here, so the logged sentence can change without touching
// any handler. `message` describes the gesture/event; `fn` is the plain-English
// function the gesture triggers.

export type LogMessage = {
  message: string;
  fn: string;
};

export const logMessages = {
  // Session / game lifecycle (emitted by the logger itself).
  GAME_STARTED: { message: "Game started", fn: "start game" },
  GAME_ENDED: { message: "Game ended", fn: "end game" },

  // Setup screen.
  ADD_PLAYER: { message: '"+" add-player button clicked', fn: "add player" },
  REMOVE_PLAYER: { message: '"×" remove-player button clicked', fn: "remove player" },
  RENAME_PLAYER: { message: "Name field edited", fn: "rename player" },
  SET_AVATAR: { message: "Avatar file chosen", fn: "set player avatar" },
  REORDER_PLAYER: { message: "Player dragged to new position", fn: "reorder player" },
  CHANGE_ROLE_COUNT: { message: "Role stepper clicked", fn: "change role count" },
  CHANGE_TIMER_SECONDS: { message: "Timer stepper clicked", fn: "change timer duration" },
  TOGGLE_SHOW_ROLES: { message: "Show-roles switch toggled", fn: "toggle show roles" },
  TOGGLE_TIMER: { message: "Timer switch toggled", fn: "toggle timer" },
  SET_DECK_CATEGORY: { message: "Category dropdown changed", fn: "set deck category" },
  SET_DECK_DIFFICULTY: { message: "Difficulty dropdown changed", fn: "set deck difficulty" },
  CLEAR_HISTORY: { message: '"Clear" history button clicked', fn: "clear round history" },
  START_ROUND: { message: '"Start round" button clicked', fn: "start round" },

  // Round screen.
  REVEAL_WORD: { message: "Reveal card tapped", fn: "reveal word" },
  NEXT_PLAYER: { message: '"Next player" button tapped', fn: "next player" },
  START_TURN: { message: "Discussion turn began", fn: "start turn" },
  START_VOTE: { message: '"Start vote" button clicked', fn: "start vote" },
  SELECT_ELIMINATION: { message: "Player selected for elimination", fn: "select elimination" },
  CONFIRM_ELIMINATION: { message: '"Confirm" elimination button clicked', fn: "confirm elimination" },
  SUBMIT_MRWHITE_GUESS: { message: '"Submit guess" button clicked', fn: "submit Mr. White guess" },
  FINISH_ELIMINATION: { message: "Player eliminated", fn: "finish elimination" },
  CONTINUE_AFTER_ELIMINATION: { message: '"Continue" button clicked', fn: "continue after elimination" },
  TIMER_START: { message: "Timer ▶ button clicked", fn: "start timer" },
  TIMER_PAUSE: { message: "Timer ⏸ button clicked", fn: "pause timer" },
  TIMER_RESET: { message: "Timer ↺ button clicked", fn: "reset timer" },
  RECORD_RESULT: { message: "Game won", fn: "record result" },
} as const satisfies Record<string, LogMessage>;

export type LogToken = keyof typeof logMessages;

export function resolveLogMessage(token: LogToken): LogMessage {
  return logMessages[token];
}
