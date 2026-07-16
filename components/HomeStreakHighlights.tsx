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

type HeroStatCellProps = {
  label: string;
  value: number | string;
  suffix?: string;
  icon: string;
  highlight?: boolean;
};

function HeroStatCell({ label, value, suffix, icon, highlight }: HeroStatCellProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-2 py-3 text-center sm:px-3 sm:py-3.5 lg:px-1.5 lg:py-2",
        highlight && "bg-amber-400/20",
      )}
    >
      <span className="text-base leading-none sm:text-lg lg:text-sm" aria-hidden>
        {icon}
      </span>
      <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-50/80 lg:mt-1 lg:text-[8px]">
        {label}
      </p>
      <p className="mt-0.5 font-display text-xl font-extrabold leading-none text-white tabular-nums sm:text-2xl lg:text-base">
        {value}
        {suffix ? (
          <span className="ml-0.5 text-[10px] font-bold text-emerald-50/75 lg:text-[9px]">{suffix}</span>
        ) : null}
      </p>
    </div>
  );
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
    <div className={cn("w-full", className)}>
      <Link
        href={href}
        className="group block w-full transition-transform hover:scale-[1.01] active:scale-[0.99] lg:hover:scale-100 lg:active:scale-100"
        aria-label={`View stats. Current streak ${currentStreak}, best today ${todayBest}, daily challenge run ${dailyRun} days, all-time best ${bestStreak}`}
      >
        <div className="overflow-hidden rounded-2xl border border-white/30 bg-white/10 shadow-[0_8px_32px_rgb(0_0_0_/_0.18)] backdrop-blur-md lg:rounded-xl lg:shadow-[0_4px_16px_rgb(0_0_0_/_0.14)]">
          <div
            className={cn(
              "flex items-center gap-3 border-b border-white/20 bg-white px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4 lg:gap-2.5 lg:px-3 lg:py-2.5",
              streakTier.level > 0 && "ring-2 ring-inset ring-amber-300/50",
            )}
          >
            <span className="text-2xl leading-none sm:text-3xl lg:text-xl" aria-hidden>
              {streakTier.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 lg:text-[9px]">
                {streakTier.level > 0 ? streakTier.label : "Current streak"}
              </p>
              <p className="font-display text-3xl font-extrabold leading-none text-slate-900 sm:text-4xl lg:text-2xl">
                {currentStreak}
              </p>
            </div>
            <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400 transition-colors group-hover:text-teal-600 sm:block lg:text-[9px]">
              Stats →
            </span>
          </div>

          <div className="grid grid-cols-3 divide-x divide-white/15">
            <HeroStatCell
              label="Best today"
              value={todayBest}
              icon="⚡"
              highlight={chasingTodayBest || beatTodayBest}
            />
            <HeroStatCell
              label="Daily run"
              value={dailyRun > 0 ? dailyRun : "—"}
              suffix={dailyRun > 0 ? (dailyRun === 1 ? "day" : "days") : undefined}
              icon="📅"
            />
            <HeroStatCell
              label="All-time"
              value={bestStreak > 0 ? bestStreak : "—"}
              icon="🏆"
            />
          </div>
        </div>
      </Link>

      <p className="mt-2.5 text-xs leading-snug text-emerald-50/85 sm:text-sm lg:hidden">{motivation}</p>
    </div>
  );
}
