"use client";

import { useShowMapProgress } from "@/lib/use-show-map-progress";
import { cn } from "@/lib/utils";

/**
 * Main-menu toggle for painting mastery progress on the globe and 2D maps.
 * Off keeps the natural land texture only. Styled like ThemeToggle's menu variant.
 */
export function ShowMapProgressToggle() {
  const { enabled, setEnabled, ready } = useShowMapProgress();

  return (
    <div className="px-3 py-2" suppressHydrationWarning>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Map progress
      </p>
      <div
        className="grid h-11 grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
        role="group"
        aria-label="Show map progress"
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
          <span aria-hidden>🗺️</span>
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
          <span aria-hidden>🌍</span>
          Off
        </button>
      </div>
    </div>
  );
}
