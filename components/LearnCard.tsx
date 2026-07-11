"use client";

import type { ReactNode } from "react";
import { getCountryByCode, getFlagPath, formatPopulation } from "@/lib/countries";
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
    <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-500">
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
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              {country.hasFlag && (
                <Image
                  src={getFlagPath(country.code)}
                  alt=""
                  width={48}
                  height={32}
                  className="h-8 w-12 shrink-0 rounded border border-slate-200 object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-black text-slate-900 sm:text-lg">
                  {country.name}
                </p>
                <p className={`text-sm font-semibold ${isLarger ? "text-emerald-700" : "text-slate-600"}`}>
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

  return (
    <div
      className={`animate-card-pop-in overflow-hidden rounded-t-[1.75rem] border-2 bg-white shadow-xl sm:rounded-3xl ${
        wasCorrect ? "border-emerald-300" : "border-rose-300"
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
              height={80}
              className="h-auto w-full rounded-lg border border-slate-200 sm:w-[120px]"
            />
          )}
          <div className="min-w-0 space-y-1 text-xs leading-relaxed sm:text-sm">
            <p><span className="font-semibold">Capital:</span> {country.capital || "N/A"}</p>
            <p><span className="font-semibold">Continent:</span> {country.continent}</p>
            {!compareCountryCode && (
              <p><span className="font-semibold">Population:</span> {formatPopulation(country.population)}</p>
            )}
            <p className="text-slate-600">{country.fact}</p>
          </div>
        </div>
        <p className="mt-3 text-center text-xs font-medium text-slate-400 sm:mt-4 sm:text-sm">Tap anywhere to continue</p>
      </div>
    </div>
  );
}
