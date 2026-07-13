import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  countries,
  formatPopulation,
  getCountryByCode,
  getFlagPath,
  getShapePath,
  usStates,
} from "@/lib/countries";
import { isStateCode } from "@/lib/scope";

type CountryPageProps = {
  params: Promise<{ code: string }>;
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

export default async function CountryPage({ params }: CountryPageProps) {
  const { code } = await params;
  const country = getCountryByCode(code.toUpperCase());
  if (!country) notFound();
  const isState = isStateCode(country.code);

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
        { label: "State code", value: country.code },
        { label: "Status", value: "U.S. state" },
      ]
    : [
        { label: "Capital", value: country.capital || "No official capital" },
        { label: "Continent", value: country.continent },
        { label: "Region", value: country.subregion || "Not listed" },
        { label: "Population", value: country.population > 0 ? formatPopulation(country.population) : "Not available" },
        {
          label: "Area",
          value: country.area > 0 ? `${formatPopulation(country.area)} km²` : "Not available",
        },
        { label: "Country codes", value: `${country.code} / ${country.code3}` },
        { label: "Status", value: country.isTerritory ? "Territory" : "Sovereign country" },
      ];

  return (
    <article className="space-y-5 sm:space-y-7">
      <Link
        href={isState ? "/library?scope=usa" : "/library"}
        className="inline-flex min-h-11 items-center rounded-full border-2 border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-teal-400 hover:text-teal-700 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-300"
      >
        {isState ? "← All states" : "← All countries"}
      </Link>

      <header className="overflow-hidden rounded-[1.75rem] border-2 border-teal-100 bg-white/85 shadow-sm backdrop-blur dark:border-teal-900/70 dark:bg-slate-900/85">
        <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)] sm:items-center sm:p-8">
          <div>
            <div className="flex items-center gap-3">
              {country.hasFlag ? (
                <span className="w-16 shrink-0 overflow-hidden rounded-lg border-2 border-slate-200 bg-white shadow-sm dark:border-slate-700">
                  <Image
                    src={getFlagPath(country.code)}
                    alt={`Flag of ${country.name}`}
                    width={160}
                    height={120}
                    className="h-auto w-full object-contain"
                    priority
                  />
                </span>
              ) : null}
              <p className="text-sm font-bold text-teal-700 dark:text-teal-300">{country.continent}</p>
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
              {country.name}
            </h1>
            {country.officialName !== country.name ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                {country.officialName}
              </p>
            ) : null}
            <p className="mt-5 rounded-2xl bg-teal-50 p-4 text-sm font-semibold leading-relaxed text-teal-900 dark:bg-teal-950/60 dark:text-teal-200">
              {country.fact}
            </p>
          </div>

          <div className="flex min-h-56 items-center justify-center rounded-2xl bg-slate-50 p-6 dark:bg-slate-800/70 sm:min-h-72">
            {country.hasShape ? (
              // Country silhouettes are local SVG documents with their own intrinsic viewBox.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getShapePath(country.code3)}
                alt={`Outline of ${country.name}`}
                className="max-h-64 w-full object-contain [filter:brightness(0)_saturate(100%)_invert(28%)_sepia(15%)_saturate(1120%)_hue-rotate(179deg)_brightness(93%)_contrast(90%)] dark:[filter:brightness(0)_invert(1)]"
              />
            ) : (
              <p className="text-sm font-semibold text-slate-400">Shape unavailable</p>
            )}
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
                href={`/library/${neighbor.code.toLowerCase()}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-slate-200 bg-white/80 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-teal-400 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-300"
              >
                {neighbor.hasFlag ? (
                  <Image
                    src={getFlagPath(neighbor.code)}
                    alt=""
                    width={32}
                    height={24}
                    className="h-5 w-auto rounded-sm border border-slate-200 object-contain dark:border-slate-600"
                  />
                ) : null}
                {neighbor.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            This place has no land borders.
          </p>
        )}
      </section>
    </article>
  );
}
