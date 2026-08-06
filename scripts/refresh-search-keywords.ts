import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getCountrySearchKeywords,
  getStateSearchKeywords,
} from "./place-search-keywords";
import type { Country } from "../lib/types";

const DATA_DIR = join(process.cwd(), "data");

function readPlaces(filename: string): Country[] {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), "utf8")) as Country[];
}

function writePlaces(filename: string, places: Country[]): void {
  writeFileSync(join(DATA_DIR, filename), `${JSON.stringify(places, null, 2)}\n`);
}

const countries = readPlaces("countries.json").map((place) => ({
  ...place,
  searchKeywords: getCountrySearchKeywords(place.code3),
}));

const states = readPlaces("states.json").map((place) => ({
  ...place,
  searchKeywords: getStateSearchKeywords(place.code),
}));

writePlaces("countries.json", countries);
writePlaces("states.json", states);

console.log(
  `Updated search keywords for ${countries.length} countries and ${states.length} states`,
);
