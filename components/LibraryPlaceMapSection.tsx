"use client";

import Link from "next/link";
import { PlaceContextMap } from "@/components/PlaceContextMap";
import { buildPlaceMapHref, countryHasContextMap } from "@/lib/context-maps";
import { isStateCode } from "@/lib/scope";
import type { Country } from "@/lib/types";

type LibraryPlaceMapSectionProps = {
  country: Country;
};

export function LibraryPlaceMapSection({ country }: LibraryPlaceMapSectionProps) {
  if (!countryHasContextMap(country)) {
    return null;
  }

  const isState = isStateCode(country.code);

  return (
    <section aria-labelledby="location-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="location-heading"
            className="font-display text-xl font-extrabold text-slate-800 dark:text-slate-100"
          >
            Location on the map
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">
            {isState
              ? `${country.name} highlighted within the United States.`
              : `${country.name} highlighted within ${country.continent}.`}
          </p>
        </div>
        <Link
          href={buildPlaceMapHref(country.code)}
          className="inline-flex shrink-0 min-h-11 items-center rounded-full border-2 border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800 transition-colors hover:border-teal-400 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:border-teal-500 dark:hover:bg-teal-950"
        >
          Open on Map
        </Link>
      </div>
      <PlaceContextMap country={country} variant="hero" />
    </section>
  );
}
