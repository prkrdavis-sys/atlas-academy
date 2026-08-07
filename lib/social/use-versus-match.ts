"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  finalizeMatch,
  forfeitMatch,
  loadMatch,
  loadMatchAnswers,
  measureServerOffsetMs,
  submitMatchAnswer,
  timeOutMatchAnswer,
  toCorrectedMs,
} from "@/lib/social/versus";
import {
  ANSWER_LOCK_MS,
  DISCONNECT_GRACE_MS,
  REVEAL_MS,
  secondsRemaining,
} from "@/lib/social/versus-timing";
import type { MatchAnswerRow, MatchRow } from "@/lib/social/types";

const supabase = createClient();

/** Safety net in case a broadcast is dropped; the RPCs remain authoritative. */
const RECONCILE_INTERVAL_MS = 2000;

type StoredAnswer = MatchAnswerRow & { question_index: number };

export type VersusQuestionPhase =
  /** Nobody has committed a selection yet. */
  | { kind: "answering" }
  /** You have chosen and may still change it; your opponent has not. */
  | { kind: "waiting-for-opponent"; deadlineMs: number }
  /** Your opponent chose first and your window is closing. */
  | { kind: "racing"; deadlineMs: number }
  /** Both answers are in: feedback and the learn card are showing. */
  | { kind: "revealing"; revealUntilMs: number };

