"use client";

import type { GlobeUsMode } from "@/lib/globe-texture";
import { useGlobeUsMode } from "@/lib/use-globe-us-mode";
import { cn } from "@/lib/utils";

const OPTIONS: { mode: GlobeUsMode; label: string }[] = [
  { mode: "states", label: "50 states" },
  { mode: "country", label: "One country" },
];

/**
 * Main-menu toggle for how the 3D globes render the USA: broken into 50
 * individually tracked states, or as a single country.
 */
export function GlobeUsModeToggle() {
  const { usMode, setUsMode } = useGlobeUsMode();

  return (
    <div className="flex min-h-11 items-center justify-between gap-2 px-2.5 py-2" suppressHydrationWarning>
      <p className="shrink-0 text-sm font-medium text-slate-700 dark:text-slate-200">
        USA on globe
      </p>
      <div
        className="grid h-8 min-w-0 flex-1 grid-cols-2 gap-0.5 rounded-full bg-slate-100 p-0.5 dark:bg-slate-800"
        role="group"
        aria-label="USA rendering on the globe"
      >
        {OPTIONS.map(({ mode, label }) => {
          const selected = usMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setUsMode(mode)}
              aria-pressed={selected}
              className={cn(
                "truncate rounded-full px-1.5 text-xs font-medium transition-colors",
                selected
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
