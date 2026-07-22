import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Country } from "@/lib/types";
import {
  attachUsdRate,
  fetchUsdExchangeRates,
  pickPrimaryCurrency,
} from "./currency-data";

type RawCountry = {
  cca2: string;
  currencies?: Record<string, { name: string; symbol: string }>;
};

const ROOT = process.cwd();
const COUNTRIES_PATH = join(ROOT, "data", "countries.json");

async function main() {
  const response = await fetch(
    "https://raw.githubusercontent.com/mledoze/countries/master/countries.json",
  );
  if (!response.ok) throw new Error("Failed to fetch mledoze countries.json");

  const rawCountries = (await response.json()) as RawCountry[];
  const currencyByCode2 = new Map(
    rawCountries.map((raw) => [
      raw.cca2.toUpperCase(),
      pickPrimaryCurrency(raw.cca2.toUpperCase(), raw.currencies),
    ]),
  );

  const rates = await fetchUsdExchangeRates();
  const countries = JSON.parse(readFileSync(COUNTRIES_PATH, "utf8")) as Country[];

  let enriched = 0;
  for (const country of countries) {
    const currency = currencyByCode2.get(country.code);
    if (!currency) continue;
    country.currency = attachUsdRate(currency, rates);
    enriched += 1;
  }

  writeFileSync(COUNTRIES_PATH, JSON.stringify(countries, null, 2));
  console.log(`Added currency data to ${enriched} countries`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
