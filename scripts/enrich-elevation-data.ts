import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Country } from "@/lib/types";
import {
  getCountryElevation,
  getStateElevation,
} from "./elevation-data";

const ROOT = process.cwd();
const COUNTRIES_PATH = join(ROOT, "data", "countries.json");
const STATES_PATH = join(ROOT, "data", "states.json");

function main() {
  const countries = JSON.parse(readFileSync(COUNTRIES_PATH, "utf8")) as Country[];
  let countryCount = 0;
  const missingCountries: string[] = [];

  for (const country of countries) {
    const elevation = getCountryElevation(country.code);
    if (!elevation) {
      missingCountries.push(country.code);
      continue;
    }
    country.elevation = elevation;
    countryCount += 1;
  }

  if (missingCountries.length > 0) {
    throw new Error(`Missing elevations for: ${missingCountries.join(", ")}`);
  }

  writeFileSync(COUNTRIES_PATH, `${JSON.stringify(countries, null, 2)}\n`);

  const states = JSON.parse(readFileSync(STATES_PATH, "utf8")) as Country[];
  let stateCount = 0;
  const missingStates: string[] = [];

  for (const state of states) {
    const postal = state.code.replace(/^US-/, "");
    const elevation = getStateElevation(postal);
    if (!elevation) {
      missingStates.push(state.code);
      continue;
    }
    state.elevation = elevation;
    stateCount += 1;
  }

  if (missingStates.length > 0) {
    throw new Error(`Missing state elevations for: ${missingStates.join(", ")}`);
  }

  writeFileSync(STATES_PATH, `${JSON.stringify(states, null, 2)}\n`);

  console.log(`Added elevation data to ${countryCount} countries and ${stateCount} states`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
