import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { FlagImage } from "@/components/FlagDisplay";
import { LibraryDetailNav } from "@/components/LibraryDetailNav";
import { LibraryPlaceVisual } from "@/components/LibraryPlaceVisual";
import {
  countries,
  formatNoNeighborsMessage,
  formatPopulation,
  getCountryByCode,
  usStates,
} from "@/lib/countries";
import {
  buildLibraryDetailHref,
  normalizeLibraryFilter,
  normalizeLibrarySort,
} from "@/lib/library";
import { formatDisplayCode, isStateCode } from "@/lib/scope";
import type { GameScope } from "@/lib/types";

type CountryPageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ scope?: string; region?: string; sort?: string }>;
};

export function generateStaticParams() {
  return [...countries, ...usStates].map((country) => ({
    code: country.code.toLowerCase(),
  }));
}

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { code } = await params;
  const country = getCountryByCode(code.toUpperCase());

  return country
    ? {
        title: `${country.name} | ${isStateCode(country.code) ? "State" : "Country"} Library`,
        description: `Learn about ${country.name}, including its flag, shape, capital, population, and neighbors.`,
      }
    : {};
}

export default async function CountryPage({ params, searchParams }: CountryPageProps) {
  const { code } = await params;
  const query = await searchParams;
  const country = getCountryByCode(code.toUpperCase());
  if (!country) notFound();
  const isState = isStateCode(country.code);
  const scope: GameScope = isState ? "usa" : "world";
  const filter = normalizeLibraryFilter(scope, query.region ?? null);
  const sort = normalizeLibrarySort(query.sort ?? null);
  const neighborLinkClass =
    "inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-slate-200 bg-white/80 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-300";

  const neighbors = country.borders
    .map((borderCode) => getCountryByCode(borderCode))
    .filter((neighbor) => neighbor !== undefined)
    .toSorted((a, b) => a.name.localeCompare(b.name));

  const details = isState
    ? [
        { label: "Capital", value: country.capital || "No official capital" },
        { label: "Region", value: country.continent },
        { label: "Division", value: country.subregion || "Not listed" },
        { label: "Population", value: country.population > 0 ? formatPopulation(country.population) : "Not available" },
        {
          label: "Area",
          value: country.area > 0 ? `${formatPopulation(country.area)} km²` : "Not available",
        },
        { label: "State code", value: formatDisplayCode(country.code) },
      ]
    : [
        { label: "Capital", value: country.capital || "No official capital" },
        ...(country.nativeName
          ? [{ label: "Native name", value: country.nativeName }]
          : []),
        { label: "Language", value: country.languages || "Not listed" },
        { label: "Region", value: country.subregion || "Not listed" },
        { label: "Population", value: country.population > 0 ? formatPopulation(country.population) : "Not available" },
        {
          label: "Area",
          value: country.area > 0 ? `${formatPopulation(country.area)} km²` : "Not available",
        },
        { label: "Country codes", value: `${country.code} / ${country.code3}` },
      ];

  return (
    <article className="space-y-5 sm:space-y-7">
      <Suspense fallback={<div className="h-11 animate-pulse rounded-full bg-slate-200/70 dark:bg-slate-800/70" />}>
        <LibraryDetailNav
          scope={scope}
          filter={filter}
          isState={isState}
          currentCode={country.code}
        />
      </Suspense>

      <header className="overflow-hidden rounded-[1.75rem] border-2 border-teal-100 bg-white/85 shadow-sm backdrop-blur dark:border-teal-900/70 dark:bg-slate-900/85">
        <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)] sm:items-center sm:p-8">
          <div className="min-w-0">
            <p className="text-sm font-bold text-teal-700 dark:text-teal-300">
              {country.continent}
              {!isState && country.isTerritory ? " - Territory" : null}
            </p>
            <div className="mt-4 flex items-start justify-between gap-3 sm:mt-5 sm:gap-5">
              <div className="min-w-0 flex-1">
                <h1 className="break-words font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
                  {country.name}
                </h1>
                {country.officialName !== country.name ? (
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                    {country.officialName}
                  </p>
                ) : null}
              </div>
              {country.hasFlag && country.hasShape ? (
                <>
                  <FlagImage
                    code={country.code}
                    alt={`Flag of ${country.name}`}
                    width={140}
                    frame="md"
                    className="w-[5.75rem] shrink-0 sm:hidden"
                    priority
                  />
                  <FlagImage
                    code={country.code}
                    alt={`Flag of ${country.name}`}
                    width={176}
                    frame="lg"
                    className="hidden w-[8.75rem] shrink-0 sm:block lg:w-[10.5rem]"
                    priority
                  />
                </>
              ) : null}
            </div>
            <p className="mt-5 rounded-2xl bg-teal-50 p-4 text-sm font-semibold leading-relaxed text-teal-900 dark:bg-teal-950/60 dark:text-teal-200">
              {country.fact}
            </p>
          </div>

          <div className="flex min-h-56 items-center justify-center rounded-2xl bg-slate-50 p-6 dark:bg-slate-800/70 sm:min-h-72">
            <LibraryPlaceVisual
              country={country}
              variant="hero"
              visual={country.hasShape ? "shape" : "auto"}
            />
          </div>
        </div>
      </header>

      <section aria-labelledby="country-details-heading">
        <h2 id="country-details-heading" className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100">
          {isState ? "State details" : "Country details"}
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {details.map((detail) => (
            <div key={detail.label} className="rounded-2xl border-2 border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/80">
              <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">{detail.label}</dt>
              <dd className="mt-1 font-display text-base font-extrabold leading-snug text-slate-900 dark:text-slate-100 sm:text-lg">
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="neighbors-heading">
        <h2 id="neighbors-heading" className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100">
          Neighbors
        </h2>
        {neighbors.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {neighbors.map((neighbor) => (
              <Link
                key={neighbor.code}
                href={buildLibraryDetailHref(neighbor.code, scope, filter, sort)}
                className={neighborLinkClass}
              >
                {neighbor.hasFlag ? (
                  <FlagImage
                    code={neighbor.code}
                    alt=""
                    width={32}
                    frame="pill"
                    constrainedAxis="height"
                    className="h-5 w-auto shrink-0"
                  />
                ) : null}
                {neighbor.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {formatNoNeighborsMessage(country, scope)}
          </p>
        )}
      </section>

      {country.hasCapitalImage ? (
        <section aria-labelledby="capital-city-heading">
          <h2 id="capital-city-heading" className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100">
            Capital city
          </h2>
          <div className="overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/85 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
            <div className="aspect-[16/7] w-full sm:aspect-[21/9]">
              <LibraryPlaceVisual country={country} variant="hero" visual="capital" />
            </div>
            <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
              <p className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-3xl">
                {country.capital}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Capital of {country.name}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
