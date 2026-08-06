"use client";

import Link from "next/link";
import { subtleBackLinkClass } from "@/lib/utils";
import { GameModeFamilySection } from "@/components/GameModeFamilySection";
import { GameModeTile } from "@/components/GameModeTile";
import { ScopeSelector } from "@/components/ScopeSelector";
import { useGameScope } from "@/lib/use-game-scope";
import { FEATURED_SETUP_MODE, MODE_FAMILIES } from "@/lib/types";

export function GameSetupPageContent() {
  const { scope, selectScope } = useGameScope();

  return (
    <div className="space-y-4 sm:space-y-5">
      <header>
        <Link href="/" className={subtleBackLinkClass}>
          ← Back home
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Choose a mode
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
              Which way do you like to play?
            </p>
          </div>
          <ScopeSelector scope={scope} onSelect={selectScope} />
        </div>
      </header>

      <GameModeTile mode={FEATURED_SETUP_MODE} scope={scope} variant="featured" />

      {MODE_FAMILIES.map((family) => (
        <GameModeFamilySection
          key={family.id}
          title={family.title}
          blurb={family.blurb}
          icon={family.icon}
          primary={family.primary}
          twists={family.twists}
          scope={scope}
        />
      ))}
    </div>
  );
}
