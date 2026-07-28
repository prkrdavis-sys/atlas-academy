"use client";

import {
  getMapProgressDelta,
  type MapProgressSummary,
} from "@/lib/map-progress";
import { SCOPE_INFO } from "@/lib/scope";
import type { GameScope } from "@/lib/types";

type GameMapProgressSummaryProps = {
  scope: GameScope;
  initialSummary: MapProgressSummary;
  currentSummary: MapProgressSummary;
};

function formatRoundDelta(
  scope: GameScope,
  delta: ReturnType<typeof getMapProgressDelta>,
): string | null {
  const parts: string[] = [];
  const scopeInfo = SCOPE_INFO[scope];

  if (delta.completedCategories > 0) {
    parts.push(
      `+${delta.completedCategories} categor${delta.completedCategories === 1 ? "y" : "ies"}`,
    );
  }
  if (delta.masteredPlaces > 0) {
    parts.push(
      `+${delta.masteredPlaces} ${scopeInfo.noun}${delta.masteredPlaces === 1 ? "" : "s"} mastered`,
    );
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function GameMapProgressSummary({
  scope,
  initialSummary,
  currentSummary,
}: GameMapProgressSummaryProps) {
  const delta = getMapProgressDelta(initialSummary, currentSummary);
  const roundDelta = formatRoundDelta(scope, delta);

  return (
    <div
      className="mx-auto mt-4 max-w-sm rounded-xl border border-teal-200/70 bg-teal-50/40 px-3 py-2.5 dark:border-teal-800/70 dark:bg-teal-950/20"
      aria-label="Map progress this round"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-bold text-teal-800 dark:text-teal-300">
            Map progress
          </span>
          <span
            className="select-none text-xs text-teal-500/70 dark:text-teal-400/50"
            aria-hidden
          >
            –
          </span>
          <span className="font-display text-base font-extrabold tabular-nums leading-none text-emerald-700 dark:text-emerald-400">
            {currentSummary.percentComplete}%
          </span>
        </div>
        {roundDelta ? (
          <p className="min-w-0 truncate text-right text-xs leading-tight text-teal-600 dark:text-teal-400">
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {roundDelta}
            </span>{" "}
            this round
          </p>
        ) : null}
      </div>

      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80"
        role="progressbar"
        aria-valuenow={currentSummary.percentComplete}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${SCOPE_INFO[scope].shortLabel} map progress`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-300"
          style={{ width: `${currentSummary.percentComplete}%` }}
        />
      </div>
    </div>
  );
}
