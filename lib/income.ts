import { formatCurrencyAmount } from "@/lib/currency";

/** Formats a median household income chip value in the selected display currency. */
export function formatMedianHouseholdIncome(
  amountUsd: number,
  currencyCode: string,
  usdToCurrencyRate: number,
): string {
  return formatCurrencyAmount(amountUsd * usdToCurrencyRate, currencyCode);
}

/** Formats a median monthly rent chip value in the selected display currency. */
export function formatMedianRent(
  amountUsd: number,
  currencyCode: string,
  usdToCurrencyRate: number,
): string {
  return `${formatCurrencyAmount(amountUsd * usdToCurrencyRate, currencyCode)}/mo`;
}

/** Formats a median household income chip value as a whole-dollar USD amount. */
export function formatMedianHouseholdIncomeUsd(amount: number): string {
  return formatMedianHouseholdIncome(amount, "USD", 1);
}

/** Formats a median monthly rent chip value as whole-dollar USD per month. */
export function formatMedianRentUsd(amount: number): string {
  return formatMedianRent(amount, "USD", 1);
}
