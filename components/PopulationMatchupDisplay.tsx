"use client";

import Image from "next/image";
import { getCountryByCode, getFlagPath, getShapePath } from "@/lib/countries";

type PopulationMatchupDisplayProps = {
  codes: string[];
};

export function PopulationMatchupDisplay({ codes }: PopulationMatchupDisplayProps) {
  return (
    <div className="grid h-full min-h-0 grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
      {codes.map((code) => {
        const country = getCountryByCode(code);
        if (!country) return null;

        return (
          <div
            key={code}
            className="flex min-h-0 flex-col items-center justify-center gap-3 px-3 py-2 sm:gap-4 sm:px-4"
          >
            {country.hasShape && (
              <div className="flex min-h-0 w-full flex-1 items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getShapePath(country.code3)}
                  alt=""
                  className="max-h-[min(28dvh,12rem)] w-full object-contain [filter:brightness(0)] dark:[filter:brightness(0)_invert(1)] sm:max-h-[min(32dvh,14rem)]"
                />
              </div>
            )}
            <div className="shrink-0 overflow-hidden rounded-xl border-2 border-slate-200 shadow-sm dark:border-slate-700">
              <Image
                src={getFlagPath(country.code)}
                alt=""
                width={120}
                height={90}
                className="h-12 w-16 object-contain sm:h-[4.5rem] sm:w-24"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
