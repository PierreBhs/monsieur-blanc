import { useMemo, useState } from "react";
import { wordPairs } from "./decks/wordPairs";
import {
  chooseRandomActiveAssignment,
  createRound,
  evaluateGameStatus,
  isCorrectMrWhiteGuess,
} from "./game/core";
import type { GameStatus, PlayerAssignment, PlayerInput, RoleCounts, Round } from "./game/types";

const savedPlayersKey = "mr-white.players";
const savedCountsKey = "mr-white.counts";
const savedShowRolesKey = "mr-white.show-roles";

const defaultPlayers: PlayerInput[] = [
  { id: "player-1", name: "Alex" },
  { id: "player-2", name: "Sam" },
  { id: "player-3", name: "Nina" },
  { id: "player-4", name: "Leo" },
  { id: "player-5", name: "Maya" },
];

const defaultCounts: RoleCounts = {
  civilian: 3,
  undercover: 1,
  mrWhite: 1,
};

type PlayPhase = "reveal" | "turn" | "vote" | "mrWhiteGuess" | "gameOver";

function App() {
  const [players, setPlayers] = useState<PlayerInput[]>(loadPlayers);
  const [counts, setCounts] = useState<RoleCounts>(loadCounts);
  const [showRoles, setShowRoles] = useState(loadShowRoles);
  const [round, setRound] = useState<Round | null>(null);
  const [phase, setPhase] = useState<PlayPhase>("reveal");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [turnStarter, setTurnStarter] = useState<PlayerAssignment | null>(null);
  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set());
  const [pendingElimination, setPendingElimination] = useState<PlayerAssignment | null>(null);
  const [mrWhiteGuess, setMrWhiteGuess] = useState("");
  const [gameStatus, setGameStatus] = useState<GameStatus>({ state: "playing" });
  const [lastElimination, setLastElimination] = useState("");
  const [error, setError] = useState("");

  const totalRoles = counts.civilian + counts.undercover + counts.mrWhite;
  const activeAssignment = round?.assignments[activeIndex];
  const roleMismatch = totalRoles !== players.length;
  const activeAssignments = round?.assignments.filter((assignment) => !eliminatedIds.has(assignment.player.id)) ?? [];

  const deckStats = useMemo(() => {
    const categories = new Set(wordPairs.map((pair) => pair.category));
    return `${wordPairs.length} pairs across ${categories.size} categories`;
  }, []);

  function updatePlayers(nextPlayers: PlayerInput[]) {
    setPlayers(nextPlayers);
    localStorage.setItem(savedPlayersKey, JSON.stringify(nextPlayers));
  }

  function updateCounts(nextCounts: RoleCounts) {
    setCounts(nextCounts);
    localStorage.setItem(savedCountsKey, JSON.stringify(nextCounts));
  }

  function updateShowRoles(nextShowRoles: boolean) {
    setShowRoles(nextShowRoles);
    localStorage.setItem(savedShowRolesKey, JSON.stringify(nextShowRoles));
  }

  function updatePlayerName(id: string, name: string) {
    updatePlayers(players.map((player) => (player.id === id ? { ...player, name } : player)));
  }

  function addPlayer() {
    const nextNumber = players.length + 1;
    updatePlayers([...players, { id: crypto.randomUUID(), name: `Player ${nextNumber}` }]);
    updateCounts({ ...counts, civilian: counts.civilian + 1 });
  }

  function removePlayer(id: string) {
    if (players.length <= 3) {
      setError("Keep at least 3 players.");
      return;
    }

    const nextPlayers = players.filter((player) => player.id !== id);
    updatePlayers(nextPlayers);
    updateCounts(trimCountsToPlayers(counts, nextPlayers.length));
  }

  function changeCount(role: keyof RoleCounts, delta: number) {
    const nextValue = Math.max(0, counts[role] + delta);
    updateCounts({ ...counts, [role]: nextValue });
  }

  function startRound() {
    setError("");

    try {
      const nextRound = createRound({
        players: players.map((player) => ({ ...player, name: player.name.trim() })),
        counts,
        deck: wordPairs,
      });

      setRound(nextRound);
      setPhase("reveal");
      setActiveIndex(0);
      setIsRevealed(false);
      setTurnStarter(null);
      setEliminatedIds(new Set());
      setPendingElimination(null);
      setMrWhiteGuess("");
      setGameStatus({ state: "playing" });
      setLastElimination("");
    } catch (roundError) {
      setError(roundError instanceof Error ? roundError.message : "Could not start the round.");
    }
  }

  function goToNextPlayer() {
    if (!round) {
      return;
    }

    setIsRevealed(false);

    if (activeIndex + 1 >= round.assignments.length) {
      startNextTurn(round.assignments, eliminatedIds);
      return;
    }

    setActiveIndex(activeIndex + 1);
  }

  function startNextTurn(assignments: PlayerAssignment[], nextEliminatedIds: Set<string>) {
    setTurnStarter(chooseRandomActiveAssignment(assignments, nextEliminatedIds));
    setPhase("turn");
  }

  function selectElimination(assignment: PlayerAssignment) {
    setLastElimination("");

    if (assignment.role === "mrWhite") {
      setPendingElimination(assignment);
      setMrWhiteGuess("");
      setPhase("mrWhiteGuess");
      return;
    }

    finishElimination(assignment);
  }

  function submitMrWhiteGuess() {
    if (!round || !pendingElimination) {
      return;
    }

    if (isCorrectMrWhiteGuess(mrWhiteGuess, round.wordPair.civilian)) {
      setGameStatus({
        state: "won",
        winner: "mrWhite",
        reason: `${pendingElimination.player.name} guessed "${round.wordPair.civilian}".`,
      });
      setPhase("gameOver");
      return;
    }

    finishElimination(pendingElimination);
  }

  function finishElimination(assignment: PlayerAssignment) {
    if (!round) {
      return;
    }

    const nextEliminatedIds = new Set(eliminatedIds);
    nextEliminatedIds.add(assignment.player.id);
    const nextStatus = evaluateGameStatus(round.assignments, nextEliminatedIds);

    setEliminatedIds(nextEliminatedIds);
    setPendingElimination(null);
    setMrWhiteGuess("");
    setGameStatus(nextStatus);
    setLastElimination(`${assignment.player.name} is out.`);
    if (nextStatus.state === "won") {
      setPhase("gameOver");
      return;
    }

    startNextTurn(round.assignments, nextEliminatedIds);
  }

  function resetRound() {
    setRound(null);
    setPhase("reveal");
    setActiveIndex(0);
    setIsRevealed(false);
    setTurnStarter(null);
    setEliminatedIds(new Set());
    setPendingElimination(null);
    setMrWhiteGuess("");
    setGameStatus({ state: "playing" });
    setLastElimination("");
    setError("");
  }

  if (round) {
    return (
      <main className="app-shell">
        <section className="round-layout">
          <div className="top-bar">
            <button className="secondary-button" type="button" onClick={resetRound}>
              Back to setup
            </button>
            <span>{activeAssignments.length} active</span>
          </div>

          <PlayerStrip assignments={round.assignments} eliminatedIds={eliminatedIds} turnStarterId={turnStarter?.player.id} />

          {phase === "reveal" && activeAssignment && (
            <div className="round-card reveal-card">
              <div className="phase-band">
                <span>Private reveal</span>
                <strong>
                  {activeIndex + 1}/{round.assignments.length}
                </strong>
              </div>
              <PlayerSpotlight assignment={activeAssignment} />

              {!isRevealed ? (
                <>
                  <p className="muted-text">Only this player should look at the screen.</p>
                  <button className="primary-button" type="button" onClick={() => setIsRevealed(true)}>
                    Reveal word
                  </button>
                </>
              ) : (
                <>
                  <div className="secret-box">
                    {showRoles && <div className="role-name">{roleLabel(activeAssignment.role)}</div>}
                    <div className="secret-word">{activeAssignment.word ?? "No word"}</div>
                  </div>
                  <button className="primary-button" type="button" onClick={goToNextPlayer}>
                    Hide and continue
                  </button>
                </>
              )}
            </div>
          )}

          {phase === "turn" && turnStarter && (
            <div className="round-card turn-card">
              <div className="phase-band">
                <span>New turn</span>
                <strong>{activeAssignments.length} active</strong>
              </div>
              <div className="starter-layout">
                <PlayerSpotlight assignment={turnStarter} />
                <p className="muted-text">
                  Starts this turn. They give one clue word, then continue around the table.
                </p>
              </div>

              {lastElimination && <p className="status-line">{lastElimination}</p>}

              <button className="primary-button" type="button" onClick={() => setPhase("vote")}>
                Vote after discussion
              </button>
            </div>
          )}

          {phase === "vote" && (
            <div className="round-card vote-card">
              <div className="phase-band">
                <span>Elimination vote</span>
                <strong>{activeAssignments.length} choices</strong>
              </div>
              <div className="phase-copy">
                <p className="muted-text">Choose one active player to eliminate from this turn.</p>
              </div>

              <div className="vote-list">
                {activeAssignments.map((assignment) => (
                  <button
                    className="vote-row"
                    key={assignment.player.id}
                    type="button"
                    onClick={() => selectElimination(assignment)}
                  >
                    <span className="player-token">{initials(assignment.player.name)}</span>
                    <span>{assignment.player.name}</span>
                    <span>Eliminate</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === "mrWhiteGuess" && pendingElimination && (
            <div className="round-card guess-card">
              <div className="phase-band danger-band">
                <span>Final guess</span>
                <strong>Mr. White</strong>
              </div>
              <div className="starter-layout">
                <PlayerSpotlight assignment={pendingElimination} />
                <p className="muted-text">Mr. White was voted out and gets one guess at the civilian word.</p>
              </div>

              <input
                aria-label="Mr. White word guess"
                autoFocus
                value={mrWhiteGuess}
                onChange={(event) => setMrWhiteGuess(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitMrWhiteGuess();
                  }
                }}
              />

              <div className="button-row">
                <button className="secondary-button" type="button" onClick={() => finishElimination(pendingElimination)}>
                  Skip guess
                </button>
                <button className="primary-button" type="button" onClick={submitMrWhiteGuess}>
                  Submit guess
                </button>
              </div>
            </div>
          )}

          {phase === "gameOver" && gameStatus.state === "won" && (
            <div className="round-card end-card">
              <div className="phase-band">
                <span>Game over</span>
                <strong>{winnerLabel(gameStatus.winner)}</strong>
              </div>
              <div>
                <h1>{winnerLabel(gameStatus.winner)} win</h1>
                <p className="muted-text">{gameStatus.reason}</p>
              </div>

              <div className="summary-list">
                {round.assignments.map((assignment) => (
                  <div className="summary-row" key={assignment.player.id}>
                    <span>{assignment.player.name}</span>
                    <span>{roleLabel(assignment.role)}</span>
                    <span>{assignment.word ?? "No word"}</span>
                  </div>
                ))}
              </div>

              <button className="primary-button" type="button" onClick={resetRound}>
                New round
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="setup-layout">
        <div className="setup-header">
          <div className="brand-lockup">
            <img src="/mr-white-mark.svg" alt="" />
            <div>
              <h1>Mr. White</h1>
              <p>{deckStats}</p>
            </div>
          </div>
          <div className="deck-card">
            <span>Tonight's deck</span>
            <strong>{wordPairs.length}</strong>
          </div>
        </div>

        <div className="setup-grid">
          <section className="panel player-panel">
            <div className="panel-heading">
              <h2>Players</h2>
              <button className="icon-button" type="button" title="Add player" onClick={addPlayer}>
                +
              </button>
            </div>

            <div className="player-list">
              {players.map((player, index) => (
                <div className="player-row" key={player.id}>
                  <span className="player-token">{initials(player.name) || String(index + 1)}</span>
                  <input
                    aria-label={`Player ${index + 1} name`}
                    value={player.name}
                    onChange={(event) => updatePlayerName(player.id, event.target.value)}
                  />
                  <button
                    className="icon-button"
                    type="button"
                    title={`Remove ${player.name}`}
                    onClick={() => removePlayer(player.id)}
                  >
                    -
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel role-panel">
            <div className="panel-heading">
              <h2>Roles</h2>
              <span className={roleMismatch ? "count-warning" : "count-ok"}>
                {totalRoles}/{players.length}
              </span>
            </div>

            <RoleCounter
              label="Civilians"
              value={counts.civilian}
              onMinus={() => changeCount("civilian", -1)}
              onPlus={() => changeCount("civilian", 1)}
            />
            <RoleCounter
              label="Undercovers"
              value={counts.undercover}
              onMinus={() => changeCount("undercover", -1)}
              onPlus={() => changeCount("undercover", 1)}
            />
            <RoleCounter
              label="Mr. Whites"
              value={counts.mrWhite}
              onMinus={() => changeCount("mrWhite", -1)}
              onPlus={() => changeCount("mrWhite", 1)}
            />

            <label className="toggle-row">
              <span>Show roles during reveal</span>
              <input
                type="checkbox"
                checked={showRoles}
                onChange={(event) => updateShowRoles(event.target.checked)}
              />
            </label>

            <div className="start-area">
              {error && <p className="error-text">{error}</p>}
              {roleMismatch && <p className="error-text">Role count must match player count.</p>}
              <button className="primary-button" type="button" onClick={startRound}>
                Start round
              </button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

type PlayerStripProps = {
  assignments: PlayerAssignment[];
  eliminatedIds: Set<string>;
  turnStarterId?: string;
};

function PlayerStrip({ assignments, eliminatedIds, turnStarterId }: PlayerStripProps) {
  return (
    <div className="player-strip">
      {assignments.map((assignment) => {
        const isEliminated = eliminatedIds.has(assignment.player.id);
        const isStarter = assignment.player.id === turnStarterId;

        return (
          <div className={`strip-token ${isEliminated ? "is-out" : ""} ${isStarter ? "is-starter" : ""}`} key={assignment.player.id}>
            <span>{initials(assignment.player.name)}</span>
            <strong>{assignment.player.name}</strong>
          </div>
        );
      })}
    </div>
  );
}

function PlayerSpotlight({ assignment }: { assignment: PlayerAssignment }) {
  return (
    <div className="player-spotlight">
      <span className="big-token">{initials(assignment.player.name)}</span>
      <h1>{assignment.player.name}</h1>
    </div>
  );
}

type RoleCounterProps = {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
};

function RoleCounter({ label, value, onMinus, onPlus }: RoleCounterProps) {
  return (
    <div className="role-counter">
      <span>{label}</span>
      <div>
        <button className="icon-button" type="button" title={`Decrease ${label}`} onClick={onMinus}>
          -
        </button>
        <strong>{value}</strong>
        <button className="icon-button" type="button" title={`Increase ${label}`} onClick={onPlus}>
          +
        </button>
      </div>
    </div>
  );
}

function loadPlayers(): PlayerInput[] {
  const saved = localStorage.getItem(savedPlayersKey);

  if (!saved) {
    return defaultPlayers;
  }

  try {
    const parsed = JSON.parse(saved) as PlayerInput[];
    return parsed.length >= 3 ? parsed : defaultPlayers;
  } catch {
    return defaultPlayers;
  }
}

function loadCounts(): RoleCounts {
  const saved = localStorage.getItem(savedCountsKey);

  if (!saved) {
    return defaultCounts;
  }

  try {
    return { ...defaultCounts, ...(JSON.parse(saved) as Partial<RoleCounts>) };
  } catch {
    return defaultCounts;
  }
}

function loadShowRoles(): boolean {
  const saved = localStorage.getItem(savedShowRolesKey);

  return saved ? JSON.parse(saved) === true : false;
}

function trimCountsToPlayers(counts: RoleCounts, playerCount: number): RoleCounts {
  const nextCounts = { ...counts };

  while (nextCounts.civilian + nextCounts.undercover + nextCounts.mrWhite > playerCount) {
    if (nextCounts.civilian > 1) {
      nextCounts.civilian -= 1;
    } else if (nextCounts.undercover > 0) {
      nextCounts.undercover -= 1;
    } else {
      nextCounts.mrWhite -= 1;
    }
  }

  return nextCounts;
}

function roleLabel(role: PlayerAssignment["role"]): string {
  if (role === "mrWhite") {
    return "Mr. White";
  }

  return role === "undercover" ? "Undercover" : "Civilian";
}

function winnerLabel(winner: Exclude<GameStatus, { state: "playing" }>["winner"]): string {
  if (winner === "mrWhite") {
    return "Mr. White";
  }

  return winner === "undercovers" ? "Undercovers" : "Civilians";
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default App;
