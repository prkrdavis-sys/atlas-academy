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
            className="flex min-h-0 items-center justify-center px-2 py-2 sm:px-4 sm:py-3"
          >
            <div className="flex w-full max-w-[11rem] flex-col items-center justify-center gap-3 sm:max-w-none sm:gap-4">
              {country.hasShape && (
                <div className="flex w-full items-center justify-center px-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getShapePath(country.code3)}
                    alt=""
                    className="max-h-[min(18dvh,8rem)] w-full object-contain [filter:brightness(0)] dark:[filter:brightness(0)_invert(1)] sm:max-h-[min(28dvh,12rem)]"
                  />
                </div>
              )}
              <div className="flex w-full items-center justify-center">
                <FlagImage
                  code={country.code}
                  alt=""
                  width={144}
                  frame="md"
                  className="w-[min(92%,9rem)] sm:w-36"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
