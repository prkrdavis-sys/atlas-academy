"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  formatMapProgressAreaLabel,
  getMapProgressDelta,
  isFullMapProgressSelection,
  type MapProgressSummary,
} from "@/lib/map-progress";
import { getMapProgressChrome } from "@/lib/map-mastery-fx";
import { SCOPE_INFO } from "@/lib/scope";
import type { GameScope, MapProgressDifficulty, Region } from "@/lib/types";
import { cn } from "@/lib/utils";

type GameMapProgressSummaryProps = {
  scope: GameScope;
  continents: Region[];
  difficulty: MapProgressDifficulty;
  initialSummary: MapProgressSummary;
  currentSummary: MapProgressSummary;
  /** Full World/USA progress — shown in the info popover when playing a subset. */
  initialOverallSummary: MapProgressSummary;
  currentOverallSummary: MapProgressSummary;
};

function formatRoundDeltaParts(
  scope: GameScope,
  delta: ReturnType<typeof getMapProgressDelta>,
): string[] {
  const parts: string[] = [];
  const scopeInfo = SCOPE_INFO[scope];

  if (delta.completedCategories > 0) {
    parts.push(
      `+${delta.completedCategories} categor${delta.completedCategories === 1 ? "y" : "ies"}`,
    );
  }
  if (delta.masteredPlaces > 0) {
    parts.push(
      `+${delta.masteredPlaces} ${
        delta.masteredPlaces === 1 ? scopeInfo.noun : scopeInfo.nounPlural
      } mastered`,
    );
  }

  return parts;
}

function ProgressBarFill({
  initialSummary,
  currentSummary,
  baseClassName,
  gainClassName,
  ariaLabel,
}: {
  initialSummary: MapProgressSummary;
  currentSummary: MapProgressSummary;
  baseClassName: string;
  gainClassName: string;
  ariaLabel: string;
}) {
  const delta = getMapProgressDelta(initialSummary, currentSummary);
  const totalCategories = currentSummary.totalCategories;
  const basePercent =
    totalCategories > 0 ? (initialSummary.completedCategories / totalCategories) * 100 : 0;
  const gainPercent =
    totalCategories > 0
      ? (Math.max(0, delta.completedCategories) / totalCategories) * 100
      : 0;

  return (
    <div
      className="flex h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80"
      role="progressbar"
      aria-valuenow={currentSummary.percentComplete}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      {basePercent > 0 ? (
        <div
          className={cn(
            "h-full shrink-0 transition-all duration-300",
            gainPercent > 0 ? "rounded-l-full" : "rounded-full",
            baseClassName,
          )}
          style={{ width: `${basePercent}%` }}
        />
      ) : null}
      {gainPercent > 0 ? (
        <div
          className={cn(
            "h-full shrink-0 transition-all duration-300",
            basePercent > 0 ? "rounded-r-full" : "rounded-full",
            gainClassName,
          )}
          style={{ width: `${gainPercent}%` }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function GameMapProgressSummary({
  scope,
  continents,
  difficulty,
  initialSummary,
  currentSummary,
  initialOverallSummary,
  currentOverallSummary,
}: GameMapProgressSummaryProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const infoId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const delta = getMapProgressDelta(initialSummary, currentSummary);
  const roundDeltaParts = formatRoundDeltaParts(scope, delta);
  const chrome = getMapProgressChrome(difficulty);
  const areaLabel = formatMapProgressAreaLabel(scope, continents);
  const showOverallInfo = !isFullMapProgressSelection(scope, continents);
  const overallLabel = SCOPE_INFO[scope].shortLabel;

  useEffect(() => {
    if (!infoOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setInfoOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setInfoOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [infoOpen]);

  return (
    <div className={cn("relative", chrome.gamePanelClass)} aria-label="Map progress this round">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-xs font-bold leading-tight", chrome.gameLabelClass)}>
            Map progress
          </p>
          <p className={cn("mt-0.5 text-[11px] leading-tight opacity-80", chrome.gameLabelClass)}>
            of {areaLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <span
            className={cn(
              "font-display text-lg font-extrabold tabular-nums leading-none",
              chrome.gamePercentClass,
            )}
          >
            {currentSummary.percentComplete}%
          </span>
          {showOverallInfo ? (
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setInfoOpen((open) => !open)}
              aria-expanded={infoOpen}
              aria-controls={infoId}
              aria-label={`${overallLabel} map progress`}
              className={cn(
                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                difficulty === "hard"
                  ? "border-fuchsia-300/80 text-fuchsia-700 hover:bg-fuchsia-100/80 dark:border-fuchsia-700 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/60"
                  : "border-teal-300/80 text-teal-700 hover:bg-teal-100/80 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-950/60",
              )}
            >
              <InfoIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5">
        {roundDeltaParts.length > 0 ? (
          <div className="space-y-0.5">
            {roundDeltaParts.map((part) => (
              <p
                key={part}
                className={cn(
                  "text-xs font-bold leading-snug",
                  chrome.gamePercentClass,
                )}
              >
                {part}
              </p>
            ))}
            <p className={cn("text-[11px] leading-tight opacity-70", chrome.gameLabelClass)}>
              this round
            </p>
          </div>
        ) : (
          <p className={cn("text-xs leading-snug opacity-70", chrome.gameLabelClass)}>
            No new progress
          </p>
        )}
      </div>

      <div className="mt-2.5">
        <ProgressBarFill
          initialSummary={initialSummary}
          currentSummary={currentSummary}
          baseClassName={chrome.gameBarBaseClass}
          gainClassName={chrome.gameBarGainClass}
          ariaLabel={`${areaLabel} map progress`}
        />
      </div>

      {showOverallInfo && infoOpen ? (
        <div
          ref={panelRef}
          id={infoId}
          role="dialog"
          aria-label={`${overallLabel} map progress`}
          className={cn(
            "absolute left-1/2 top-full z-20 mt-2 w-[min(100%,16rem)] -translate-x-1/2 rounded-xl border px-3 py-2.5 shadow-lg",
            difficulty === "hard"
              ? "border-fuchsia-200 bg-white dark:border-fuchsia-800 dark:bg-slate-900"
              : "border-teal-200 bg-white dark:border-teal-800 dark:bg-slate-900",
          )}
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn("text-[11px] font-bold", chrome.gameLabelClass)}>
              {overallLabel} total
            </p>
            <p
              className={cn(
                "font-display text-sm font-extrabold tabular-nums leading-none",
                chrome.gamePercentClass,
              )}
            >
              {currentOverallSummary.percentComplete}%
            </p>
          </div>
          <div className="mt-1.5">
            <ProgressBarFill
              initialSummary={initialOverallSummary}
              currentSummary={currentOverallSummary}
              baseClassName={chrome.gameBarBaseClass}
              gainClassName={chrome.gameBarGainClass}
              ariaLabel={`${overallLabel} map progress`}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
