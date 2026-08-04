import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Country } from "@/lib/types";
import { getCountryEmblems, getStateEmblems } from "./bird-plant-data";

const ROOT = process.cwd();
const COUNTRIES_PATH = join(ROOT, "data", "countries.json");
const STATES_PATH = join(ROOT, "data", "states.json");

function applyEmblems(
  place: Country,
  emblems: { bird?: string; plant?: string } | undefined,
): boolean {
  if (!emblems) {
    delete place.bird;
    delete place.plant;
    return false;
  }
  if (emblems.bird) place.bird = emblems.bird;
  else delete place.bird;
  if (emblems.plant) place.plant = emblems.plant;
  else delete place.plant;
  return Boolean(emblems.bird || emblems.plant);
}

function main() {
  const countries = JSON.parse(readFileSync(COUNTRIES_PATH, "utf8")) as Country[];
  let countryCount = 0;

  for (const country of countries) {
    if (applyEmblems(country, getCountryEmblems(country.code))) {
      countryCount += 1;
    }
  }

  writeFileSync(COUNTRIES_PATH, `${JSON.stringify(countries, null, 2)}\n`);

  const states = JSON.parse(readFileSync(STATES_PATH, "utf8")) as Country[];
  let stateCount = 0;
  const missingStates: string[] = [];

  for (const state of states) {
    const postal = state.code.replace(/^US-/, "");
    const emblems = getStateEmblems(postal);
    if (!emblems?.bird || !emblems.plant) {
      missingStates.push(state.code);
      continue;
    }
    applyEmblems(state, emblems);
    stateCount += 1;
  }

  if (missingStates.length > 0) {
    throw new Error(`Missing state bird/plant for: ${missingStates.join(", ")}`);
  }

  writeFileSync(STATES_PATH, `${JSON.stringify(states, null, 2)}\n`);

  console.log(`Added bird/plant data to ${countryCount} countries and ${stateCount} states`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
