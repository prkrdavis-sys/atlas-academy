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

function formatDailyRunLabel(days: number): string {
  if (days === 0) return "No run yet";
  if (days === 1) return "1 day";
  return `${days} days`;
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
  const dailyRunLabel = formatDailyRunLabel(dailyRun);

  return (
    <div className={cn("space-y-3", className)}>
      <Link
        href={href}
        className="group inline-flex flex-wrap gap-2 transition-opacity hover:opacity-90 active:opacity-75"
        aria-label={`View stats. Current streak ${currentStreak}, best today ${todayBest}, daily challenge run ${dailyRun} days, all-time best ${bestStreak}`}
      >
        <span
          title="Your live streak across all modes"
          className={cn(
            "inline-flex min-w-[5.5rem] flex-col rounded-2xl px-3 py-2 backdrop-blur transition-[border-color,box-shadow,background] duration-300 sm:min-w-[6.5rem] sm:px-4 sm:py-2.5",
            streakTier.heroPanelClass,
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-50/90 sm:text-[11px]">
            {streakTier.level > 0 ? streakTier.label : "Active streak"}
          </span>
          <span className="font-display text-lg font-extrabold leading-none sm:text-xl">
            {streakTier.emoji} {currentStreak}
          </span>
        </span>

        <span
          title="Your highest streak so far today — can you beat it?"
          className="inline-flex min-w-[5.5rem] flex-col rounded-2xl bg-white/15 px-3 py-2 backdrop-blur sm:min-w-[6.5rem] sm:px-4 sm:py-2.5"
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-50/90 sm:text-[11px]">
            Best today
          </span>
          <span className="font-display text-lg font-extrabold leading-none sm:text-xl">
            ⚡ {todayBest}
          </span>
        </span>

        <span
          title="Consecutive days you've finished the daily challenge"
          className="inline-flex min-w-[5.5rem] flex-col rounded-2xl bg-white/15 px-3 py-2 backdrop-blur sm:min-w-[6.5rem] sm:px-4 sm:py-2.5"
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-50/90 sm:text-[11px]">
            Daily run
          </span>
          <span className="font-display text-lg font-extrabold leading-none sm:text-xl">
            📅 {dailyRunLabel}
          </span>
        </span>

        {bestStreak > 0 && (
          <span
            title="Your all-time best streak"
            className="inline-flex min-w-[5.5rem] flex-col rounded-2xl bg-white/10 px-3 py-2 backdrop-blur sm:min-w-[6.5rem] sm:px-4 sm:py-2.5"
          >
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-50/90 sm:text-[11px]">
              All-time best
            </span>
            <span className="font-display text-lg font-extrabold leading-none sm:text-xl">
              🏆 {bestStreak}
            </span>
          </span>
        )}
      </Link>

      <p className="max-w-md text-xs leading-relaxed text-emerald-50/90 sm:text-sm">
        {beatTodayBest ? (
          <>New personal best for today — keep pushing while you&apos;re hot.</>
        ) : chasingTodayBest ? (
          <>
            {storedTodayBest - currentStreak} away from today&apos;s best — one more round could get you there.
          </>
        ) : dailyRun === 0 && !dailyCompletedToday ? (
          <>Finish today&apos;s challenge to start a daily run and build the habit.</>
        ) : dailyRun > 0 && !dailyCompletedToday ? (
          <>
            {dailyRun}-day daily run on the line — don&apos;t break the chain today.
          </>
        ) : dailyRun > 0 && dailyCompletedToday ? (
          <>
            {dailyRun}-day daily run secured. See if you can raise your best today.
          </>
        ) : todayBest === 0 && currentStreak === 0 ? (
          <>Jump in and set the bar for today.</>
        ) : (
          <>Every correct answer builds your streak — beat your best today.</>
        )}
      </p>
    </div>
  );
}
