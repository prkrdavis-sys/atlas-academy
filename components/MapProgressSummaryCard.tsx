"use client";

import Link from "next/link";
import { useState } from "react";
import { MapProgressInfoButton, MapProgressInfoDialog } from "@/components/MapProgressInfoDialog";
import { getMapProgressSummary } from "@/lib/map-progress";
import { SCOPE_INFO } from "@/lib/scope";
import type { MapProgressDifficulty, Profile } from "@/lib/types";
import { DIFFICULTY_LABELS, type GameScope } from "@/lib/types";

type MapProgressSummaryCardProps = {
  scope: GameScope;
  profile: Profile;
  difficulty: MapProgressDifficulty;
  showInfoDialog?: boolean;
  showMapLink?: boolean;
};

export function MapProgressSummaryCard({
  scope,
  profile,
  difficulty,
  showInfoDialog = false,
  showMapLink = false,
}: MapProgressSummaryCardProps) {
  const [showProgressInfo, setShowProgressInfo] = useState(false);
  const info = SCOPE_INFO[scope];
  const summary = getMapProgressSummary(scope, profile, difficulty);
  const mapHref = scope === "usa" ? "/map?view=usa" : "/map";

  return (
    <>
      {showInfoDialog ? (
        <MapProgressInfoDialog
          open={showProgressInfo}
          onClose={() => setShowProgressInfo(false)}
          scope={scope}
        />
      ) : null}
      <div className="rounded-2xl border-2 border-teal-400 bg-gradient-to-br from-teal-50 to-emerald-50 p-4 shadow-sm dark:border-teal-600 dark:from-teal-950/40 dark:to-emerald-950/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
              <span aria-hidden>{info.icon}</span> {info.shortLabel}
            </p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              {info.nounPlural} · {DIFFICULTY_LABELS[difficulty]}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {showInfoDialog ? (
              <MapProgressInfoButton onClick={() => setShowProgressInfo(true)} />
            ) : null}
            <p className="font-display text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 sm:text-3xl">
              {summary.percentComplete}%
            </p>
          </div>
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

        {showMapLink ? (
          <Link
            href={mapHref}
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-teal-600 bg-teal-600 px-4 py-2 font-display text-sm font-extrabold text-white shadow-[0_3px_0_var(--color-teal-800)] transition-all hover:bg-teal-500 active:translate-y-[3px] active:shadow-none dark:border-teal-500 dark:bg-teal-600 dark:shadow-[0_3px_0_var(--color-teal-900)]"
          >
            Open Map →
          </Link>
        ) : null}
      </div>
    </>
  );
}
