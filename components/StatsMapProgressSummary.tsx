"use client";

import { useState } from "react";
import { MapProgressSummaryCard } from "@/components/MapProgressSummaryCard";
import { MapProgressDifficultySelector } from "@/components/PlaceMapProgressPanel";
import { SCOPE_INFO } from "@/lib/scope";
import type { MapProgressDifficulty, Profile } from "@/lib/types";
import { DIFFICULTY_LABELS, type GameScope } from "@/lib/types";

type StatsMapProgressSummaryProps = {
  profile: Profile;
  scope: GameScope;
};

export function StatsMapProgressSummary({ profile, scope }: StatsMapProgressSummaryProps) {
  const defaultDifficulty: MapProgressDifficulty =
    profile.settings.difficulty === "hard" ? "hard" : "medium";
  const [mapDifficulty, setMapDifficulty] = useState<MapProgressDifficulty>(defaultDifficulty);
  const scopeInfo = SCOPE_INFO[scope];

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
          <MapProgressDifficultySelector value={mapDifficulty} onChange={setMapDifficulty} />
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <MapProgressSummaryCard
          scope={scope}
          profile={profile}
          difficulty={mapDifficulty}
          showInfoDialog
          showMapLink
        />
      </div>
    </section>
  );
}
