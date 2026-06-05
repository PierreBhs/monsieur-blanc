// Tiny in-memory action logger for the current app session.
//
// One session = one app load. Games are bracketed by startGame()/endGame().
// Call sites pass only a TOKEN (see ./messages); the human wording is resolved
// from the catalog at render time, so each entry stays small and the text lives
// in one place. Every entry renders as a single sequential text line, e.g.:
//   2026-06-05T12:00:09.880Z  #0007  session=2f1c8e4a  game=a9b3d201  Reveal card tapped  fn="reveal word" player="Sam"

import { logMessages, type LogToken } from "./messages";

export type LogDetail = Record<string, unknown>;

export type LogEntry = {
  seq: number;
  ts: string;
  sessionId: string;
  gameId: string | null;
  token: LogToken;
  detail?: LogDetail;
  // Internal: collapses a burst of identical edits (e.g. typing a name) into one
  // entry. Not rendered. See logCoalesced.
  coalesceKey?: string;
};

const sessionId = crypto.randomUUID();
const sessionStartedAt = new Date().toISOString();

const entries: LogEntry[] = [];
let seq = 0;
let currentGameId: string | null = null;
let gameNumber = 0;

function idPrefix(id: string | null): string {
  return id ? id.slice(0, 8) : "-";
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatDetail(detail?: LogDetail): string {
  if (!detail) {
    return "";
  }

  return Object.entries(detail)
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join(" ");
}

function log(token: LogToken, detail?: LogDetail): void {
  seq += 1;
  entries.push({
    seq,
    ts: new Date().toISOString(),
    sessionId,
    gameId: currentGameId,
    token,
    detail,
  });
}

// Like log(), but consecutive calls with the same token + coalesceKey update the
// previous entry in place instead of appending. Keeps high-frequency edits
// (typing a player name) to one meaningful line showing the final value.
function logCoalesced(token: LogToken, coalesceKey: string, detail?: LogDetail): void {
  const last = entries[entries.length - 1];

  if (last && last.token === token && last.coalesceKey === coalesceKey && last.gameId === currentGameId) {
    last.detail = detail;
    last.ts = new Date().toISOString();
    return;
  }

  seq += 1;
  entries.push({
    seq,
    ts: new Date().toISOString(),
    sessionId,
    gameId: currentGameId,
    token,
    detail,
    coalesceKey,
  });
}

function startGame(detail?: LogDetail): string {
  currentGameId = crypto.randomUUID();
  gameNumber += 1;
  log("GAME_STARTED", { game: gameNumber, ...detail });
  return currentGameId;
}

function endGame(reason: string): void {
  if (!currentGameId) {
    return;
  }

  log("GAME_ENDED", { reason });
  currentGameId = null;
}

function getEntries(): readonly LogEntry[] {
  return entries;
}

function formatLine(entry: LogEntry): string {
  const { message, fn } = logMessages[entry.token];
  const columns = [
    entry.ts,
    `#${String(entry.seq).padStart(4, "0")}`,
    `session=${idPrefix(entry.sessionId)}`,
    `game=${idPrefix(entry.gameId)}`,
    message.padEnd(30),
    `fn=${formatValue(fn)}`,
    formatDetail(entry.detail),
  ];

  return columns.join("  ").trimEnd();
}

function serialize(opts?: { gameId?: string }): string {
  const selected = opts?.gameId ? entries.filter((entry) => entry.gameId === opts.gameId) : entries;
  return selected.map(formatLine).join("\n");
}

function downloadLogs(opts?: { gameId?: string }): void {
  const blob = new Blob([serialize(opts)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `mr-white-${idPrefix(sessionId)}-${stamp}.log`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const logger = {
  sessionId,
  sessionStartedAt,
  log,
  logCoalesced,
  startGame,
  endGame,
  getEntries,
  formatLine,
  serialize,
  downloadLogs,
};
