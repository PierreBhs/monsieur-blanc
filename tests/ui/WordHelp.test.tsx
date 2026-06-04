import { describe, expect, it } from "vitest";

// TODO: Add real UI tests for the WordHelp component (open/close modal, switch
// language flags, render the description). The jsdom + @testing-library setup is
// already wired up in vite.config.ts / tests/setup.ts, so a future test can just
// render(<WordHelp word="..." />) and assert on the DOM.
describe("WordHelp", () => {
  it.todo("renders the help modal and switches languages");

  it("placeholder", () => {
    expect(true).toBe(true);
  });
});
