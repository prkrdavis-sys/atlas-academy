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

function getTierProgress(streak: number): number {
  if (streak <= 0) return 0;
  const inTier = streak % 5;
  return (inTier === 0 ? 5 : inTier) / 5;
}

function getTierSurfaceClass(level: number): string {
  if (level >= 8) {
    return "from-rose-500/30 via-orange-500/25 to-amber-400/20 shadow-[0_0_28px_rgb(244_63_94_/_0.35)]";
  }
  if (level >= 5) {
    return "from-orange-500/30 via-amber-500/25 to-yellow-400/15 shadow-[0_0_24px_rgb(249_115_22_/_0.3)]";
  }
  if (level >= 2) {
    return "from-amber-400/30 via-orange-400/20 to-yellow-300/15 shadow-[0_0_20px_rgb(251_191_36_/_0.28)]";
  }
  if (level >= 1) {
    return "from-amber-300/25 via-orange-300/15 to-white/10 shadow-[0_0_16px_rgb(251_191_36_/_0.22)]";
  }
  return "from-white/20 via-white/10 to-white/5 shadow-[0_0_12px_rgb(255_255_255_/_0.12)]";
}

function getRingColors(level: number): { track: string; fill: string } {
  if (level >= 8) return { track: "stroke-rose-200/35", fill: "stroke-rose-300" };
  if (level >= 5) return { track: "stroke-orange-200/35", fill: "stroke-orange-300" };
  if (level >= 2) return { track: "stroke-amber-200/35", fill: "stroke-amber-300" };
  if (level >= 1) return { track: "stroke-amber-100/35", fill: "stroke-amber-200" };
  return { track: "stroke-white/25", fill: "stroke-white/70" };
}

type StreakRingProps = {
  value: number;
  progress: number;
  emoji: string;
  level: number;
};

function StreakRing({ value, progress, emoji, level }: StreakRingProps) {
  const size = 72;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const { track, fill } = getRingColors(level);

  return (
    <div
      className={cn(
        "relative size-[4.5rem] shrink-0 lg:size-14",
        level > 0 && "animate-[pulse_3s_ease-in-out_infinite]",
      )}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 size-full" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={track}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn(fill, "transition-[stroke-dashoffset] duration-700 ease-out")}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl leading-none lg:text-base" aria-hidden>
          {emoji}
        </span>
        <span className="mt-1 font-display text-2xl font-extrabold leading-none tabular-nums text-white lg:mt-0.5 lg:text-lg">
          {value}
        </span>
      </div>
    </div>
  );
}

type MiniStatCardProps = {
  label: string;
  value: number | string;
  icon: string;
  progress: number;
  caption: string;
  tone: "amber" | "violet";
  highlight?: boolean;
};

