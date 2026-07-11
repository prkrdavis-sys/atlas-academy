"use client";

import { useEffect, useState } from "react";
import { useProfiles } from "@/components/ProfileProvider";
import { cn } from "@/lib/utils";
import { ACHIEVEMENTS, DIFFICULTIES, GAME_MODES, type Difficulty } from "@/lib/types";
import { getGlobalStreak } from "@/lib/stats-helpers";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

function DifficultySelector({
  value,
  onChange,
  className,
}: {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("grid grid-cols-3 gap-2", className)}
      role="group"
      aria-label="Difficulty"
    >
      {DIFFICULTIES.map((level) => {
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(level)}
            className={cn(
              "min-h-10 rounded-xl border-2 px-3 py-2 text-sm font-semibold capitalize transition-all duration-100",
              selected
                ? "border-emerald-600 bg-emerald-500 text-white shadow-[0_3px_0_var(--color-emerald-700)]"
                : "border-slate-200 bg-white text-slate-700 shadow-[0_3px_0_var(--color-slate-200)] hover:border-sky-300 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500",
            )}
          >
            {DIFFICULTY_LABELS[level]}
          </button>
        );
      })}
    </div>
  );
}

export default function StatsPage() {
  const { activeProfile, hydrated } = useProfiles();
  const profile = hydrated ? activeProfile : null;
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  useEffect(() => {
    if (profile) {
      setDifficulty(profile.settings.difficulty ?? "easy");
    }
  }, [profile?.id, profile?.settings.difficulty]);

  if (!profile) {
    return (
      <div className="rounded-3xl border-2 border-slate-200 bg-white/90 p-8 text-center shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <p className="text-slate-600 dark:text-slate-400">Create a profile to see your stats.</p>
      </div>
    );
  }

  const globalStreak = getGlobalStreak(profile, difficulty);
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];

  return (
    <div className="space-y-5 sm:space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Stats for {profile.name}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
          Track your streaks and accuracy across all game modes.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100 sm:text-lg">
            Difficulty
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
            Showing {difficultyLabel.toLowerCase()} mode scores
          </p>
        </div>
        <DifficultySelector
          value={difficulty}
          onChange={setDifficulty}
          className="sm:max-w-xs sm:flex-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm dark:border-amber-800 dark:from-amber-950/50 dark:to-orange-950/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Current streak</p>
          <p className="mt-1 font-display text-4xl font-extrabold text-amber-900 dark:text-amber-200">
            {globalStreak.currentStreak}
          </p>
          <p className="mt-1 hidden text-sm text-amber-800/80 dark:text-amber-300/80 sm:block">
            Carries across modes and rounds
          </p>
        </div>
        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm dark:border-emerald-800 dark:from-emerald-950/50 dark:to-teal-950/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">All-time best streak</p>
          <p className="mt-1 font-display text-4xl font-extrabold text-emerald-900 dark:text-emerald-200">
            {globalStreak.bestStreak}
          </p>
          <p className="mt-1 hidden text-sm text-emerald-800/80 dark:text-emerald-300/80 sm:block">
            Your longest run across every mode
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
          <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100">By mode</h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{difficultyLabel} difficulty</p>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {GAME_MODES.map((mode) => {
            const stats = profile.stats[mode.id][difficulty];
            const accuracy =
              stats.totalPlayed > 0
                ? Math.round((stats.totalCorrect / stats.totalPlayed) * 100)
                : 0;
            return (
              <li key={mode.id} className="px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800"
                    aria-hidden
                  >
                    {mode.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-sm font-extrabold leading-snug text-slate-900 dark:text-slate-100">
                        {mode.title}
                      </p>
                      <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                        {accuracy}%
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{stats.currentStreak}</span> streak
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden>·</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">{stats.bestStreak}</span> best
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden>·</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{stats.totalPlayed}</span> played
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="hidden sm:block">
        <div className="rounded-3xl border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
            <h2 className="font-display text-lg font-extrabold text-slate-800 dark:text-slate-100">By mode</h2>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{difficultyLabel} difficulty</p>
          </div>
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 [&_th]:sticky [&_th]:top-[var(--app-header-offset)] [&_th]:z-10 [&_th]:bg-slate-50 [&_th]:shadow-[0_1px_0_0_rgb(226_232_240)] dark:[&_th]:bg-slate-800 dark:[&_th]:shadow-[0_1px_0_0_rgb(51_65_85)]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Mode</th>
                <th className="px-4 py-3 text-right font-semibold">Mode Streak</th>
                <th className="px-4 py-3 text-right font-semibold">Mode Best</th>
                <th className="px-4 py-3 text-right font-semibold">Accuracy</th>
                <th className="px-4 py-3 text-right font-semibold">Played</th>
              </tr>
            </thead>
            <tbody>
              {GAME_MODES.map((mode) => {
                const stats = profile.stats[mode.id][difficulty];
                const accuracy =
                  stats.totalPlayed > 0
                    ? Math.round((stats.totalCorrect / stats.totalPlayed) * 100)
                    : 0;
                return (
                  <tr key={mode.id} className="border-b border-slate-100 even:bg-slate-100/80 dark:border-slate-800 dark:even:bg-slate-800/80">
                    <td className="px-4 py-3">
                      <span className="mr-2">{mode.icon}</span>
                      {mode.title}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{stats.currentStreak}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 dark:text-emerald-400">{stats.bestStreak}</td>
                    <td className="px-4 py-3 text-right">{accuracy}%</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{stats.totalPlayed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="sticky top-[var(--app-header-offset)] z-10 flex items-baseline justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
          <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100 sm:font-semibold">Achievements</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
            {profile.achievements.length} / {ACHIEVEMENTS.length} unlocked
          </p>
        </div>
        <div className="p-4 sm:p-6">
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400 sm:mb-4 sm:text-sm">
            Achievements count progress across all difficulties.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {ACHIEVEMENTS.map((achievement) => {
              const earned = profile.achievements.includes(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={`rounded-xl border px-3.5 py-3 sm:px-4 ${earned ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50" : "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-800"}`}
                >
                  <p className="text-sm font-medium leading-snug sm:text-base">
                    {earned ? "🏆" : "🔒"} {achievement.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:mt-1 sm:text-sm">
                    {achievement.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
