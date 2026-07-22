"use client";

import { useMemo, useState } from "react";
import { StatsProgressMap, getStatsMapTemplateKey } from "@/components/StatsProgressMap";
import { getRegionsForScope } from "@/lib/countries";
import {
  getOverallMapProgress,
  getRegionMapProgress,
  MAP_PROGRESS_CATEGORY_INFO,
} from "@/lib/map-progress";
import { getProgressPathStyle } from "@/lib/map-colors";
import { SCOPE_INFO } from "@/lib/scope";
import type { MapProgressDifficulty, Profile } from "@/lib/types";
import {
  DIFFICULTY_LABELS,
  MAP_PROGRESS_CATEGORIES,
  MAP_PROGRESS_DIFFICULTIES,
  type GameScope,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type StatsMapProgressSectionProps = {
  profile: Profile;
  scope: GameScope;
};

function MapDifficultySelector({
  value,
  onChange,
}: {
  value: MapProgressDifficulty;
  onChange: (difficulty: MapProgressDifficulty) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Map progress difficulty">
      {MAP_PROGRESS_DIFFICULTIES.map((level) => {
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(level)}
            className={cn(
              "min-h-10 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-all duration-100",
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

export function StatsMapProgressSection({ profile, scope }: StatsMapProgressSectionProps) {
  const defaultDifficulty: MapProgressDifficulty =
    profile.settings.difficulty === "hard" ? "hard" : "medium";
  const [mapDifficulty, setMapDifficulty] = useState<MapProgressDifficulty>(defaultDifficulty);

  const scopeInfo = SCOPE_INFO[scope];
  const regions = getRegionsForScope(scope);
  const overall = getOverallMapProgress(scope, profile, mapDifficulty);
  const regionRows = useMemo(
    () =>
      regions.map((region) => ({
        region,
        progress: getRegionMapProgress(scope, region, profile, mapDifficulty),
      })),
    [regions, scope, profile, mapDifficulty],
  );

  const placeNoun = scope === "usa" ? "states" : "countries";

  return (
    <section className="overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
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
          <MapDifficultySelector value={mapDifficulty} onChange={setMapDifficulty} />
        </div>
      </div>

      <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Answer correctly in <strong className="font-semibold text-slate-800 dark:text-slate-200">Normal</strong> or{" "}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">Hard</strong> mode (not Practice) to fill
          each {scopeInfo.noun.toLowerCase()}. Master all four categories —{" "}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">Flag</strong> (Countries from flags or Flags from countries),{" "}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">Shape</strong>,{" "}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">Capital</strong>, and{" "}
          <strong className="font-semibold text-slate-800 dark:text-slate-200">Trivia</strong> — to fully complete a{" "}
          {scopeInfo.noun.toLowerCase()}. Mixed, Daily Challenge, Marathon, and Speed Round count when the
          question matches a category.
        </p>

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

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Fill levels:</span>
          {([1, 2, 3, 4] as const).map((level) => {
            const style = getProgressPathStyle(level, false);
            return (
              <span key={level} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-sm border"
                  style={{ backgroundColor: style.fill, borderColor: style.stroke }}
                  aria-hidden
                />
                {level}/4
              </span>
            );
          })}
        </div>

        <StatsProgressMap
          profile={profile}
          difficulty={mapDifficulty}
          scope={scope}
          templateKey={getStatsMapTemplateKey(scope)}
          ariaLabel={`${scopeInfo.label} map progress at ${DIFFICULTY_LABELS[mapDifficulty]} difficulty`}
        />

        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Overall:{" "}
          <span className="font-display text-base font-extrabold text-emerald-700 dark:text-emerald-400">
            {overall.mastered} / {overall.total}
          </span>{" "}
          {placeNoun} fully mastered
        </p>

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
