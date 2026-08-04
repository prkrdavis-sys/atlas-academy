import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Country } from "@/lib/types";
import {
  getCountryEcosystem,
  getStateEcosystem,
} from "./ecosystem-data";

const ROOT = process.cwd();
const COUNTRIES_PATH = join(ROOT, "data", "countries.json");
const STATES_PATH = join(ROOT, "data", "states.json");

function main() {
  const countries = JSON.parse(readFileSync(COUNTRIES_PATH, "utf8")) as Country[];
  let countryCount = 0;
  const missingCountries: string[] = [];

  for (const country of countries) {
    const ecosystem = getCountryEcosystem(country.code);
    if (!ecosystem) {
      missingCountries.push(country.code);
      continue;
    }
    country.ecosystem = ecosystem;
    countryCount += 1;
  }

  if (missingCountries.length > 0) {
    throw new Error(`Missing ecosystems for: ${missingCountries.join(", ")}`);
  }

  writeFileSync(COUNTRIES_PATH, `${JSON.stringify(countries, null, 2)}\n`);

  const states = JSON.parse(readFileSync(STATES_PATH, "utf8")) as Country[];
  let stateCount = 0;
  const missingStates: string[] = [];

  for (const state of states) {
    const postal = state.code.replace(/^US-/, "");
    const ecosystem = getStateEcosystem(postal);
    if (!ecosystem) {
      missingStates.push(state.code);
      continue;
    }
    state.ecosystem = ecosystem;
    stateCount += 1;
  }

  if (missingStates.length > 0) {
    throw new Error(`Missing state ecosystems for: ${missingStates.join(", ")}`);
  }

  writeFileSync(STATES_PATH, `${JSON.stringify(states, null, 2)}\n`);

  console.log(`Added ecosystem data to ${countryCount} countries and ${stateCount} states`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
