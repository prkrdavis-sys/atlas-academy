"use client";

import { useEffect } from "react";
import { getStreakTier, STREAK_SNUFF_MIN, streakSnuffCopy } from "@/lib/streak-tier";
import { cn } from "@/lib/utils";

export type FeedbackBurst = {
  id: number;
  correct: boolean;
  /** Prior streak length when a miss ends a run of 2+. */
  lostStreak?: number;
};

const BURST_LIFETIME_MS = 950;
const STREAK_SNUFF_LIFETIME_MS = 1650;

function Burst({ burst, onDone }: { burst: FeedbackBurst; onDone: (id: number) => void }) {
  const lostStreak = burst.lostStreak;
  const showSnuff = !burst.correct && lostStreak !== undefined && lostStreak >= STREAK_SNUFF_MIN;
  const lifetime = showSnuff ? STREAK_SNUFF_LIFETIME_MS : BURST_LIFETIME_MS;
  const tier = showSnuff ? getStreakTier(lostStreak) : null;

  useEffect(() => {
    const timer = setTimeout(() => onDone(burst.id), lifetime);
    return () => clearTimeout(timer);
  }, [burst.id, lifetime, onDone]);

  return (
    <div className="absolute inset-0">
      <div
        className={cn(
          "answer-screen-flash",
          burst.correct ? "answer-screen-flash-correct" : "answer-screen-flash-incorrect",
        )}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center translate-y-[30vh]">
        <div className="relative flex flex-col items-center">
          {showSnuff && tier ? (
            <div
              className="absolute bottom-[calc(100%+0.85rem)] left-1/2 z-10 w-max max-w-[min(100vw-2rem,18rem)] -translate-x-1/2"
              role="status"
              aria-live="polite"
            >
              <div
                className={cn(
                  "animate-streak-snuff relative flex flex-col items-center gap-0.5 rounded-2xl border-2 px-5 py-3 text-center shadow-[0_12px_36px_rgb(15_23_42_/_0.22)] backdrop-blur-md sm:px-6 sm:py-3.5",
                  tier.level > 0
                    ? "border-orange-400/90 bg-gradient-to-b from-amber-50/95 to-orange-100/95 dark:border-orange-500/80 dark:from-amber-950/90 dark:to-orange-950/90"
                    : "border-slate-300/90 bg-white/95 dark:border-slate-600 dark:bg-slate-900/95",
                )}
              >
                <span
                  className="animate-streak-flame-snuff pointer-events-none absolute -top-3 text-2xl sm:text-3xl"
                  aria-hidden
                >
                  {tier.emoji}
                </span>
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
                  <span className="animate-streak-ember streak-ember streak-ember-1" />
                  <span className="animate-streak-ember streak-ember streak-ember-2" />
                  <span className="animate-streak-ember streak-ember streak-ember-3" />
                  <span className="animate-streak-ember streak-ember streak-ember-4" />
                </span>
                <p className="font-display text-4xl font-extrabold leading-none tracking-tight text-slate-900 tabular-nums dark:text-slate-50 sm:text-5xl">
                  {lostStreak}
                </p>
                <p
                  className={cn(
                    "text-[11px] font-black uppercase tracking-[0.16em] sm:text-xs",
                    tier.level > 0
                      ? "text-orange-700 dark:text-orange-300"
                      : "text-slate-500 dark:text-slate-400",
                  )}
                >
                  {streakSnuffCopy(lostStreak)}
                </p>
              </div>
            </div>
          ) : null}
          <div className="relative flex items-center justify-center" aria-hidden>
            <div
              className={`animate-feedback-ring absolute h-28 w-28 rounded-full border-4 ${
                burst.correct ? "border-emerald-400" : "border-rose-400"
              }`}
            />
            <div
              className={`${
                burst.correct
                  ? "animate-feedback-correct bg-emerald-500 shadow-[0_8px_30px_rgb(16_185_129_/_0.5)]"
                  : "animate-feedback-incorrect bg-rose-500 shadow-[0_8px_30px_rgb(244_63_94_/_0.5)]"
              } flex h-28 w-28 items-center justify-center rounded-full text-white`}
            >
              {burst.correct ? (
                <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" aria-hidden>
                  <path
                    d="M4.5 12.5l5 5 10-11"
                    stroke="currentColor"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Fixed overlay that plays quick correct/incorrect bursts above the game board.
 */
export function AnswerFeedbackLayer({
  bursts,
  onDone,
}: {
  bursts: FeedbackBurst[];
  onDone: (id: number) => void;
}) {
  if (bursts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[52]">
      {bursts.map((burst) => (
        <Burst key={burst.id} burst={burst} onDone={onDone} />
      ))}
    </div>
  );
}
