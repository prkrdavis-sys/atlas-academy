"use client";

import Link from "next/link";
import { subtleBackLinkClass } from "@/lib/utils";
import { GameModeTile } from "@/components/GameModeTile";
import { useGameScope } from "@/lib/use-game-scope";
import { CORE_QUESTION_TYPES, EXTRA_QUIZ_MODES, PRACTICE_MODES } from "@/lib/types";

const MORE_MODES = [...PRACTICE_MODES, ...EXTRA_QUIZ_MODES];

export function GameSetupPageContent() {
  const { scope } = useGameScope();

  return (
    <div className="space-y-6 sm:space-y-7">
      <header>
        <Link href="/" className={subtleBackLinkClass}>
          ← Back home
        </Link>
        <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Choose a mode
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          Which way do you like to play?
        </p>
      </header>

      <GameModeTile mode="mixed" scope={scope} variant="featured" />

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Focus on one skill
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CORE_QUESTION_TYPES.map((id) => (
            <GameModeTile key={id} mode={id} scope={scope} variant="card" />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          More ways to play
        </h2>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white py-1 dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
          {MORE_MODES.map((id) => (
            <GameModeTile key={id} mode={id} scope={scope} variant="row" className="rounded-none" />
          ))}
        </div>
      </section>
    </div>
  );
}
