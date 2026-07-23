"use client";

import { useMemo, useState } from "react";
import { MapProgressInfoButton, MapProgressInfoDialog } from "@/components/MapProgressInfoDialog";
import { MapProgressDifficultySelector } from "@/components/PlaceMapProgressPanel";
import { StatsProgressMap, getStatsMapTemplateKey } from "@/components/StatsProgressMap";
import { getRegionsForScope } from "@/lib/countries";
import {
  getMapProgressSummary,
  getRegionMapProgress,
  MAP_PROGRESS_CATEGORY_INFO,
} from "@/lib/map-progress";
import { SCOPE_INFO } from "@/lib/scope";
import type { MapProgressDifficulty, Profile } from "@/lib/types";
import {
  DIFFICULTY_LABELS,
  MAP_PROGRESS_CATEGORIES,
  type GameScope,
} from "@/lib/types";

type StatsMapProgressSectionProps = {
  profile: Profile;
  scope: GameScope;
};

function MapProgressSummaryCard({
  scope: cardScope,
  profile,
  difficulty,
  onInfoClick,
}: {
  scope: GameScope;
  profile: Profile;
  difficulty: MapProgressDifficulty;
  onInfoClick: () => void;
}) {
  const info = SCOPE_INFO[cardScope];
  const summary = getMapProgressSummary(cardScope, profile, difficulty);

  return (
    <div className="relative rounded-2xl border-2 border-teal-400 bg-gradient-to-br from-teal-50 to-emerald-50 p-4 pr-12 shadow-sm dark:border-teal-600 dark:from-teal-950/40 dark:to-emerald-950/40">
      <MapProgressInfoButton onClick={onInfoClick} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
            <span aria-hidden>{info.icon}</span> {info.shortLabel}
          </p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            {info.nounPlural} · {DIFFICULTY_LABELS[difficulty]}
          </p>
        </div>
        <p className="font-display text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 sm:text-3xl">
          {summary.percentComplete}%
        </p>
      </div>

      <p className="mt-3 font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 sm:text-xl">
        {summary.completedCategories}
        <span className="text-slate-400 dark:text-slate-500"> / </span>
        {summary.totalCategories}
      </p>
      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">category completions</p>

      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="progressbar"
        aria-valuenow={summary.percentComplete}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${info.shortLabel} map progress`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-300"
          style={{ width: `${summary.percentComplete}%` }}
        />
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
        {summary.masteredPlaces} / {summary.totalPlaces} {info.nounPlural} fully mastered
      </p>
    </div>
  );
}

export function StatsMapProgressSection({ profile, scope }: StatsMapProgressSectionProps) {
  const defaultDifficulty: MapProgressDifficulty =
    profile.settings.difficulty === "hard" ? "hard" : "medium";
  const [mapDifficulty, setMapDifficulty] = useState<MapProgressDifficulty>(defaultDifficulty);
  const [showProgressInfo, setShowProgressInfo] = useState(false);

  const scopeInfo = SCOPE_INFO[scope];
  const regions = getRegionsForScope(scope);
  const regionRows = useMemo(
    () =>
      regions.map((region) => ({
        region,
        progress: getRegionMapProgress(scope, region, profile, mapDifficulty),
      })),
    [regions, scope, profile, mapDifficulty],
  );

  return (
    <section className="overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <MapProgressInfoDialog
        open={showProgressInfo}
        onClose={() => setShowProgressInfo(false)}
        scope={scope}
      />
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/80 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100 sm:text-lg">
              Map Progress
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
              {DIFFICULTY_LABELS[mapDifficulty]} difficulty · {scopeInfo.label}
            </p>
          </div>
          <MapProgressDifficultySelector value={mapDifficulty} onChange={setMapDifficulty} />
        </div>
      </div>

      <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
        <MapProgressSummaryCard
          scope={scope}
          profile={profile}
          difficulty={mapDifficulty}
          onInfoClick={() => setShowProgressInfo(true)}
        />

        <div className="flex flex-wrap gap-2">
          {MAP_PROGRESS_CATEGORIES.map((category) => {
            const info = MAP_PROGRESS_CATEGORY_INFO[category];
            return (
              <span
                key={category}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <span aria-hidden>{info.icon}</span>
                {info.label}
              </span>
            );
          })}
        </div>

        <StatsProgressMap
          profile={profile}
          difficulty={mapDifficulty}
          scope={scope}
          templateKey={getStatsMapTemplateKey(scope)}
          showFillLegend
          ariaLabel={`${scopeInfo.label} map progress at ${DIFFICULTY_LABELS[mapDifficulty]} difficulty`}
        />

        <div className="space-y-4">
          {regionRows.map(({ region, progress }) => (
            <div
              key={region}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/50 sm:p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-display text-sm font-extrabold text-slate-900 dark:text-slate-100 sm:text-base">
                  {region}
                </h3>
                <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  {progress.mastered}/{progress.total}
                </span>
              </div>
              <StatsProgressMap
                profile={profile}
                difficulty={mapDifficulty}
                scope={scope}
                templateKey={getStatsMapTemplateKey(scope, region)}
                region={region}
                compact
                ariaLabel={`${region} map progress`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
