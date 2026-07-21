"use client";

import Link from "next/link";
import { PlaceContextMap } from "@/components/PlaceContextMap";
import { buildWorldMapHref, countryHasContextMap } from "@/lib/context-maps";
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
      <h2
        id="location-heading"
        className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100"
      >
        Location on the map
      </h2>
      <p className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
        {isState
          ? `${country.name} highlighted within the United States.`
          : `${country.name} highlighted within ${country.continent}.`}
      </p>
      <Link
        href={buildWorldMapHref(country.code)}
        className="mb-3 inline-flex min-h-11 items-center rounded-full border-2 border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800 transition-colors hover:border-teal-400 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:border-teal-500 dark:hover:bg-teal-950"
      >
        Open World Map
      </Link>
      <PlaceContextMap country={country} variant="hero" />
    </section>
  );
}
