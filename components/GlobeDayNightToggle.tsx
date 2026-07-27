"use client";

import { useGlobeDayNight } from "@/lib/use-globe-day-night";
import { cn } from "@/lib/utils";

/**
 * Main-menu toggle for real-time day/night sunlight on the 3D globes.
 * Styled like ThemeToggle's menu variant.
 */
export function GlobeDayNightToggle() {
  const { enabled, setEnabled, ready } = useGlobeDayNight();

  return (
    <div className="px-3 py-2" suppressHydrationWarning>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Globe day / night
      </p>
      <div
        className="grid h-11 grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
        role="group"
        aria-label="Globe day and night lighting"
      >
        <button
          type="button"
          onClick={() => setEnabled(true)}
          aria-pressed={ready && enabled}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
            ready && enabled
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          <span aria-hidden>🌓</span>
          On
        </button>
        <button
          type="button"
          onClick={() => setEnabled(false)}
          aria-pressed={ready && !enabled}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
            ready && !enabled
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          <span aria-hidden>☀️</span>
          Off
        </button>
      </div>
    </div>
  );
}
