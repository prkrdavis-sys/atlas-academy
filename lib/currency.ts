import type { CountryCurrency } from "@/lib/types";

export const DEFAULT_CURRENCY_CODE = "USD";
export const CURRENCY_STORAGE_KEY = "atlas-academy-currency";
export const CURRENCY_RATES_STORAGE_KEY = "atlas-academy-currency-rates";
export const CURRENCY_CHANGE_EVENT = "atlas-academy-currency-change";
export const CURRENCY_RATES_REFRESH_MS = 86_400_000;

export type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
};

export type CurrencyRateMap = Record<string, number>;

export type ExchangeRatesPayload = {
  baseCode: "USD";
  rates: CurrencyRateMap;
  currencies: CurrencyOption[];
  asOf: string | null;
  source: {
    name: string;
    url: string;
  };
};

export function isCurrencyCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value);
}

export function getUsdToCurrencyRate(
  code: string,
  rates: CurrencyRateMap,
  fallback?: number,
): number | undefined {
  if (code === DEFAULT_CURRENCY_CODE) return 1;
  const rate = rates[code];
  return Number.isFinite(rate) && rate > 0 ? rate : fallback;
}

export function formatCurrencyAmount(
  amount: number,
  code: string,
  maximumFractionDigits = 0,
): string {
  if (!Number.isFinite(amount)) return "Not available";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits,
    }).format(amount);
  } catch {
    return `${code} ${new Intl.NumberFormat("en-US", {
      maximumFractionDigits,
    }).format(amount)}`;
  }
}

export function formatCurrencyCodeAmount(amount: number, code: string): string {
  if (!Number.isFinite(amount)) return "Not available";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "code",
      maximumFractionDigits: 3,
    }).format(amount);
  } catch {
    return `${code} ${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 3,
    }).format(amount)}`;
  }
}

export function formatCurrencyUnitLabel(code: string, symbol?: string): string {
  const trimmedSymbol = symbol?.trim();
  return trimmedSymbol ? `${trimmedSymbol}1` : `${code} 1`;
}

export function formatCurrencyChipLabel(
  currency: CountryCurrency,
  baseCode = DEFAULT_CURRENCY_CODE,
  baseSymbol = "$",
  localUsdRate = currency.code === DEFAULT_CURRENCY_CODE ? 1 : currency.usdRate,
): string {
  if (localUsdRate == null) return "Currency";
  return `Currency · ${formatCurrencyUnitLabel(baseCode, baseSymbol)} equivalent`;
}

export function formatCurrencyChipValue(
  currency: CountryCurrency,
  baseCode = DEFAULT_CURRENCY_CODE,
  rates: CurrencyRateMap = {},
): string {
  const localUsdRate = getUsdToCurrencyRate(currency.code, rates, currency.usdRate);
  const baseUsdRate = getUsdToCurrencyRate(baseCode, rates);
  if (localUsdRate == null || baseUsdRate == null) return currency.name;

  const amount = localUsdRate / baseUsdRate;
  return `${currency.name} - ${formatCurrencyCodeAmount(amount, currency.code)}`;
}
