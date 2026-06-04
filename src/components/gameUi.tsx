import { useLayoutEffect, useRef, type ChangeEvent } from "react";
import type { RoundHistoryEntry, SessionStats } from "../game/session";
import type { GameStatus, PlayerAssignment, PlayerInput, RoleCounts } from "../game/types";

type PlayerStripProps = {
  assignments: PlayerAssignment[];
  eliminatedIds: Set<string>;
  turnStarterId?: string;
};

export function PlayerStrip({ assignments, eliminatedIds, turnStarterId }: PlayerStripProps) {
  return (
    <div className="player-strip">
      {assignments.map((assignment) => {
        const isEliminated = eliminatedIds.has(assignment.player.id);
        const isStarter = assignment.player.id === turnStarterId;

        return (
          <div
            className={`strip-token ${isEliminated ? "is-out" : ""} ${isStarter ? "is-starter" : ""}`}
            key={assignment.player.id}
          >
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

export function DiscussionTimer({
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

export function FitText({
  text,
  className,
  max = 5.8,
  min = 1.6,
}: {
  text: string;
  className?: string;
  max?: number;
  min?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    let lastWidth = -1;
    // Words wrap normally at spaces; shrink only when one word would overflow.
    const fit = () => {
      let size = max;
      el.style.fontSize = `${size}rem`;
      while (el.scrollWidth > el.clientWidth && size > min) {
        size -= 0.15;
        el.style.fontSize = `${size}rem`;
      }
    };

    fit();
    const observer = new ResizeObserver(() => {
      const width = parent.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      fit();
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [text, max, min]);

  return (
    <div ref={ref} className={className}>
      {text}
    </div>
  );
}

export function PlayerSpotlight({ assignment }: { assignment: PlayerAssignment }) {
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

export function PlayerAvatar({ className, player, fallback, onImageChange }: PlayerAvatarProps) {
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

export function RoleCounter({ label, value, onMinus, onPlus }: RoleCounterProps) {
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

export function TimerSetting({ seconds, onMinus, onPlus }: TimerSettingProps) {
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

type SessionSummaryProps = {
  history: RoundHistoryEntry[];
  stats: SessionStats;
  onClear?: () => void;
  title?: string;
  framed?: boolean;
};

type DeckFilterControlsProps = {
  categories: { value: string; label: string; count: number }[];
  category: string;
  difficulty: string;
  filteredCount: number;
  totalCount: number;
  onCategoryChange: (category: string) => void;
  onDifficultyChange: (difficulty: string) => void;
};

export function DeckFilterControls({
  categories,
  category,
  difficulty,
  filteredCount,
  totalCount,
  onCategoryChange,
  onDifficultyChange,
}: DeckFilterControlsProps) {
  return (
    <div className="deck-controls">
      <label>
        <span>Category</span>
        <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Difficulty</span>
        <select value={difficulty} onChange={(event) => onDifficultyChange(event.target.value)}>
          <option value="any">Any difficulty</option>
          <option value="easy">Easy</option>
          <option value="tricky">Tricky</option>
        </select>
      </label>

      <p className={filteredCount > 0 ? "deck-count" : "error-text"}>
        {filteredCount}/{totalCount} pairs available
      </p>
    </div>
  );
}

export function SessionSummary({ history, stats, onClear, title = "Session", framed = true }: SessionSummaryProps) {
  const hasPlayers = stats.players.length > 0;

  return (
    <section className={`${framed ? "panel " : ""}session-panel${framed ? "" : " scoreboard-panel"}`}>
      <div className="panel-heading">
        <h2>{title}</h2>
        {history.length > 0 && onClear && (
          <button className="secondary-button compact-button" type="button" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      <div className="session-totals">
        <SessionTotal label="Rounds" value={stats.roundsPlayed} />
        <SessionTotal label="Civilians" value={stats.wins.civilians} />
        <SessionTotal label="Infiltrators" value={stats.wins.infiltrators} />
        <SessionTotal label="Mr. White" value={stats.wins.mrWhite} />
      </div>

      {hasPlayers ? (
        <div className="leader-list">
          <div className="leader-header" aria-hidden="true">
            <span>#</span>
            <span>Player</span>
            <span>Points</span>
            <span>Wins</span>
          </div>
          {stats.players.map((player, index) => (
            <div className="leader-row" key={player.name}>
              <span className="leader-rank">{index + 1}</span>
              <span>{player.name}</span>
              <strong>{player.points} pts</strong>
              <small>{player.wins === 1 ? "1 win" : `${player.wins} wins`}</small>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted-text">Add players to start the ranking.</p>
      )}

      {history.length > 0 && (
        <div className="history-list">
          {history.slice(0, 4).map((entry) => (
            <div className="history-row" key={entry.id}>
              <span>{winnerLabel(entry.winner)}</span>
              <strong>{entry.word || "No word"}</strong>
              <small>{entry.winners.join(", ")}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SessionTotal({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function roleLabel(role: PlayerAssignment["role"]): string {
  if (role === "mrWhite") {
    return "Mr. White";
  }

  return role === "undercover" ? "Undercover" : "Civilian";
}

export function winnerLabel(winner: Exclude<GameStatus, { state: "playing" }>["winner"]): string {
  if (winner === "mrWhite") {
    return "Mr. White";
  }

  return winner === "infiltrators" ? "Infiltrators" : "Civilians";
}

export function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function roleTotal(counts: RoleCounts): number {
  return counts.civilian + counts.undercover + counts.mrWhite;
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