function MiniStatCard({ label, value, icon, progress, caption, tone, highlight }: MiniStatCardProps) {
  const toneStyles =
    tone === "amber"
      ? {
          shell: "from-amber-400/25 via-orange-400/15 to-white/5 border-amber-200/30",
          badge: "bg-amber-300/25 text-amber-100 ring-amber-200/40",
          bar: "bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-300",
          caption: "text-amber-100/80",
        }
      : {
          shell: "from-violet-400/25 via-fuchsia-400/15 to-white/5 border-violet-200/30",
          badge: "bg-violet-300/25 text-violet-100 ring-violet-200/40",
          bar: "bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200",
          caption: "text-violet-100/80",
        };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br p-3",
        toneStyles.shell,
        highlight && "ring-2 ring-inset ring-white/35",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-3 -top-3 size-12 rounded-full bg-white/10 blur-xl"
      />
      <div className="relative flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs ring-1 sm:size-7 sm:text-sm",
                toneStyles.badge,
              )}
              aria-hidden
            >
              {icon}
            </span>
            <p className="min-w-0 text-[9px] font-bold uppercase leading-tight tracking-[0.1em] text-white/75 sm:text-[10px]">
              {label}
            </p>
          </div>
          <p className="shrink-0 font-display text-lg font-extrabold leading-none tabular-nums text-white sm:text-xl">
            {value}
          </p>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-black/15">
          <div
            className={cn("h-full rounded-full transition-[width] duration-700 ease-out", toneStyles.bar)}
            style={{ width: `${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%` }}
          />
        </div>
        <p className={cn("min-w-0 text-[10px] font-semibold leading-snug sm:text-[11px]", toneStyles.caption)}>
          {caption}
        </p>
      </div>
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
  const tierProgress = getTierProgress(currentStreak);
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

  const answersToNextTier =
    currentStreak <= 0 ? 5 : currentStreak % 5 === 0 ? 5 : 5 - (currentStreak % 5);

  const streakCaption =
    currentStreak <= 0
      ? "Answer 5 in a row to heat up"
      : streakTier.level >= 10
        ? "Legendary pace"
        : `${answersToNextTier} more to level up`;

  const todayProgress =
    storedTodayBest > 0 ? Math.min(currentStreak / storedTodayBest, 1) : currentStreak > 0 ? 1 : 0;

  const todayCaption = beatTodayBest
    ? "New best today!"
    : chasingTodayBest
      ? `${storedTodayBest - currentStreak} away`
      : todayBest > 0
        ? "Today's peak"
        : "Set the bar";

  const allTimeProgress = bestStreak > 0 ? Math.min(currentStreak / bestStreak, 1) : 0;

  const allTimeCaption =
    bestStreak <= 0
      ? "No record yet"
      : currentStreak >= bestStreak
        ? "Tied or beating it"
        : `${bestStreak - currentStreak} from your best`;

  return (
    <div className={cn("w-full", className)}>
      <Link
        href={href}
        className="group block w-full transition-transform hover:scale-[1.01] active:scale-[0.99] lg:hover:scale-100 lg:active:scale-100"
        aria-label={`View stats. Current streak ${currentStreak}, best today ${todayBest}, all-time best ${bestStreak}`}
      >
        <div className="overflow-hidden rounded-[1.35rem] border border-white/25 bg-black/10 shadow-[0_10px_40px_rgb(0_0_0_/_0.22)] backdrop-blur-xl lg:rounded-2xl">
          <div
            className={cn(
              "relative overflow-hidden bg-gradient-to-br px-4 py-4 sm:px-5 sm:py-5 lg:px-3 lg:py-3.5",
              getTierSurfaceClass(streakTier.level),
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgb(255_255_255_/_0.22),transparent_55%)]"
            />
            <div className="relative flex items-center gap-3 sm:gap-4 lg:gap-2.5">
              <StreakRing
                value={currentStreak}
                progress={tierProgress}
                emoji={streakTier.emoji}
                level={streakTier.level}
              />
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70 lg:text-[9px]">
                  Live streak
                </p>
                <p className="mt-0.5 truncate font-display text-lg font-extrabold leading-tight text-white sm:text-xl lg:text-base">
                  {streakTier.level > 0 ? streakTier.label : "Ready to roll"}
                </p>
                <p className="mt-1 text-[11px] font-semibold leading-snug text-white/80 sm:text-xs lg:text-[10px]">
                  {streakCaption}
                </p>
              </div>
              <span className="hidden shrink-0 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/75 transition-colors group-hover:border-white/40 group-hover:bg-white/20 group-hover:text-white sm:inline-flex lg:hidden xl:inline-flex lg:px-2 lg:py-0.5 lg:text-[9px]">
                Stats
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 p-2.5 min-[420px]:grid-cols-2 sm:gap-2.5 sm:p-3 lg:grid-cols-1 lg:gap-2 lg:p-2.5">
            <MiniStatCard
              label="Best today"
              value={todayBest}
              icon="⚡"
              progress={todayProgress}
              caption={todayCaption}
              tone="amber"
              highlight={chasingTodayBest || beatTodayBest}
            />
            <MiniStatCard
              label="All-time"
              value={bestStreak > 0 ? bestStreak : "—"}
              icon="🏆"
              progress={allTimeProgress}
              caption={allTimeCaption}
              tone="violet"
            />
          </div>
        </div>
      </Link>

      <p className="mt-2.5 text-xs leading-snug text-emerald-50/85 sm:text-sm lg:hidden">{motivation}</p>
    </div>
  );
}
