import { createClient } from "@/lib/supabase/client";
import { ANSWER_LOCK_MS } from "@/lib/social/versus-timing";
import type {
  MatchAnswerRow,
  MatchQuestionState,
  MatchRow,
  MatchSettings,
} from "@/lib/social/types";

const supabase = createClient();

const MATCH_COLUMNS =
  "id,host_id,guest_id,status,settings,seed,question_count,host_score,guest_score,winner_id,created_at,started_at,ended_at";

/** Head-to-head is always Normal difficulty, so every question is multiple choice. */
export const VERSUS_DIFFICULTY = "medium" as const;

export async function loadMatch(matchId: string): Promise<MatchRow | null> {
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_COLUMNS)
    .eq("id", matchId)
    .maybeSingle();

  if (error) throw error;
  return (data as MatchRow | null) ?? null;
}

export async function createMatch(
  opponentId: string,
  settings: MatchSettings,
  questionCount: number,
): Promise<MatchRow> {
  const { data, error } = await supabase.rpc("create_match", {
    opponent_id: opponentId,
    settings,
    question_count: questionCount,
  });

  if (error) throw error;
  return data as MatchRow;
}

export async function respondToMatchInvite(
  matchId: string,
  accept: boolean,
): Promise<MatchRow> {
  const { data, error } = await supabase.rpc("respond_to_match_invite", {
    p_match_id: matchId,
    accept,
  });

  if (error) throw error;
  return data as MatchRow;
}

/** Host-only: withdraw an unanswered invite without counting a forfeit. */
export async function cancelMatchInvite(matchId: string): Promise<MatchRow> {
  const { data, error } = await supabase.rpc("cancel_match_invite", {
    p_match_id: matchId,
  });

  if (error) throw error;
  return data as MatchRow;
}

export async function submitMatchAnswer(
  matchId: string,
  questionIndex: number,
  answer: string,
  isCorrect: boolean,
): Promise<MatchQuestionState> {
  const { data, error } = await supabase.rpc("submit_match_answer", {
    p_match_id: matchId,
    p_question_index: questionIndex,
    p_answer: answer,
    p_is_correct: isCorrect,
  });

  if (error) throw error;
  return data as MatchQuestionState;
}

export async function timeOutMatchAnswer(
  matchId: string,
  questionIndex: number,
  playerId: string,
): Promise<MatchQuestionState> {
  const { data, error } = await supabase.rpc("time_out_match_answer", {
    p_match_id: matchId,
    p_question_index: questionIndex,
    p_player_id: playerId,
  });

  if (error) throw error;
  return data as MatchQuestionState;
}

export async function finalizeMatch(matchId: string): Promise<MatchRow> {
  const { data, error } = await supabase.rpc("finalize_match", {
    p_match_id: matchId,
  });

  if (error) throw error;
  return data as MatchRow;
}

export async function forfeitMatch(
  matchId: string,
  forfeitingPlayerId: string,
): Promise<MatchRow> {
  const { data, error } = await supabase.rpc("forfeit_match", {
    p_match_id: matchId,
    p_forfeiting_player_id: forfeitingPlayerId,
  });

  if (error) throw error;
  return data as MatchRow;
}

export async function loadMatchAnswers(matchId: string): Promise<
  (MatchAnswerRow & { question_index: number })[]
> {
  const { data, error } = await supabase
    .from("match_answers")
    .select("question_index,player_id,answer,is_correct,timed_out,answered_at")
    .eq("match_id", matchId);

  if (error) throw error;
  return (data ?? []) as (MatchAnswerRow & { question_index: number })[];
}

/**
 * Local clock minus database clock. Every deadline is computed against
 * corrected time so the two players count down together even when their device
 * clocks disagree.
 */
export async function measureServerOffsetMs(): Promise<number> {
  const before = Date.now();
  const { data, error } = await supabase.rpc("server_time");
  if (error) throw error;

  const after = Date.now();
  const roundTrip = after - before;
  const serverMs = new Date(data as string).getTime();
  // Assume the database read happened halfway through the round trip.
  return before + roundTrip / 2 - serverMs;
}

export function toCorrectedMs(serverTimestamp: string, offsetMs: number): number {
  return new Date(serverTimestamp).getTime() + offsetMs;
}

export type QuestionResolution =
  | { kind: "waiting" }
  | { kind: "counting-down"; deadlineMs: number }
  | { kind: "resolved"; resolvedAtMs: number; answers: MatchAnswerRow[] };

/**
 * Both clients run this over the same answer rows and reach the same verdict,
 * which is what keeps the reveal simultaneous without a referee.
 */
export function resolveQuestion(
  state: MatchQuestionState,
  offsetMs: number,
): QuestionResolution {
  const answers = state.answers;
  if (answers.length === 0) return { kind: "waiting" };

  if (answers.length >= 2) {
    const resolvedAtMs = Math.max(
      ...answers.map((answer) => toCorrectedMs(answer.answered_at, offsetMs)),
    );
    return { kind: "resolved", resolvedAtMs, answers };
  }

  // One player is locked in: the other has ANSWER_LOCK_MS from that moment.
  const firstAnsweredMs = toCorrectedMs(answers[0]!.answered_at, offsetMs);
  return { kind: "counting-down", deadlineMs: firstAnsweredMs + ANSWER_LOCK_MS };
}
