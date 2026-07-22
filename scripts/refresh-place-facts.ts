/** Updates fact + factQuestion in data/countries.json and data/states.json from place-facts.ts */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  COUNTRY_FACTS,
  STATE_FACTS,
  getCountryFact,
  getCountryFactQuestion,
  getStateFact,
  getStateFactQuestion,
} from "./place-facts";

type PlaceRow = {
  code3?: string;
  code: string;
  name: string;
  fact: string;
  factQuestion: string;
};

const ROOT = process.cwd();

function updateCountries() {
  const path = join(ROOT, "data", "countries.json");
  const countries = JSON.parse(readFileSync(path, "utf8")) as PlaceRow[];

  for (const country of countries) {
    const code3 = country.code3 ?? country.code;
    const fact = getCountryFact(code3);
    const question = getCountryFactQuestion(code3);
    if (!fact || !question) {
      throw new Error(`Missing fact data for ${country.name} (${code3})`);
    }
    country.fact = fact;
    country.factQuestion = question;
  }

  const codes = new Set(countries.map((c) => (c.code3 ?? c.code).toUpperCase()));
  for (const code of Object.keys(COUNTRY_FACTS)) {
    if (!codes.has(code)) {
      throw new Error(`Curated country fact has no matching row: ${code}`);
    }
  }

  writeFileSync(path, `${JSON.stringify(countries, null, 2)}\n`);
  console.log(`Updated ${countries.length} countries in data/countries.json`);
}

function updateStates() {
  const path = join(ROOT, "data", "states.json");
  const states = JSON.parse(readFileSync(path, "utf8")) as PlaceRow[];

  for (const state of states) {
    const fact = getStateFact(state.code);
    const question = getStateFactQuestion(state.code);
    if (!fact || !question) {
      throw new Error(`Missing fact data for ${state.name} (${state.code})`);
    }
    state.fact = fact;
    state.factQuestion = question;
  }

  const codes = new Set(states.map((s) => s.code.toUpperCase()));
  for (const code of Object.keys(STATE_FACTS)) {
    if (!codes.has(code)) {
      throw new Error(`Curated state fact has no matching row: ${code}`);
    }
  }

  writeFileSync(path, `${JSON.stringify(states, null, 2)}\n`);
  console.log(`Updated ${states.length} states in data/states.json`);
}

updateCountries();
updateStates();
