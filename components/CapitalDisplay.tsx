"use client";

import { getCountryByCode, getCapitalPath } from "@/lib/countries";

type CapitalDisplayProps = {
  code: string;
  compact?: boolean;
  showLabel?: boolean;
};

export function CapitalDisplay({ code, compact = false, showLabel = true }: CapitalDisplayProps) {
  const country = getCountryByCode(code);
  if (!country?.hasCapitalImage) return null;

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div
        className={`flex w-full max-w-lg items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-slate-900 to-slate-800 shadow-md dark:border-slate-700 ${
          compact ? "h-40 sm:h-44" : "h-52 sm:h-64"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getCapitalPath(country.code)}
          alt={`Skyline of ${country.capital}`}
          className="h-full w-full object-cover"
        />
      </div>
      {showLabel && (
        <p className="font-display text-lg font-extrabold text-slate-700 dark:text-slate-200 sm:text-xl">
          {country.capital}
        </p>
      )}
    </div>
  );
}
