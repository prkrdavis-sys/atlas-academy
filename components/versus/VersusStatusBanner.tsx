"use client";

import { cn } from "@/lib/utils";

export type VersusPhase =
  | { kind: "answering" }
  | { kind: "waiting-for-opponent"; opponentName: string }
  | { kind: "racing"; secondsLeft: number }
  | { kind: "revealing"; secondsLeft: number };

/**
 * The one line that tells a player what the match is waiting on: their answer,
 * their opponent's, or the gap before the next question.
 */
export function VersusStatusBanner({ phase }: { phase: VersusPhase }) {
  if (phase.kind === "answering") return null;

  if (phase.kind === "waiting-for-opponent") {
    return (
      <div
        role="status"
        className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-sky-300 bg-sky-50 px-3 py-2 dark:border-sky-700 dark:bg-sky-950/50"
      >
        <span className="flex gap-1" aria-hidden>
          <Dot delay="0ms" />
          <Dot delay="150ms" />
          <Dot delay="300ms" />
        </span>
        <p className="font-display text-sm font-extrabold text-sky-800 dark:text-sky-200">
          {phase.opponentName} is still choosing…
        </p>
      </div>
    );
  }

  if (phase.kind === "racing") {
    return (
      <div
        role="status"
        aria-live="assertive"
        className="flex shrink-0 items-center justify-center gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50 px-3 py-2 dark:border-rose-700 dark:bg-rose-950/50"
      >
        <span
          key={phase.secondsLeft}
          aria-hidden
          className="animate-card-pop-in font-display text-2xl font-extrabold tabular-nums leading-none text-rose-600 dark:text-rose-300"
        >
          {phase.secondsLeft}
        </span>
        <p className="font-display text-sm font-extrabold text-rose-800 dark:text-rose-200">
          Answer now or lose the point
        </p>
      </div>
    );
  }

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
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-1.5 animate-bounce rounded-full bg-sky-500 dark:bg-sky-400"
      style={{ animationDelay: delay }}
    />
  );
}

const RING_RADIUS = 10;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function CountdownRing({ secondsLeft }: { secondsLeft: number }) {
  const progress = Math.max(0, Math.min(1, secondsLeft / 5));

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
