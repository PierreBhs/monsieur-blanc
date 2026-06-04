/**
 * Test plan — src/log/logger.ts (in-memory session/game action logger)
 *
 * API under test:
 *   - log:          appends an entry stamped with session + current game id
 *   - logCoalesced: collapses a burst of same-token/key edits into one entry
 *   - startGame:    opens a game (sets gameId for later entries), emits GAME_STARTED
 *   - endGame:      closes the current game, emits GAME_ENDED, clears gameId
 *   - formatLine:   renders one entry, resolving wording from the message catalog
 *   - serialize:    joins lines with "\n", optionally filtered to one game
 *
 * Call sites pass only a TOKEN; the human wording lives in src/log/messages.ts
 * and is resolved at render time. The logger is a module-scope singleton, so its
 * `entries`/`seq` accumulate across tests — assertions use a captured baseline.
 */
import { describe, expect, it } from "vitest";
import { logger, type LogEntry } from "../../src/log/logger";
import { logMessages } from "../../src/log/messages";

function tail(beforeLength: number): readonly LogEntry[] {
  return logger.getEntries().slice(beforeLength);
}

describe("logger.log", () => {
  it("appends an entry stamped with the token, session id and a null game id during setup", () => {
    logger.endGame("reset-for-test"); // ensure no game is open
    const before = logger.getEntries().length;

    logger.log("ADD_PLAYER", { players: 6 });

    const [entry] = tail(before);
    expect(entry.token).toBe("ADD_PLAYER");
    expect(entry.detail).toEqual({ players: 6 });
    expect(entry.sessionId).toBe(logger.sessionId);
    expect(entry.gameId).toBeNull();
  });

  it("assigns strictly increasing sequence numbers", () => {
    const before = logger.getEntries().length;

    logger.log("START_VOTE");
    logger.log("START_TURN");

    const [first, second] = tail(before);
    expect(second.seq).toBe(first.seq + 1);
  });
});

describe("logger.logCoalesced", () => {
  it("collapses consecutive same-token/key edits into one entry with the latest detail", () => {
    logger.endGame("reset-for-test");
    const before = logger.getEntries().length;

    logger.logCoalesced("RENAME_PLAYER", "player-1", { id: "player-1", name: "A" });
    logger.logCoalesced("RENAME_PLAYER", "player-1", { id: "player-1", name: "Al" });
    logger.logCoalesced("RENAME_PLAYER", "player-1", { id: "player-1", name: "Alex" });

    const added = tail(before);
    expect(added).toHaveLength(1);
    expect(added[0].detail).toEqual({ id: "player-1", name: "Alex" });
  });

  it("starts a new entry when the coalesce key changes", () => {
    logger.log("CLEAR_HISTORY"); // break any coalesce chain left by a prior test
    const before = logger.getEntries().length;

    logger.logCoalesced("RENAME_PLAYER", "player-1", { id: "player-1", name: "Ada" });
    logger.logCoalesced("RENAME_PLAYER", "player-2", { id: "player-2", name: "Ben" });

    expect(tail(before)).toHaveLength(2);
  });
});

describe("logger.startGame / endGame", () => {
  it("stamps entries with the game id between startGame and endGame", () => {
    const before = logger.getEntries().length;

    const gameId = logger.startGame();
    logger.log("REVEAL_WORD", { player: "Sam" });
    logger.endGame("back-to-setup");
    logger.log("ADD_PLAYER", { players: 5 });

    const [start, reveal, end, afterGame] = tail(before);
    expect(start.token).toBe("GAME_STARTED");
    expect(reveal.gameId).toBe(gameId);
    expect(end.token).toBe("GAME_ENDED");
    expect(end.detail).toMatchObject({ reason: "back-to-setup" });
    expect(afterGame.gameId).toBeNull();
  });

  it("endGame is a no-op when no game is open", () => {
    logger.endGame("first");
    const before = logger.getEntries().length;

    logger.endGame("second");

    expect(logger.getEntries().length).toBe(before);
  });
});

describe("logger.formatLine", () => {
  const entry: LogEntry = {
    seq: 7,
    ts: "2026-06-04T12:00:09.880Z",
    sessionId: "2f1c8e4a-0000-0000-0000-000000000000",
    gameId: "a9b3d201-0000-0000-0000-000000000000",
    token: "REVEAL_WORD",
    detail: { player: "Sam", role: "undercover", word: "kiwi" },
  };

  it("renders timestamp, padded seq, short ids, the catalog message/fn and key=value details", () => {
    const line = logger.formatLine(entry);
    expect(line).toContain("2026-06-04T12:00:09.880Z");
    expect(line).toContain("#0007");
    expect(line).toContain("session=2f1c8e4a");
    expect(line).toContain("game=a9b3d201");
    expect(line).toContain(logMessages.REVEAL_WORD.message);
    expect(line).toContain(`fn="${logMessages.REVEAL_WORD.fn}"`);
    expect(line).toContain('player="Sam"');
    expect(line).toContain('role="undercover"');
    expect(line).toContain('word="kiwi"');
  });

  it("renders game=- for setup-screen entries with no game", () => {
    const line = logger.formatLine({ ...entry, gameId: null, detail: undefined });
    expect(line).toContain("game=-");
  });
});

describe("logger.serialize", () => {
  it("joins entries with newlines in sequence order", () => {
    const text = logger.serialize();
    const lines = text.split("\n");
    expect(lines.length).toBe(logger.getEntries().length);
  });

  it("filters to a single game when a gameId is given", () => {
    const gameId = logger.startGame();
    logger.log("START_VOTE");
    logger.endGame("done");

    const lines = logger.serialize({ gameId }).split("\n");
    expect(lines.every((line) => line.includes(`game=${gameId.slice(0, 8)}`))).toBe(true);
    expect(lines.some((line) => line.includes(logMessages.START_VOTE.message))).toBe(true);
  });
});
