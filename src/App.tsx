import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { WordHelp } from "./WordHelp";
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
const savedTimerEnabledKey = "mr-white.timer-enabled";
const savedTimerSecondsKey = "mr-white.timer-seconds";
const defaultTimerSeconds = 120;
const minTimerSeconds = 30;
const maxTimerSeconds = 600;

const defaultPlayers: PlayerInput[] = [
  { id: "player-1", name: "" },
  { id: "player-2", name: "" },
  { id: "player-3", name: "" },
  { id: "player-4", name: "" },
  { id: "player-5", name: "" },
];
const legacyDefaultNames = ["Alex", "Sam", "Nina", "Leo", "Maya"];

const defaultCounts: RoleCounts = {
  civilian: 3,
  undercover: 1,
  mrWhite: 1,
};

type PlayPhase = "reveal" | "turn" | "vote" | "mrWhiteGuess" | "eliminationReveal" | "gameOver";

function App() {
  const [players, setPlayers] = useState<PlayerInput[]>(loadPlayers);
  const [counts, setCounts] = useState<RoleCounts>(loadCounts);
  const [showRoles, setShowRoles] = useState(loadShowRoles);
  const [timerEnabled, setTimerEnabled] = useState(loadTimerEnabled);
  const [timerSeconds, setTimerSeconds] = useState(loadTimerSeconds);
  const [round, setRound] = useState<Round | null>(null);
  const [phase, setPhase] = useState<PlayPhase>("reveal");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [turnStarter, setTurnStarter] = useState<PlayerAssignment | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(timerSeconds);
  const [timerRunning, setTimerRunning] = useState(false);
  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set());
  const [pendingElimination, setPendingElimination] = useState<PlayerAssignment | null>(null);
  const [mrWhiteGuess, setMrWhiteGuess] = useState("");
  const [gameStatus, setGameStatus] = useState<GameStatus>({ state: "playing" });
  const [lastElimination, setLastElimination] = useState("");
  const [error, setError] = useState("");
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const totalRoles = counts.civilian + counts.undercover + counts.mrWhite;
  const activeAssignment = round?.assignments[activeIndex];
  const roleMismatch = totalRoles !== players.length;
  const activeAssignments = round?.assignments.filter((assignment) => !eliminatedIds.has(assignment.player.id)) ?? [];

  const deckStats = useMemo(() => {
    const categories = new Set(wordPairs.map((pair) => pair.category));
    return `${wordPairs.length} pairs across ${categories.size} categories`;
  }, []);

  useEffect(() => {
    if (phase !== "turn" || !timerEnabled || !timerRunning || remainingSeconds <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [phase, remainingSeconds, timerEnabled, timerRunning]);

  useEffect(() => {
    if (remainingSeconds === 0) {
      setTimerRunning(false);
    }
  }, [remainingSeconds]);

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

  function updateTimerEnabled(nextTimerEnabled: boolean) {
    setTimerEnabled(nextTimerEnabled);
    localStorage.setItem(savedTimerEnabledKey, JSON.stringify(nextTimerEnabled));
  }

  function updateTimerSeconds(nextTimerSeconds: number) {
    setTimerSeconds(nextTimerSeconds);
    setRemainingSeconds(nextTimerSeconds);
    localStorage.setItem(savedTimerSecondsKey, JSON.stringify(nextTimerSeconds));
  }

  function updatePlayerName(id: string, name: string) {
    updatePlayers(players.map((player) => (player.id === id ? { ...player, name } : player)));
  }

  function updatePlayerAvatar(id: string, avatarUrl: string) {
    updatePlayers(players.map((player) => (player.id === id ? { ...player, avatarUrl } : player)));
  }

  function changePlayerAvatar(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        updatePlayerAvatar(id, reader.result);
      }
    });
    reader.readAsDataURL(file);
  }

  function addPlayer() {
    updatePlayers([...players, { id: crypto.randomUUID(), name: "" }]);
    updateCounts({ ...counts, civilian: counts.civilian + 1 });
  }

  function removePlayer(id: string) {
    if (players.length <= 3) {
      setError("Keep at least 3 players.");
      return;
    }

    if (leavingId) return;

    setLeavingId(id);
    setTimeout(() => {
      const nextPlayers = players.filter((player) => player.id !== id);
      updatePlayers(nextPlayers);
      updateCounts(trimCountsToPlayers(counts, nextPlayers.length));
      setLeavingId(null);
    }, 180);
  }

  function changeCount(role: keyof RoleCounts, delta: number) {
    if (delta > 0 && totalRoles >= players.length) return;
    const nextValue = Math.max(0, counts[role] + delta);
    updateCounts({ ...counts, [role]: nextValue });
  }

  function changeTimerSeconds(delta: number) {
    updateTimerSeconds(clamp(timerSeconds + delta, minTimerSeconds, maxTimerSeconds));
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
      setRemainingSeconds(timerSeconds);
      setTimerRunning(false);
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
    setTurnStarter(chooseRandomActiveAssignment(assignments, nextEliminatedIds, Math.random, turnStarter?.player.id));
    setRemainingSeconds(timerSeconds);
    setTimerRunning(timerEnabled);
    setPhase("turn");
  }

  function startVote() {
    setTimerRunning(false);
    setPhase("vote");
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
    setPendingElimination(assignment);
    setMrWhiteGuess("");
    setGameStatus(nextStatus);
    setLastElimination(`${assignment.player.name} is out.`);
    setPhase("eliminationReveal");
  }

  function continueAfterElimination() {
    if (!round) {
      return;
    }

    setPendingElimination(null);

    if (gameStatus.state === "won") {
      setPhase("gameOver");
      return;
    }

    startNextTurn(round.assignments, eliminatedIds);
  }

  function resetRound() {
    setRound(null);
    setPhase("reveal");
    setActiveIndex(0);
    setIsRevealed(false);
    setTurnStarter(null);
    setRemainingSeconds(timerSeconds);
    setTimerRunning(false);
    setEliminatedIds(new Set());
    setPendingElimination(null);
    setMrWhiteGuess("");
    setGameStatus({ state: "playing" });
    setLastElimination("");
    setError("");
  }

  if (round) {
    return (
      <main key="round" className="app-shell">
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
                    {activeAssignment.word && <WordHelp word={activeAssignment.word} />}
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

              {timerEnabled && (
                <DiscussionTimer
                  remainingSeconds={remainingSeconds}
                  timerRunning={timerRunning}
                  timerSeconds={timerSeconds}
                  onPause={() => setTimerRunning(false)}
                  onReset={() => {
                    setRemainingSeconds(timerSeconds);
                    setTimerRunning(true);
                  }}
                  onStart={() => setTimerRunning(true)}
                />
              )}

              {lastElimination && <p className="status-line">{lastElimination}</p>}

              <button className="primary-button" type="button" onClick={startVote}>
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
                    <PlayerAvatar className="player-token" player={assignment.player} />
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

          {phase === "eliminationReveal" && pendingElimination && (
            <div className="round-card elimination-card">
              <div className="phase-band danger-band">
                <span>Eliminated</span>
                <strong>{roleLabel(pendingElimination.role)}</strong>
              </div>
              <PlayerSpotlight assignment={pendingElimination} />
              <div className="elimination-role">
                <span>{pendingElimination.player.name} is eliminated</span>
                <strong>{roleLabel(pendingElimination.role)}</strong>
              </div>
              <button className="primary-button" type="button" onClick={continueAfterElimination}>
                Continue
              </button>
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
    <main key="setup" className="app-shell">
      <section className="setup-layout">
        <div className="setup-header">
          <div className="brand-lockup">
            <img src="/mr-white-mark.svg" alt="" />
            <div>
              <h1>M.Blanc</h1>
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
              <button className="icon-button add-player-button" type="button" title="Add player" onClick={addPlayer}>
                +
              </button>
            </div>

            <div className="player-list">
              {players.map((player, index) => (
                <div className={`player-row${leavingId === player.id ? " is-leaving" : ""}`} key={player.id}>
                  <PlayerAvatar
                    className="player-token"
                    fallback={String(index + 1)}
                    player={player}
                    onImageChange={(event) => changePlayerAvatar(player.id, event)}
                  />
                  <input
                    aria-label={`Player ${index + 1} name`}
                    placeholder={`Player ${index + 1}`}
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

            <label className="toggle-row">
              <span>Discussion timer</span>
              <input
                type="checkbox"
                checked={timerEnabled}
                onChange={(event) => updateTimerEnabled(event.target.checked)}
              />
            </label>

            {timerEnabled && (
              <TimerSetting
                seconds={timerSeconds}
                onMinus={() => changeTimerSeconds(-30)}
                onPlus={() => changeTimerSeconds(30)}
              />
            )}

            <div className="start-area">
              {error && <p className="error-text">{error}</p>}
              <button className="primary-button" type="button" onClick={startRound} disabled={roleMismatch}>
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
            <PlayerAvatar className="strip-avatar" player={assignment.player} />
            <strong>{assignment.player.name}</strong>
          </div>
        );
      })}
    </div>
  );
}

type DiscussionTimerProps = {
  remainingSeconds: number;
  timerRunning: boolean;
  timerSeconds: number;
  onPause: () => void;
  onReset: () => void;
  onStart: () => void;
};

function DiscussionTimer({
  remainingSeconds,
  timerRunning,
  timerSeconds,
  onPause,
  onReset,
  onStart,
}: DiscussionTimerProps) {
  return (
    <div className={`discussion-timer${remainingSeconds === 0 ? " is-finished" : ""}`}>
      <span>{remainingSeconds === 0 ? "Time's up" : "Discussion timer"}</span>
      <strong>{formatTimer(remainingSeconds)}</strong>
      <div className="button-row">
        <button className="secondary-button" type="button" onClick={timerRunning ? onPause : onStart}>
          {timerRunning ? "Pause" : "Start"}
        </button>
        <button className="secondary-button" type="button" onClick={onReset}>
          Reset {formatTimer(timerSeconds)}
        </button>
      </div>
    </div>
  );
}

function PlayerSpotlight({ assignment }: { assignment: PlayerAssignment }) {
  return (
    <div className="player-spotlight">
      <PlayerAvatar className="big-token" player={assignment.player} />
      <h1>{assignment.player.name}</h1>
    </div>
  );
}

type PlayerAvatarProps = {
  className: string;
  player: PlayerInput;
  fallback?: string;
  onImageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

function PlayerAvatar({ className, player, fallback, onImageChange }: PlayerAvatarProps) {
  const label = initials(player.name) || fallback || "?";
  const avatarClassName = `player-avatar ${className}`;
  const content = player.avatarUrl ? <img src={player.avatarUrl} alt="" /> : label;

  if (onImageChange) {
    return (
      <label className={`${avatarClassName} is-editable`} title={`Change image for ${player.name}`}>
        {content}
        <input
          aria-label={`Change image for ${player.name}`}
          className="avatar-input"
          type="file"
          accept="image/*"
          capture="user"
          onChange={onImageChange}
        />
      </label>
    );
  }

  return <span className={avatarClassName}>{content}</span>;
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

type TimerSettingProps = {
  seconds: number;
  onMinus: () => void;
  onPlus: () => void;
};

function TimerSetting({ seconds, onMinus, onPlus }: TimerSettingProps) {
  return (
    <div className="timer-setting">
      <span>Duration</span>
      <div>
        <button className="icon-button" type="button" title="Decrease timer" onClick={onMinus}>
          -
        </button>
        <strong>{formatTimer(seconds)}</strong>
        <button className="icon-button" type="button" title="Increase timer" onClick={onPlus}>
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

    if (isLegacyDefaultPlayers(parsed) || isGeneratedDefaultPlayers(parsed)) {
      localStorage.setItem(savedPlayersKey, JSON.stringify(defaultPlayers));
      return defaultPlayers;
    }

    if (parsed.length < 3) {
      return defaultPlayers;
    }

    const normalizedPlayers = parsed.map((player, index) => ({
      ...player,
      name: isGeneratedDefaultName(player.name, index) ? "" : player.name,
    }));

    if (normalizedPlayers.some((player, index) => player.name !== parsed[index].name)) {
      localStorage.setItem(savedPlayersKey, JSON.stringify(normalizedPlayers));
    }

    return normalizedPlayers;
  } catch {
    return defaultPlayers;
  }
}

function isLegacyDefaultPlayers(players: PlayerInput[]): boolean {
  return (
    players.length === legacyDefaultNames.length &&
    players.every((player, index) => player.id === `player-${index + 1}` && player.name === legacyDefaultNames[index])
  );
}

function isGeneratedDefaultPlayers(players: PlayerInput[]): boolean {
  return players.every((player, index) => isGeneratedDefaultName(player.name, index));
}

function isGeneratedDefaultName(name: string, index: number): boolean {
  return name.trim() === `Player ${index + 1}`;
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

function loadTimerEnabled(): boolean {
  const saved = localStorage.getItem(savedTimerEnabledKey);

  return saved ? JSON.parse(saved) === true : false;
}

function loadTimerSeconds(): number {
  const saved = localStorage.getItem(savedTimerSecondsKey);

  if (!saved) {
    return defaultTimerSeconds;
  }

  const parsedSeconds = Number(JSON.parse(saved));

  return Number.isFinite(parsedSeconds) ? clamp(parsedSeconds, minTimerSeconds, maxTimerSeconds) : defaultTimerSeconds;
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

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
