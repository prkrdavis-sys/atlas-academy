"use client";

import { useCallback, useEffect, useState } from "react";
import { StatsMapProgressSummary } from "@/components/StatsMapProgressSummary";
import { useProfiles } from "@/components/ProfileProvider";
import { cn } from "@/lib/utils";
import {
  ACHIEVEMENTS,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  GAME_MODES,
  GAME_SCOPES,
  type Difficulty,
  type GameScope,
} from "@/lib/types";
import { getStoredScope, SCOPE_INFO, scopeText, setStoredScope } from "@/lib/scope";
import { getGlobalStreak, sortGameModesByMostPlayed } from "@/lib/stats-helpers";

type StatsTab = "overview" | "achievements";
type AchievementSort = "default" | "unlocked";

const STATS_TABS: { id: StatsTab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "achievements", label: "Achievements", icon: "🏆" },
];

const ACHIEVEMENT_SORT_OPTIONS: { value: AchievementSort; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "unlocked", label: "Unlocked" },
];

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

function AchievementSortSelector({
  value,
  onChange,
  className,
}: {
  value: AchievementSort;
  onChange: (sort: AchievementSort) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-2", className)}
      role="group"
      aria-label="Achievement sort"
    >
      {ACHIEVEMENT_SORT_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-10 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-all duration-100",
              selected
                ? "border-emerald-600 bg-emerald-500 text-white shadow-[0_3px_0_var(--color-emerald-700)]"
                : "border-slate-200 bg-white text-slate-700 shadow-[0_3px_0_var(--color-slate-200)] hover:border-sky-300 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function StatsPage() {
  const { activeProfile, hydrated } = useProfiles();
  const profile = hydrated ? activeProfile : null;
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [achievementSort, setAchievementSort] = useState<AchievementSort>("default");
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
      setDifficulty(profile.settings.difficulty ?? "easy");
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

  const globalStreak = getGlobalStreak(profile, difficulty, scope);
  const scopeInfo = SCOPE_INFO[scope];
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
  const modesByMostPlayed = sortGameModesByMostPlayed(GAME_MODES, profile, difficulty, scope);
  const sortedAchievements =
    achievementSort === "default"
      ? ACHIEVEMENTS
      : [...ACHIEVEMENTS].sort((a, b) => {
          const aEarned = profile.achievements.includes(a.id);
          const bEarned = profile.achievements.includes(b.id);
          if (aEarned === bEarned) {
            return ACHIEVEMENTS.indexOf(a) - ACHIEVEMENTS.indexOf(b);
          }
          return aEarned ? -1 : 1;
        });

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Stats for {profile.name}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            {activeTab === "overview"
              ? `Track your streaks and accuracy across all game modes for ${scopeInfo.nounPlural}.`
              : "Unlock badges by hitting streaks, trying modes, and exploring the atlas."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800"
          role="tablist"
          aria-label="Stats sections"
        >
          {STATS_TABS.map((tab) => {
            const active = activeTab === tab.id;
            const tabLabel =
              tab.id === "achievements"
                ? `${tab.label} (${profile.achievements.length}/${ACHIEVEMENTS.length})`
                : tab.label;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`stats-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`stats-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "min-h-9 rounded-xl px-3 py-1.5 font-display text-sm font-extrabold transition-all sm:px-4",
                  active
                    ? "bg-white text-teal-800 shadow-sm dark:bg-slate-900 dark:text-teal-300"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                )}
              >
                <span className="mr-1.5" aria-hidden>
                  {tab.icon}
                </span>
                {tabLabel}
              </button>
            );
          })}
        </div>

        {activeTab === "overview" ? (
          <div
            className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800"
            role="group"
            aria-label="Choose where to view stats"
          >
            {GAME_SCOPES.map((option) => {
              const active = scope === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectScope(option)}
                  className={cn(
                    "min-h-9 rounded-xl px-3 py-1.5 font-display text-sm font-extrabold transition-all",
                    active
                      ? "bg-white text-teal-800 shadow-sm dark:bg-slate-900 dark:text-teal-300"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                  )}
                >
                  {SCOPE_INFO[option].icon} {SCOPE_INFO[option].shortLabel}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {activeTab === "overview" ? (
        <div
          id="stats-panel-overview"
          role="tabpanel"
          aria-labelledby="stats-tab-overview"
          className="space-y-5 sm:space-y-8"
        >
      <StatsMapProgressSummary profile={profile} scope={scope} />

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
            Carries across modes and rounds in {scopeInfo.label.toLowerCase()}
          </p>
        </div>
        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm dark:border-emerald-800 dark:from-emerald-950/50 dark:to-teal-950/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">All-time best streak</p>
          <p className="mt-1 font-display text-4xl font-extrabold text-emerald-900 dark:text-emerald-200">
            {globalStreak.bestStreak}
          </p>
          <p className="mt-1 hidden text-sm text-emerald-800/80 dark:text-emerald-300/80 sm:block">
            Your longest run in {scopeInfo.label.toLowerCase()}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
          <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100">By mode</h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{difficultyLabel} difficulty</p>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {modesByMostPlayed.map((mode) => {
            const stats = profile.stats[scope][mode.id][difficulty];
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
                        {scopeText(mode.title, scope)}
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
              {modesByMostPlayed.map((mode) => {
                const stats = profile.stats[scope][mode.id][difficulty];
                const accuracy =
                  stats.totalPlayed > 0
                    ? Math.round((stats.totalCorrect / stats.totalPlayed) * 100)
                    : 0;
                return (
                  <tr key={mode.id} className="border-b border-slate-100 even:bg-slate-100/80 dark:border-slate-800 dark:even:bg-slate-800/80">
                    <td className="px-4 py-3">
                      <span className="mr-2">{mode.icon}</span>
                      {scopeText(mode.title, scope)}
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
        </div>
      ) : (
        <section
          id="stats-panel-achievements"
          role="tabpanel"
          aria-labelledby="stats-tab-achievements"
          className="rounded-[1.75rem] border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90"
        >
          <div className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100 sm:text-lg">
                  Achievements
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                  {profile.achievements.length} / {ACHIEVEMENTS.length} unlocked
                </p>
              </div>
              <AchievementSortSelector
                value={achievementSort}
                onChange={setAchievementSort}
                className="sm:max-w-xs sm:flex-1"
              />
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 sm:mt-4 sm:text-sm">
              Achievements count progress across all difficulties.
            </p>
          </div>
          <div className="px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
              {sortedAchievements.map((achievement) => {
                const earned = profile.achievements.includes(achievement.id);
                return (
                  <div
                    key={achievement.id}
                    className={cn(
                      "rounded-xl border px-3.5 py-3 sm:px-4",
                      earned
                        ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50"
                        : "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-800",
                    )}
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
      )}
    </div>
  );
}
