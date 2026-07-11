"use client";

import { cn } from "@/lib/utils";

export function StreakCounter({ streak, compact = false }: { streak: number; compact?: boolean }) {
  const milestone = streak >= 50 || streak >= 25 || streak >= 10 || streak >= 5;
  const label =
    streak >= 50 ? "Legendary!" : streak >= 25 ? "Unstoppable!" : streak >= 10 ? "Heating up!" : streak >= 5 ? "On a roll!" : "Streak";

  return (
    <div
      className={cn(
        "border-2 text-center shadow-sm transition-transform",
        compact ? "rounded-xl px-2 py-1 sm:rounded-2xl sm:px-3 sm:py-1.5" : "rounded-2xl px-4 py-3",
        milestone
          ? "scale-105 border-amber-300 bg-gradient-to-b from-amber-50 to-orange-100"
          : "border-slate-200 bg-white/90",
      )}
    >
      <p
        className={cn(
          "font-semibold uppercase tracking-wide",
          milestone ? "text-orange-600" : "text-slate-500",
          compact ? "game-stat-label text-[9px] sm:text-[10px]" : "text-xs",
        )}
      >
        {milestone ? "🔥 " : ""}
        {label}
      </p>
      <p className={cn("font-display font-extrabold text-slate-900", compact ? "text-base leading-none sm:text-lg" : "text-3xl")}>
        {streak}
      </p>
    </div>
  );
}
