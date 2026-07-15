"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PlayModeLink } from "@/components/PlayModeLink";
import { ProfileRequiredDialog } from "@/components/ProfileRequiredDialog";
import { ScopeSelector } from "@/components/ScopeSelector";
import { EXTRA_QUIZ_MODES, GAME_MODES } from "@/lib/types";
import { getStoredScope, normalizeScope, SCOPE_INFO, scopeText, setStoredScope } from "@/lib/scope";
import { useGameScope } from "@/lib/use-game-scope";
import { cn } from "@/lib/utils";

const TILE_STYLES: Record<
  string,
  { tile: string; iconBg: string; hover: string }
> = {
  "weak-spots": {
    tile: "border-rose-200 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/50",
    iconBg: "bg-rose-100 dark:bg-rose-900/60",
    hover: "hover:border-rose-400 dark:hover:border-rose-600",
  },
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
};

const TILE_CLASS =
  "group flex min-h-[5.25rem] items-center gap-3 rounded-2xl border-2 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:p-5";
const ICON_CLASS =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition-transform group-hover:scale-110 sm:h-14 sm:w-14 sm:text-3xl";

const LIBRARY_FEATURES = [
  { icon: "🏳️", label: "Flags" },
  { icon: "🗺️", label: "Shapes" },
  { icon: "🏛️", label: "Capitals" },
  { icon: "👥", label: "Population" },
  { icon: "🔗", label: "Neighbors" },
  { icon: "💡", label: "Facts" },
] as const;

export function ExtrasPageContent() {
  const searchParams = useSearchParams();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const showRequiredProfileDialog = useCallback(() => setShowProfileDialog(true), []);
  const hideRequiredProfileDialog = useCallback(() => setShowProfileDialog(false), []);

  const { scope, setScope, selectScope } = useGameScope();
  useEffect(() => {
    const fromUrl = searchParams.get("scope");
    const next = fromUrl !== null ? normalizeScope(fromUrl) : getStoredScope();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScope(next);
    setStoredScope(next);
  }, [searchParams, setScope]);
  const scopeInfo = SCOPE_INFO[scope];

  return (
    <div className="space-y-5 sm:space-y-6">
      <ProfileRequiredDialog open={showProfileDialog} onClose={hideRequiredProfileDialog} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            ✨ Extras
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Bonus quiz modes and the Library
          </p>
        </div>
        <ScopeSelector scope={scope} onSelect={selectScope} />
      </header>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100 sm:mb-4">
          More ways to play
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {EXTRA_QUIZ_MODES.map((id) => {
            const mode = GAME_MODES.find((m) => m.id === id);
            if (!mode) return null;
            const style = TILE_STYLES[mode.id];
            return (
              <PlayModeLink
                key={mode.id}
                mode={mode.id}
                scope={scope}
                onProfileRequired={showRequiredProfileDialog}
                className={cn(TILE_CLASS, style?.tile, style?.hover)}
              >
                <span className={cn(ICON_CLASS, style?.iconBg)}>{mode.icon}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-extrabold text-slate-900 dark:text-slate-100">
                    {scopeText(mode.title, scope)}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-600 dark:text-slate-400 sm:truncate sm:text-sm">
                    {scopeText(mode.description, scope)}
                  </p>
                </div>
              </PlayModeLink>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100 sm:mb-4">
          Reference
        </h2>
        <Link
          href="/library"
          className="group relative block min-h-[10.5rem] overflow-hidden rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/90 via-white to-teal-50/70 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md dark:border-violet-800 dark:from-violet-950/50 dark:via-slate-900 dark:to-teal-950/40 dark:hover:border-violet-500 sm:min-h-[11.5rem] sm:p-6"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-3 -right-2 text-[5.5rem] opacity-[0.07] transition-transform duration-300 group-hover:scale-105 group-hover:opacity-[0.1] sm:text-[7rem]"
          >
            📚
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.12),transparent_55%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_55%)]"
          />

          <div className="relative flex h-full flex-col justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-3xl shadow-sm transition-transform group-hover:scale-110 dark:bg-violet-900/60 sm:h-16 sm:w-16">
                📚
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="font-display text-xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-2xl">
                  Library
                </h3>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Browse countries and states — flags, shapes, capitals, populations, neighbors, and facts.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {LIBRARY_FEATURES.map((feature) => (
                  <span
                    key={feature.label}
                    className="inline-flex items-center gap-1 rounded-full border border-violet-200/80 bg-white/80 px-2.5 py-1 text-xs font-semibold text-violet-800 dark:border-violet-700/60 dark:bg-violet-950/40 dark:text-violet-200"
                  >
                    <span aria-hidden>{feature.icon}</span>
                    {feature.label}
                  </span>
                ))}
              </div>
              <span className="shrink-0 font-display text-sm font-extrabold text-violet-700 transition-transform group-hover:translate-x-0.5 dark:text-violet-300">
                Browse →
              </span>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
