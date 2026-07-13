"use client";

import { getStreakTier } from "@/lib/streak-tier";
import { cn } from "@/lib/utils";

export function StreakCounter({ streak, compact = false }: { streak: number; compact?: boolean }) {
  const tier = getStreakTier(streak);
  const heated = tier.level > 0;

  return (
    <div
      className={cn(
        "shrink-0 border-2 text-center transition-[border-color,box-shadow,background] duration-300",
        compact ? "rounded-xl px-1.5 py-1 sm:rounded-2xl sm:px-3 sm:py-1.5" : "rounded-2xl px-4 py-3",
        tier.gamePanelClass,
      )}
    >
      <p
        className={cn(
          "font-semibold uppercase tracking-wide",
          tier.gameLabelClass,
          compact ? "game-stat-label text-[9px] sm:text-[10px]" : "text-xs",
        )}
      >
        {heated ? `${tier.emoji} ` : ""}
        {tier.label}
      </p>
      <p className={cn("font-display font-extrabold text-slate-900 dark:text-slate-100", compact ? "text-base leading-none sm:text-lg" : "text-3xl")}>
        {streak}
      </p>
    </div>
  );
}
