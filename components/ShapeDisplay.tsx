"use client";

import { PlaceContextMap } from "@/components/PlaceContextMap";
import { countryHasContextMap } from "@/lib/context-maps";
import { getCountryByCode, getShapePath } from "@/lib/countries";

export function ShapeDisplay({ code, compact = false }: { code: string; compact?: boolean }) {
  const country = getCountryByCode(code);
  if (!country) return null;

  return (
    <div className="flex w-full justify-center">
      <div
        className={`flex w-full max-w-md items-center justify-center rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-sky-50 to-white shadow-md dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 ${compact ? "h-36 p-4" : "h-56 p-6"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getShapePath(country.code3)}
          alt={`Shape of ${country.name}`}
          className="h-full w-full object-contain [filter:brightness(0)] dark:[filter:brightness(0)_invert(1)]"
        />
      </div>
    </div>
  );
}

/** Learn-card regional map for easy shape rounds — surroundings stay visible. */
export function ShapeContextDisplay({ code }: { code: string }) {
  const country = getCountryByCode(code);
  if (!country) return null;
  if (!countryHasContextMap(country)) {
    return <ShapeDisplay code={code} compact />;
  }

  return (
    <div className="flex h-full min-h-0 w-full max-w-2xl items-center justify-center">
      <PlaceContextMap
        country={country}
        variant="learn"
        highlightNeighbors
        ariaLabel="Map showing a highlighted country and its surrounding area"
        className="!aspect-auto !min-h-0 h-full max-h-full w-full"
      />
    </div>
  );
}
