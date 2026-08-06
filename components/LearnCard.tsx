"use client";

import type { ReactNode } from "react";
import { FlagImage } from "@/components/FlagDisplay";
import { PlaceContextMap } from "@/components/PlaceContextMap";
import {
  getCountryByCode,
  formatLearnRegionLabel,
  formatPopulation,
} from "@/lib/countries";
import { isStateCode } from "@/lib/scope";
import type { Country } from "@/lib/types";
import { cn } from "@/lib/utils";

type LearnCardProps = {
  countryCode: string;
  wasCorrect: boolean;
  compareCountryCode?: string;
  heading?: ReactNode;
  /** Embedded in the game panel between the header and answer choices. */
  variant?: "default" | "inline";
};

function formatPrimaryLanguage(languages?: string): string {
  if (!languages?.trim()) return "Not listed";
  return languages.split(" · ")[0]?.trim() || "Not listed";
}

function formatNeighborCount(borders: string[]): string {
  const count = borders.length;
  return `${count}`;
}

function LanguageOrNeighbors({
  country,
  isState,
  dtClassName,
  ddClassName,
}: {
  country: Country;
  isState: boolean;
  dtClassName: string;
  ddClassName: string;
}) {
  return (
    <>
      <dt className={dtClassName}>{isState ? "Neighbors" : "Language"}</dt>
      <dd className={ddClassName}>
        {isState ? formatNeighborCount(country.borders) : formatPrimaryLanguage(country.languages)}
      </dd>
    </>
  );
}

