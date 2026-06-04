import type { ChangeEvent, DragEvent } from "react";
import type { DeckCategoryOption, DifficultyFilter } from "../decks/filters";
import type { RoundHistoryEntry, SessionStats } from "../game/session";
import type { PlayerInput, RoleCounts } from "../game/types";
import {
  DeckFilterControls,
  PlayerAvatar,
  RoleCounter,
  SessionSummary,
  TimerSetting,
} from "./gameUi";

type SetupScreenProps = {
  players: PlayerInput[];
  counts: RoleCounts;
  showRoles: boolean;
  timerEnabled: boolean;
  timerSeconds: number;
  deckCategory: string;
  deckDifficulty: DifficultyFilter;
  categoryOptions: DeckCategoryOption[];
  filteredWordCount: number;
  totalWordCount: number;
  deckStats: string;
  roleMismatch: boolean;
  totalRoles: number;
  deckEmpty: boolean;
  error: string;
  leavingId: string | null;
  draggingPlayerId: string | null;
  dropTargetPlayerId: string | null;
  roundHistory: RoundHistoryEntry[];
  sessionStats: SessionStats;
  onAddPlayer: () => void;
  onRemovePlayer: (id: string) => void;
  onPlayerNameChange: (id: string, name: string) => void;
  onPlayerAvatarChange: (id: string, event: ChangeEvent<HTMLInputElement>) => void;
  onPlayerDragStart: (id: string, event: DragEvent<HTMLElement>) => void;
  onPlayerDragOver: (id: string, event: DragEvent<HTMLDivElement>) => void;
  onPlayerDrop: (id: string, event: DragEvent<HTMLDivElement>) => void;
  onPlayerDragEnd: () => void;
  onRoleCountChange: (role: keyof RoleCounts, delta: number) => void;
  onShowRolesChange: (showRoles: boolean) => void;
  onTimerEnabledChange: (timerEnabled: boolean) => void;
  onTimerSecondsChange: (delta: number) => void;
  onDeckCategoryChange: (category: string) => void;
  onDeckDifficultyChange: (difficulty: string) => void;
  onStartRound: () => void;
  onClearRoundHistory: () => void;
};

export function SetupScreen({
  players,
  counts,
  showRoles,
  timerEnabled,
  timerSeconds,
  deckCategory,
  deckDifficulty,
  categoryOptions,
  filteredWordCount,
  totalWordCount,
  deckStats,
  roleMismatch,
  totalRoles,
  deckEmpty,
  error,
  leavingId,
  draggingPlayerId,
  dropTargetPlayerId,
  roundHistory,
  sessionStats,
  onAddPlayer,
  onRemovePlayer,
  onPlayerNameChange,
  onPlayerAvatarChange,
  onPlayerDragStart,
  onPlayerDragOver,
  onPlayerDrop,
  onPlayerDragEnd,
  onRoleCountChange,
  onShowRolesChange,
  onTimerEnabledChange,
  onTimerSecondsChange,
  onDeckCategoryChange,
  onDeckDifficultyChange,
  onStartRound,
  onClearRoundHistory,
}: SetupScreenProps) {
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
            <strong>{filteredWordCount}</strong>
          </div>
        </div>

        <div className="setup-grid">
          <section className="panel player-panel">
            <div className="panel-heading">
              <h2>Players</h2>
              <button className="icon-button add-player-button" type="button" title="Add player" onClick={onAddPlayer}>
                +
              </button>
            </div>

            <div className="player-list">
              {players.map((player, index) => (
                <div
                  className={`player-row${leavingId === player.id ? " is-leaving" : ""}${
                    draggingPlayerId === player.id ? " is-dragging" : ""
                  }${dropTargetPlayerId === player.id ? " is-drop-target" : ""}`}
                  key={player.id}
                  onDragOver={(event) => onPlayerDragOver(player.id, event)}
                  onDrop={(event) => onPlayerDrop(player.id, event)}
                >
                  <button
                    aria-label={`Move ${player.name || `Player ${index + 1}`}`}
                    className="drag-handle"
                    draggable
                    type="button"
                    title="Drag to reorder"
                    onDragEnd={onPlayerDragEnd}
                    onDragStart={(event) => onPlayerDragStart(player.id, event)}
                  >
                    ::
                  </button>
                  <PlayerAvatar
                    className="player-token"
                    fallback={String(index + 1)}
                    player={player}
                    onImageChange={(event) => onPlayerAvatarChange(player.id, event)}
                  />
                  <input
                    aria-label={`Player ${index + 1} name`}
                    placeholder={`Player ${index + 1}`}
                    value={player.name}
                    onChange={(event) => onPlayerNameChange(player.id, event.target.value)}
                  />
                  <button
                    className="icon-button remove-player-button"
                    type="button"
                    title={`Remove ${player.name}`}
                    onClick={() => onRemovePlayer(player.id)}
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

            <DeckFilterControls
              categories={categoryOptions}
              category={deckCategory}
              difficulty={deckDifficulty}
              filteredCount={filteredWordCount}
              totalCount={totalWordCount}
              onCategoryChange={onDeckCategoryChange}
              onDifficultyChange={onDeckDifficultyChange}
            />

            <RoleCounter
              label="Civilians"
              value={counts.civilian}
              onMinus={() => onRoleCountChange("civilian", -1)}
              onPlus={() => onRoleCountChange("civilian", 1)}
            />
            <RoleCounter
              label="Undercovers"
              value={counts.undercover}
              onMinus={() => onRoleCountChange("undercover", -1)}
              onPlus={() => onRoleCountChange("undercover", 1)}
            />
            <RoleCounter
              label="Mr. Whites"
              value={counts.mrWhite}
              onMinus={() => onRoleCountChange("mrWhite", -1)}
              onPlus={() => onRoleCountChange("mrWhite", 1)}
            />

            <label className="toggle-row">
              <span>Show role during word reveal</span>
              <input type="checkbox" checked={showRoles} onChange={(event) => onShowRolesChange(event.target.checked)} />
            </label>

            <label className="toggle-row">
              <span>Discussion timer</span>
              <input
                type="checkbox"
                checked={timerEnabled}
                onChange={(event) => onTimerEnabledChange(event.target.checked)}
              />
            </label>

            {timerEnabled && (
              <TimerSetting
                seconds={timerSeconds}
                onMinus={() => onTimerSecondsChange(-30)}
                onPlus={() => onTimerSecondsChange(30)}
              />
            )}

            <div className="start-area">
              {error && <p className="error-text">{error}</p>}
              <button className="primary-button" type="button" onClick={onStartRound} disabled={roleMismatch || deckEmpty}>
                Start round
              </button>
            </div>
          </section>
        </div>

        <SessionSummary history={roundHistory} stats={sessionStats} onClear={onClearRoundHistory} />
      </section>
    </main>
  );
}
