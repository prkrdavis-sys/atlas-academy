"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FlagImage } from "@/components/FlagDisplay";
import { LibraryPlaceVisual } from "@/components/LibraryPlaceVisual";
import { LibrarySearch } from "@/components/LibrarySearch";
import { useProfiles } from "@/components/ProfileProvider";
import { getRegionsForScope } from "@/lib/countries";
import {
  buildLibraryDetailHref,
  buildLibraryListHref,
  getFilteredLibraryPlaces,
  getStoredLibraryFilter,
  getStoredLibrarySort,
  normalizeLibraryFilter,
  normalizeLibrarySort,
  setStoredLibraryFilter,
  setStoredLibrarySort,
  type LibraryFilter,
  type LibrarySort,
} from "@/lib/library";
import { SCOPE_INFO, setStoredLibraryScope } from "@/lib/scope";
import { getCommonlyMissedCountries } from "@/lib/stats-helpers";
import { GAME_SCOPES, type GameScope } from "@/lib/types";

type LibraryBrowserProps = {
  scope?: GameScope;
};

const SORT_OPTIONS: { value: LibrarySort; label: string }[] = [
  { value: "alphabetical", label: "A–Z" },
  { value: "commonly-missed", label: "Commonly missed" },
];

export function LibraryBrowser({ scope = "world" }: LibraryBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProfile } = useProfiles();
  const [filter, setFilter] = useState<LibraryFilter>("All");
  const [sort, setSort] = useState<LibrarySort>("alphabetical");

  const scopeInfo = SCOPE_INFO[scope];
  const regions = getRegionsForScope(scope);
  const isUsa = scope === "usa";

  const commonlyMissedCodes = useMemo(
    () => (activeProfile ? getCommonlyMissedCountries(activeProfile, scope) : []),
    [activeProfile, scope],
  );
  const commonlyMissedSet = useMemo(
    () => new Set(commonlyMissedCodes),
    [commonlyMissedCodes],
  );

  useEffect(() => {
    const regionParam = searchParams.get("region");
    const sortParam = searchParams.get("sort");
    const nextSort = normalizeLibrarySort(sortParam);
    setSort(nextSort);
    setStoredLibrarySort(scope, nextSort);

    if (regionParam !== null) {
      const next = normalizeLibraryFilter(scope, regionParam);
      setFilter(next);
      setStoredLibraryFilter(scope, next);
      return;
    }

    const storedFilter = getStoredLibraryFilter(scope);
    const storedSort = getStoredLibrarySort(scope);
    if (storedFilter !== "All" || storedSort !== "alphabetical") {
      router.replace(buildLibraryListHref(scope, storedFilter, storedSort));
      return;
    }

    setFilter("All");
  }, [scope, searchParams, router]);

  const updateFilter = (next: LibraryFilter) => {
    setFilter(next);
    setStoredLibraryFilter(scope, next);
    router.replace(buildLibraryListHref(scope, next, sort));
  };

  const updateSort = (next: LibrarySort) => {
    setSort(next);
    setStoredLibrarySort(scope, next);
    router.replace(buildLibraryListHref(scope, filter, next));
  };

  const filteredCountries = useMemo(
    () => getFilteredLibraryPlaces(scope, filter, sort, commonlyMissedCodes),
    [scope, filter, sort, commonlyMissedCodes],
  );

  const missedInViewCount = useMemo(
    () => filteredCountries.filter((country) => commonlyMissedSet.has(country.code)).length,
    [filteredCountries, commonlyMissedSet],
  );

  return (
    <div className="space-y-5 sm:space-y-7">
      <header className="rounded-[1.75rem] border-2 border-teal-100 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-teal-900/70 dark:bg-slate-900/80 sm:p-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          {scopeInfo.libraryTitle}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
          {isUsa
            ? "Browse flags, outlines, capitals, populations, neighbors, and geographic profiles for all 50 US states."
            : "Browse flags, outlines, capitals, populations, neighbors, and geographic profiles for every country and territory."}
        </p>
        <div className="mt-4 inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Library scope">
          {GAME_SCOPES.map((option) => {
            const active = scope === option;
            return (
              <Link
                key={option}
                href={buildLibraryListHref(
                  option,
                  option === scope ? filter : getStoredLibraryFilter(option),
                  option === scope ? sort : getStoredLibrarySort(option),
                )}
                aria-current={active ? "page" : undefined}
                onClick={() => setStoredLibraryScope(option)}
                className={`min-h-10 rounded-xl px-4 py-2 font-display text-sm font-extrabold transition-all ${
                  active
                    ? "bg-white text-teal-800 shadow-sm dark:bg-slate-900 dark:text-teal-300"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {SCOPE_INFO[option].icon} {SCOPE_INFO[option].shortLabel}
              </Link>
            );
          })}
        </div>
      </header>

      <LibrarySearch
        scope={scope}
        filter={filter}
        sort={sort}
        isState={isUsa}
        className="w-full max-w-xl"
      />

      <section aria-labelledby="library-filter-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
          <h2 id="library-filter-heading" className="font-display text-lg font-extrabold text-slate-800 dark:text-slate-100">
            Browse by {isUsa ? "region" : "continent"}
          </h2>
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="library-sort" className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Sort
              </label>
              <select
                id="library-sort"
                value={sort}
                onChange={(event) => updateSort(normalizeLibrarySort(event.target.value))}
                className="min-h-10 rounded-full border-2 border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-bold text-slate-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:focus:border-teal-500 dark:focus:ring-teal-900/60"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <p aria-live="polite" className="text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">
              {filteredCountries.length} places
            </p>
          </div>
        </div>
        {sort === "commonly-missed" ? (
          <p className="mb-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
            {commonlyMissedCodes.length === 0
              ? "No commonly missed places yet — play some games and misses will appear here automatically."
              : missedInViewCount === 0
                ? "None of your commonly missed places match this filter."
                : `${missedInViewCount} commonly missed ${missedInViewCount === 1 ? "place" : "places"} in this view.`}
          </p>
        ) : null}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0">
          {(["All", ...regions] as LibraryFilter[]).map((region) => {
            const active = filter === region;
            return (
              <button
                key={region}
                type="button"
                onClick={() => updateFilter(region)}
                aria-pressed={active}
                className={`min-h-11 shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold transition-all active:scale-[0.98] ${
                  active
                    ? "border-teal-600 bg-teal-600 text-white shadow-sm dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950"
                    : "border-slate-200 bg-white/80 text-slate-700 hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-300"
                }`}
              >
                {region}
              </button>
            );
          })}
        </div>
      </section>

      {filteredCountries.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {filteredCountries.map((country) => {
            const isCommonlyMissed = commonlyMissedSet.has(country.code);
            return (
              <li key={country.code}>
                <Link
                  href={buildLibraryDetailHref(country.code, scope, filter, sort)}
                  className="group relative flex h-full min-h-48 flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white/85 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md active:translate-y-0 dark:border-slate-700 dark:bg-slate-900/85 dark:hover:border-teal-500 sm:min-h-56 sm:p-4"
                >
                  {isCommonlyMissed ? (
                    <span className="absolute right-2 top-2 z-10 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-rose-800 dark:bg-rose-950/80 dark:text-rose-200">
                      Missed
                    </span>
                  ) : null}
                  <div className="flex min-h-28 flex-1 items-center justify-center rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70 sm:min-h-32">
                    <LibraryPlaceVisual country={country} variant="card" />
                  </div>
                  <div className="mt-3 flex items-center gap-2.5">
                    {country.hasFlag ? (
                      <FlagImage
                        code={country.code}
                        alt=""
                        width={40}
                        frame="pill"
                        className="w-10 shrink-0"
                      />
                    ) : null}
                    <span className="min-w-0 font-display text-sm font-extrabold leading-tight text-slate-900 dark:text-slate-100 sm:text-base">
                      {country.name}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No places match this {isUsa ? "region" : "continent"}.
        </div>
      )}
    </div>
  );
}
