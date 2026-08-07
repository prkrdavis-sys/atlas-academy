"use client";

import { cn } from "@/lib/utils";
import { REVEAL_SECONDS } from "@/lib/social/versus-timing";

export type VersusPhase =
  | { kind: "answering" }
  /** You locked in; waiting on the opponent during the pending window. */
  | { kind: "pending"; mode: "waiting"; opponentName: string; secondsLeft: number }
  /** Opponent locked in first; you still have time to answer. */
  | { kind: "pending"; mode: "racing"; secondsLeft: number }
  | { kind: "revealing"; secondsLeft: number };

/**
 * The one line that tells a player what the match is waiting on: their answer,
 * their opponent's, or the gap before the next question.
 */
export function VersusStatusBanner({ phase }: { phase: VersusPhase }) {
  switch (phase.kind) {
    case "answering":
      return null;
    case "pending":
      return phase.mode === "waiting" ? (
        <div
          role="status"
          className="flex shrink-0 items-center justify-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-950/50"
        >
          <span
            key={phase.secondsLeft}
            aria-hidden
            className="animate-card-pop-in font-display text-2xl font-extrabold tabular-nums leading-none text-amber-600 dark:text-amber-300"
          >
            {phase.secondsLeft}
          </span>
          <div className="min-w-0 text-left">
            <p className="font-display text-sm font-extrabold text-amber-900 dark:text-amber-100">
              Pending
            </p>
            <p className="truncate text-[11px] font-semibold text-amber-700/90 dark:text-amber-200/90">
              Waiting for {phase.opponentName}…
            </p>
          </div>
        </div>
      ) : (
        <div
          role="status"
          aria-live="assertive"
          className="flex shrink-0 items-center justify-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-950/50"
        >
          <span
            key={phase.secondsLeft}
            aria-hidden
            className="animate-card-pop-in font-display text-2xl font-extrabold tabular-nums leading-none text-amber-600 dark:text-amber-300"
          >
            {phase.secondsLeft}
          </span>
          <div className="min-w-0 text-left">
            <p className="font-display text-sm font-extrabold text-amber-900 dark:text-amber-100">
              Pending
            </p>
            <p className="text-[11px] font-semibold text-amber-700/90 dark:text-amber-200/90">
              Answer now or lose the point
            </p>
          </div>
        </div>
      );
    case "revealing":
      return (
        <div
          role="status"
          className="flex shrink-0 items-center justify-center gap-2.5 rounded-2xl border-2 border-slate-200 bg-white/90 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/90"
        >
          <CountdownRing secondsLeft={phase.secondsLeft} />
          <p className="font-display text-sm font-extrabold text-slate-700 dark:text-slate-200">
            Next question in {phase.secondsLeft}s
          </p>
        </div>
      );
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

const RING_RADIUS = 10;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function CountdownRing({ secondsLeft }: { secondsLeft: number }) {
  const progress = Math.max(0, Math.min(1, secondsLeft / REVEAL_SECONDS));

  return (
    <svg viewBox="0 0 24 24" className="size-6 -rotate-90" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="3"
        className="stroke-slate-200 dark:stroke-slate-700"
      />
      <circle
        cx="12"
        cy="12"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
        className={cn(
          "stroke-teal-500 transition-[stroke-dashoffset] duration-1000 ease-linear dark:stroke-teal-400",
        )}
      />
    </svg>
  );
}
