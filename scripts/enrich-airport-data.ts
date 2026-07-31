import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Country } from "@/lib/types";
import {
  COUNTRIES_WITHOUT_AIRPORT,
  getCountryAirport,
  getCountryTravelAccess,
  getStateAirport,
} from "./airport-data";

const ROOT = process.cwd();
const COUNTRIES_PATH = join(ROOT, "data", "countries.json");
const STATES_PATH = join(ROOT, "data", "states.json");

function main() {
  const countries = JSON.parse(readFileSync(COUNTRIES_PATH, "utf8")) as Country[];
  let countryCount = 0;
  const missingCountries: string[] = [];

  for (const country of countries) {
    const airport = getCountryAirport(country.code);
    if (airport) {
      country.largestAirport = airport;
      delete country.travelAccess;
      countryCount += 1;
      continue;
    }

    if (COUNTRIES_WITHOUT_AIRPORT.has(country.code)) {
      delete country.largestAirport;
      const travelAccess = getCountryTravelAccess(country.code);
      if (!travelAccess) {
        missingCountries.push(country.code);
        continue;
      }
      country.travelAccess = travelAccess;
      continue;
    }

    delete country.travelAccess;
    missingCountries.push(country.code);
  }

  if (missingCountries.length > 0) {
    throw new Error(`Missing airport mapping for: ${missingCountries.join(", ")}`);
  }

  writeFileSync(COUNTRIES_PATH, `${JSON.stringify(countries, null, 2)}\n`);

  const states = JSON.parse(readFileSync(STATES_PATH, "utf8")) as Country[];
  let stateCount = 0;
  const missingStates: string[] = [];

  for (const state of states) {
    const postal = state.code.replace(/^US-/, "");
    const airport = getStateAirport(postal);
    if (!airport) {
      missingStates.push(state.code);
      continue;
    }
    state.largestAirport = airport;
    stateCount += 1;
  }

  if (missingStates.length > 0) {
    throw new Error(`Missing state airport mapping for: ${missingStates.join(", ")}`);
  }

  writeFileSync(STATES_PATH, `${JSON.stringify(states, null, 2)}\n`);

  console.log(
    `Added airport data to ${countryCount} countries (${COUNTRIES_WITHOUT_AIRPORT.size} without airports) and ${stateCount} states`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
