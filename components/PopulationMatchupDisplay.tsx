"use client";

import { FlagImage } from "@/components/FlagDisplay";
import { getCountryByCode, getShapePath } from "@/lib/countries";

type PopulationMatchupDisplayProps = {
  codes: string[];
};

export function PopulationMatchupDisplay({ codes }: PopulationMatchupDisplayProps) {
  return (
    <div className="grid h-full min-h-0 w-full grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
      {codes.map((code) => {
        const country = getCountryByCode(code);
        if (!country) return null;

        return (
          <div
            key={code}
            className="flex min-h-0 min-w-0 flex-col items-stretch justify-center px-1.5 py-2 sm:px-3 sm:py-3"
          >
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 sm:gap-3">
              {country.hasShape && (
                <div className="flex min-h-0 flex-1 w-full items-center justify-center px-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getShapePath(country.code3)}
                    alt=""
                    className="max-h-full max-w-full object-contain [filter:brightness(0)] dark:[filter:brightness(0)_invert(1)]"
                  />
                </div>
              )}
              <div className="w-full min-w-0 shrink-0 overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-800">
                <FlagImage
                  code={country.code}
                  alt=""
                  width={160}
                  frame="none"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
