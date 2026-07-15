"use client";

import { getPlacesForScope } from "@/lib/countries";
import { SCOPE_INFO } from "@/lib/scope";
import { GAME_SCOPES, type GameScope } from "@/lib/types";
import { cn } from "@/lib/utils";

type ScopeSelectorProps = {
  scope: GameScope;
  onSelect: (scope: GameScope) => void;
};

const SCOPE_DESCRIPTIONS: Record<GameScope, string> = {
  world: "Every country and territory — flags, capitals, shapes, and more.",
  usa: "All 50 states — flags, capitals, shapes, and regional quizzes.",
};

export function ScopeSelector({ scope, onSelect }: ScopeSelectorProps) {
  const activeInfo = SCOPE_INFO[scope];
  const placeCount = getPlacesForScope(scope).length;

  return (
    <section
      aria-labelledby="scope-selector-heading"
      className="rounded-[1.75rem] border-2 border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 sm:p-6"
    >
      <h2
        id="scope-selector-heading"
        className="mb-4 text-center font-display text-xl font-extrabold text-slate-800 dark:text-slate-100 sm:mb-5 sm:text-2xl"
      >
        Where do you want to play?
      </h2>

      <div
        className="relative rounded-[1.5rem] bg-slate-200/80 p-1.5 dark:bg-slate-800"
        role="group"
        aria-label="Choose where to play"
      >
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-1.5 top-1.5 w-[calc(50%-0.375rem)] rounded-[1.25rem] bg-white shadow-[0_4px_14px_rgb(15_23_42_/_0.12)] transition-[left] duration-300 ease-out dark:bg-slate-900 dark:shadow-[0_4px_14px_rgb(0_0_0_/_0.35)]",
            scope === "usa" ? "left-[calc(50%+0.375rem)]" : "left-1.5",
          )}
        />

        <div className="relative grid grid-cols-2">
          {GAME_SCOPES.map((option) => {
            const info = SCOPE_INFO[option];
            const active = scope === option;

            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(option)}
                className={cn(
                  "flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-[1.25rem] px-3 py-4 transition-colors sm:min-h-[5.75rem] sm:flex-row sm:gap-3 sm:px-5",
                  active
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                <span className="text-4xl leading-none sm:text-5xl">{info.icon}</span>
                <span className="font-display text-base font-extrabold leading-tight sm:text-xl">
                  {info.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p
        className="mt-4 text-center text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base"
        aria-live="polite"
      >
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {activeInfo.icon} {activeInfo.label}
        </span>
        {" · "}
        {placeCount} {activeInfo.nounPlural}
        <br className="sm:hidden" />
        <span className="hidden sm:inline"> — </span>
        {SCOPE_DESCRIPTIONS[scope]}
      </p>
    </section>
  );
}
