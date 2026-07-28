"use client";

import {
  getMapProgressDelta,
  type MapProgressSummary,
} from "@/lib/map-progress";
import { getMapProgressChrome } from "@/lib/map-mastery-fx";
import { SCOPE_INFO } from "@/lib/scope";
import type { GameScope, MapProgressDifficulty } from "@/lib/types";
import { cn } from "@/lib/utils";

type GameMapProgressSummaryProps = {
  scope: GameScope;
  difficulty: MapProgressDifficulty;
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
  difficulty,
  initialSummary,
  currentSummary,
}: GameMapProgressSummaryProps) {
  const delta = getMapProgressDelta(initialSummary, currentSummary);
  const roundDelta = formatRoundDelta(scope, delta);
  const chrome = getMapProgressChrome(difficulty);

  return (
    <div className={chrome.gamePanelClass} aria-label="Map progress this round">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-xs font-bold", chrome.gameLabelClass)}>Map progress</span>
          <span
            className={cn("select-none text-xs opacity-60", chrome.gameLabelClass)}
            aria-hidden
          >
            –
          </span>
          <span
            className={cn(
              "font-display text-base font-extrabold tabular-nums leading-none",
              chrome.gamePercentClass,
            )}
          >
            {currentSummary.percentComplete}%
          </span>
        </div>
        {roundDelta ? (
          <p className={cn("min-w-0 truncate text-right text-xs leading-tight", chrome.gameLabelClass)}>
            <span className={cn("font-bold", chrome.gamePercentClass)}>{roundDelta}</span> this round
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
          className={cn("h-full rounded-full transition-all duration-300", chrome.gameBarClass)}
          style={{ width: `${currentSummary.percentComplete}%` }}
        />
      </div>
    </div>
  );
}
