"use client";

import Link from "next/link";
import { useProfiles } from "@/components/ProfileProvider";
import { getCommonlyMissedCountries } from "@/lib/stats-helpers";
import { useGameScope } from "@/lib/use-game-scope";

const LIBRARY_FEATURES = [
  { icon: "🏳️", label: "Flags" },
  { icon: "🗺️", label: "Shapes" },
  { icon: "🏛️", label: "Capitals" },
  { icon: "👥", label: "Population" },
  { icon: "🔗", label: "Neighbors" },
  { icon: "💡", label: "Facts" },
] as const;

const MAP_FEATURES = [
  { icon: "🌐", label: "All countries" },
  { icon: "🔍", label: "Pan & zoom" },
  { icon: "👆", label: "Click to explore" },
  { icon: "📚", label: "Library links" },
] as const;

export function ExtrasPageContent() {
  const { activeProfile, hydrated } = useProfiles();
  const profile = hydrated ? activeProfile : null;
  const { scope } = useGameScope();
  const weakSpotCount = profile ? getCommonlyMissedCountries(profile, scope).length : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          🧭 Explore
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Reference tools, the Library, and the World Map
        </p>
      </header>

      {weakSpotCount > 0 ? (
        <Link
          href="/play/setup/weak-spots"
          className="group flex items-center gap-4 rounded-2xl border-2 border-rose-200 bg-rose-50/80 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-400 hover:shadow-md dark:border-rose-800 dark:bg-rose-950/50 dark:hover:border-rose-600"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-2xl dark:bg-rose-900/60">
            🎯
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-extrabold text-slate-900 dark:text-slate-100">
              Practice {weakSpotCount} commonly missed {weakSpotCount === 1 ? "place" : "places"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              Open game setup with Weak Spots selected
            </p>
          </div>
          <span className="shrink-0 font-display text-sm font-extrabold text-rose-700 dark:text-rose-300">
            Setup →
          </span>
        </Link>
      ) : null}

      <Link
        href="/play/setup"
        className="group flex items-center gap-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md dark:border-emerald-800 dark:bg-emerald-950/50 dark:hover:border-emerald-600"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl dark:bg-emerald-900/60">
          ⚙️
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-extrabold text-slate-900 dark:text-slate-100">
            Customize your game
          </h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
            Change mode, difficulty, regions, and more
          </p>
        </div>
        <span className="shrink-0 font-display text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
          Setup →
        </span>
      </Link>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100 sm:mb-4">
          Reference
        </h2>
        <div className="grid gap-3 sm:gap-4">
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

          <Link
            href="/map"
            className="group relative block min-h-[10.5rem] overflow-hidden rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50/90 via-white to-teal-50/70 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md dark:border-sky-800 dark:from-sky-950/50 dark:via-slate-900 dark:to-teal-950/40 dark:hover:border-sky-500 sm:min-h-[11.5rem] sm:p-6"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-3 -right-2 text-[5.5rem] opacity-[0.07] transition-transform duration-300 group-hover:scale-105 group-hover:opacity-[0.1] sm:text-[7rem]"
            >
              🌍
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_55%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_55%)]"
            />

            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-3xl shadow-sm transition-transform group-hover:scale-110 dark:bg-sky-900/60 sm:h-16 sm:w-16">
                  🌍
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h3 className="font-display text-xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-2xl">
                    World Map
                  </h3>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    Explore every country on an interactive world map — pan, zoom, and click to jump into the Library.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {MAP_FEATURES.map((feature) => (
                    <span
                      key={feature.label}
                      className="inline-flex items-center gap-1 rounded-full border border-sky-200/80 bg-white/80 px-2.5 py-1 text-xs font-semibold text-sky-800 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-200"
                    >
                      <span aria-hidden>{feature.icon}</span>
                      {feature.label}
                    </span>
                  ))}
                </div>
                <span className="shrink-0 font-display text-sm font-extrabold text-sky-700 transition-transform group-hover:translate-x-0.5 dark:text-sky-300">
                  Explore →
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
