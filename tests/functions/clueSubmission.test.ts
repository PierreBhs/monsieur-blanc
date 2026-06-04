/**
 * Test plan — Clue submission (instruction module 4) — NOT IMPLEMENTED.
 *
 * This implementation is a pass-the-device, in-person game: players say their
 * one-word clue out loud around the table (see RoundScreen's turn phase, which
 * literally prompts "They give one clue word, then continue around the table").
 * No clue text is captured, validated, or stored in code, so there is no public
 * API to assert against here.
 *
 * The scenarios below are left as todos so the coverage gap is explicit. If clue
 * tracking is ever added (e.g. a submitClue(playerId, clue) reducer), implement
 * these against that API.
 *
 * TODO: clarify with game author whether clues should ever be tracked in code.
 */
import { describe, it } from "vitest";

describe("clue submission (not implemented — clues are spoken in person)", () => {
  it.todo("accepts a valid one-word clue for the active player");
  it.todo("rejects an empty clue");
  it.todo("rejects a multi-word clue");
  it.todo("prevents a player from submitting twice in one round");
  it.todo("prevents an eliminated player from submitting a clue");
  it.todo("stores and returns clues in submission order");
});
