"use client";

import { useEffect, useState } from "react";
import { DailyCalendarIcon } from "@/components/DailyCalendarIcon";
import {
  formatDailyResetCountdown,
  getMillisecondsUntilDailyReset,
} from "@/lib/game-engine";
import { filterDailyDatesByScope, scopeText } from "@/lib/scope";
import {
  DAILY_CHALLENGE_QUESTION_COUNT,
  DAILY_CHALLENGE_QUESTION_TYPES,
  DIFFICULTY_LABELS,
  GAME_MODES,
  type GameScope,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const DAILY_ACHIEVEMENT_MILESTONES = [
  { count: 1, title: "Daily Devotee", icon: "🌟" },
  { count: 7, title: "Daily Regular", icon: "🔥" },
  { count: 30, title: "Daily Veteran", icon: "🏅" },
] as const;

type DailyChallengePreRoundProps = {
  scope: GameScope;
  dailyDateLabel: string;
  dailyRun: number;
  dailyCompletedToday: boolean;
  dailyAlreadyPlayed: boolean;
  completions: string[] | undefined;
  isUsa: boolean;
};

type DailyStatus = "fresh" | "in-progress" | "completed";

function getDailyStatus(
  dailyCompletedToday: boolean,
  dailyAlreadyPlayed: boolean,
): DailyStatus {
  if (dailyCompletedToday) return "completed";
  if (dailyAlreadyPlayed) return "in-progress";
  return "fresh";
}

function getMotivation({
  dailyRun,
  dailyAlreadyPlayed,
  status,
}: {
  dailyRun: number;
  dailyAlreadyPlayed: boolean;
  status: DailyStatus;
}): string {
  if (status === "completed") {
    return dailyRun > 0
      ? `${dailyRun}-day daily run secured. Come back tomorrow for a fresh challenge!`
      : "Challenge complete! A new puzzle arrives at midnight Eastern.";
  }
  if (status === "in-progress") {
    return "You started today's challenge — finish all 10 to count toward your daily run.";
  }
  if (dailyRun > 0) {
    return `${dailyRun}-day daily run on the line — don't break the chain!`;
  }
  if (dailyAlreadyPlayed) {
    return "Replay today's challenge anytime — review mode won't affect your stats.";
  }
  return "Same 10 questions for everyone today. Finish yours before midnight Eastern!";
}

function getHeadline(status: DailyStatus, dailyRun: number): string {
  switch (status) {
    case "completed":
      return dailyRun > 0 ? "Streak secured!" : "Well done!";
    case "in-progress":
      return "Finish strong!";
    case "fresh":
      return dailyRun > 0 ? "Keep the chain alive!" : "Your daily dose of geography";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function getNextMilestone(totalCompletions: number) {
  return DAILY_ACHIEVEMENT_MILESTONES.find((milestone) => totalCompletions < milestone.count) ?? null;
}

type StatCellProps = {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
};

function StatCell({ label, value, icon, highlight }: StatCellProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-2 py-3 text-center sm:px-3 sm:py-3.5",
        highlight && "bg-amber-400/20",
      )}
    >
      <span className="text-base leading-none sm:text-lg" aria-hidden>
        {icon}
      </span>
      <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-50/80">
        {label}
      </p>
      <p className="mt-0.5 font-display text-lg font-extrabold leading-none text-white tabular-nums sm:text-xl">
        {value}
      </p>
    </div>
  );
}

type RuleRowProps = {
  icon: string;
  label: string;
  value: string;
};

function RuleRow({ icon, label, value }: RuleRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50/80 px-3.5 py-3 dark:bg-slate-800/50">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm dark:bg-slate-900">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
          {value}
        </p>
      </div>
    </div>
  );
}

