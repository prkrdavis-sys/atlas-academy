"use client";

import Link from "next/link";
import { GameModeTile } from "@/components/GameModeTile";
import { ScopeSelector } from "@/components/ScopeSelector";
import { useGameScope } from "@/lib/use-game-scope";
import { CHALLENGE_MODES, EXTRA_QUIZ_MODES, PLAY_MODES, PRACTICE_MODES } from "@/lib/types";

const CORE_MODE_STYLES: Record<string, { tile: string; iconBg: string; hover: string }> = {
  "flag-to-country": {
    tile: "border-sky-200 bg-sky-50/80 dark:border-sky-800 dark:bg-sky-950/50",
    iconBg: "bg-sky-100 dark:bg-sky-900/60",
    hover: "hover:border-sky-400 dark:hover:border-sky-600",
  },
  "shape-to-country": {
    tile: "border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/50",
    iconBg: "bg-amber-100 dark:bg-amber-900/60",
    hover: "hover:border-amber-400 dark:hover:border-amber-600",
  },
  "capital-to-country": {
    tile: "border-violet-200 bg-violet-50/80 dark:border-violet-800 dark:bg-violet-950/50",
    iconBg: "bg-violet-100 dark:bg-violet-900/60",
    hover: "hover:border-violet-400 dark:hover:border-violet-600",
  },
  "country-to-capital": {
    tile: "border-rose-200 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/50",
    iconBg: "bg-rose-100 dark:bg-rose-900/60",
    hover: "hover:border-rose-400 dark:hover:border-rose-600",
  },
  mixed: {
    tile: "border-teal-200 bg-teal-50/80 dark:border-teal-800 dark:bg-teal-950/50",
    iconBg: "bg-teal-100 dark:bg-teal-900/60",
    hover: "hover:border-teal-400 dark:hover:border-teal-600",
  },
};

const PRACTICE_MODE_STYLES: Record<string, { tile: string; iconBg: string; hover: string }> = {
  "weak-spots": {
    tile: "border-rose-200 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/50",
    iconBg: "bg-rose-100 dark:bg-rose-900/60",
    hover: "hover:border-rose-400 dark:hover:border-rose-600",
  },
};

const BONUS_MODE_STYLES: Record<string, { tile: string; iconBg: string; hover: string }> = {
  "country-to-flag": {
    tile: "border-sky-200 bg-sky-50/80 dark:border-sky-800 dark:bg-sky-950/50",
    iconBg: "bg-sky-100 dark:bg-sky-900/60",
    hover: "hover:border-sky-400 dark:hover:border-sky-600",
  },
  "neighbor-quiz": {
    tile: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/50",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/60",
    hover: "hover:border-emerald-400 dark:hover:border-emerald-600",
  },
  "population-showdown": {
    tile: "border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/50",
    iconBg: "bg-amber-100 dark:bg-amber-900/60",
    hover: "hover:border-amber-400 dark:hover:border-amber-600",
  },
  "fact-to-country": {
    tile: "border-violet-200 bg-violet-50/80 dark:border-violet-800 dark:bg-violet-950/50",
    iconBg: "bg-violet-100 dark:bg-violet-900/60",
    hover: "hover:border-violet-400 dark:hover:border-violet-600",
  },
};

export function GameSetupPageContent() {
  const { scope, selectScope } = useGameScope();

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50/50 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100/70 hover:text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/30 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
          >
            ← Back home
          </Link>
          <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Choose a mode
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Pick a game mode to configure its settings.
          </p>
        </div>
        <ScopeSelector scope={scope} onSelect={selectScope} />
      </header>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100 sm:mb-4">
          Core Play
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {PLAY_MODES.map((id) => (
            <GameModeTile
              key={id}
              mode={id}
              scope={scope}
              style={CORE_MODE_STYLES[id]}
              className={id === "mixed" ? "sm:col-span-2" : undefined}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100 sm:mb-4">
          Challenges
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CHALLENGE_MODES.map((id) => (
            <GameModeTile key={id} mode={id} scope={scope} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100 sm:mb-4">
          Practice
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {PRACTICE_MODES.map((id) => (
            <GameModeTile key={id} mode={id} scope={scope} style={PRACTICE_MODE_STYLES[id]} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100 sm:mb-4">
          Bonus Modes
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {EXTRA_QUIZ_MODES.map((id) => (
            <GameModeTile key={id} mode={id} scope={scope} style={BONUS_MODE_STYLES[id]} />
          ))}
        </div>
      </section>
    </div>
  );
}
