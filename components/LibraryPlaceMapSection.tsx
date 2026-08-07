"use client";

import Link from "next/link";
import { PlaceContextMap } from "@/components/PlaceContextMap";
import { buildPlaceMapHref, countryHasContextMap } from "@/lib/context-maps";
import { GLASS_CONTROL_CLASS, GLASS_INSET_CLASS, GLASS_PANEL_CLASS } from "@/lib/glass";
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
    <section
      aria-labelledby="location-heading"
      className={`${GLASS_PANEL_CLASS} rounded-[1.75rem] p-4 sm:p-5`}
    >
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
              : `${country.name} highlighted within ${country.continent}.`}{" "}
            Drag to pan · scroll or pinch to zoom out for more context.
          </p>
        </div>
        <Link
          href={buildPlaceMapHref(country.code)}
          className={`${GLASS_CONTROL_CLASS} inline-flex shrink-0 min-h-11 items-center rounded-full px-4 py-2 text-sm font-bold text-teal-800 transition-colors hover:border-teal-400 hover:text-teal-700 dark:text-teal-200 dark:hover:border-teal-500 dark:hover:text-teal-100`}
        >
          Open on Map
        </Link>
      </div>
      <div className={`${GLASS_INSET_CLASS} overflow-hidden rounded-2xl p-1`}>
        <PlaceContextMap country={country} variant="hero" interactive />
      </div>
    </section>
  );
}
