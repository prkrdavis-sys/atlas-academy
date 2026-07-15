"use client";

import Link from "next/link";
import { getStreakTier } from "@/lib/streak-tier";
import type { GlobalStreakSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

type HomeStreakHighlightsProps = {
  streak: GlobalStreakSnapshot;
  todayBest: number;
  storedTodayBest: number;
  dailyRun: number;
  dailyCompletedToday: boolean;
  href?: string;
  className?: string;
};

function formatMotivation({
  beatTodayBest,
  chasingTodayBest,
  storedTodayBest,
  currentStreak,
  dailyRun,
  dailyCompletedToday,
  todayBest,
}: {
  beatTodayBest: boolean;
  chasingTodayBest: boolean;
  storedTodayBest: number;
  currentStreak: number;
  dailyRun: number;
  dailyCompletedToday: boolean;
  todayBest: number;
}): string {
  if (beatTodayBest) return "New personal best for today — keep pushing.";
  if (chasingTodayBest) {
    return `${storedTodayBest - currentStreak} from today's best — one more round could do it.`;
  }
  if (dailyRun === 0 && !dailyCompletedToday) {
    return "Finish today's challenge to start your daily run.";
  }
  if (dailyRun > 0 && !dailyCompletedToday) {
    return `${dailyRun}-day daily run on the line — don't break the chain.`;
  }
  if (dailyRun > 0 && dailyCompletedToday) {
    return `${dailyRun}-day daily run secured — can you beat today's best?`;
  }
  if (todayBest === 0 && currentStreak === 0) return "Jump in and set the bar for today.";
  return "Every correct answer builds your streak.";
}

export function HomeStreakHighlights({
  streak,
  todayBest,
  storedTodayBest,
  dailyRun,
  dailyCompletedToday,
  href = "/stats",
  className,
}: HomeStreakHighlightsProps) {
  const { currentStreak, bestStreak } = streak;
  const streakTier = getStreakTier(currentStreak);
  const chasingTodayBest =
    storedTodayBest > 0 && currentStreak > 0 && currentStreak < storedTodayBest;
  const beatTodayBest = storedTodayBest > 0 && currentStreak > storedTodayBest;
  const motivation = formatMotivation({
    beatTodayBest,
    chasingTodayBest,
    storedTodayBest,
    currentStreak,
    dailyRun,
    dailyCompletedToday,
    todayBest,
  });

  return (
    <div className={cn("space-y-2.5", className)}>
      <Link
        href={href}
        className="group block transition-opacity hover:opacity-95 active:opacity-80"
        aria-label={`View stats. Current streak ${currentStreak}, best today ${todayBest}, daily challenge run ${dailyRun} days, all-time best ${bestStreak}`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          {/* Primary: live streak — solid card, largest number */}
          <div
            title="Your live streak across all modes"
            className="flex shrink-0 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_4px_14px_rgb(0_0_0_/_0.12)] sm:min-w-[9.5rem]"
          >
            <span className="text-2xl leading-none sm:text-3xl" aria-hidden>
              {streakTier.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {streakTier.level > 0 ? streakTier.label : "Current streak"}
              </p>
              <p className="font-display text-3xl font-extrabold leading-none text-slate-900 sm:text-4xl">
                {currentStreak}
              </p>
            </div>
          </div>

          {/* Secondary row: compact, varied chips */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span
              title="Your highest streak so far today — can you beat it?"
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-400/25 px-3 py-1.5 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.2)]"
            >
              <span className="text-base leading-none" aria-hidden>
                ⚡
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-wide text-amber-100/90">
                  Best today
                </span>
                <span className="font-display text-xl font-extrabold leading-none text-white">
                  {todayBest}
                </span>
              </span>
            </span>

            <span
              title="Consecutive days you've finished the daily challenge"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/12 px-3 py-1.5 backdrop-blur-sm"
            >
              <span className="text-base leading-none" aria-hidden>
                📅
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-wide text-emerald-50/80">
                  Daily run
                </span>
                <span className="font-display text-lg font-extrabold leading-none text-white">
                  {dailyRun > 0 ? (
                    <>
                      {dailyRun}
                      <span className="ml-0.5 text-xs font-bold text-emerald-50/75">
                        {dailyRun === 1 ? "day" : "days"}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-bold text-emerald-50/70">—</span>
                  )}
                </span>
              </span>
            </span>

            {bestStreak > 0 && (
              <span
                title="Your all-time best streak"
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/25 bg-gradient-to-r from-amber-500/20 to-yellow-500/15 px-2.5 py-1.5"
              >
                <span className="text-sm leading-none" aria-hidden>
                  🏆
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wide text-amber-100/80">
                  Record
                </span>
                <span className="font-display text-lg font-extrabold leading-none text-white">
                  {bestStreak}
                </span>
              </span>
            )}
          </div>
        </div>
      </Link>

      <p className="max-w-md text-xs leading-snug text-emerald-50/85 sm:text-sm">{motivation}</p>
    </div>
  );
}
