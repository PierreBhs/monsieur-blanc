import type { PlayerAssignment } from "../game/types";

export type RevealMessage = {
  title: string;
  body: string;
};

export function createLocalRevealMessage(assignment: PlayerAssignment): RevealMessage {
  if (assignment.role === "mrWhite") {
    return {
      title: "You are Mr. White",
      body: "No word. Blend in and steal clues from the table.",
    };
  }

  return {
    title: assignment.role === "undercover" ? "You are Undercover" : "You are Civilian",
    body: assignment.word ?? "",
  };
}
