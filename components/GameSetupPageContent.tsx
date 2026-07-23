"use client";

import Link from "next/link";
import { subtleBackLinkClass } from "@/lib/utils";
import { GameModeGroup, type GameModeGroupHeaderStyle } from "@/components/GameModeGroup";
import { GameModeTile } from "@/components/GameModeTile";
import { ScopeSelector } from "@/components/ScopeSelector";
import { useGameScope } from "@/lib/use-game-scope";
import { EXTRA_QUIZ_MODES, PLAY_MODES, PRACTICE_MODES } from "@/lib/types";

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

const CORE_GROUP_STYLE: GameModeGroupHeaderStyle = {
  container: "border-teal-200 bg-teal-50/60 dark:border-teal-800 dark:bg-teal-950/40",
  summary: "hover:bg-teal-100/80 dark:hover:bg-teal-900/50",
  title: "text-teal-950 dark:text-teal-50",
  subtitle: "text-teal-700/90 dark:text-teal-300/90",
  badge: "bg-teal-200/80 text-teal-900 dark:bg-teal-800/80 dark:text-teal-100",
  chevron: "bg-teal-200/70 text-teal-800 dark:bg-teal-800/70 dark:text-teal-100",
};

const PRACTICE_GROUP_STYLE: GameModeGroupHeaderStyle = {
  container: "border-rose-200 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-950/40",
  summary: "hover:bg-rose-100/80 dark:hover:bg-rose-900/50",
  title: "text-rose-950 dark:text-rose-50",
  subtitle: "text-rose-700/90 dark:text-rose-300/90",
  badge: "bg-rose-200/80 text-rose-900 dark:bg-rose-800/80 dark:text-rose-100",
  chevron: "bg-rose-200/70 text-rose-800 dark:bg-rose-800/70 dark:text-rose-100",
};

const BONUS_GROUP_STYLE: GameModeGroupHeaderStyle = {
  container: "border-violet-200 bg-violet-50/60 dark:border-violet-800 dark:bg-violet-950/40",
  summary: "hover:bg-violet-100/80 dark:hover:bg-violet-900/50",
  title: "text-violet-950 dark:text-violet-50",
  subtitle: "text-violet-700/90 dark:text-violet-300/90",
  badge: "bg-violet-200/80 text-violet-900 dark:bg-violet-800/80 dark:text-violet-100",
  chevron: "bg-violet-200/70 text-violet-800 dark:bg-violet-800/70 dark:text-violet-100",
};

export function GameSetupPageContent() {
  const { scope, selectScope } = useGameScope();

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/"
            className={subtleBackLinkClass}
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

      <GameModeGroup
        title="Core Play"
        subtitle="Flags, shapes, capitals, and mixed rounds"
        defaultOpen
        badge={PLAY_MODES.length === 1 ? "1 mode" : `${PLAY_MODES.length} modes`}
        headerStyle={CORE_GROUP_STYLE}
      >
        <div className="grid gap-2 pt-1 sm:grid-cols-2 sm:gap-3">
          {PLAY_MODES.map((id) => (
            <GameModeTile
              key={id}
              mode={id}
              scope={scope}
              compact
              style={CORE_MODE_STYLES[id]}
              className={id === "mixed" ? "sm:col-span-2" : undefined}
            />
          ))}
        </div>
      </GameModeGroup>

      <GameModeGroup
        title="Practice"
        subtitle="Target what you miss most"
        badge={PRACTICE_MODES.length === 1 ? "1 mode" : `${PRACTICE_MODES.length} modes`}
        headerStyle={PRACTICE_GROUP_STYLE}
      >
        <div className="grid gap-2 pt-1 sm:grid-cols-2 sm:gap-3">
          {PRACTICE_MODES.map((id) => (
            <GameModeTile key={id} mode={id} scope={scope} compact style={PRACTICE_MODE_STYLES[id]} />
          ))}
        </div>
      </GameModeGroup>

      <GameModeGroup
        title="Bonus Modes"
        subtitle="Extra quizzes and fun challenges"
        badge={EXTRA_QUIZ_MODES.length === 1 ? "1 mode" : `${EXTRA_QUIZ_MODES.length} modes`}
        headerStyle={BONUS_GROUP_STYLE}
      >
        <div className="grid gap-2 pt-1 sm:grid-cols-2 sm:gap-3">
          {EXTRA_QUIZ_MODES.map((id) => (
            <GameModeTile key={id} mode={id} scope={scope} compact style={BONUS_MODE_STYLES[id]} />
          ))}
        </div>
      </GameModeGroup>
    </div>
  );
}
