"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExplorerRankBadge } from "@/components/ExplorerRankBadge";
import { StatsDifficultySelector, StatsScopeToggle } from "@/components/StatsControls";
import { useProfiles } from "@/components/ProfileProvider";
import { getCountryName } from "@/lib/countries";
import { getStoredScope, SCOPE_INFO, scopeText, setStoredScope } from "@/lib/scope";
import {
  getDifficultyTotals,
  getGlobalStreak,
  getModeStatRows,
  getScopeTotals,
  getTodayBestStreakDisplay,
  getTopMissedPlaces,
  maxGlobalBestStreak,
} from "@/lib/stats-helpers";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type Difficulty,
  type GameScope,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AdvancedStatsPage() {
  const { activeProfile, hydrated } = useProfiles();
  const profile = hydrated ? activeProfile : null;
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [scope, setScope] = useState<GameScope>("world");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScope(getStoredScope());
  }, []);

  const selectScope = useCallback((next: GameScope) => {
    setScope(next);
    setStoredScope(next);
  }, []);

  useEffect(() => {
    if (profile) {
      setDifficulty(profile.settings.difficulty ?? "medium");
    }
  }, [profile?.id, profile?.settings.difficulty]);

  if (!hydrated) {
    return (
      <div className="rounded-3xl border-2 border-slate-200 bg-white/90 p-8 text-center shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <p className="text-slate-600 dark:text-slate-400">Loading stats…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-3xl border-2 border-slate-200 bg-white/90 p-8 text-center shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <p className="text-slate-600 dark:text-slate-400">Create a profile to see your stats.</p>
      </div>
    );
  }

  const scopeInfo = SCOPE_INFO[scope];
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
  const modeRows = getModeStatRows(profile, difficulty, scope);
  const scopeTotals = getScopeTotals(profile, scope);
  const todayBest = getTodayBestStreakDisplay(profile, difficulty, scope);
  const lifetimeBest = maxGlobalBestStreak(profile, scope);
  const loginStreak = profile.loginStreak?.length ?? 0;
  const dailyCompletions = profile.dailyChallengeCompletions?.length ?? 0;
  const missedPlaces = getTopMissedPlaces(profile, scope);
  const difficultyBreakdown = DIFFICULTIES.map((level) => {
    const totals = getDifficultyTotals(profile, level, scope);
    const streak = getGlobalStreak(profile, level, scope);
    return { level, totals, streak };
  });

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/stats"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
          >
            ← Back to stats
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
              Advanced stats
            </h1>
            <ExplorerRankBadge profile={profile} scope={scope} />
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            Detailed breakdowns for {profile.name} · {scopeInfo.nounPlural}
          </p>
        </div>
        <StatsScopeToggle value={scope} onChange={selectScope} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border-2 border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Lifetime accuracy
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
            {scopeTotals.accuracy}%
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {scopeTotals.totalCorrect}/{scopeTotals.totalPlayed} all difficulties
          </p>
        </div>
        <div className="rounded-2xl border-2 border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Lifetime best streak
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
            {lifetimeBest}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Across all difficulties
          </p>
        </div>
        <div className="rounded-2xl border-2 border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Today&apos;s best
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-amber-700 dark:text-amber-400">
            {todayBest}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {difficultyLabel} streak today
          </p>
        </div>
        <div className="rounded-2xl border-2 border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Habits
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-sky-700 dark:text-sky-400">
            {loginStreak}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Login streak · {dailyCompletions} daily clears
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/80 sm:px-6">
          <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100 sm:text-lg">
            By difficulty
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
            Totals across every mode in {scopeInfo.label}
          </p>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 sm:hidden">
          {difficultyBreakdown.map(({ level, totals, streak }) => (
            <li
              key={level}
              className={cn(
                "px-4 py-3.5",
                level === difficulty && "bg-teal-50/70 dark:bg-teal-950/30",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {DIFFICULTY_LABELS[level]}
                </p>
                <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  {totals.accuracy}%
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{streak.currentStreak}</span> streak
                <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden>·</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{streak.bestStreak}</span> best
                <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden>·</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{totals.totalPlayed}</span> played
              </p>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700">
              <tr className="bg-slate-50/80 dark:bg-slate-800/80">
                <th className="px-4 py-3 text-left font-semibold">Difficulty</th>
                <th className="px-4 py-3 text-right font-semibold">Current</th>
                <th className="px-4 py-3 text-right font-semibold">Best</th>
                <th className="px-4 py-3 text-right font-semibold">Accuracy</th>
                <th className="px-4 py-3 text-right font-semibold">Played</th>
              </tr>
            </thead>
            <tbody>
              {difficultyBreakdown.map(({ level, totals, streak }) => (
                <tr
                  key={level}
                  className={cn(
                    "border-b border-slate-100 dark:border-slate-800",
                    level === difficulty && "bg-teal-50/70 dark:bg-teal-950/30",
                  )}
                >
                  <td className="px-4 py-3 font-display font-extrabold text-slate-900 dark:text-slate-100">
                    {DIFFICULTY_LABELS[level]}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{streak.currentStreak}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {streak.bestStreak}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.accuracy}%</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                    {totals.totalPlayed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100 sm:text-lg">
            By mode
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
            Showing {difficultyLabel.toLowerCase()} scores
          </p>
        </div>
        <StatsDifficultySelector
          value={difficulty}
          onChange={setDifficulty}
          className="sm:max-w-xs sm:flex-1"
        />
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:hidden">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {modeRows.map((row) => (
            <li key={row.mode} className="px-4 py-3.5">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800"
                  aria-hidden
                >
                  {row.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-sm font-extrabold leading-snug text-slate-900 dark:text-slate-100">
                      {scopeText(row.title, scope)}
                    </p>
                    <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      {row.accuracy}%
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{row.currentStreak}</span> streak
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden>·</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">{row.bestStreak}</span> best
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden>·</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{row.totalPlayed}</span> played
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden>·</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{row.totalCorrect}</span> correct
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="hidden overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/80">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Mode</th>
                <th className="px-4 py-3 text-right font-semibold">Streak</th>
                <th className="px-4 py-3 text-right font-semibold">Best</th>
                <th className="px-4 py-3 text-right font-semibold">Correct</th>
                <th className="px-4 py-3 text-right font-semibold">Accuracy</th>
                <th className="px-4 py-3 text-right font-semibold">Played</th>
              </tr>
            </thead>
            <tbody>
              {modeRows.map((row) => (
                <tr
                  key={row.mode}
                  className="border-b border-slate-100 even:bg-slate-100/80 dark:border-slate-800 dark:even:bg-slate-800/80"
                >
                  <td className="px-4 py-3">
                    <span className="mr-2" aria-hidden>
                      {row.icon}
                    </span>
                    {scopeText(row.title, scope)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{row.currentStreak}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {row.bestStreak}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.totalCorrect}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.accuracy}%</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                    {row.totalPlayed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/80 sm:px-6">
          <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100 sm:text-lg">
            Weak spots
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
            Places you miss most often in {scopeInfo.label}
          </p>
        </div>
        {missedPlaces.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-400 sm:px-6">
            No misses recorded yet — keep playing to see patterns here.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {missedPlaces.map((place, index) => (
              <li
                key={place.code}
                className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-xs font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {index + 1}
                  </span>
                  <p className="truncate font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {getCountryName(place.code)}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-rose-50 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                  {place.misses} miss{place.misses === 1 ? "" : "es"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
