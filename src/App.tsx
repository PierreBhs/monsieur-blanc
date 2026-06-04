import { useEffect, useMemo, useState, type ChangeEvent, type PointerEvent } from "react";
import { RoundScreen } from "./components/RoundScreen";
import { SetupScreen } from "./components/SetupScreen";
import { roleTotal } from "./components/gameUi";
import {
  allCategories,
  anyDifficulty,
  categoryGroupLabel,
  deckCategoryOptions,
  filterWordPairs,
  type DifficultyFilter,
} from "./decks/filters";
import { wordPairs } from "./decks/wordPairs";
import {
  chooseRandomActiveAssignment,
  createRound,
  evaluateGameStatus,
  isCorrectMrWhiteGuess,
} from "./game/core";
import { logger } from "./log/logger";
import type { PlayPhase } from "./game/playPhase";
import {
  appendRoundHistory,
  calculateSessionStats,
  createRoundHistoryEntry,
  type RoundHistoryEntry,
} from "./game/session";
import type { GameStatus, PlayerAssignment, PlayerInput, RoleCounts, Round } from "./game/types";
import { pickMrWhiteVariant, preloadMrWhiteVariant, type MrWhiteVariant } from "./mrWhiteVariants";

const savedPlayersKey = "mr-white.players";
const savedCountsKey = "mr-white.counts";
const savedShowRolesKey = "mr-white.show-roles";
const savedTimerEnabledKey = "mr-white.timer-enabled";
const savedTimerSecondsKey = "mr-white.timer-seconds";
const savedRoundHistoryKey = "mr-white.round-history";
const savedDeckCategoryKey = "mr-white.deck-category";
const savedDeckDifficultyKey = "mr-white.deck-difficulty";
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

