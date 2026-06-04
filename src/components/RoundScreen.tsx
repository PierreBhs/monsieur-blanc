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
  pendingElimination: PlayerAssignment | null;
  mrWhiteGuess: string;
  gameStatus: GameStatus;
  roundHistory: RoundHistoryEntry[];
  sessionStats: SessionStats;
  onBackToSetup: () => void;
  onContinuePlaying: () => void;
  onReveal: () => void;
  onNextPlayer: () => void;
  onStartVote: () => void;
  onSelectElimination: (assignment: PlayerAssignment) => void;
  onMrWhiteGuessChange: (guess: string) => void;
  onSubmitMrWhiteGuess: () => void;
  onSkipMrWhiteGuess: (assignment: PlayerAssignment) => void;
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
  pendingElimination,
  mrWhiteGuess,
  gameStatus,
  roundHistory,
  sessionStats,
  onBackToSetup,
  onContinuePlaying,
  onReveal,
  onNextPlayer,
  onStartVote,
  onSelectElimination,
  onMrWhiteGuessChange,
  onSubmitMrWhiteGuess,
  onSkipMrWhiteGuess,
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
            <span>{activeAssignments.length} active</span>
          </div>
        )}

        <PlayerStrip assignments={round.assignments} eliminatedIds={eliminatedIds} turnStarterId={turnStarter?.player.id} />

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
                  className="vote-row"
                  key={assignment.player.id}
                  type="button"
                  onClick={() => onSelectElimination(assignment)}
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
