import type { CountryCurrency } from "@/lib/types";

function formatConversionAmount(amount: number): string {
  if (amount >= 1000) return new Intl.NumberFormat("en-US").format(Math.round(amount));
  if (amount >= 100) return Math.round(amount).toString();
  if (amount >= 10) return Number.isInteger(amount) ? amount.toString() : amount.toFixed(1);
  if (amount >= 1) return Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
  return amount.toFixed(3);
}

export function formatCurrencyChipLabel(currency: CountryCurrency): string {
  if (currency.usdRate == null && currency.code !== "USD") return "Currency";
  return "Currency · $1";
}

export function formatCurrencyChipValue(currency: CountryCurrency): string {
  if (currency.usdRate == null) return currency.name;

  const amount = currency.code === "USD" ? "1" : formatConversionAmount(currency.usdRate);
  return `${currency.name} - ${amount}`;
}
