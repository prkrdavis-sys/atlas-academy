import type { CountryCurrency } from "@/lib/types";

type RawCurrency = {
  name: string;
  symbol: string;
};

type RawCountryCurrencies = Record<string, RawCurrency>;

/** Prefer the local currency when a place lists USD alongside its own. */
const PRIMARY_CURRENCY_OVERRIDES: Record<string, string> = {
  CU: "CUP",
  ZW: "USD",
};

/** Places where mledoze omits currency metadata. */
const CURRENCY_OVERRIDES: Record<string, CountryCurrency> = {
  FM: { code: "USD", name: "United States dollar", symbol: "$" },
};

/** Currencies without a public market rate — use a fixed or derived value. */
const USD_RATE_OVERRIDES: Record<string, number> = {
  CUC: 1,
};

export function pickPrimaryCurrency(
  code2: string,
  currencies?: RawCountryCurrencies,
): CountryCurrency | undefined {
  const override = CURRENCY_OVERRIDES[code2];
  if (override) return override;

  if (!currencies) return undefined;

  const entries = Object.entries(currencies);
  if (entries.length === 0) return undefined;

  const overrideCode = PRIMARY_CURRENCY_OVERRIDES[code2];
  if (overrideCode && currencies[overrideCode]) {
    const entry = currencies[overrideCode];
    return { code: overrideCode, name: entry.name, symbol: entry.symbol };
  }

  const nonUsd = entries.find(([code]) => code !== "USD");
  const [code, entry] = nonUsd ?? entries[0];
  return { code, name: entry.name, symbol: entry.symbol };
}

export async function fetchUsdExchangeRates(): Promise<Map<string, number>> {
  const response = await fetch("https://api.frankfurter.dev/v2/rates?base=USD");
  if (!response.ok) throw new Error("Failed to fetch USD exchange rates");

  const payload = (await response.json()) as Array<{
    base?: unknown;
    quote?: unknown;
    rate?: unknown;
  }>;
  if (!Array.isArray(payload)) {
    throw new Error("Unexpected exchange rate response");
  }

  const rates = new Map<string, number>([["USD", 1]]);

  for (const item of payload) {
    if (
      item.base === "USD" &&
      typeof item.quote === "string" &&
      typeof item.rate === "number" &&
      Number.isFinite(item.rate) &&
      item.rate > 0
    ) {
      rates.set(item.quote, item.rate);
    }
  }

  for (const [code, rate] of Object.entries(USD_RATE_OVERRIDES)) {
    rates.set(code, rate);
  }

  return rates;
}

export function attachUsdRate(
  currency: CountryCurrency,
  rates: Map<string, number>,
): CountryCurrency {
  const usdRate = rates.get(currency.code);
  return usdRate == null ? currency : { ...currency, usdRate };
}
