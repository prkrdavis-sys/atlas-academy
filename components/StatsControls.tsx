"use client";

import { cn } from "@/lib/utils";
import { DIFFICULTIES, DIFFICULTY_LABELS, GAME_SCOPES, type Difficulty, type GameScope } from "@/lib/types";
import { SCOPE_INFO } from "@/lib/scope";

export function StatsDifficultySelector({
  value,
  onChange,
  className,
}: {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("grid grid-cols-3 gap-2", className)}
      role="group"
      aria-label="Difficulty"
    >
      {DIFFICULTIES.map((level) => {
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(level)}
            className={cn(
              "min-h-10 rounded-xl border-2 px-3 py-2 text-sm font-semibold capitalize transition-all duration-100",
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

export function StatsScopeToggle({
  value,
  onChange,
  className,
}: {
  value: GameScope;
  onChange: (scope: GameScope) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800", className)}
      role="group"
      aria-label="Choose where to view stats"
    >
      {GAME_SCOPES.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={cn(
              "min-h-9 rounded-xl px-3 py-1.5 font-display text-sm font-extrabold transition-all",
              active
                ? "bg-white text-teal-800 shadow-sm dark:bg-slate-900 dark:text-teal-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            )}
          >
            {SCOPE_INFO[option].icon} {SCOPE_INFO[option].shortLabel}
          </button>
        );
      })}
    </div>
  );
}
