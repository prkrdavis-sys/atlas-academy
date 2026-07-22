"use client";

import { getScopedModeInfo, scopeText } from "@/lib/scope";
import type { GameMode, GameScope } from "@/lib/types";
import { cn } from "@/lib/utils";

type RecentModeShortcutsProps = {
  modes: GameMode[];
  activeMode: GameMode;
  scope: GameScope;
  onSelect: (mode: GameMode) => void;
  className?: string;
};

export function RecentModeShortcuts({
  modes,
  activeMode,
  scope,
  onSelect,
  className,
}: RecentModeShortcutsProps) {
  if (modes.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wider text-emerald-50/90">
        Quick swap
      </h2>
      <div className="flex flex-wrap gap-2">
        {modes.map((mode) => {
          const modeInfo = getScopedModeInfo(mode, scope);
          if (!modeInfo) return null;
          const active = mode === activeMode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => onSelect(mode)}
              aria-pressed={active}
              className={cn(
                "inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 px-3 py-2 text-sm font-bold transition-all",
                active
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-500",
              )}
            >
              <span aria-hidden>{modeInfo.icon}</span>
              <span className="truncate">{scopeText(modeInfo.title, scope)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
