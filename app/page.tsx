"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { ProfileRequiredDialog } from "@/components/ProfileRequiredDialog";
import { useProfiles } from "@/components/ProfileProvider";
import { StreakSummaryLink } from "@/components/StreakSummaryLink";
import { GAME_MODES, type GameMode } from "@/lib/types";
import { formatDailyDate, hasPlayedDailyToday } from "@/lib/game-engine";
import { getGlobalStreakOrZero } from "@/lib/stats-helpers";
import { cn } from "@/lib/utils";

const CORE_MODE_STYLES: Record<
  string,
  { tile: string; iconBg: string; hover: string }
> = {
  "flag-to-country": {
    tile: "border-sky-200 bg-sky-50/80 dark:border-sky-800 dark:bg-sky-950/50",
    iconBg: "bg-sky-100 dark:bg-sky-900/60",
    hover: "hover:border-sky-400 dark:hover:border-sky-600",
  },
  "capital-to-country": {
    tile: "border-violet-200 bg-violet-50/80 dark:border-violet-800 dark:bg-violet-950/50",
    iconBg: "bg-violet-100 dark:bg-violet-900/60",
    hover: "hover:border-violet-400 dark:hover:border-violet-600",
  },
  "country-to-capital": {
    tile: "border-rose-200 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/50",
    iconBg: "bg-rose-100 dark:bg-rose-900/60",
    hover: "hover:border-rose-400 dark:hover:border-rose-600",
  },
  "shape-to-country": {
    tile: "border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/50",
    iconBg: "bg-amber-100 dark:bg-amber-900/60",
    hover: "hover:border-amber-400 dark:hover:border-amber-600",
  },
};

const CHALLENGE_MODES: GameMode[] = ["daily-challenge", "mixed", "speed-round", "marathon"];
const EXTRA_QUIZ_MODES: GameMode[] = ["weak-spots", "country-to-flag", "neighbor-quiz", "population-showdown"];

export default function HomePage() {
  const { activeProfile, hydrated } = useProfiles();
  const profile = hydrated ? activeProfile : null;
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  function handlePlayModeClick(event: MouseEvent<HTMLAnchorElement>) {
    if (hydrated && !activeProfile) {
      event.preventDefault();
      setShowProfileDialog(true);
    }
  }

  const difficulty = profile?.settings.difficulty ?? "easy";
  const globalStreak = getGlobalStreakOrZero(profile, difficulty);
  const dailyDateLabel = formatDailyDate();
  const dailyCompletedToday = profile
    ? hasPlayedDailyToday(profile.dailyChallengePlayedDates)
    : false;

  return (
    <div className="space-y-7 sm:space-y-10">
      <ProfileRequiredDialog
        open={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
      />
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-700 p-5 text-white shadow-[0_16px_40px_rgb(15_118_110_/_0.22)] sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 select-none text-[8rem] opacity-15 sm:-right-10 sm:-top-14 sm:text-[11rem]"
        >
          🌍
        </div>
        <div className="relative max-w-xl">
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Atlas Academy
          </h1>
          <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-emerald-50 sm:mt-3 sm:max-w-md sm:text-base">
            Flags, capitals, and country shapes. Build a streak and beat your best.
          </p>
          {profile && (
            <StreakSummaryLink streak={globalStreak} className="mt-4 sm:mt-5" />
          )}
          <div className="mt-5 sm:mt-6">
            {profile ? (
              <Link
                href="/play/daily-challenge"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-display text-sm font-extrabold text-teal-800 shadow-[0_3px_0_rgb(255_255_255_/_0.45)] transition-transform hover:scale-[1.03] active:translate-y-[3px] active:shadow-none sm:text-base"
              >
                <span className="flex flex-col items-center leading-tight sm:flex-row sm:gap-2">
                  <span>📅 {dailyCompletedToday ? "Review today's challenge" : "Play today's challenge"}</span>
                  <span className="text-xs font-semibold text-teal-700/80">{dailyDateLabel}</span>
                </span>
              </Link>
            ) : (
              <Link
                href="/profiles"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-display text-sm font-extrabold text-teal-800 shadow-[0_3px_0_rgb(255_255_255_/_0.45)] transition-transform hover:scale-[1.03] active:translate-y-[3px] active:shadow-none sm:text-base"
              >
                Create your first profile
              </Link>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100 sm:mb-4">Play</h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {GAME_MODES.filter((m) => m.phase === 1).map((mode) => {
            const style = CORE_MODE_STYLES[mode.id];
            return (
              <Link
                key={mode.id}
                href={`/play/${mode.id}`}
                onClick={handlePlayModeClick}
                className={cn(
                  "group flex min-h-[5.25rem] items-center gap-3 rounded-2xl border-2 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:p-5",
                  style?.tile ?? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
                  style?.hover,
                )}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition-transform group-hover:scale-110 sm:h-14 sm:w-14 sm:text-3xl",
                    style?.iconBg ?? "bg-slate-100 dark:bg-slate-800",
                  )}
                >
                  {mode.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-extrabold text-slate-900 dark:text-slate-100">{mode.title}</h3>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-600 dark:text-slate-400 sm:truncate sm:text-sm">{mode.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100 sm:mb-4">Challenges</h2>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-5">
          {CHALLENGE_MODES.map((id) => {
            const mode = GAME_MODES.find((m) => m.id === id);
            if (!mode) return null;
            const isDaily = mode.id === "daily-challenge";
            return (
              <Link
                key={mode.id}
                href={`/play/${mode.id}`}
                onClick={handlePlayModeClick}
                className="group min-h-[8.75rem] min-w-[9.5rem] snap-start rounded-2xl border-2 border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-teal-500 sm:min-w-0"
              >
                <span className="text-2xl transition-transform group-hover:scale-110">
                  {mode.icon}
                </span>
                <h3 className="mt-2 font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {mode.title}
                </h3>
                {isDaily ? (
                  <p className="mt-0.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
                    {dailyDateLabel}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{mode.description}</p>
              </Link>
            );
          })}
        </div>

        <div className="-mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-4 sm:flex-wrap sm:overflow-visible sm:px-0">
          <span className="shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">More:</span>
          {EXTRA_QUIZ_MODES.map((id) => {
            const mode = GAME_MODES.find((m) => m.id === id);
            if (!mode) return null;
            return (
              <Link
                key={mode.id}
                href={`/play/${mode.id}`}
                onClick={handlePlayModeClick}
                className="min-h-11 shrink-0 rounded-full border-2 border-slate-200 bg-white/80 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-300"
              >
                {mode.icon} {mode.title}
              </Link>
            );
          })}
          <Link
            href="/library"
            className="min-h-11 shrink-0 rounded-full border-2 border-slate-200 bg-white/80 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-300"
          >
            📚 Country Library
          </Link>
        </div>
      </section>
    </div>
  );
}
