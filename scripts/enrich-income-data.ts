import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Country } from "@/lib/types";
import {
  fetchCountryMedianHouseholdIncomeUsd,
  getStateMedianHouseholdIncomeUsd,
} from "./income-data";

const ROOT = process.cwd();
const COUNTRIES_PATH = join(ROOT, "data", "countries.json");
const STATES_PATH = join(ROOT, "data", "states.json");

async function main() {
  const incomeByCode3 = await fetchCountryMedianHouseholdIncomeUsd();
  const countries = JSON.parse(readFileSync(COUNTRIES_PATH, "utf8")) as Country[];

  let countryCount = 0;
  for (const country of countries) {
    const income = incomeByCode3.get(country.code3);
    if (income == null) {
      delete country.medianHouseholdIncomeUsd;
      continue;
    }
    country.medianHouseholdIncomeUsd = income;
    countryCount += 1;
  }

  writeFileSync(COUNTRIES_PATH, `${JSON.stringify(countries, null, 2)}\n`);

  const states = JSON.parse(readFileSync(STATES_PATH, "utf8")) as Country[];
  let stateCount = 0;
  const missingStates: string[] = [];

  for (const state of states) {
    const postal = state.code.replace(/^US-/, "");
    const income = getStateMedianHouseholdIncomeUsd(postal);
    if (income == null) {
      missingStates.push(state.code);
      delete state.medianHouseholdIncomeUsd;
      continue;
    }
    state.medianHouseholdIncomeUsd = income;
    stateCount += 1;
  }

  if (missingStates.length > 0) {
    throw new Error(`Missing state median incomes for: ${missingStates.join(", ")}`);
  }

  writeFileSync(STATES_PATH, `${JSON.stringify(states, null, 2)}\n`);

  console.log(
    `Added median household income to ${countryCount} countries and ${stateCount} states`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
