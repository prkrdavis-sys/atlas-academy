"use client";

import type { ReactNode } from "react";
import {
  getCountryByCode,
  getFlagPath,
  getShapePath,
  formatBorderFact,
  formatPopulation,
} from "@/lib/countries";
import { isStateCode } from "@/lib/scope";
import Image from "next/image";

type LearnCardProps = {
  countryCode: string;
  wasCorrect: boolean;
  compareCountryCode?: string;
  heading?: ReactNode;
};

function PopulationComparison({
  countryCode,
  compareCountryCode,
}: {
  countryCode: string;
  compareCountryCode: string;
}) {
  const correct = getCountryByCode(countryCode);
  const other = getCountryByCode(compareCountryCode);
  if (!correct || !other) return null;

  const entries = [correct, other].sort((a, b) => b.population - a.population);

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800 sm:p-4">
      <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        Population comparison
      </p>
      <div className="space-y-2">
        {entries.map((country) => {
          const isLarger = country.code === entries[0].code;
          return (
            <div
              key={country.code}
              className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${
                isLarger
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              {country.hasFlag && (
                <Image
                  src={getFlagPath(country.code)}
                  alt=""
                  width={48}
                  height={36}
                  className="h-9 w-12 shrink-0 rounded border border-slate-200 object-contain dark:border-slate-600"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-black text-slate-900 dark:text-slate-100 sm:text-lg">
                  {country.name}
                </p>
                <p className={`text-sm font-semibold ${isLarger ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"}`}>
                  {formatPopulation(country.population)} people
                </p>
              </div>
              {isLarger && (
                <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                  Larger
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LearnCard({ countryCode, wasCorrect, compareCountryCode, heading }: LearnCardProps) {
  const country = getCountryByCode(countryCode);
  if (!country) return null;
  const isState = isStateCode(country.code);

  return (
    <div
      className={`animate-card-pop-in overflow-hidden rounded-[1.75rem] border-2 bg-white shadow-xl dark:bg-slate-900 sm:rounded-3xl ${
        wasCorrect ? "border-emerald-300 dark:border-emerald-700" : "border-rose-300 dark:border-rose-700"
      }`}
    >
      <div
        className={`px-4 py-3.5 font-display text-white sm:px-6 sm:py-4 ${
          wasCorrect ? "bg-emerald-500" : "bg-rose-500"
        }`}
      >
        <p className="text-center text-lg font-black leading-tight tracking-tight sm:text-xl">
          {heading ?? country.name}
        </p>
      </div>
      <div className="p-4 sm:p-6">
        {compareCountryCode && (
          <PopulationComparison
            countryCode={countryCode}
            compareCountryCode={compareCountryCode}
          />
        )}
        {country.hasShape && (
          <div className="mb-4 flex justify-center">
            <div className="flex h-28 w-full max-w-xs items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-sky-50 to-white p-4 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 sm:h-32">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getShapePath(country.code3)}
                alt={`Outline of ${country.name}`}
                className="max-h-full max-w-full object-contain [filter:brightness(0)] dark:[filter:brightness(0)_invert(1)]"
              />
            </div>
          </div>
        )}
        <div
          className={
            country.hasFlag
              ? "grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3 sm:flex sm:items-center sm:gap-4"
              : "block"
          }
        >
          {country.hasFlag && (
            <Image
              src={getFlagPath(country.code)}
              alt={country.name}
              width={120}
              height={90}
              className="h-auto w-full rounded-lg border border-slate-200 object-contain dark:border-slate-600 sm:w-[120px]"
            />
          )}
          <div className="min-w-0 space-y-1 text-xs leading-relaxed sm:text-sm">
            <p><span className="font-semibold">Capital:</span> {country.capital || "N/A"}</p>
            <p><span className="font-semibold">{isState ? "Region" : "Continent"}:</span> {country.continent}</p>
            {!compareCountryCode && (
              <p><span className="font-semibold">Population:</span> {formatPopulation(country.population)}</p>
            )}
            <p className="text-slate-600 dark:text-slate-400">
              {formatBorderFact(country.borders.length, isState ? "usa" : "world")}
            </p>
          </div>
        </div>
        <p className="mt-3 text-center text-xs font-medium text-slate-400 dark:text-slate-500 sm:mt-4 sm:text-sm">Tap anywhere to continue</p>
      </div>
    </div>
  );
}
