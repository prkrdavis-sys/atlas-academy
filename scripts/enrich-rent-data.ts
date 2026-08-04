import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Country } from "@/lib/types";
import { fetchCountryMedianRentUsd, getStateMedianRentUsd } from "./rent-data";

const ROOT = process.cwd();
const COUNTRIES_PATH = join(ROOT, "data", "countries.json");
const STATES_PATH = join(ROOT, "data", "states.json");

async function main() {
  const countries = JSON.parse(readFileSync(COUNTRIES_PATH, "utf8")) as Country[];
  const rentByCode = await fetchCountryMedianRentUsd(
    countries.map((country) => ({ code: country.code, name: country.name })),
  );

  let countryCount = 0;
  for (const country of countries) {
    const rent = rentByCode.get(country.code);
    if (rent == null) {
      delete country.medianRentUsd;
      continue;
    }
    country.medianRentUsd = rent;
    countryCount += 1;
  }

  writeFileSync(COUNTRIES_PATH, `${JSON.stringify(countries, null, 2)}\n`);

  const states = JSON.parse(readFileSync(STATES_PATH, "utf8")) as Country[];
  let stateCount = 0;
  const missingStates: string[] = [];

  for (const state of states) {
    const postal = state.code.replace(/^US-/, "");
    const rent = getStateMedianRentUsd(postal);
    if (rent == null) {
      missingStates.push(state.code);
      delete state.medianRentUsd;
      continue;
    }
    state.medianRentUsd = rent;
    stateCount += 1;
  }

  if (missingStates.length > 0) {
    throw new Error(`Missing state median rents for: ${missingStates.join(", ")}`);
  }

  writeFileSync(STATES_PATH, `${JSON.stringify(states, null, 2)}\n`);

  console.log(`Added median rent to ${countryCount} countries and ${stateCount} states`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
