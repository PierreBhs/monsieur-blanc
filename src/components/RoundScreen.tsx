import { WordHelp } from "../WordHelp";
import type { PlayPhase } from "../game/playPhase";
import type { RoundHistoryEntry, SessionStats } from "../game/session";
import type { GameStatus, PlayerAssignment, Round } from "../game/types";
import {
  DiscussionTimer,
  FitText,
  PlayerAvatar,
  PlayerSpotlight,
  PlayerStrip,
  SessionSummary,
  roleLabel,
  winnerLabel,
} from "./gameUi";

type RoundScreenProps = {
  round: Round;
  phase: PlayPhase;
  activeAssignment?: PlayerAssignment;
  activeIndex: number;
  activeAssignments: PlayerAssignment[];
  eliminatedIds: Set<string>;
  turnStarter: PlayerAssignment | null;
  isRevealed: boolean;
  showRoles: boolean;
  timerEnabled: boolean;
  timerRunning: boolean;
  timerSeconds: number;
  remainingSeconds: number;
  lastElimination: string;
  undercoverBonusPoints: number;
  selectedElimination: PlayerAssignment | null;
  pendingElimination: PlayerAssignment | null;
  mrWhiteGuess: string;
  undercoverGuess: string;
  gameStatus: GameStatus;
  roundHistory: RoundHistoryEntry[];
  sessionStats: SessionStats;
  addPlayerName: string;
  roundError: string;
  onOpenAddPlayer: () => void;
  onCancelAddPlayer: () => void;
  onAddPlayerNameChange: (name: string) => void;
  onConfirmAddPlayer: () => void;
  onBackToSetup: () => void;
  onContinuePlaying: () => void;
  onReveal: () => void;
  onNextPlayer: () => void;
  onStartVote: () => void;
  onSelectElimination: (assignment: PlayerAssignment) => void;
  onConfirmElimination: () => void;
  onMrWhiteGuessChange: (guess: string) => void;
  onSubmitMrWhiteGuess: () => void;
  onSkipMrWhiteGuess: (assignment: PlayerAssignment) => void;
  onUndercoverGuessChange: (guess: string) => void;
  onSubmitUndercoverGuess: () => void;
  onSkipUndercoverGuess: (assignment: PlayerAssignment) => void;
  onContinueAfterElimination: () => void;
  onTimerPause: () => void;
  onTimerReset: () => void;
  onTimerStart: () => void;
};

