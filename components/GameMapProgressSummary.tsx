"use client";

import {
  getMapProgressDelta,
  type MapProgressSummary,
} from "@/lib/map-progress";
import { SCOPE_INFO } from "@/lib/scope";
import { DIFFICULTY_LABELS, type GameScope, type MapProgressDifficulty } from "@/lib/types";

type GameMapProgressSummaryProps = {
  scope: GameScope;
  difficulty: MapProgressDifficulty;
  initialSummary: MapProgressSummary;
  currentSummary: MapProgressSummary;
  questionsCounted: number;
};

export function GameMapProgressSummary({
  scope,
  difficulty,
  initialSummary,
  currentSummary,
  questionsCounted,
}: GameMapProgressSummaryProps) {
  const scopeInfo = SCOPE_INFO[scope];
  const delta = getMapProgressDelta(initialSummary, currentSummary);

  return (
    <div className="mx-auto mt-6 max-w-sm rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-4 text-left shadow-sm dark:border-teal-700 dark:from-teal-950/40 dark:to-emerald-950/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
            Map progress
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
            {scopeInfo.shortLabel} · {DIFFICULTY_LABELS[difficulty]}
          </p>
        </div>
        <p className="font-display text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
          {currentSummary.percentComplete}%
        </p>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="progressbar"
        aria-valuenow={currentSummary.percentComplete}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${scopeInfo.shortLabel} map progress`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-300"
          style={{ width: `${currentSummary.percentComplete}%` }}
        />
      </div>

      <p className="mt-2 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
        {currentSummary.completedCategories}
        <span className="text-slate-400 dark:text-slate-500"> / </span>
        {currentSummary.totalCategories}
        <span className="ml-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
          category completions
        </span>
      </p>

      {delta.completedCategories > 0 && (
        <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          +{delta.completedCategories} new categor{delta.completedCategories === 1 ? "y" : "ies"} this round
        </p>
      )}

      {delta.masteredPlaces > 0 && (
        <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          +{delta.masteredPlaces} {scopeInfo.noun}
          {delta.masteredPlaces === 1 ? "" : "s"} fully mastered
        </p>
      )}

      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
        {questionsCounted} question{questionsCounted === 1 ? "" : "s"} counted toward map progress
      </p>

      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        {currentSummary.masteredPlaces} / {currentSummary.totalPlaces} {scopeInfo.nounPlural} fully mastered
      </p>
    </div>
  );
}