function RegionValue({ country, isState }: { country: Country; isState: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {formatLearnRegionLabel(country, isState ? "usa" : "world")}
      {!isState && country.isTerritory ? (
        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
          Territory
        </span>
      ) : null}
    </span>
  );
}

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
          ? "mb-4 grid grid-cols-2 gap-3 sm:mb-3 sm:gap-2"
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
                inline ? "flex-col px-3 py-3 text-center sm:flex-row sm:px-2.5 sm:py-2 sm:text-left" : "gap-3 px-3 py-2.5",
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
                  className={inline ? "w-12 sm:w-10" : "w-12"}
                />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate font-display font-black text-slate-900 dark:text-slate-100",
                    inline ? "text-base sm:text-sm" : "text-base sm:text-lg",
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
        "animate-learn-card-pop-in flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-md dark:bg-slate-900",
        wasCorrect ? "border-emerald-400 dark:border-emerald-600" : "border-rose-400 dark:border-rose-600",
      )}
    >
      <div
        className={cn(
          "shrink-0 border-b px-3 py-2 text-center sm:px-6 sm:py-3",
          wasCorrect
            ? "border-emerald-100 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/30"
            : "border-rose-100 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/30",
        )}
      >
        <p className="font-display text-base font-extrabold leading-snug text-slate-900 dark:text-slate-100 sm:text-lg lg:text-xl">
          {heading ?? country.name}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2 sm:hidden">
        {/* Visuals shrink first on short phones so Capital/Population/Language never clip. */}
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 overflow-hidden">
          {country.hasFlag && (
            <div className="flex min-h-0 shrink justify-center">
              <FlagImage
                code={country.code}
                alt={country.name}
                width={240}
                frame="md"
                className="mx-auto block h-auto max-h-[4.75rem] w-full max-w-[8rem] object-contain"
              />
            </div>
          )}

          <div className="min-h-0 w-full shrink overflow-hidden">
            <PlaceContextMap
              country={country}
              variant="learn"
              highlightNeighbors
              className="min-h-0 max-h-[5.25rem]"
            />
          </div>
        </div>

        {compareCountryCode && (
          <PopulationComparison
            countryCode={countryCode}
            compareCountryCode={compareCountryCode}
            inline
          />
        )}

        <dl className="mt-2 grid w-full shrink-0 grid-cols-2 content-start gap-x-4 gap-y-2 self-stretch text-sm">
          <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Capital
            </dt>
            <dd className="mt-0.5 text-sm font-semibold leading-snug text-slate-800 dark:text-slate-200">
              {country.capital || "N/A"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Region
            </dt>
            <dd className="mt-0.5 text-sm font-semibold leading-snug text-slate-800 dark:text-slate-200">
              <RegionValue country={country} isState={isState} />
            </dd>
          </div>
          {!compareCountryCode && (
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Population
              </dt>
              <dd className="mt-0.5 text-sm font-semibold leading-snug text-slate-800 dark:text-slate-200">
                {formatPopulation(country.population)}
              </dd>
            </div>
          )}
          <div className={cn("min-w-0", compareCountryCode ? "col-span-2" : "")}>
            <LanguageOrNeighbors
              country={country}
              isState={isState}
              dtClassName="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              ddClassName="mt-0.5 text-sm font-semibold leading-snug text-slate-800 dark:text-slate-200"
            />
          </div>
        </dl>
      </div>

      <div className="hidden shrink-0 flex-col gap-3 p-4 sm:flex lg:px-6 lg:py-4">
        <div
          className={cn(
            "grid items-start gap-5 lg:gap-6",
            country.hasFlag ? "grid-cols-[5.5rem_minmax(0,1fr)] lg:grid-cols-[6.25rem_minmax(0,1fr)]" : "grid-cols-1",
          )}
        >
          {country.hasFlag && (
            <div className="flex items-start justify-center pt-0.5">
              <FlagImage
                code={country.code}
                alt={country.name}
                width={112}
                frame="md"
                className="w-[5.5rem] lg:w-24"
              />
            </div>
          )}

          <div className="min-w-0 pl-0.5 lg:pl-1">
            {compareCountryCode && (
              <PopulationComparison
                countryCode={countryCode}
                compareCountryCode={compareCountryCode}
                inline
              />
            )}
            <dl
              className={cn(
                "grid grid-cols-2 gap-x-4 gap-y-2 text-[0.9rem] leading-snug",
                compareCountryCode ? "mt-0" : "",
              )}
            >
              <div>
                <dt className="font-semibold text-slate-500 dark:text-slate-400">Capital</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">{country.capital || "N/A"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500 dark:text-slate-400">Region</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">
                  <RegionValue country={country} isState={isState} />
                </dd>
              </div>
              {!compareCountryCode && (
                <div>
                  <dt className="font-semibold text-slate-500 dark:text-slate-400">Population</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200">{formatPopulation(country.population)}</dd>
                </div>
              )}
              <div className={compareCountryCode ? "col-span-2" : ""}>
                <LanguageOrNeighbors
                  country={country}
                  isState={isState}
                  dtClassName="font-semibold text-slate-500 dark:text-slate-400"
                  ddClassName="font-medium text-slate-800 dark:text-slate-200"
                />
              </div>
            </dl>
          </div>
        </div>

        <PlaceContextMap
          country={country}
          variant="learn"
          highlightNeighbors
          className="w-full"
        />
      </div>

      <p className="shrink-0 border-t border-slate-100 px-3 py-2 text-center text-xs font-medium text-slate-400 dark:border-slate-800 dark:text-slate-500 sm:px-6 sm:py-2">
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
        <div className="mb-4">
          <PlaceContextMap country={country} variant="learn" highlightNeighbors />
        </div>
        <div
          className={
            country.hasFlag
              ? "grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 sm:flex sm:items-center sm:gap-4"
              : "block"
          }
        >
          {country.hasFlag && (
            <FlagImage
              code={country.code}
              alt={country.name}
              width={96}
              frame="pill"
              className="w-[4.5rem] rounded-lg sm:w-20"
            />
          )}
          <div className="min-w-0 space-y-1 text-xs leading-relaxed sm:text-sm">
            <p><span className="font-semibold">Capital:</span> {country.capital || "N/A"}</p>
            <p>
              <span className="font-semibold">Region:</span>{" "}
              <RegionValue country={country} isState={isState} />
            </p>
            {!compareCountryCode && (
              <p><span className="font-semibold">Population:</span> {formatPopulation(country.population)}</p>
            )}
            <p>
              <span className="font-semibold">{isState ? "Neighbors" : "Language"}:</span>{" "}
              {isState ? formatNeighborCount(country.borders) : formatPrimaryLanguage(country.languages)}
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
