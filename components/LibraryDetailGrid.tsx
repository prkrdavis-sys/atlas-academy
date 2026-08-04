"use client";

import { useCurrency } from "@/components/CurrencyProvider";
import { LocalTimeChip } from "@/components/LocalTimeChip";
import { formatAirportChip } from "@/lib/airport";
import {
  formatAltitudeRange,
  formatPopulation,
} from "@/lib/countries";
import {
  formatCurrencyChipLabel,
  formatCurrencyChipValue,
  getUsdToCurrencyRate,
} from "@/lib/currency";
import { formatMedianHouseholdIncome, formatMedianRent } from "@/lib/income";
import { formatDisplayCode } from "@/lib/scope";
import type { Country } from "@/lib/types";

type LibraryDetail = {
  label: string;
  value: string;
  descriptor?: string;
};

type LibraryDetailGridProps = {
  country: Country;
  isState: boolean;
};

export function LibraryDetailGrid({ country, isState }: LibraryDetailGridProps) {
  const { displayCurrencyCode, displayCurrency, displayRate, rates } = useCurrency();

  const airportDetails: LibraryDetail[] = country.largestAirport
    ? [{ label: "Largest airport", value: formatAirportChip(country.largestAirport) }]
    : country.travelAccess
      ? [
          { label: "Typical travel", value: country.travelAccess.mode },
          { label: "Travel from", value: country.travelAccess.from },
        ]
      : [];

  const altitudeDetail: LibraryDetail[] = country.elevation
    ? [{ label: "Altitude range", value: formatAltitudeRange(country.elevation) }]
    : [];

  const ecosystemDetail: LibraryDetail[] = country.ecosystem
    ? [{ label: "Ecosystem", value: country.ecosystem }]
    : [];

  const incomeDetail: LibraryDetail[] =
    country.medianHouseholdIncomeUsd != null
      ? [
          {
            label: "Median household income",
            value: formatMedianHouseholdIncome(
              country.medianHouseholdIncomeUsd,
              displayCurrencyCode,
              displayRate,
            ),
            descriptor: `${displayCurrencyCode} equivalent`,
          },
        ]
      : [];

  const rentDetail: LibraryDetail[] =
    country.medianRentUsd != null
      ? [
          {
            label: "Median rent",
            value: formatMedianRent(country.medianRentUsd, displayCurrencyCode, displayRate),
            descriptor: `${displayCurrencyCode} equivalent`,
          },
        ]
      : [];

  const currencyDetails: LibraryDetail[] = country.currency
    ? [
        {
          label: formatCurrencyChipLabel(
            country.currency,
            displayCurrencyCode,
            displayCurrency.symbol,
            getUsdToCurrencyRate(
              country.currency.code,
              rates,
              country.currency.usdRate,
            ),
          ),
          value: formatCurrencyChipValue(country.currency, displayCurrencyCode, rates),
        },
      ]
    : [];

  const emblemDetails: LibraryDetail[] = [
    ...(country.bird
      ? [{ label: isState ? "State bird" : "National bird", value: country.bird }]
      : []),
    ...(country.plant
      ? [{ label: isState ? "State flower" : "National flower", value: country.plant }]
      : []),
  ];

  const details: LibraryDetail[] = isState
    ? [
        { label: "Capital", value: country.capital || "No official capital" },
        { label: "Region", value: country.continent },
        { label: "Division", value: country.subregion || "Not listed" },
        {
          label: "Population",
          value: country.population > 0 ? formatPopulation(country.population) : "Not available",
        },
        {
          label: "Area",
          value: country.area > 0 ? `${formatPopulation(country.area)} km²` : "Not available",
        },
        ...incomeDetail,
        ...rentDetail,
        ...altitudeDetail,
        ...ecosystemDetail,
        ...emblemDetails,
        { label: "State code", value: formatDisplayCode(country.code) },
        ...airportDetails,
      ]
    : [
        { label: "Capital", value: country.capital || "No official capital" },
        ...(country.nativeName
          ? [{ label: "Native name", value: country.nativeName }]
          : []),
        { label: "Language", value: country.languages || "Not listed" },
        ...currencyDetails,
        { label: "Region", value: country.subregion || "Not listed" },
        {
          label: "Population",
          value: country.population > 0 ? formatPopulation(country.population) : "Not available",
        },
        {
          label: "Area",
          value: country.area > 0 ? `${formatPopulation(country.area)} km²` : "Not available",
        },
        ...incomeDetail,
        ...rentDetail,
        ...altitudeDetail,
        ...ecosystemDetail,
        ...emblemDetails,
        { label: "Country codes", value: `${country.code} / ${country.code3}` },
        ...airportDetails,
      ];

  return (
    <section aria-labelledby="country-details-heading">
      <h2
        id="country-details-heading"
        className="mb-3 font-display text-xl font-extrabold text-slate-800 dark:text-slate-100"
      >
        {isState ? "State details" : "Country details"}
      </h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {details.flatMap((detail, index) => {
          const chip = (
            <div
              key={detail.label}
              className="rounded-2xl border-2 border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/80"
            >
              <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">{detail.label}</dt>
              <dd className="mt-1 font-display text-base font-extrabold leading-snug text-slate-900 dark:text-slate-100 sm:text-lg">
                <span className="block">{detail.value}</span>
                {detail.descriptor ? (
                  <span className="mt-0.5 block text-xs font-bold text-slate-500 dark:text-slate-400 sm:text-sm">
                    {detail.descriptor}
                  </span>
                ) : null}
              </dd>
            </div>
          );
          if (index === 0 && country.timezone) {
            return [chip, <LocalTimeChip key="local-time" timeZone={country.timezone} />];
          }
          return [chip];
        })}
      </dl>
    </section>
  );
}
