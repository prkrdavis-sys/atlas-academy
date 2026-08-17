import { scopedHref } from "@/lib/scope";
import type {
  ChallengeModifier,
  Difficulty,
  DailyChallengeAnswer,
  GameMode,
  GameScope,
  Question,
  Region,
  RoundQuestionSetting,
} from "@/lib/types";

export const GAME_RESUME_SESSION_KEY = "atlas-academy-game-resume";
export const GAME_RESUME_STORAGE_KEY = "atlas-academy-game-resume";

const RESUME_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type GameResumeSnapshot = {
  version: 1;
  playHref: string;
  createdAt: number;
  profileId?: string;
  mode: GameMode;
  challengeModifier: ChallengeModifier;
  continents: Region[];
  scope: GameScope;
  includeTerritories: boolean;
  difficulty: Difficulty;
  weakSpotCodes?: string[];
  seed?: number;
  timed: boolean;
  stopOnWrong: boolean;
  maxQuestions?: RoundQuestionSetting;
  countStats: boolean;
  dailyDateKey?: string;
  dailyStartedAt?: number;
  dailyQuestions?: Question[];
  dailyAnswers?: DailyChallengeAnswer[];
  questionIndex: number;
  roundCountryCodes: string[];
  question: Question;
  showLearnCard: boolean;
  streak: number;
  endedStreak: number;
  lastCorrect: boolean;
  lastSelectedAnswer: string | null;
  lastSelectedCode: string | null;
  disabled: boolean;
  hiddenOptions: string[];
  usedFiftyFifty: boolean;
  usedSkip: boolean;
  questionCount: number;
  correctAnswers: number;
  skippedAnswers: number;
  hintsUsed: number;
  timeLeft: number;
  gameOver: boolean;
  sessionComplete: boolean;
};

export type GameResumeMatch = {
  mode: GameMode;
  scope: GameScope;
  profileId?: string;
  dailyDateKey?: string;
};

function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== "object") return false;
  const q = value as Partial<Question>;
  return (
    typeof q.id === "string" &&
    typeof q.mode === "string" &&
    typeof q.countryCode === "string" &&
    typeof q.prompt === "string" &&
    typeof q.correctAnswer === "string"
  );
}

export function isResumeSnapshot(value: unknown): value is GameResumeSnapshot {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<GameResumeSnapshot>;
  return (
    s.version === 1 &&
    typeof s.playHref === "string" &&
    typeof s.mode === "string" &&
    typeof s.scope === "string" &&
    typeof s.difficulty === "string" &&
    typeof s.questionIndex === "number" &&
    Array.isArray(s.roundCountryCodes) &&
    Array.isArray(s.continents) &&
    isQuestion(s.question) &&
    typeof s.questionCount === "number" &&
    typeof s.correctAnswers === "number" &&
    typeof s.lastCorrect === "boolean"
  );
}

function normalizeResumeSnapshot(snapshot: GameResumeSnapshot): GameResumeSnapshot {
  return {
    ...snapshot,
    // Older snapshots were only written on the learn card.
    showLearnCard: snapshot.showLearnCard ?? true,
  };
}

export function buildGameResumePlayHref(
  mode: GameMode,
  scope: GameScope,
  dailyDateKey?: string,
): string {
  return scopedHref(`/play/${mode}`, scope, {
    resume: "1",
    ...(mode === "daily-challenge" && dailyDateKey ? { date: dailyDateKey } : {}),
  });
}

function writeResumeRaw(raw: string): void {
  localStorage.setItem(GAME_RESUME_STORAGE_KEY, raw);
  try {
    sessionStorage.removeItem(GAME_RESUME_SESSION_KEY);
  } catch {
    // sessionStorage may be unavailable even when localStorage works.
  }
}

export function saveGameResumeSnapshot(snapshot: GameResumeSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    writeResumeRaw(JSON.stringify(snapshot));
  } catch {
    // Ignore quota / private-mode failures — resume is best-effort.
  }
}

function readResumeRaw(): string | null {
  try {
    const local = localStorage.getItem(GAME_RESUME_STORAGE_KEY);
    if (local) return local;
    const session = sessionStorage.getItem(GAME_RESUME_SESSION_KEY);
    if (!session) return null;
    writeResumeRaw(session);
    return session;
  } catch {
    return null;
  }
}

export function loadGameResumeSnapshot(): GameResumeSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readResumeRaw();
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isResumeSnapshot(parsed)) {
      clearGameResumeSnapshot();
      return null;
    }
    return normalizeResumeSnapshot(parsed);
  } catch {
    clearGameResumeSnapshot();
    return null;
  }
}

export function snapshotMatchesResume(
  snapshot: GameResumeSnapshot | null,
  match: GameResumeMatch,
): snapshot is GameResumeSnapshot {
  if (!snapshot) return false;
  if (!Number.isFinite(snapshot.createdAt) || Date.now() - snapshot.createdAt > RESUME_MAX_AGE_MS) {
    return false;
  }
  if (snapshot.mode !== match.mode || snapshot.scope !== match.scope) return false;
  if (match.profileId && snapshot.profileId && snapshot.profileId !== match.profileId) {
    return false;
  }
  if (
    snapshot.mode === "daily-challenge" &&
    match.dailyDateKey &&
    snapshot.dailyDateKey &&
    snapshot.dailyDateKey !== match.dailyDateKey
  ) {
    return false;
  }
  return true;
}

export function loadMatchingGameResumeSnapshot(
  match: GameResumeMatch,
): GameResumeSnapshot | null {
  const snapshot = loadGameResumeSnapshot();
  return snapshotMatchesResume(snapshot, match) ? snapshot : null;
}

export function clearGameResumeSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GAME_RESUME_STORAGE_KEY);
  } catch {
    // Ignore storage failures while clearing.
  }
  try {
    sessionStorage.removeItem(GAME_RESUME_SESSION_KEY);
  } catch {
    // Ignore storage failures while clearing.
  }
}

export function peekGameResumePlayHref(): string | null {
  return loadGameResumeSnapshot()?.playHref ?? null;
}

const FRESH_PLAY_SESSION_KEY = "atlas-academy-fresh-play";

export function markFreshPlay(mode: GameMode, scope: GameScope): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(FRESH_PLAY_SESSION_KEY, `${mode}:${scope}`);
  } catch {
    // Ignore private-mode failures.
  }
}

export function consumeFreshPlay(mode: GameMode, scope: GameScope): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(FRESH_PLAY_SESSION_KEY);
    if (raw !== `${mode}:${scope}`) return false;
    sessionStorage.removeItem(FRESH_PLAY_SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}
