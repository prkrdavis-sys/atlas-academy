"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProfiles } from "@/components/ProfileProvider";
import { getStoredScope } from "@/lib/scope";
import { getGlobalStreakOrZero } from "@/lib/stats-helpers";
import { getStreakTier } from "@/lib/streak-tier";
import type { GameScope } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Compact streak indicator for the app header, following the familiar
 * top-bar streak chip pattern from habit/learning games. Links to stats.
 */
export function HeaderStreakChip() {
  const { activeProfile, hydrated } = useProfiles();
  const [scope, setScope] = useState<GameScope | null>(null);

  useEffect(() => {
    // Hydrate after mount so server-rendered markup never mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScope(getStoredScope());
  }, []);

  if (!hydrated || !activeProfile || !scope) return null;

  const difficulty = activeProfile.settings.difficulty;
  const { currentStreak } = getGlobalStreakOrZero(activeProfile, difficulty, scope);
  const tier = getStreakTier(currentStreak);
  const lit = currentStreak > 0;

  return (
    <Link
      href="/stats"
      aria-label={`Current streak: ${currentStreak}. View stats.`}
      className={cn(
        "flex min-h-9 items-center gap-1 rounded-full px-2.5 py-1 font-display text-sm font-extrabold tabular-nums transition-colors",
        lit
          ? "text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/40"
          : "text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800",
      )}
    >
      <span aria-hidden className={cn("text-base leading-none", !lit && "grayscale opacity-70")}>
        {lit ? tier.emoji : "🔥"}
      </span>
      {currentStreak}
    </Link>
  );
}
