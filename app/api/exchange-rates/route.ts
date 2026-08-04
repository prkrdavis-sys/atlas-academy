import type { CurrencyOption, ExchangeRatesPayload } from "@/lib/currency";

const RATES_URL = "https://api.frankfurter.dev/v2/rates?base=USD";
const CURRENCIES_URL = "https://api.frankfurter.dev/v2/currencies";
const UPSTREAM_REVALIDATE_SECONDS = 86_400;

type FrankfurterRate = {
  base?: unknown;
  quote?: unknown;
  rate?: unknown;
  date?: unknown;
};

type FrankfurterCurrency = {
  iso_code?: unknown;
  name?: unknown;
  symbol?: unknown;
  end_date?: unknown;
};

const NON_CURRENCY_CODES = new Set(["XAG", "XAU", "XDR", "XPD", "XPT"]);

function isCurrencyCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseRates(payload: unknown): {
  rates: Record<string, number>;
  asOf: string | null;
} {
  if (!Array.isArray(payload)) {
    throw new Error("Frankfurter returned an invalid rates payload");
  }

  const rates: Record<string, number> = { USD: 1 };
  const dates: string[] = [];

  for (const item of payload as FrankfurterRate[]) {
    if (
      item.base !== "USD" ||
      !isCurrencyCode(item.quote) ||
      !isPositiveFiniteNumber(item.rate)
    ) {
      continue;
    }

    rates[item.quote] = item.rate;
    if (typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      dates.push(item.date);
    }
  }

  if (Object.keys(rates).length <= 1) {
    throw new Error("Frankfurter returned no usable USD rates");
  }

  return {
    rates,
    asOf: dates.toSorted().at(-1) ?? null,
  };
}

function parseCurrencies(payload: unknown, rates: Record<string, number>): CurrencyOption[] {
  if (!Array.isArray(payload)) {
    throw new Error("Frankfurter returned an invalid currencies payload");
  }

  const currencies: CurrencyOption[] = [];

  for (const item of payload as FrankfurterCurrency[]) {
    const code = item.iso_code;
    if (
      !isCurrencyCode(code) ||
      NON_CURRENCY_CODES.has(code) ||
      !Object.hasOwn(rates, code) ||
      typeof item.name !== "string" ||
      typeof item.symbol !== "string"
    ) {
      continue;
    }

    currencies.push({
      code,
      name: item.name,
      symbol: item.symbol,
    });
  }

  if (!currencies.some((currency) => currency.code === "USD")) {
    currencies.push({
      code: "USD",
      name: "United States Dollar",
      symbol: "$",
    });
  }

  return currencies.toSorted((a, b) => a.name.localeCompare(b.name));
}

async function fetchUpstream(url: string): Promise<unknown> {
  const response = await fetch(url, {
    next: { revalidate: UPSTREAM_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Frankfurter request failed with status ${response.status}`);
  }

  return response.json();
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [ratesPayload, currenciesPayload] = await Promise.all([
      fetchUpstream(RATES_URL),
      fetchUpstream(CURRENCIES_URL),
    ]);
    const { rates, asOf } = parseRates(ratesPayload);
    const currencies = parseCurrencies(currenciesPayload, rates);

    const payload: ExchangeRatesPayload = {
      baseCode: "USD",
      rates,
      currencies,
      asOf,
      source: {
        name: "Frankfurter",
        url: "https://frankfurter.dev/",
      },
    };

    return Response.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return Response.json(
      { error: "Exchange rates are temporarily unavailable." },
      { status: 502 },
    );
  }
}
