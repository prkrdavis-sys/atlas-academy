import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Country } from "@/lib/types";
import {
  fetchSourceCountries,
  pickPrimaryTimezone,
  STATE_TIMEZONES,
} from "./timezone-data";

const ROOT = process.cwd();
const COUNTRIES_PATH = join(ROOT, "data", "countries.json");
const STATES_PATH = join(ROOT, "data", "states.json");

async function main() {
  const sourceCountries = await fetchSourceCountries();
  const timezoneByCode = new Map(
    sourceCountries.flatMap((raw) => {
      const timezone = pickPrimaryTimezone(raw);
      return timezone ? [[raw.iso2.toUpperCase(), timezone] as const] : [];
    }),
  );

  const countries = JSON.parse(readFileSync(COUNTRIES_PATH, "utf8")) as Country[];
  let countryCount = 0;
  const missingCountries: string[] = [];

  for (const country of countries) {
    const timezone = timezoneByCode.get(country.code);
    if (!timezone) {
      missingCountries.push(country.code);
      continue;
    }
    country.timezone = timezone;
    countryCount += 1;
  }

  if (missingCountries.length > 0) {
    throw new Error(`Missing timezones for: ${missingCountries.join(", ")}`);
  }

  writeFileSync(COUNTRIES_PATH, `${JSON.stringify(countries, null, 2)}\n`);

  const states = JSON.parse(readFileSync(STATES_PATH, "utf8")) as Country[];
  let stateCount = 0;
  const missingStates: string[] = [];

  for (const state of states) {
    const postal = state.code.replace(/^US-/, "");
    const timezone = STATE_TIMEZONES[postal];
    if (!timezone) {
      missingStates.push(state.code);
      continue;
    }
    state.timezone = timezone;
    stateCount += 1;
  }

  if (missingStates.length > 0) {
    throw new Error(`Missing state timezones for: ${missingStates.join(", ")}`);
  }

  writeFileSync(STATES_PATH, `${JSON.stringify(states, null, 2)}\n`);

  console.log(`Added timezone data to ${countryCount} countries and ${stateCount} states`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
