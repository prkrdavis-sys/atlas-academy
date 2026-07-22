"use client";

import type { ReactNode } from "react";
import { FlagImage } from "@/components/FlagDisplay";
import { PlaceContextMap } from "@/components/PlaceContextMap";
import {
  getCountryByCode,
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

function ContinentValue({ country, isState }: { country: Country; isState: boolean }) {
  if (isState) {
    return country.continent;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {country.continent}
      {country.isTerritory ? (
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
        "animate-learn-card-pop-in flex min-h-full w-full flex-col rounded-2xl border-2 bg-white shadow-md dark:bg-slate-900 sm:min-h-0 sm:block",
        wasCorrect ? "border-emerald-400 dark:border-emerald-600" : "border-rose-400 dark:border-rose-600",
      )}
    >
      <div
        className={cn(
          "shrink-0 border-b px-4 py-2.5 text-center sm:px-6 sm:py-3",
          wasCorrect
            ? "border-emerald-100 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/30"
            : "border-rose-100 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/30",
        )}
      >
        <p className="font-display text-base font-extrabold leading-snug text-slate-900 dark:text-slate-100 sm:text-lg lg:text-xl">
          {heading ?? country.name}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3 sm:hidden">
        {country.hasFlag && (
          <div className="mb-3 w-full shrink-0 overflow-hidden rounded-xl">
            <FlagImage
              code={country.code}
              alt={country.name}
              width={360}
              frame="md"
              className="mx-auto block w-full max-w-full"
            />
          </div>
        )}

        {compareCountryCode && (
          <PopulationComparison
            countryCode={countryCode}
            compareCountryCode={compareCountryCode}
            inline
          />
        )}

        <dl className="grid w-full shrink-0 grid-cols-2 content-start gap-x-6 gap-y-3 self-stretch text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Capital</dt>
            <dd className="mt-1 text-base font-semibold text-slate-800 dark:text-slate-200">{country.capital || "N/A"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{isState ? "Region" : "Continent"}</dt>
            <dd className="mt-1 text-base font-semibold text-slate-800 dark:text-slate-200">
              <ContinentValue country={country} isState={isState} />
            </dd>
          </div>
          {!compareCountryCode && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Population</dt>
              <dd className="mt-1 text-base font-semibold text-slate-800 dark:text-slate-200">{formatPopulation(country.population)}</dd>
            </div>
          )}
          <div className={compareCountryCode ? "col-span-2" : ""}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Language</dt>
            <dd className="mt-1 text-base font-semibold text-slate-800 dark:text-slate-200">
              {formatPrimaryLanguage(country.languages)}
            </dd>
          </div>
        </dl>

        <div className="mt-3 w-full shrink-0 pb-1">
          <PlaceContextMap country={country} variant="compact" countryOnly />
        </div>
      </div>

      <div
        className={cn(
          "hidden items-center gap-5 p-4 sm:grid lg:px-6 lg:py-4",
          country.hasFlag
            ? "grid-cols-[6.5rem_1fr_6.5rem] lg:grid-cols-[7.5rem_1fr_7.5rem]"
            : "grid-cols-[1fr_6.5rem] lg:grid-cols-[1fr_7.5rem]",
        )}
      >
        {country.hasFlag && (
          <div className="flex items-center justify-center">
            <FlagImage
              code={country.code}
              alt={country.name}
              width={128}
              frame="md"
              className="w-24 lg:w-28"
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
              "grid grid-cols-2 gap-x-4 gap-y-2 text-[0.9rem] leading-snug",
              compareCountryCode ? "mt-0" : "",
            )}
          >
            <div>
              <dt className="font-semibold text-slate-500 dark:text-slate-400">Capital</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-200">{country.capital || "N/A"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500 dark:text-slate-400">{isState ? "Region" : "Continent"}</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-200">
                <ContinentValue country={country} isState={isState} />
              </dd>
            </div>
            {!compareCountryCode && (
              <div>
                <dt className="font-semibold text-slate-500 dark:text-slate-400">Population</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">{formatPopulation(country.population)}</dd>
              </div>
            )}
            <div className={compareCountryCode ? "col-span-2" : ""}>
              <dt className="font-semibold text-slate-500 dark:text-slate-400">Language</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-200">
                {formatPrimaryLanguage(country.languages)}
              </dd>
            </div>
          </dl>
        </div>

        <PlaceContextMap
          country={country}
          variant="compact"
          countryOnly
          className="w-full"
        />
      </div>

      <p className="mt-auto shrink-0 border-t border-slate-100 px-4 py-2.5 text-center text-xs font-medium text-slate-400 dark:border-slate-800 dark:text-slate-500 sm:mt-0 sm:px-6 sm:py-2">
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
          <PlaceContextMap country={country} variant="compact" countryOnly />
        </div>
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
            <p>
              <span className="font-semibold">{isState ? "Region" : "Continent"}:</span>{" "}
              <ContinentValue country={country} isState={isState} />
            </p>
            {!compareCountryCode && (
              <p><span className="font-semibold">Population:</span> {formatPopulation(country.population)}</p>
            )}
            <p>
              <span className="font-semibold">Language:</span> {formatPrimaryLanguage(country.languages)}
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
