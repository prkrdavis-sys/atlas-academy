"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getFlagPath, getPlacesForScope, getRegionsForScope, getShapePath } from "@/lib/countries";
import { SCOPE_INFO } from "@/lib/scope";
import { GAME_SCOPES, type GameScope, type Region } from "@/lib/types";

type LibraryFilter = "All" | Region;

type LibraryBrowserProps = {
  scope?: GameScope;
};

export function LibraryBrowser({ scope = "world" }: LibraryBrowserProps) {
  const [filter, setFilter] = useState<LibraryFilter>("All");

  const scopeInfo = SCOPE_INFO[scope];
  const regions = getRegionsForScope(scope);
  const isUsa = scope === "usa";

  const filteredCountries = useMemo(
    () =>
      getPlacesForScope(scope)
        .filter((country) => filter === "All" || country.continent === filter)
        .toSorted((a, b) => a.name.localeCompare(b.name)),
    [scope, filter],
  );

  return (
    <div className="space-y-5 sm:space-y-7">
      <header className="rounded-[1.75rem] border-2 border-teal-100 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-teal-900/70 dark:bg-slate-900/80 sm:p-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          {scopeInfo.libraryTitle}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
          {isUsa
            ? "Browse flags, outlines, capitals, populations, neighbors, and facts for all 50 US states."
            : "Browse flags, outlines, capitals, populations, neighbors, and facts for every country and territory."}
        </p>
        <div className="mt-4 inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Library scope">
          {GAME_SCOPES.map((option) => {
            const active = scope === option;
            return (
              <Link
                key={option}
                href={option === "usa" ? "/library?scope=usa" : "/library"}
                aria-current={active ? "page" : undefined}
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

      <section aria-labelledby="library-filter-heading">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 id="library-filter-heading" className="font-display text-lg font-extrabold text-slate-800 dark:text-slate-100">
            Browse by {isUsa ? "region" : "continent"}
          </h2>
          <p aria-live="polite" className="shrink-0 text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">
            {filteredCountries.length} places
          </p>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0">
          {(["All", ...regions] as LibraryFilter[]).map((region) => {
            const active = filter === region;
            return (
              <button
                key={region}
                type="button"
                onClick={() => setFilter(region)}
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
          {filteredCountries.map((country) => (
            <li key={country.code}>
              <Link
                href={`/library/${country.code.toLowerCase()}`}
                className="group flex h-full min-h-48 flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white/85 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md active:translate-y-0 dark:border-slate-700 dark:bg-slate-900/85 dark:hover:border-teal-500 sm:min-h-56 sm:p-4"
              >
                <div className="flex min-h-28 flex-1 items-center justify-center rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70 sm:min-h-32">
                  {country.hasShape ? (
                    // Silhouettes are local SVG documents with their own intrinsic viewBox.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getShapePath(country.code3)}
                      alt=""
                      className="max-h-24 w-full object-contain opacity-80 transition-transform group-hover:scale-105 [filter:brightness(0)_saturate(100%)_invert(30%)_sepia(13%)_saturate(1020%)_hue-rotate(179deg)_brightness(93%)_contrast(90%)] dark:opacity-90 dark:[filter:brightness(0)_invert(1)] sm:max-h-28"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">Shape unavailable</span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2.5">
                  {country.hasFlag ? (
                    <span className="w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-600">
                      <Image
                        src={getFlagPath(country.code)}
                        alt=""
                        width={80}
                        height={60}
                        className="h-auto w-full object-contain"
                      />
                    </span>
                  ) : null}
                  <span className="min-w-0 font-display text-sm font-extrabold leading-tight text-slate-900 dark:text-slate-100 sm:text-base">
                    {country.name}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No places match this {isUsa ? "region" : "continent"}.
        </div>
      )}
    </div>
  );
}
