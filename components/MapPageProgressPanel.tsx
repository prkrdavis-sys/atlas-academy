"use client";

import { useState } from "react";
import { ExplorerRankBadge } from "@/components/ExplorerRankBadge";
import { MapProgressInfoButton, MapProgressInfoDialog } from "@/components/MapProgressInfoDialog";
import { MapProgressSummaryCard } from "@/components/MapProgressSummaryCard";
import {
  getCategoryMapProgress,
  getRegionsMapProgress,
  MAP_PROGRESS_CATEGORY_INFO,
} from "@/lib/map-progress";
import { getScopedModeInfo, SCOPE_INFO } from "@/lib/scope";
import {
  DIFFICULTY_LABELS,
  type GameScope,
  type MapProgressDifficulty,
  type Profile,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type MapPageProgressPanelProps = {
  scope: GameScope;
  profile: Profile;
  difficulty: MapProgressDifficulty;
};

function ProgressMeter({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full bg-slate-700 transition-all duration-300 dark:bg-slate-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function categoryModeBlurb(category: keyof typeof MAP_PROGRESS_CATEGORY_INFO, scope: GameScope) {
  const info = MAP_PROGRESS_CATEGORY_INFO[category];
  return info.modes
    .map((mode) => getScopedModeInfo(mode, scope)?.title)
    .filter(Boolean)
    .join(" · ");
}

export function MapPageProgressPanel({
  scope,
  profile,
  difficulty,
}: MapPageProgressPanelProps) {
  const [showProgressInfo, setShowProgressInfo] = useState(false);
  const scopeInfo = SCOPE_INFO[scope];
  const categories = getCategoryMapProgress(scope, profile, difficulty);
  const regions = getRegionsMapProgress(scope, profile, difficulty);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <MapProgressInfoDialog
        open={showProgressInfo}
        onClose={() => setShowProgressInfo(false)}
        scope={scope}
      />

      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/80 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
              <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100 sm:text-lg">
                Map Progress
              </h2>
              <ExplorerRankBadge profile={profile} scope={scope} />
            </div>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
              {DIFFICULTY_LABELS[difficulty]} · {scopeInfo.label}
            </p>
          </div>
          <MapProgressInfoButton onClick={() => setShowProgressInfo(true)} />
        </div>
      </div>

      <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-5">
        <MapProgressSummaryCard
          scope={scope}
          profile={profile}
          difficulty={difficulty}
        />

        <div>
          <h3 className="font-display text-sm font-extrabold text-slate-800 dark:text-slate-100">
            Categories
          </h3>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Game modes that fill the map · {scopeInfo.nounPlural} completed
          </p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {categories.map((entry) => {
              const info = MAP_PROGRESS_CATEGORY_INFO[entry.category];
              const modeBlurb = categoryModeBlurb(entry.category, scope);

              return (
                <li
                  key={entry.category}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      <span aria-hidden>{info.icon}</span> {info.label}
                    </p>
                    <p className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {entry.completed}
                      <span className="text-slate-400 dark:text-slate-500"> / </span>
                      {entry.total}
                    </p>
                  </div>
                  {modeBlurb ? (
                    <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                      {modeBlurb}
                    </p>
                  ) : null}
                  <ProgressMeter
                    className="mt-2.5"
                    value={entry.percentComplete}
                    label={`${info.label} progress`}
                  />
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-extrabold text-slate-800 dark:text-slate-100">
            {scopeInfo.regionLabel}
          </h3>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Mastered {scopeInfo.nounPlural} and category completions
          </p>
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            {regions.map((entry) => (
              <li
                key={entry.region}
                className="grid gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-3 sm:block">
                    <p className="font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {entry.region}
                    </p>
                    <p className="font-mono text-sm font-bold tabular-nums text-slate-900 sm:mt-1 dark:text-slate-100">
                      {entry.mastered}
                      <span className="text-slate-400 dark:text-slate-500"> / </span>
                      {entry.total}{" "}
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        mastered
                      </span>
                    </p>
                  </div>
                  <ProgressMeter
                    className="mt-2"
                    value={entry.percentComplete}
                    label={`${entry.region} map progress`}
                  />
                </div>
                <p className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400 sm:text-right">
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {entry.completedCategories}
                    <span className="text-slate-400 dark:text-slate-500"> / </span>
                    {entry.totalCategories}
                  </span>
                  <span className="mt-0.5 block font-medium text-slate-500 dark:text-slate-400">
                    categories
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
