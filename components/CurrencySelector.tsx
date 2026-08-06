"use client";

import { useCurrency } from "@/components/CurrencyProvider";
import { cn } from "@/lib/utils";

function formatAsOfDate(asOf: string | null): string | null {
  if (!asOf) return null;
  const date = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function CurrencySelector() {
  const {
    selectedCurrencyCode,
    options,
    hydrated,
    ratesReady,
    ratesLoading,
    ratesError,
    ratesAsOf,
    setCurrency,
  } = useCurrency();
  const asOfDate = formatAsOfDate(ratesAsOf);

  return (
    <div className="border-t border-slate-100 px-2.5 py-2.5 dark:border-slate-800">
      <label
        htmlFor="base-currency"
        className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        Base currency
      </label>
      <select
        id="base-currency"
        value={selectedCurrencyCode}
        onChange={(event) => setCurrency(event.target.value)}
        disabled={!hydrated || !ratesReady}
        className={cn(
          "min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-200 disabled:cursor-wait disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-teal-500 dark:focus:ring-teal-900/60",
        )}
        aria-describedby="base-currency-status"
      >
        {options.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.code} - {currency.name}
          </option>
        ))}
      </select>
      <p
        id="base-currency-status"
        className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400"
        aria-live="polite"
      >
        {ratesLoading && !ratesReady
          ? "Loading daily reference rates..."
          : ratesError
            ? ratesReady
              ? ratesError
              : "Rates unavailable. USD values remain in use."
            : asOfDate
              ? `Rates as of ${asOfDate}.`
              : "Daily reference rates."}
        {" "}
        <a
          href="https://frankfurter.dev/"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:decoration-teal-700 dark:hover:text-teal-100"
        >
          Frankfurter
        </a>
      </p>
    </div>
  );
}
