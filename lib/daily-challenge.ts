import { saveCloudProfile } from "@/lib/cloud-profiles";
import {
  buildDailyChallengeSnapshot,
  DAILY_CHALLENGE_CONTENT_VERSION,
  getDailySeedForDateKey,
} from "@/lib/game-engine";
import { createClient } from "@/lib/supabase/client";
import type {
  DailyChallengeSnapshot,
  DailyChallengeLocalResult,
  Profile,
  Question,
} from "@/lib/types";

const supabase = createClient();

export const DAILY_TIMER_SESSION_KEY = "atlas-academy-daily-timer";

export type DailyChallengeLeaderboardEntry = {
  rank: number;
  profileId: string;
  displayName: string;
  avatarId: string | null;
  avatarColor: string;
  questionCount: number;
  correctCount: number;
  skippedCount: number;
  elapsedCentiseconds: number;
  completedAt: string;
};

type DailyChallengeSnapshotRow = {
  challenge_date: string;
  content_version: string;
  seed: number;
  question_specs: Question[];
};

type DailyChallengeResultRow = {
  id: string;
  rank?: number;
  challenge_date: string;
  profile_id: string;
  display_name: string;
  avatar_id: string | null;
  avatar_color: string;
  question_count: number;
  correct_count: number;
  skipped_count: number;
  elapsed_centiseconds: number;
  completed_at: string;
};

export type DailyTimerSession = {
  dateKey: string;
  startedAt: number;
};

function normalizeSnapshot(row: DailyChallengeSnapshotRow): DailyChallengeSnapshot {
  return {
    dateKey: row.challenge_date,
    contentVersion: row.content_version,
    seed: row.seed,
    questions: row.question_specs,
  };
}

function normalizeLeaderboardEntry(row: DailyChallengeResultRow): DailyChallengeLeaderboardEntry {
  return {
    rank: Number(row.rank ?? 0),
    profileId: row.profile_id,
    displayName: row.display_name,
    avatarId: row.avatar_id,
    avatarColor: row.avatar_color,
    questionCount: row.question_count,
    correctCount: row.correct_count,
    skippedCount: row.skipped_count,
    elapsedCentiseconds: row.elapsed_centiseconds,
    completedAt: row.completed_at,
  };
}

function resolveSubmitQuestions(
  result: DailyChallengeLocalResult,
  questions?: Question[],
): Question[] {
  if (questions?.length) return questions;
  if (result.questions?.length) return result.questions;
  return buildDailyChallengeSnapshot(result.dateKey).questions;
}

export async function loadDailyChallengeSnapshot(
  dateKey: string,
  profileId: string,
): Promise<DailyChallengeSnapshot | null> {
  const { data, error } = await supabase.rpc("get_daily_challenge_snapshot", {
    p_challenge_date: dateKey,
    p_profile_id: profileId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeSnapshot(row as DailyChallengeSnapshotRow) : null;
}

export async function loadDailyChallengeLeaderboard(
  dateKey: string,
  profileId: string,
): Promise<DailyChallengeLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_daily_challenge_leaderboard", {
    p_challenge_date: dateKey,
    p_profile_id: profileId,
  });
  if (error) throw error;
  return ((data ?? []) as DailyChallengeResultRow[]).map(normalizeLeaderboardEntry);
}

export async function submitDailyChallengeResult(
  profileId: string,
  result: DailyChallengeLocalResult,
  seed = getDailySeedForDateKey(result.dateKey),
  contentVersion = DAILY_CHALLENGE_CONTENT_VERSION,
  questions?: Question[],
): Promise<DailyChallengeLeaderboardEntry | null> {
  const questionSpecs = resolveSubmitQuestions(result, questions);
  if (!questionSpecs.length) return null;

  const { data, error } = await supabase.rpc("submit_daily_challenge_result", {
    p_profile_id: profileId,
    p_challenge_date: result.dateKey,
    p_seed: seed,
    p_content_version: contentVersion,
    p_question_specs: questionSpecs,
    p_question_count: result.questionCount,
    p_correct_count: result.correctAnswers,
    p_skipped_count: result.skippedAnswers,
    p_elapsed_centiseconds: result.elapsedCentiseconds,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeLeaderboardEntry(row as DailyChallengeResultRow) : null;
}

function profileWithDailyResult(profile: Profile, result: DailyChallengeLocalResult): Profile {
  const existing = profile.dailyChallengeResults?.[result.dateKey];
  return {
    ...profile,
    dailyChallengeResults: {
      ...profile.dailyChallengeResults,
      [result.dateKey]: existing ?? result,
    },
    dailyChallengeCompletions: [
      ...new Set([...(profile.dailyChallengeCompletions ?? []), result.dateKey]),
    ],
  };
}

/**
 * Make sure the active cloud profile exists, then submit the local first-attempt
 * result. Used after gameplay and again when opening the leaderboard so players
 * who completed before a failed submit still appear.
 */
export async function ensureDailyChallengeResultSubmitted(
  profile: Profile,
  result: DailyChallengeLocalResult,
  questions?: Question[],
): Promise<DailyChallengeLeaderboardEntry | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Sign in to submit your daily challenge result.");
  }

  const syncedProfile = profileWithDailyResult(profile, result);
  try {
    await saveCloudProfile(userId, syncedProfile);
  } catch {
    // Profile rows are usually already synced by ProfileProvider. Continue so a
    // transient profile upsert failure does not block the global leaderboard.
  }

  return submitDailyChallengeResult(
    syncedProfile.id,
    result,
    getDailySeedForDateKey(result.dateKey),
    DAILY_CHALLENGE_CONTENT_VERSION,
    questions ?? result.questions,
  );
}

export function loadDailyTimerSession(dateKey: string): DailyTimerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DAILY_TIMER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DailyTimerSession>;
    if (parsed.dateKey !== dateKey || !Number.isFinite(parsed.startedAt)) return null;
    return { dateKey, startedAt: parsed.startedAt as number };
  } catch {
    return null;
  }
}

export function saveDailyTimerSession(session: DailyTimerSession): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DAILY_TIMER_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Timer persistence is best-effort in private browsing modes.
  }
}

export function clearDailyTimerSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DAILY_TIMER_SESSION_KEY);
}

export function formatDailyElapsedTime(
  elapsedCentiseconds: number,
  showCentiseconds = false,
): string {
  const safeCentiseconds = Math.max(0, Math.round(elapsedCentiseconds));
  const minutes = Math.floor(safeCentiseconds / 6000);
  const seconds = Math.floor((safeCentiseconds % 6000) / 100);
  const centiseconds = safeCentiseconds % 100;
  const base = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return showCentiseconds ? `${base}.${String(centiseconds).padStart(2, "0")}` : base;
}
