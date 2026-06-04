/**
 * Test plan — Vote tallying / tie-breaking (instruction module 5) — NOT
 * IMPLEMENTED as vote collection.
 *
 * Voting here is resolved verbally at the table: the host then taps the single
 * agreed player to eliminate (App.selectElimination -> one player removed). There
 * is no per-player ballot, no tally, and therefore no tie-breaking rule in code.
 *
 * What DOES exist and IS covered elsewhere:
 *   - Choosing one active player eliminates exactly that player, and the result
 *     is re-evaluated for a win — see tests/ui/App.test.tsx and the
 *     evaluateGameStatus cases in tests/functions/core.test.ts.
 *   - The vote screen offers exactly one choice per active player — see
 *     tests/ui/RoundScreen.test.tsx.
 *
 * The ballot-style scenarios below are todos to mark the intentional gap.
 *
 * TODO: clarify with game author whether individual ballots / tie-breaking
 * should be modelled in code rather than handled verbally.
 */
import { describe, it } from "vitest";

describe("vote tallying (not implemented — elimination is a single host choice)", () => {
  it.todo("records exactly one vote per active player");
  it.todo("forbids voting for yourself");
  it.todo("forbids voting for an already-eliminated player");
  it.todo("eliminates the player with the most votes");
  it.todo("applies a tie-breaking rule on tied votes");
  it.todo("closes voting once every active player has voted");
});
