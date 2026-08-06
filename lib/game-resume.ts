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

export type GameResumeSnapshot = {
  version: 1;
  playHref: string;
  createdAt: number;
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

function isResumeSnapshot(value: unknown): value is GameResumeSnapshot {
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

export function saveGameResumeSnapshot(snapshot: GameResumeSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(GAME_RESUME_SESSION_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota / private-mode failures — resume is best-effort.
  }
}

export function loadGameResumeSnapshot(): GameResumeSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(GAME_RESUME_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isResumeSnapshot(parsed)) {
      sessionStorage.removeItem(GAME_RESUME_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(GAME_RESUME_SESSION_KEY);
    return null;
  }
}

export function clearGameResumeSnapshot(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(GAME_RESUME_SESSION_KEY);
}

export function peekGameResumePlayHref(): string | null {
  return loadGameResumeSnapshot()?.playHref ?? null;
}

export function consumeGameResumeSnapshot(
  mode: GameMode,
  scope: GameScope,
): GameResumeSnapshot | null {
  const snapshot = loadGameResumeSnapshot();
  if (!snapshot) return null;
  if (snapshot.mode !== mode || snapshot.scope !== scope) return null;
  clearGameResumeSnapshot();
  return snapshot;
}