export function DailyChallengePreRound({
  scope,
  dailyDateLabel,
  dailyRun,
  dailyCompletedToday,
  dailyAlreadyPlayed,
  completions,
  isUsa,
}: DailyChallengePreRoundProps) {
  const [resetCountdown, setResetCountdown] = useState(() =>
    formatDailyResetCountdown(getMillisecondsUntilDailyReset()),
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setResetCountdown(formatDailyResetCountdown(getMillisecondsUntilDailyReset()));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const status = getDailyStatus(dailyCompletedToday, dailyAlreadyPlayed);
  const totalCompletions = filterDailyDatesByScope(completions, scope).length;
  const nextMilestone = getNextMilestone(totalCompletions);
  const motivation = getMotivation({
    dailyRun,
    dailyAlreadyPlayed,
    status,
  });
  const headline = getHeadline(status, dailyRun);
  const poolLabel = isUsa ? "All 50 states" : "All continents";
  const questionTypeLabel = DAILY_CHALLENGE_QUESTION_TYPES.map((type) => {
    const mode = GAME_MODES.find((entry) => entry.id === type);
    return mode ? scopeText(mode.title, scope) : type;
  }).join(" · ");

  return (
    <div className="space-y-4 animate-card-pop-in sm:space-y-5">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-700 p-5 text-white shadow-[0_16px_40px_rgb(15_118_110_/_0.22)] sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-2 -top-3 w-[6.5rem] select-none text-white opacity-[0.16] sm:-right-3 sm:-top-5 sm:w-[8.75rem] sm:opacity-[0.18]"
        >
          <DailyCalendarIcon />
        </div>

        <div className="relative">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/90">
              Today&apos;s challenge
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {headline}
            </h1>
            <p className="mt-1.5 text-sm font-semibold text-emerald-50/90 sm:text-base">
              {dailyDateLabel}
            </p>
          </div>

          {isUsa && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-inset ring-white/25">
              🇺🇸 Across America
            </p>
          )}

          <p className="mt-4 max-w-lg text-sm leading-relaxed text-emerald-50/90 sm:text-base">
            {motivation}
          </p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/25 bg-white/10 backdrop-blur-md">
            <div className="grid grid-cols-3 divide-x divide-white/15">
              <StatCell
                label="Daily run"
                value={dailyRun > 0 ? `${dailyRun}d` : "—"}
                icon="🔥"
                highlight={status !== "completed" && dailyRun > 0}
              />
              <StatCell
                label="Completed"
                value={String(totalCompletions)}
                icon="✅"
              />
              <StatCell
                label="Resets in"
                value={resetCountdown}
                icon="⏳"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:space-y-4 sm:p-5">
        <div>
          <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-slate-100 sm:text-lg">
            Today&apos;s rules
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Fixed format — no settings needed. Everyone gets the same puzzle.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <RuleRow icon="🎲" label="Question types" value={questionTypeLabel} />
          <RuleRow
            icon="🔢"
            label="Questions"
            value={`${DAILY_CHALLENGE_QUESTION_COUNT} mixed`}
          />
          <RuleRow
            icon="📊"
            label="Difficulty"
            value={DIFFICULTY_LABELS.medium}
          />
          <RuleRow icon="🌍" label="Pool" value={poolLabel} />
        </div>

        <p className="rounded-xl bg-teal-50 px-3.5 py-2.5 text-xs leading-relaxed text-teal-900 dark:bg-teal-950/40 dark:text-teal-200 sm:text-sm">
          <span className="font-bold">Same puzzle worldwide</span> — every player sees
          identical questions today. A brand-new set drops at midnight Eastern.
        </p>
      </section>

      {nextMilestone ? (
        <section className="rounded-[1.75rem] border-2 border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/80 p-4 shadow-sm dark:border-amber-800/60 dark:from-amber-950/40 dark:to-orange-950/30 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm dark:bg-slate-900">
              {nextMilestone.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700/80 dark:text-amber-400/80">
                Next achievement
              </p>
              <p className="font-display text-sm font-extrabold text-amber-950 dark:text-amber-100 sm:text-base">
                {nextMilestone.title}
              </p>
              <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                {nextMilestone.count - totalCompletions} more completion
                {nextMilestone.count - totalCompletions === 1 ? "" : "s"} to unlock
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-2xl font-extrabold tabular-nums text-amber-700 dark:text-amber-400">
                {totalCompletions}/{nextMilestone.count}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-200/60 dark:bg-amber-900/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-500"
              style={{
                width: `${Math.min(100, (totalCompletions / nextMilestone.count) * 100)}%`,
              }}
            />
          </div>
        </section>
      ) : null}

      {dailyAlreadyPlayed && !dailyCompletedToday ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          You already started today&apos;s challenge. Play again to pick up where you
          left off — only your first completed run counts for stats.
        </p>
      ) : null}

      {dailyCompletedToday ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          Today&apos;s challenge is in the books. Replay anytime in review mode — stats
          won&apos;t change.
        </p>
      ) : null}
    </div>
  );
}