export function useVersusMatch(matchId: string, userId: string | null) {
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [answers, setAnswers] = useState<StoredAnswer[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [offsetMs, setOffsetMs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [opponentSeenAtMs, setOpponentSeenAtMs] = useState<number | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timedOutRef = useRef<Set<string>>(new Set());
  const finalizedRef = useRef(false);

  const opponentId = match
    ? match.host_id === userId
      ? match.guest_id
      : match.host_id
    : null;

  const mergeAnswers = useCallback((incoming: StoredAnswer[]) => {
    setAnswers((current) => {
      const byKey = new Map(
        current.map((answer) => [`${answer.question_index}:${answer.player_id}`, answer]),
      );
      for (const answer of incoming) {
        byKey.set(`${answer.question_index}:${answer.player_id}`, answer);
      }
      return [...byKey.values()];
    });
  }, []);

  const reconcile = useCallback(async () => {
    try {
      const rows = await loadMatchAnswers(matchId);
      setAnswers(rows);
    } catch {
      // Transient network failure; the next tick tries again.
    }
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const [loadedMatch, loadedAnswers, offset] = await Promise.all([
          loadMatch(matchId),
          loadMatchAnswers(matchId),
          measureServerOffsetMs(),
        ]);
        if (cancelled) return;

        if (!loadedMatch) {
          setError("This match could not be found.");
          setLoading(false);
          return;
        }

        setMatch(loadedMatch);
        setAnswers(loadedAnswers);
        setOffsetMs(offset);

        // Resume where the match actually is, so a refresh mid-round is safe.
        const resolvedCount = countResolvedQuestions(loadedAnswers);
        setQuestionIndex(Math.min(resolvedCount, loadedMatch.question_count - 1));
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Could not load this match.");
          setLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  // Presence tells us the opponent is still here; broadcast carries their
  // answers with less latency than waiting on a poll.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`match:${matchId}`, {
      config: { private: true, presence: { key: userId } },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ userId: string }>();
      const present = Object.values(state)
        .flat()
        .some((entry) => entry.userId && entry.userId !== userId);
      setOpponentSeenAtMs(present ? Date.now() : null);
    });

    channel.on("broadcast", { event: "answer" }, ({ payload }) => {
      const answer = payload as StoredAnswer | undefined;
      if (!answer?.player_id || answer.player_id === userId) return;
      mergeAnswers([answer]);
    });

    channel.on("broadcast", { event: "match-updated" }, () => {
      void loadMatch(matchId).then((next) => {
        if (next) setMatch(next);
      });
    });

    void channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      void channel.track({ userId });
      // Guest joins after accept; this wakes the host still sitting on "invited".
      void channel.send({
        type: "broadcast",
        event: "match-updated",
        payload: {},
      });
    });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [matchId, userId, mergeAnswers]);

  // Authoritative path for invite → active (and cancel/decline): the accept RPC
  // updates Postgres but does not broadcast on this channel.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`match-row-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        () => {
          void loadMatch(matchId).then((next) => {
            if (next) setMatch(next);
          });
        },
      );

    void channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, userId]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 200);
    return () => window.clearInterval(interval);
  }, []);

  // Safety net while the invite is outstanding — covers missed realtime events.
  useEffect(() => {
    if (!match || match.status !== "invited") return;
    const interval = window.setInterval(() => {
      void loadMatch(matchId).then((next) => {
        if (next) setMatch(next);
      });
    }, RECONCILE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [match, matchId]);

  useEffect(() => {
    if (!match || match.status !== "active") return;
    const interval = window.setInterval(() => void reconcile(), RECONCILE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [match, reconcile]);

  const currentAnswers = useMemo(
    () => answers.filter((answer) => answer.question_index === questionIndex),
    [answers, questionIndex],
  );

  const yourAnswer = currentAnswers.find((answer) => answer.player_id === userId) ?? null;
  const opponentAnswer =
    currentAnswers.find((answer) => answer.player_id !== userId) ?? null;

  const phase = useMemo<VersusQuestionPhase>(() => {
    if (yourAnswer && opponentAnswer) {
      const resolvedAtMs = Math.max(
        toCorrectedMs(yourAnswer.answered_at, offsetMs),
        toCorrectedMs(opponentAnswer.answered_at, offsetMs),
      );
      return { kind: "revealing", revealUntilMs: resolvedAtMs + REVEAL_MS };
    }

    if (yourAnswer) {
      return {
        kind: "waiting-for-opponent",
        deadlineMs: toCorrectedMs(yourAnswer.answered_at, offsetMs) + ANSWER_LOCK_MS,
      };
    }

    if (opponentAnswer) {
      return {
        kind: "racing",
        deadlineMs: toCorrectedMs(opponentAnswer.answered_at, offsetMs) + ANSWER_LOCK_MS,
      };
    }

    return { kind: "answering" };
  }, [yourAnswer, opponentAnswer, offsetMs]);

  // Whichever client's countdown expires first records the miss; the RPC is
  // idempotent, so the duplicate call from the other side is harmless.
  useEffect(() => {
    if (!match || match.status !== "active" || !userId || !opponentId) return;
    if (phase.kind !== "waiting-for-opponent" && phase.kind !== "racing") return;
    if (nowMs < phase.deadlineMs) return;

    const missingPlayerId = phase.kind === "racing" ? userId : opponentId;
    const key = `${questionIndex}:${missingPlayerId}`;
    if (timedOutRef.current.has(key)) return;
    timedOutRef.current.add(key);

    void timeOutMatchAnswer(matchId, questionIndex, missingPlayerId)
      .then((state) => {
        mergeAnswers(
          state.answers.map((answer) => ({ ...answer, question_index: questionIndex })),
        );
      })
      .catch(() => {
        timedOutRef.current.delete(key);
      });
  }, [phase, nowMs, match, matchId, questionIndex, userId, opponentId, mergeAnswers]);

  // Advance together: both clients derive the same reveal deadline from the
  // database timestamps, so the timer fires at the same moment on both.
  useEffect(() => {
    if (!match || phase.kind !== "revealing") return;

    const currentMatch = match;
    const revealUntilMs = phase.revealUntilMs;

    const timeout = window.setTimeout(
      () => {
        if (questionIndex + 1 < currentMatch.question_count) {
          setQuestionIndex((index) => (index === questionIndex ? index + 1 : index));
          return;
        }

        if (finalizedRef.current) return;
        finalizedRef.current = true;
        void finalizeMatch(matchId)
          .then((next) => {
            setMatch(next);
            channelRef.current?.send({
              type: "broadcast",
              event: "match-updated",
              payload: {},
            });
          })
          .catch(() => {
            finalizedRef.current = false;
          });
      },
      Math.max(0, revealUntilMs - Date.now()),
    );

    return () => window.clearTimeout(timeout);
  }, [phase, match, matchId, questionIndex]);

  const selectAnswer = useCallback(
    (answer: string, isCorrect: boolean) => {
      if (!userId || !match || match.status !== "active") return;
      // Locked once the opponent has committed; the server enforces this too.
      if (opponentAnswer) return;

      const index = questionIndex;
      void submitMatchAnswer(matchId, index, answer, isCorrect)
        .then((state) => {
          const rows = state.answers.map((row) => ({ ...row, question_index: index }));
          mergeAnswers(rows);
          const mine = rows.find((row) => row.player_id === userId);
          if (mine) {
            channelRef.current?.send({
              type: "broadcast",
              event: "answer",
              payload: mine,
            });
          }
        })
        .catch(() => setError("Your answer did not reach the other player."));
    },
    [userId, match, matchId, questionIndex, opponentAnswer, mergeAnswers],
  );

  // Forfeit once the opponent has been gone longer than the grace period.
  const missingSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!match || match.status !== "active" || !opponentId) return;

    if (opponentSeenAtMs !== null) {
      missingSinceRef.current = null;
      return;
    }

    if (missingSinceRef.current === null) {
      missingSinceRef.current = Date.now();
      return;
    }

    if (Date.now() - missingSinceRef.current < DISCONNECT_GRACE_MS) return;

    missingSinceRef.current = null;
    void forfeitMatch(matchId, opponentId).then(setMatch).catch(() => undefined);
  }, [opponentSeenAtMs, nowMs, match, matchId, opponentId]);

  const { yourScore, opponentScore } = useMemo(() => {
    let yours = 0;
    let theirs = 0;
    for (const answer of answers) {
      if (!answer.is_correct) continue;
      if (answer.player_id === userId) yours += 1;
      else theirs += 1;
    }
    return { yourScore: yours, opponentScore: theirs };
  }, [answers, userId]);

  return {
    match,
    setMatch,
    loading,
    error,
    questionIndex,
    phase,
    yourAnswer,
    opponentAnswer,
    yourScore,
    opponentScore,
    opponentConnected: opponentSeenAtMs !== null,
    nowMs,
    offsetMs,
    selectAnswer,
    secondsLeft: (deadlineMs: number) => secondsRemaining(deadlineMs, nowMs),
  };
}

/** A question counts as done once both players have an answer recorded. */
function countResolvedQuestions(rows: StoredAnswer[]): number {
  const perIndex = new Map<number, number>();
  for (const row of rows) {
    perIndex.set(row.question_index, (perIndex.get(row.question_index) ?? 0) + 1);
  }

  let resolved = 0;
  for (const [, count] of perIndex) {
    if (count >= 2) resolved += 1;
  }
  return resolved;
}