function App() {
  const [players, setPlayers] = useState<PlayerInput[]>(loadPlayers);
  const [counts, setCounts] = useState<RoleCounts>(loadCounts);
  const [showRoles, setShowRoles] = useState(loadShowRoles);
  const [timerEnabled, setTimerEnabled] = useState(loadTimerEnabled);
  const [timerSeconds, setTimerSeconds] = useState(loadTimerSeconds);
  const [deckCategory, setDeckCategory] = useState(loadDeckCategory);
  const [deckDifficulty, setDeckDifficulty] = useState<DifficultyFilter>(loadDeckDifficulty);
  const [round, setRound] = useState<Round | null>(null);
  const [mrWhiteVariant, setMrWhiteVariant] = useState<MrWhiteVariant | null>(null);
  const [phase, setPhase] = useState<PlayPhase>("reveal");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [turnStarter, setTurnStarter] = useState<PlayerAssignment | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(timerSeconds);
  const [timerRunning, setTimerRunning] = useState(false);
  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set());
  const [selectedElimination, setSelectedElimination] = useState<PlayerAssignment | null>(null);
  const [pendingElimination, setPendingElimination] = useState<PlayerAssignment | null>(null);
  const [mrWhiteGuess, setMrWhiteGuess] = useState("");
  const [gameStatus, setGameStatus] = useState<GameStatus>({ state: "playing" });
  const [roundHistory, setRoundHistory] = useState<RoundHistoryEntry[]>(loadRoundHistory);
  const [lastElimination, setLastElimination] = useState("");
  const [error, setError] = useState("");
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [dropInsertionIndex, setDropInsertionIndex] = useState<number | null>(null);

  const totalRoles = roleTotal(counts);
  const activeAssignment = round?.assignments[activeIndex];
  const roleMismatch = totalRoles !== players.length;
  const activeAssignments = round?.assignments.filter((assignment) => !eliminatedIds.has(assignment.player.id)) ?? [];
  const categoryOptions = useMemo(() => deckCategoryOptions(wordPairs), []);
  const filteredWordPairs = useMemo(
    () => filterWordPairs(wordPairs, { category: deckCategory, difficulty: deckDifficulty }),
    [deckCategory, deckDifficulty],
  );
  const deckEmpty = filteredWordPairs.length === 0;

  const deckStats = useMemo(() => {
    const categories = new Set(filteredWordPairs.map((pair) => categoryGroupLabel(pair.category)));
    return `${filteredWordPairs.length} pairs across ${categories.size} categories`;
  }, [filteredWordPairs]);
  const sessionStats = useMemo(() => calculateSessionStats(roundHistory, players), [roundHistory, players]);

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

  useEffect(() => {
    if (!round) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [phase, round]);

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
    logger.log("TOGGLE_SHOW_ROLES", { value: nextShowRoles });
  }

  function updateTimerEnabled(nextTimerEnabled: boolean) {
    setTimerEnabled(nextTimerEnabled);
    localStorage.setItem(savedTimerEnabledKey, JSON.stringify(nextTimerEnabled));
    logger.log("TOGGLE_TIMER", { value: nextTimerEnabled });
  }

  function updateTimerSeconds(nextTimerSeconds: number) {
    setTimerSeconds(nextTimerSeconds);
    setRemainingSeconds(nextTimerSeconds);
    localStorage.setItem(savedTimerSecondsKey, JSON.stringify(nextTimerSeconds));
  }

  function updateRoundHistory(nextRoundHistory: RoundHistoryEntry[]) {
    setRoundHistory(nextRoundHistory);
    localStorage.setItem(savedRoundHistoryKey, JSON.stringify(nextRoundHistory));
  }

  function updateDeckCategory(nextDeckCategory: string) {
    setDeckCategory(nextDeckCategory);
    localStorage.setItem(savedDeckCategoryKey, JSON.stringify(nextDeckCategory));
    logger.log("SET_DECK_CATEGORY", { category: nextDeckCategory });
  }

  function updateDeckDifficulty(nextDeckDifficulty: string) {
    const normalizedDifficulty = normalizeDeckDifficulty(nextDeckDifficulty);
    setDeckDifficulty(normalizedDifficulty);
    localStorage.setItem(savedDeckDifficultyKey, JSON.stringify(normalizedDifficulty));
    logger.log("SET_DECK_DIFFICULTY", { difficulty: normalizedDifficulty });
  }

  function updatePlayerName(id: string, name: string) {
    updatePlayers(players.map((player) => (player.id === id ? { ...player, name } : player)));
    logger.logCoalesced("RENAME_PLAYER", id, { id, name });
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
    logger.log("SET_AVATAR", { id });
  }

  function addPlayer() {
    updatePlayers([...players, { id: crypto.randomUUID(), name: "" }]);
    updateCounts({ ...counts, civilian: counts.civilian + 1 });
    logger.log("ADD_PLAYER", { players: players.length + 1 });
  }

  function removePlayer(id: string) {
    if (players.length <= 3) {
      setError("Keep at least 3 players.");
      return;
    }

    if (leavingId) return;

    logger.log("REMOVE_PLAYER", { id });
    setLeavingId(id);
    setTimeout(() => {
      setPlayers((currentPlayers) => {
        const nextPlayers = currentPlayers.filter((player) => player.id !== id);
        localStorage.setItem(savedPlayersKey, JSON.stringify(nextPlayers));

        setCounts((currentCounts) => {
          const nextCounts = trimCountsToPlayers(currentCounts, nextPlayers.length);
          localStorage.setItem(savedCountsKey, JSON.stringify(nextCounts));
          return nextCounts;
        });

        return nextPlayers;
      });
      setLeavingId(null);
    }, 180);
  }

  function reorderPlayer(draggedId: string, insertionIndex: number) {
    const draggedIndex = players.findIndex((player) => player.id === draggedId);

    if (draggedIndex === -1) {
      return;
    }

    const boundedInsertionIndex = clamp(insertionIndex, 0, players.length);

    if (boundedInsertionIndex === draggedIndex || boundedInsertionIndex === draggedIndex + 1) {
      return;
    }

    const nextPlayers = [...players];
    const [draggedPlayer] = nextPlayers.splice(draggedIndex, 1);
    const targetIndex = boundedInsertionIndex > draggedIndex ? boundedInsertionIndex - 1 : boundedInsertionIndex;
    nextPlayers.splice(targetIndex, 0, draggedPlayer);
    updatePlayers(nextPlayers);
    logger.log("REORDER_PLAYER", { id: draggedId, fromIndex: draggedIndex, toIndex: targetIndex });
  }

  function startPlayerDrag(id: string, event: PointerEvent<HTMLButtonElement>) {
    setDraggingPlayerId(id);
    setDropInsertionIndex(null);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveDraggedPlayer(event: PointerEvent<HTMLButtonElement>) {
    if (!draggingPlayerId) {
      return;
    }

    event.preventDefault();
    const nextInsertionIndex = meaningfulPlayerInsertionIndex(
      playerInsertionIndexFromPoint(event.clientY, draggingPlayerId, players),
      draggingPlayerId,
      players,
    );
    setDropInsertionIndex((currentInsertionIndex) =>
      currentInsertionIndex === nextInsertionIndex ? currentInsertionIndex : nextInsertionIndex,
    );
  }

  function finishPlayerDrag(event?: PointerEvent<HTMLButtonElement>) {
    event?.preventDefault();

    if (draggingPlayerId && dropInsertionIndex !== null) {
      reorderPlayer(draggingPlayerId, dropInsertionIndex);
    }

    setDraggingPlayerId(null);
    setDropInsertionIndex(null);
  }

  function changeCount(role: keyof RoleCounts, delta: number) {
    if (delta > 0 && totalRoles >= players.length) return;
    const nextValue = Math.max(0, counts[role] + delta);
    updateCounts({ ...counts, [role]: nextValue });
    logger.log("CHANGE_ROLE_COUNT", { role, delta, value: nextValue });
  }

  function changeTimerSeconds(delta: number) {
    const nextSeconds = clamp(timerSeconds + delta, minTimerSeconds, maxTimerSeconds);
    updateTimerSeconds(nextSeconds);
    logger.log("CHANGE_TIMER_SECONDS", { delta, seconds: nextSeconds });
  }

  function startRound() {
    setError("");

    try {
      const nextRound = createRound({
        players: players.map((player) => ({ ...player, name: player.name.trim() })),
        counts,
        deck: filteredWordPairs,
      });

      const nextMrWhiteVariant = pickMrWhiteVariant();
      preloadMrWhiteVariant(nextMrWhiteVariant.src);

      setRound(nextRound);
      setMrWhiteVariant(nextMrWhiteVariant);
      setPhase("reveal");
      setActiveIndex(0);
      setIsRevealed(false);
      setTurnStarter(null);
      setRemainingSeconds(timerSeconds);
      setTimerRunning(false);
      setEliminatedIds(new Set());
      setSelectedElimination(null);
      setPendingElimination(null);
      setMrWhiteGuess("");
      setGameStatus({ state: "playing" });
      setLastElimination("");

      logger.endGame("new-round");
      logger.startGame();
      logger.log("START_ROUND", {
        wordPairId: nextRound.wordPair.id,
        category: nextRound.wordPair.category,
        counts,
        playerCount: nextRound.assignments.length,
      });
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

    logger.log("NEXT_PLAYER", { index: activeIndex + 1 });
    setActiveIndex(activeIndex + 1);
  }

  function startNextTurn(assignments: PlayerAssignment[], nextEliminatedIds: Set<string>) {
    const starter = chooseRandomActiveAssignment(assignments, nextEliminatedIds, Math.random, turnStarter?.player.id);
    setTurnStarter(starter);
    setRemainingSeconds(timerSeconds);
    setTimerRunning(timerEnabled);
    setPhase("turn");
    logger.log("START_TURN", { starter: starter?.player.name });
  }

  function startVote() {
    setTimerRunning(false);
    setSelectedElimination(null);
    setPhase("vote");
    logger.log("START_VOTE");
  }

  function selectElimination(assignment: PlayerAssignment) {
    setLastElimination("");
    setSelectedElimination(assignment);
    logger.log("SELECT_ELIMINATION", { player: assignment.player.name });
  }

  function confirmElimination() {
    if (!selectedElimination) {
      return;
    }

    setSelectedElimination(null);
    logger.log("CONFIRM_ELIMINATION", {
      player: selectedElimination.player.name,
      role: selectedElimination.role,
    });

    if (selectedElimination.role === "mrWhite") {
      setPendingElimination(selectedElimination);
      setMrWhiteGuess("");
      setPhase("mrWhiteGuess");
      return;
    }

    finishElimination(selectedElimination);
  }

  function submitMrWhiteGuess() {
    if (!round || !pendingElimination) {
      return;
    }

    const correct = isCorrectMrWhiteGuess(mrWhiteGuess, round.wordPair.civilian);
    logger.log("SUBMIT_MRWHITE_GUESS", { guess: mrWhiteGuess, correct });

    if (correct) {
      const nextStatus: GameStatus = {
        state: "won",
        winner: "mrWhite",
        reason: `${pendingElimination.player.name} guessed "${round.wordPair.civilian}".`,
      };
      recordRoundResult(round.assignments, nextStatus);
      setGameStatus(nextStatus);
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

    logger.log("FINISH_ELIMINATION", {
      player: assignment.player.name,
      role: assignment.role,
      state: nextStatus.state,
    });
    setEliminatedIds(nextEliminatedIds);
    setSelectedElimination(null);
    setPendingElimination(assignment);
    setMrWhiteGuess("");
    setGameStatus(nextStatus);
    setLastElimination(`${assignment.player.name} is out.`);
    if (nextStatus.state === "won") {
      recordRoundResult(round.assignments, nextStatus);
    }
    setPhase("eliminationReveal");
  }

  function recordRoundResult(assignments: PlayerAssignment[], status: GameStatus) {
    if (status.state !== "won") {
      return;
    }

    const entry = createRoundHistoryEntry(assignments, status, new Date().toISOString());
    updateRoundHistory(appendRoundHistory(roundHistory, entry));
    logger.log("RECORD_RESULT", { winner: status.winner, reason: status.reason, word: entry.word });
  }

  function clearRoundHistory() {
    updateRoundHistory([]);
    logger.log("CLEAR_HISTORY");
  }

  function continueAfterElimination() {
    if (!round) {
      return;
    }

    setPendingElimination(null);
    logger.log("CONTINUE_AFTER_ELIMINATION");

    if (gameStatus.state === "won") {
      setPhase("gameOver");
      return;
    }

    startNextTurn(round.assignments, eliminatedIds);
  }

  function resetRound() {
    logger.endGame("back-to-setup");
    setRound(null);
    setMrWhiteVariant(null);
    setPhase("reveal");
    setActiveIndex(0);
    setIsRevealed(false);
    setTurnStarter(null);
    setRemainingSeconds(timerSeconds);
    setTimerRunning(false);
    setEliminatedIds(new Set());
    setSelectedElimination(null);
    setPendingElimination(null);
    setMrWhiteGuess("");
    setGameStatus({ state: "playing" });
    setLastElimination("");
    setError("");
    setLeavingId(null);
    setDraggingPlayerId(null);
    setDropInsertionIndex(null);
  }

  if (round) {
    return (
      <RoundScreen
        round={round}
        mrWhiteVariant={mrWhiteVariant ?? undefined}
        phase={phase}
        activeAssignment={activeAssignment}
        activeIndex={activeIndex}
        activeAssignments={activeAssignments}
        eliminatedIds={eliminatedIds}
        turnStarter={turnStarter}
        isRevealed={isRevealed}
        showRoles={showRoles}
        timerEnabled={timerEnabled}
        timerRunning={timerRunning}
        timerSeconds={timerSeconds}
        remainingSeconds={remainingSeconds}
        lastElimination={lastElimination}
        selectedElimination={selectedElimination}
        pendingElimination={pendingElimination}
        mrWhiteGuess={mrWhiteGuess}
        gameStatus={gameStatus}
        roundHistory={roundHistory}
        sessionStats={sessionStats}
        onBackToSetup={resetRound}
        onContinuePlaying={startRound}
        onReveal={() => {
          logger.log("REVEAL_WORD", {
            player: activeAssignment?.player.name,
            role: activeAssignment?.role,
            word: activeAssignment?.word,
          });
          setIsRevealed(true);
        }}
        onNextPlayer={goToNextPlayer}
        onStartVote={startVote}
        onSelectElimination={selectElimination}
        onConfirmElimination={confirmElimination}
        onMrWhiteGuessChange={setMrWhiteGuess}
        onSubmitMrWhiteGuess={submitMrWhiteGuess}
        onSkipMrWhiteGuess={finishElimination}
        onContinueAfterElimination={continueAfterElimination}
        onTimerPause={() => {
          logger.log("TIMER_PAUSE");
          setTimerRunning(false);
        }}
        onTimerReset={() => {
          logger.log("TIMER_RESET");
          setRemainingSeconds(timerSeconds);
          setTimerRunning(true);
        }}
        onTimerStart={() => {
          logger.log("TIMER_START");
          setTimerRunning(true);
        }}
      />
    );
  }

  return (
    <SetupScreen
      players={players}
      counts={counts}
      showRoles={showRoles}
      timerEnabled={timerEnabled}
      timerSeconds={timerSeconds}
      deckCategory={deckCategory}
      deckDifficulty={deckDifficulty}
      categoryOptions={categoryOptions}
      filteredWordCount={filteredWordPairs.length}
      totalWordCount={wordPairs.length}
      deckStats={deckStats}
      roleMismatch={roleMismatch}
      totalRoles={totalRoles}
      deckEmpty={deckEmpty}
      error={error}
      leavingId={leavingId}
      draggingPlayerId={draggingPlayerId}
      dropInsertionIndex={dropInsertionIndex}
      roundHistory={roundHistory}
      sessionStats={sessionStats}
      onAddPlayer={addPlayer}
      onRemovePlayer={removePlayer}
      onPlayerNameChange={updatePlayerName}
      onPlayerAvatarChange={changePlayerAvatar}
      onPlayerDragStart={startPlayerDrag}
      onPlayerDragMove={moveDraggedPlayer}
      onPlayerDragEnd={finishPlayerDrag}
      onRoleCountChange={changeCount}
      onShowRolesChange={updateShowRoles}
      onTimerEnabledChange={updateTimerEnabled}
      onTimerSecondsChange={changeTimerSeconds}
      onDeckCategoryChange={updateDeckCategory}
      onDeckDifficultyChange={updateDeckDifficulty}
      onStartRound={startRound}
      onClearRoundHistory={clearRoundHistory}
      onDownloadLogs={() => logger.downloadLogs()}
    />
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

function loadRoundHistory(): RoundHistoryEntry[] {
  const saved = localStorage.getItem(savedRoundHistoryKey);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as RoundHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function loadDeckCategory(): string {
  const saved = localStorage.getItem(savedDeckCategoryKey);

  if (!saved) {
    return allCategories;
  }

  try {
    const parsed = JSON.parse(saved);
    return typeof parsed === "string" ? parsed : allCategories;
  } catch {
    return allCategories;
  }
}

function loadDeckDifficulty(): DifficultyFilter {
  const saved = localStorage.getItem(savedDeckDifficultyKey);

  if (!saved) {
    return anyDifficulty;
  }

  try {
    return normalizeDeckDifficulty(JSON.parse(saved));
  } catch {
    return anyDifficulty;
  }
}

function normalizeDeckDifficulty(value: unknown): DifficultyFilter {
  return value === "easy" || value === "tricky" || value === anyDifficulty ? value : anyDifficulty;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function playerInsertionIndexFromPoint(clientY: number, draggedId: string, players: PlayerInput[]): number {
  const draggedIndex = players.findIndex((player) => player.id === draggedId);
  const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-player-row-id]")).filter(
    (row) => row.dataset.playerRowId !== draggedId,
  );

  for (const row of rows) {
    const playerId = row.dataset.playerRowId;
    const playerIndex = players.findIndex((player) => player.id === playerId);

    if (playerIndex === -1) {
      continue;
    }

    const rect = row.getBoundingClientRect();

    if (clientY >= rect.top && clientY <= rect.bottom) {
      if (playerIndex === draggedIndex + 1) {
        return playerIndex + 1;
      }

      if (playerIndex === draggedIndex - 1) {
        return playerIndex;
      }

      return clientY < rect.top + rect.height / 2 ? playerIndex : playerIndex + 1;
    }

    if (clientY < rect.top + rect.height / 2) {
      return playerIndex;
    }
  }

  return players.length;
}

function meaningfulPlayerInsertionIndex(rawInsertionIndex: number, draggedId: string, players: PlayerInput[]): number | null {
  const draggedIndex = players.findIndex((player) => player.id === draggedId);

  if (draggedIndex === -1) {
    return null;
  }

  return rawInsertionIndex === draggedIndex || rawInsertionIndex === draggedIndex + 1 ? null : rawInsertionIndex;
}

export default App;
