"use client";

import { SCOPE_INFO } from "@/lib/scope";
import { GAME_SCOPES, type GameScope } from "@/lib/types";
import { cn } from "@/lib/utils";

type ScopeSelectorProps = {
  scope: GameScope;
  onSelect: (scope: GameScope) => void;
};

export function ScopeSelector({ scope, onSelect }: ScopeSelectorProps) {
  return (
    <div
      className="inline-flex shrink-0 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800"
      role="group"
      aria-label="Choose where to play"
    >
      {GAME_SCOPES.map((option) => {
        const active = scope === option;

        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onMouseDown={(event) => {
              // Prevent mobile browsers from scrolling the toggle into view on tap.
              event.preventDefault();
            }}
            onClick={() => onSelect(option)}
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
