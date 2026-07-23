"use client";

import Link from "next/link";
import { getCountryName } from "@/lib/countries";
import { buildLibraryDetailHref } from "@/lib/library";
import {
  getPlaceCategoryCompletion,
  getPlaceMasteryLevel,
  MAP_PROGRESS_CATEGORY_INFO,
} from "@/lib/map-progress";
import { getProgressBorder, getProgressFillColor } from "@/lib/map-colors";
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
        "inline-flex shrink-0 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800",
        className,
      )}
      role="group"
      aria-label="Map progress difficulty"
    >
      {MAP_PROGRESS_DIFFICULTIES.map((level) => {
        const selected = value === level;
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
                ? "bg-white text-teal-800 shadow-sm dark:bg-slate-900 dark:text-teal-300"
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

export function MapProgressFillLegend({ isDark }: { isDark: boolean }) {
  const border = getProgressBorder(isDark);

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
      <span className="font-semibold text-slate-700 dark:text-slate-300">Fill levels:</span>
      {MAP_PROGRESS_FILL_LEVELS.map((level) => {
        const fill = getProgressFillColor(level, isDark);

        return (
          <span key={level} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="shrink-0 rounded-[3px]"
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                minWidth: 16,
                minHeight: 16,
                backgroundColor: fill,
                border: `1px solid ${border.stroke}`,
                boxShadow: isDark ? "inset 0 0 0 1px rgb(255 255 255 / 0.08)" : undefined,
              }}
            />
            {level}/4
          </span>
        );
      })}
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
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold leading-tight",
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
}: {
  code: string;
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  scope: GameScope;
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
    <div className="absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)] rounded-xl border border-slate-200/80 bg-white/95 p-2.5 shadow-lg backdrop-blur sm:max-w-xs dark:border-slate-600 dark:bg-slate-900/95">
      <p className="font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
        {getCountryName(code)}
      </p>
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
        className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 transition-colors hover:border-teal-400 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:border-teal-500 dark:hover:bg-teal-950"
      >
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
