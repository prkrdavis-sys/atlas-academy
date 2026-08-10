"use client";

import { useCurrency } from "@/components/CurrencyProvider";
import { LocalTimeChip } from "@/components/LocalTimeChip";
import { GLASS_INSET_CLASS, GLASS_PANEL_CLASS } from "@/lib/glass";
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
  icon: string;
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
    ? [{ icon: "✈️", label: "Largest airport", value: formatAirportChip(country.largestAirport) }]
    : country.travelAccess
      ? [
          { icon: "🧳", label: "Typical travel", value: country.travelAccess.mode },
          { icon: "📍", label: "Travel from", value: country.travelAccess.from },
        ]
      : [];

  const altitudeDetail: LibraryDetail[] = country.elevation
    ? [{ icon: "⛰️", label: "Altitude range", value: formatAltitudeRange(country.elevation) }]
    : [];

  const ecosystemDetail: LibraryDetail[] = country.ecosystem
    ? [{ icon: "🌿", label: "Ecosystem", value: country.ecosystem }]
    : [];

  const incomeDetail: LibraryDetail[] =
    country.medianHouseholdIncomeUsd != null
      ? [
          {
            icon: "💵",
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
            icon: "🏠",
            label: "Median rent",
            value: formatMedianRent(country.medianRentUsd, displayCurrencyCode, displayRate),
            descriptor: `${displayCurrencyCode} equivalent`,
          },
        ]
      : [];

  const currencyDetails: LibraryDetail[] = country.currency
    ? [
        {
          icon: "💱",
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
      ? [{ icon: "🐦", label: isState ? "State bird" : "National bird", value: country.bird }]
      : []),
    ...(country.plant
      ? [{ icon: "🌸", label: isState ? "State flower" : "National flower", value: country.plant }]
      : []),
  ];

  const details: LibraryDetail[] = isState
    ? [
        { icon: "🏛️", label: "Capital", value: country.capital || "No official capital" },
        { icon: "🌍", label: "Region", value: country.continent },
        { icon: "🗺️", label: "Division", value: country.subregion || "Not listed" },
        {
          icon: "👥",
          label: "Population",
          value: country.population > 0 ? formatPopulation(country.population) : "Not available",
        },
        {
          icon: "📐",
          label: "Area",
          value: country.area > 0 ? `${formatPopulation(country.area)} km²` : "Not available",
        },
        ...incomeDetail,
        ...rentDetail,
        ...altitudeDetail,
        ...ecosystemDetail,
        ...emblemDetails,
        { icon: "🏷️", label: "State code", value: formatDisplayCode(country.code) },
        ...airportDetails,
      ]
    : [
        { icon: "🏛️", label: "Capital", value: country.capital || "No official capital" },
        ...(country.nativeName
          ? [{ icon: "🌎", label: "Native name", value: country.nativeName }]
          : []),
        { icon: "🗣️", label: "Language", value: country.languages || "Not listed" },
        ...currencyDetails,
        { icon: "🌍", label: "Region", value: country.subregion || "Not listed" },
        {
          icon: "👥",
          label: "Population",
          value: country.population > 0 ? formatPopulation(country.population) : "Not available",
        },
        {
          icon: "📐",
          label: "Area",
          value: country.area > 0 ? `${formatPopulation(country.area)} km²` : "Not available",
        },
        ...incomeDetail,
        ...rentDetail,
        ...altitudeDetail,
        ...ecosystemDetail,
        ...emblemDetails,
        { icon: "🏷️", label: "Country codes", value: `${country.code} / ${country.code3}` },
        ...airportDetails,
      ];

  return (
    <section
      aria-labelledby="country-details-heading"
      className={`${GLASS_PANEL_CLASS} rounded-[1.75rem] p-4 sm:p-5`}
    >
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
              className={`${GLASS_INSET_CLASS} rounded-2xl p-4`}
            >
              <dt className="flex items-start gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span aria-hidden="true" className="shrink-0 text-sm leading-none">
                  {detail.icon}
                </span>
                <span>{detail.label}</span>
              </dt>
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
