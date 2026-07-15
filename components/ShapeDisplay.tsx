"use client";

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
