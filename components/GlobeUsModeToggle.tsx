"use client";

import type { GlobeUsMode } from "@/lib/globe-texture";
import { useGlobeUsMode } from "@/lib/use-globe-us-mode";
import { cn } from "@/lib/utils";

const OPTIONS: { mode: GlobeUsMode; icon: string; label: string }[] = [
  { mode: "states", icon: "🧩", label: "50 states" },
  { mode: "country", icon: "🇺🇸", label: "One country" },
];

/**
 * Main-menu toggle for how the 3D globes render the USA: broken into 50
 * individually tracked states, or as a single country. Styled like
 * ThemeToggle's menu variant.
 */
export function GlobeUsModeToggle() {
  const { usMode, setUsMode } = useGlobeUsMode();

  return (
    <div className="px-3 py-2" suppressHydrationWarning>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        USA on the globe
      </p>
      <div
        className="grid h-11 grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
        role="group"
        aria-label="USA rendering on the globe"
      >
        {OPTIONS.map(({ mode, icon, label }) => {
          const selected = usMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setUsMode(mode)}
              aria-pressed={selected}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
                selected
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              <span aria-hidden>{icon}</span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
