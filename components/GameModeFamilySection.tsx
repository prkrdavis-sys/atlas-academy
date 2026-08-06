"use client";

import { GameModeTile } from "@/components/GameModeTile";
import { scopeText } from "@/lib/scope";
import type { GameMode, GameScope } from "@/lib/types";

type GameModeFamilySectionProps = {
  title: string;
  blurb: string;
  icon: string;
  primary: GameMode[];
  /** Variants of the primary modes, kept collapsed so the page stays scannable. */
  twists: GameMode[];
  scope: GameScope;
};

export function GameModeFamilySection({
  title,
  blurb,
  icon,
  primary,
  twists,
  scope,
}: GameModeFamilySectionProps) {
  const modeCount = primary.length + twists.length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/60 sm:p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl dark:bg-slate-800"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-slate-100 sm:text-lg">
              {title}
            </h2>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              {modeCount} {modeCount === 1 ? "mode" : "modes"}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">
            {scopeText(blurb, scope)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {primary.map((mode) => (
          <GameModeTile key={mode} mode={mode} scope={scope} variant="card" />
        ))}
      </div>

      {twists.length > 0 ? (
        <details className="group mt-2">
          <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-xl px-1 text-xs font-bold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden
              className="pointer-events-none text-[0.65rem] transition-transform duration-200 group-open:rotate-90"
            >
              ▶
            </span>
            <span className="group-open:hidden">
              Show {twists.length} harder {twists.length === 1 ? "twist" : "twists"}
            </span>
            <span className="hidden group-open:inline">Hide twists</span>
          </summary>
          <div className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
            {twists.map((mode) => (
              <GameModeTile
                key={mode}
                mode={mode}
                scope={scope}
                variant="row"
                badge="Twist"
                className="rounded-none"
              />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
