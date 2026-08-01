"use client";

import { useCallback, useEffect, useState } from "react";
import { ExplorerRankBadge } from "@/components/ExplorerRankBadge";
import { StatsActivityHeatmap } from "@/components/StatsActivityHeatmap";
import { StatsMapProgressSummary } from "@/components/StatsMapProgressSummary";
import { StatsDifficultySelector, StatsScopeToggle } from "@/components/StatsControls";
import { StatsModeChart, type StatsChartMetric } from "@/components/StatsModeChart";
import { AdvancedStatsLink, StatsSnapshotCard } from "@/components/StatsOverviewCards";
import { useProfiles } from "@/components/ProfileProvider";
import { cn } from "@/lib/utils";
import {
  ACHIEVEMENTS,
  DIFFICULTY_LABELS,
  type Difficulty,
  type GameScope,
} from "@/lib/types";
import { getStoredScope, SCOPE_INFO, setStoredScope } from "@/lib/scope";
import {
  getDifficultyTotals,
  getGlobalStreak,
  getModeStatRows,
} from "@/lib/stats-helpers";

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
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [chartMetric, setChartMetric] = useState<StatsChartMetric>("accuracy");
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

  const globalStreak = getGlobalStreak(profile, difficulty, scope);
  const difficultyTotals = getDifficultyTotals(profile, difficulty, scope);
  const modeRows = getModeStatRows(profile, difficulty, scope);
  const scopeInfo = SCOPE_INFO[scope];
  const difficultyLabel = DIFFICULTY_LABELS[difficulty];
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Stats for {profile.name}</h1>
            <ExplorerRankBadge profile={profile} scope={scope} />
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            {activeTab === "overview"
              ? `Your at-a-glance progress for ${scopeInfo.nounPlural}. Dig deeper in Advanced stats.`
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
          <StatsScopeToggle value={scope} onChange={selectScope} />
        ) : null}
      </div>

      {activeTab === "overview" ? (
        <div
          id="stats-panel-overview"
          role="tabpanel"
          aria-labelledby="stats-tab-overview"
          className="space-y-5 sm:space-y-8"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100 sm:text-lg">
                Snapshot
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                {difficultyLabel} difficulty · {scopeInfo.label}
              </p>
            </div>
            <StatsDifficultySelector
              value={difficulty}
              onChange={setDifficulty}
              className="sm:max-w-xs sm:flex-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatsSnapshotCard
              tone="amber"
              label="Current streak"
              value={globalStreak.currentStreak}
              hint={`Across modes in ${scopeInfo.label.toLowerCase()}`}
            />
            <StatsSnapshotCard
              tone="emerald"
              label="Best streak"
              value={globalStreak.bestStreak}
              hint="All-time longest run"
            />
            <StatsSnapshotCard
              tone="sky"
              label="Accuracy"
              value={`${difficultyTotals.accuracy}%`}
              hint={`${difficultyTotals.totalCorrect} of ${difficultyTotals.totalPlayed} correct`}
            />
            <StatsSnapshotCard
              tone="slate"
              label="Questions played"
              value={difficultyTotals.totalPlayed}
              hint={`${difficultyLabel} only`}
            />
          </div>

          <StatsActivityHeatmap profile={profile} />

          <StatsModeChart
            rows={modeRows}
            scope={scope}
            metric={chartMetric}
            onMetricChange={setChartMetric}
          />

          <StatsMapProgressSummary profile={profile} scope={scope} />

          <AdvancedStatsLink />
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
