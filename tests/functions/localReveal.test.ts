/**
 * Test plan — src/delivery/localReveal.ts (private role reveal message)
 *
 * Function under test:
 *   - createLocalRevealMessage: builds the title/body shown when a player
 *     privately reveals their card.
 *
 * Scenarios:
 *   - Mr. White gets the blank "no word" message.
 *   - Undercover and civilian get a role title plus their secret word.
 *   - A missing word falls back to an empty body.
 */
import { describe, expect, it } from "vitest";
import { createLocalRevealMessage } from "../../src/delivery/localReveal";
import type { PlayerAssignment } from "../../src/game/types";

const player = { id: "1", name: "Ada" };

describe("createLocalRevealMessage", () => {
  it("gives Mr. White a blank-word message", () => {
    const assignment: PlayerAssignment = { player, role: "mrWhite" };

    const message = createLocalRevealMessage(assignment);

    expect(message.title).toBe("You are Mr. White");
    expect(message.body).toContain("No word");
  });

  it("shows the civilian their role and word", () => {
    const assignment: PlayerAssignment = { player, role: "civilian", word: "France" };

    expect(createLocalRevealMessage(assignment)).toEqual({
      title: "You are Civilian",
      body: "France",
    });
  });

  it("shows the undercover their role and word", () => {
    const assignment: PlayerAssignment = { player, role: "undercover", word: "Italy" };

    expect(createLocalRevealMessage(assignment)).toEqual({
      title: "You are Undercover",
      body: "Italy",
    });
  });

  it("falls back to an empty body when a non-Mr.-White assignment has no word", () => {
    const assignment: PlayerAssignment = { player, role: "civilian" };

    expect(createLocalRevealMessage(assignment).body).toBe("");
  });
});