export function RoundScreen({
  round,
  phase,
  activeAssignment,
  activeIndex,
  activeAssignments,
  eliminatedIds,
  turnStarter,
  isRevealed,
  showRoles,
  timerEnabled,
  timerRunning,
  timerSeconds,
  remainingSeconds,
  lastElimination,
  undercoverBonusPoints,
  selectedElimination,
  pendingElimination,
  mrWhiteGuess,
  undercoverGuess,
  gameStatus,
  roundHistory,
  sessionStats,
  addPlayerName,
  roundError,
  onOpenAddPlayer,
  onCancelAddPlayer,
  onAddPlayerNameChange,
  onConfirmAddPlayer,
  onBackToSetup,
  onContinuePlaying,
  onReveal,
  onNextPlayer,
  onStartVote,
  onSelectElimination,
  onConfirmElimination,
  onMrWhiteGuessChange,
  onSubmitMrWhiteGuess,
  onSkipMrWhiteGuess,
  onUndercoverGuessChange,
  onSubmitUndercoverGuess,
  onSkipUndercoverGuess,
  onContinueAfterElimination,
  onTimerPause,
  onTimerReset,
  onTimerStart,
}: RoundScreenProps) {
  return (
    <main key="round" className="app-shell">
      <section className="round-layout">
        {phase !== "gameOver" && (
          <div className="top-bar">
            <button className="secondary-button" type="button" onClick={onBackToSetup}>
              Back to setup
            </button>
            <div className="top-bar-actions">
              <span>{activeAssignments.length} active</span>
              {phase !== "addPlayer" && (
                <button
                  className="secondary-button round-add-player-button"
                  type="button"
                  onClick={onOpenAddPlayer}
                >
                  Add player
                </button>
              )}
            </div>
          </div>
        )}

        <PlayerStrip assignments={round.assignments} eliminatedIds={eliminatedIds} turnStarterId={turnStarter?.player.id} />

        {phase === "addPlayer" && (
          <div className="round-card add-player-card">
            <div className="phase-band">
              <span>Join round</span>
              <strong>New player</strong>
            </div>
            <p className="muted-text">Add someone mid-round. They get a random role, then privately reveal their word.</p>

            <input
              aria-label="New player name"
              autoFocus
              placeholder="Player name"
              value={addPlayerName}
              onChange={(event) => onAddPlayerNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onConfirmAddPlayer();
                }
              }}
            />

            {roundError && <p className="error-text">{roundError}</p>}

            <div className="button-row">
              <button className="secondary-button" type="button" onClick={onCancelAddPlayer}>
                Cancel
              </button>
              <button className="primary-button" type="button" onClick={onConfirmAddPlayer}>
                Add and reveal
              </button>
            </div>
          </div>
        )}

        {phase === "reveal" && activeAssignment && (
          <div
            className={`round-card reveal-card${
              isRevealed && activeAssignment.role === "mrWhite" ? " is-mrwhite" : ""
            }`}
          >
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
                <button className="primary-button" type="button" onClick={onReveal}>
                  Reveal word
                </button>
              </>
            ) : (
              <>
                <div className={`secret-box${activeAssignment.role === "mrWhite" ? " is-mr-white" : ""}`}>
                  {activeAssignment.word && <WordHelp word={activeAssignment.word} />}
                  {activeAssignment.role === "mrWhite" && (
                    <img className="mr-white-role-art" src="/mr-white-role.png" alt="" />
                  )}
                  {showRoles && activeAssignment.role !== "mrWhite" && (
                    <div className="role-name">{roleLabel(activeAssignment.role)}</div>
                  )}
                  <FitText className="secret-word" text={activeAssignment.word ?? roleLabel(activeAssignment.role)} />
                </div>
                <button className="primary-button" type="button" onClick={onNextPlayer}>
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
                onPause={onTimerPause}
                onReset={onTimerReset}
                onStart={onTimerStart}
              />
            )}

            {lastElimination && <p className="status-line">{lastElimination}</p>}

            <button className="primary-button" type="button" onClick={onStartVote}>
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
                  aria-pressed={selectedElimination?.player.id === assignment.player.id}
                  className={`vote-row${selectedElimination?.player.id === assignment.player.id ? " is-selected" : ""}`}
                  key={assignment.player.id}
                  type="button"
                  onClick={() => onSelectElimination(assignment)}
                >
                  <PlayerAvatar className="player-token" player={assignment.player} />
                  <span>{assignment.player.name}</span>
                  <span>{selectedElimination?.player.id === assignment.player.id ? "Selected" : "Select"}</span>
                </button>
              ))}
            </div>

            {selectedElimination && (
              <button className="primary-button danger-button" type="button" onClick={onConfirmElimination}>
                Vote out {selectedElimination.player.name}
              </button>
            )}
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
              onChange={(event) => onMrWhiteGuessChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSubmitMrWhiteGuess();
                }
              }}
            />

            <div className="button-row">
              <button className="secondary-button" type="button" onClick={() => onSkipMrWhiteGuess(pendingElimination)}>
                Skip guess
              </button>
              <button className="primary-button" type="button" onClick={onSubmitMrWhiteGuess}>
                Submit guess
              </button>
            </div>
          </div>
        )}

        {phase === "undercoverGuess" && pendingElimination && (
          <div className="round-card guess-card">
            <div className="phase-band danger-band">
              <span>Final guess</span>
              <strong>Undercover</strong>
            </div>
            <div className="starter-layout">
              <PlayerSpotlight assignment={pendingElimination} />
              <p className="muted-text">
                The undercover was voted out and can guess the civilian word for 1 point. The round keeps going either way.
              </p>
            </div>

            <input
              aria-label="Undercover word guess"
              autoFocus
              value={undercoverGuess}
              onChange={(event) => onUndercoverGuessChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSubmitUndercoverGuess();
                }
              }}
            />

            <div className="button-row">
              <button
                className="secondary-button"
                type="button"
                onClick={() => onSkipUndercoverGuess(pendingElimination)}
              >
                Skip guess
              </button>
              <button className="primary-button" type="button" onClick={onSubmitUndercoverGuess}>
                Submit guess
              </button>
            </div>
          </div>
        )}

        {phase === "eliminationReveal" && pendingElimination && (
          <div
            className={`round-card elimination-card${
              pendingElimination.role === "undercover" && undercoverBonusPoints > 0 ? " has-undercover-bonus" : ""
            }`}
          >
            <div
              className={`phase-band${
                pendingElimination.role === "undercover" && undercoverBonusPoints > 0 ? " bonus-band" : " danger-band"
              }`}
            >
              <span>
                {pendingElimination.role === "undercover" && undercoverBonusPoints > 0 ? "Bonus earned" : "Eliminated"}
              </span>
              <strong>{roleLabel(pendingElimination.role)}</strong>
            </div>
            <PlayerSpotlight assignment={pendingElimination} />
            {pendingElimination.role === "undercover" && undercoverBonusPoints > 0 && (
              <div className="undercover-bonus-banner" role="status">
                <p className="undercover-bonus-kicker">Correct civilian word</p>
                <p className="undercover-bonus-points">+{undercoverBonusPoints} point</p>
                <p className="undercover-bonus-copy">
                  <strong>{pendingElimination.player.name}</strong> guessed the hidden word before leaving the round.
                </p>
              </div>
            )}
            <div className="elimination-role">
              <span>{pendingElimination.player.name} is eliminated</span>
              <strong>{roleLabel(pendingElimination.role)}</strong>
            </div>
            {lastElimination && undercoverBonusPoints === 0 && <p className="status-line">{lastElimination}</p>}
            <button className="primary-button" type="button" onClick={onContinueAfterElimination}>
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

            <SessionSummary history={roundHistory} stats={sessionStats} title="Scoreboard" framed={false} />

            <div className="button-row">
              <button className="primary-button" type="button" onClick={onContinuePlaying}>
                Continue playing
              </button>
              <button className="secondary-button" type="button" onClick={onBackToSetup}>
                Back to menu
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
