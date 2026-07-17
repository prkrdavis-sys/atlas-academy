"use client";

import type { ReactNode } from "react";
import { FlagImage } from "@/components/FlagDisplay";
import {
  getCountryByCode,
  getShapePath,
  formatBorderFact,
  formatPopulation,
} from "@/lib/countries";
import { isStateCode } from "@/lib/scope";
import { cn } from "@/lib/utils";

type LearnCardProps = {
  countryCode: string;
  wasCorrect: boolean;
  compareCountryCode?: string;
  heading?: ReactNode;
  /** Embedded in the game panel between the header and answer choices. */
  variant?: "default" | "inline";
};

function PopulationComparison({
  countryCode,
  compareCountryCode,
  inline = false,
}: {
  countryCode: string;
  compareCountryCode: string;
  inline?: boolean;
}) {
  const correct = getCountryByCode(countryCode);
  const other = getCountryByCode(compareCountryCode);
  if (!correct || !other) return null;

  const entries = [correct, other].sort((a, b) => b.population - a.population);

  return (
    <div
      className={
        inline
          ? "mb-3 grid grid-cols-2 gap-2"
          : "mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800 sm:p-4"
      }
    >
      {!inline && (
        <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Population comparison
        </p>
      )}
      <div className={inline ? "contents" : "space-y-2"}>
        {entries.map((country) => {
          const isLarger = country.code === entries[0].code;
          return (
            <div
              key={country.code}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 px-2.5 py-2",
                inline ? "flex-col text-center sm:flex-row sm:text-left" : "gap-3 px-3 py-2.5",
                isLarger
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
              )}
            >
              {country.hasFlag && (
                <FlagImage
                  code={country.code}
                  alt=""
                  width={inline ? 40 : 48}
                  frame="pill"
                  className={inline ? "w-10" : "w-12"}
                />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate font-display font-black text-slate-900 dark:text-slate-100",
                    inline ? "text-sm" : "text-base sm:text-lg",
                  )}
                >
                  {country.name}
                </p>
                <p
                  className={cn(
                    "font-semibold",
                    inline ? "text-xs" : "text-sm",
                    isLarger ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400",
                  )}
                >
                  {formatPopulation(country.population)}
                </p>
              </div>
              {isLarger && !inline && (
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

function InlineLearnCard({
  country,
  isState,
  wasCorrect,
  heading,
  compareCountryCode,
  countryCode,
}: {
  country: NonNullable<ReturnType<typeof getCountryByCode>>;
  isState: boolean;
  wasCorrect: boolean;
  heading?: ReactNode;
  compareCountryCode?: string;
  countryCode: string;
}) {
  return (
    <div
      className={cn(
        "animate-learn-card-pop-in w-full rounded-2xl border-2 bg-white shadow-md dark:bg-slate-900",
        wasCorrect ? "border-emerald-400 dark:border-emerald-600" : "border-rose-400 dark:border-rose-600",
      )}
    >
      <div
        className={cn(
          "border-b px-3 py-2 text-center sm:px-6 sm:py-3",
          wasCorrect
            ? "border-emerald-100 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/30"
            : "border-rose-100 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/30",
        )}
      >
        <p className="font-display text-sm font-extrabold leading-snug text-slate-900 dark:text-slate-100 sm:text-lg lg:text-xl">
          {heading ?? country.name}
        </p>
      </div>

      <div
        className={cn(
          "grid items-center gap-1.5 p-2 sm:gap-5 sm:p-4 lg:px-6 lg:py-4",
          country.hasFlag && country.hasShape && "grid-cols-[3.25rem_1fr_3.25rem] sm:grid-cols-[6.5rem_1fr_6.5rem] lg:grid-cols-[7.5rem_1fr_7.5rem]",
          country.hasFlag && !country.hasShape && "grid-cols-[3.25rem_1fr] sm:grid-cols-[6.5rem_1fr]",
          !country.hasFlag && country.hasShape && "grid-cols-[1fr_3.25rem] sm:grid-cols-[1fr_6.5rem]",
          !country.hasFlag && !country.hasShape && "grid-cols-1",
        )}
      >
        {country.hasFlag && (
          <div className="flex items-center justify-center">
            <FlagImage
              code={country.code}
              alt={country.name}
              width={128}
              frame="md"
              className="w-[3.25rem] sm:w-24 lg:w-28"
            />
          </div>
        )}

        <div className="min-w-0">
          {compareCountryCode && (
            <PopulationComparison
              countryCode={countryCode}
              compareCountryCode={compareCountryCode}
              inline
            />
          )}
          <dl
            className={cn(
              "grid grid-cols-2 gap-x-3 gap-y-1 text-xs leading-snug sm:gap-x-4 sm:gap-y-2 sm:text-[0.9rem]",
              compareCountryCode ? "mt-0" : "",
            )}
          >
            <div>
              <dt className="font-semibold text-slate-500 dark:text-slate-400">Capital</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-200">{country.capital || "N/A"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500 dark:text-slate-400">{isState ? "Region" : "Continent"}</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-200">{country.continent}</dd>
            </div>
            {!compareCountryCode && (
              <div>
                <dt className="font-semibold text-slate-500 dark:text-slate-400">Population</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">{formatPopulation(country.population)}</dd>
              </div>
            )}
            <div className={compareCountryCode ? "col-span-2" : ""}>
              <dt className="font-semibold text-slate-500 dark:text-slate-400">Borders</dt>
              <dd className="text-slate-600 dark:text-slate-400">
                {formatBorderFact(country.borders.length, isState ? "usa" : "world")}
              </dd>
            </div>
          </dl>
        </div>

        {country.hasShape && (
          <div className="flex items-center justify-center">
            <div className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-b from-sky-50 to-white p-1.5 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 sm:h-24 sm:w-28 lg:h-28 lg:w-32 sm:p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getShapePath(country.code3)}
                alt={`Outline of ${country.name}`}
                className="max-h-full max-w-full object-contain [filter:brightness(0)] dark:[filter:brightness(0)_invert(1)]"
              />
            </div>
          </div>
        )}
      </div>

      <p className="border-t border-slate-100 px-3 py-1.5 text-center text-[11px] font-medium text-slate-400 dark:border-slate-800 dark:text-slate-500 sm:px-6 sm:py-2 sm:text-xs">
        Tap anywhere to continue
      </p>
    </div>
  );
}

export function LearnCard({
  countryCode,
  wasCorrect,
  compareCountryCode,
  heading,
  variant = "default",
}: LearnCardProps) {
  const country = getCountryByCode(countryCode);
  if (!country) return null;
  const isState = isStateCode(country.code);

  if (variant === "inline") {
    return (
      <InlineLearnCard
        country={country}
        isState={isState}
        wasCorrect={wasCorrect}
        heading={heading}
        compareCountryCode={compareCountryCode}
        countryCode={countryCode}
      />
    );
  }

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
            <FlagImage
              code={country.code}
              alt={country.name}
              width={120}
              frame="pill"
              className="w-full rounded-lg sm:w-[7.5rem]"
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
        <p className="mt-3 text-center text-xs font-medium text-slate-400 dark:text-slate-500 sm:mt-4 sm:text-sm">
          Tap anywhere to continue
        </p>
      </div>
    </div>
  );
}
