"use client";

import Link from "next/link";
import { getCountryName } from "@/lib/countries";
import { buildLibraryDetailHref, LIBRARY_ICON } from "@/lib/library";
import {
  getPlaceCategoryCompletion,
  getPlaceMasteryLevel,
  MAP_PROGRESS_CATEGORY_INFO,
} from "@/lib/map-progress";
import { getProgressBorder, getProgressFillColor } from "@/lib/map-colors";
import {
  getMapProgressChrome,
  getMasteryTextureClass,
} from "@/lib/map-mastery-fx";
import {
  DIFFICULTY_LABELS,
  MAP_PROGRESS_CATEGORIES,
  MAP_PROGRESS_DIFFICULTIES,
  MAP_PROGRESS_FILL_LEVELS,
  type GameScope,
  type MapProgressCategory,
  type MapProgressDifficulty,
  type Profile,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function MapProgressDifficultySelector({
  value,
  onChange,
  className,
}: {
  value: MapProgressDifficulty;
  onChange: (difficulty: MapProgressDifficulty) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex w-fit shrink-0 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800",
        className,
      )}
      role="group"
      aria-label="Map progress difficulty"
    >
      {MAP_PROGRESS_DIFFICULTIES.map((level) => {
        const selected = value === level;
        const chrome = getMapProgressChrome(level);
        return (
          <button
            key={level}
            type="button"
            aria-pressed={selected}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => onChange(level)}
            className={cn(
              "min-h-9 rounded-xl px-3 py-1.5 font-display text-sm font-extrabold transition-all",
              selected
                ? chrome.selectedLabelClass
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            )}
          >
            {DIFFICULTY_LABELS[level]}
          </button>
        );
      })}
    </div>
  );
}

const MAP_LEGEND_LEVELS = [0, ...MAP_PROGRESS_FILL_LEVELS] as const;

export function MapProgressFillLegend({
  isDark,
  difficulty,
  className,
}: {
  isDark: boolean;
  difficulty: MapProgressDifficulty;
  className?: string;
}) {
  const border = getProgressBorder(isDark);

  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      role="img"
      aria-label="Mastery colors from unstarted to complete"
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Mastery
      </span>
      <div
        className="inline-flex overflow-hidden rounded-[5px] shadow-sm"
        style={{ border: `1px solid ${border.stroke}` }}
      >
        {MAP_LEGEND_LEVELS.map((level, index) => {
          const fill = getProgressFillColor(level, isDark, difficulty);
          const isTop = level === 4;

          return (
            <span
              key={level}
              aria-hidden
              className={cn(
                "block h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4",
                isTop && getMasteryTextureClass(difficulty),
                index > 0 && "border-l",
              )}
              style={{
                backgroundColor: isTop ? undefined : fill,
                borderLeftColor: index > 0 ? border.stroke : undefined,
                boxShadow: isDark ? "inset 0 0 0 1px rgb(255 255 255 / 0.06)" : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function PlaceMapCategoryStatus({
  category,
  completed,
}: {
  category: MapProgressCategory;
  completed: boolean;
}) {
  const info = MAP_PROGRESS_CATEGORY_INFO[category];

  return (
    <li
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold leading-tight max-sm:flex max-sm:w-full max-sm:justify-center",
        completed
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
      )}
    >
      <span aria-hidden>{completed ? "✓" : "○"}</span>
      <span aria-hidden>{info.icon}</span>
      {info.label}
    </li>
  );
}

export function PlaceMapProgressPanel({
  code,
  profile,
  difficulty,
  scope,
  variant = "overlay",
  className,
  onDismiss,
}: {
  code: string;
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  scope: GameScope;
  variant?: "overlay" | "inline";
  className?: string;
  onDismiss?: () => void;
}) {
  const completion = profile
    ? getPlaceCategoryCompletion(code, profile, difficulty)
    : {
        flag: false,
        shape: false,
        capital: false,
        trivia: false,
      };
  const level = profile ? getPlaceMasteryLevel(code, profile, difficulty) : 0;
  const libraryHref = buildLibraryDetailHref(code, scope, "All");

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white/95 p-2.5 shadow-lg backdrop-blur dark:border-slate-600 dark:bg-slate-900/95",
        variant === "overlay" &&
          "pointer-events-none absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)] sm:max-w-xs",
        variant === "inline" && "pointer-events-auto w-full min-w-0 shadow-md max-sm:p-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
          {getCountryName(code)}
        </p>
        {onDismiss ? (
          <button
            type="button"
            aria-label="Close place details"
            onClick={onDismiss}
            className="pointer-events-auto -mr-1 -mt-0.5 shrink-0 rounded-lg px-2 py-0.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            ✕
          </button>
        ) : null}
      </div>
      <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
        {level}/4 categories · {DIFFICULTY_LABELS[difficulty]}
      </p>
      <ul className="mt-2 grid grid-cols-2 gap-1.5" aria-label="Completed categories">
        {MAP_PROGRESS_CATEGORIES.map((category) => (
          <PlaceMapCategoryStatus key={category} category={category} completed={completion[category]} />
        ))}
      </ul>
      <Link
        href={libraryHref}
        className="pointer-events-auto mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 transition-colors hover:border-teal-400 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:border-teal-500 dark:hover:bg-teal-950"
      >
        <span aria-hidden>{LIBRARY_ICON}</span>
        Open in Library →
      </Link>
    </div>
  );
}

export function formatPlaceProgressLabel(
  code: string,
  profile: Profile | null,
  difficulty: MapProgressDifficulty,
): string {
  const level = profile ? getPlaceMasteryLevel(code, profile, difficulty) : 0;
  return `${getCountryName(code)} · ${level}/4 categories`;
}
