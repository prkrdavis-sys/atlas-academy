import countriesData from "@/data/countries.json";
import type { Continent, CoreQuestionType, Country, GameMode } from "@/lib/types";

export const countries = countriesData as Country[];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code || c.code3 === code);
}

export function getCountryName(code: string): string {
  return getCountryByCode(code)?.name ?? code;
}

export function filterCountries(options: {
  continents: Continent[];
  mode?: GameMode;
  weakSpotCodes?: string[];
}): Country[] {
  let pool = countries.filter((c) => options.continents.includes(c.continent as Continent));

  if (options.mode === "shape-to-country") {
    pool = pool.filter((c) => c.shapeQuizEligible);
  }

  if (options.mode === "flag-to-country" || options.mode === "country-to-flag") {
    pool = pool.filter((c) => c.hasFlag);
  }

  if (options.mode === "capital-to-country" || options.mode === "country-to-capital") {
    pool = pool.filter((c) => c.capital.length > 0);
  }

  if (options.mode === "neighbor-quiz") {
    pool = pool.filter((c) => c.borders.length > 0);
  }

  if (options.mode === "population-showdown") {
    pool = pool.filter((c) => c.population > 0 && c.hasShape && c.hasFlag);
  }

  if (options.mode === "weak-spots" && options.weakSpotCodes?.length) {
    const weakSet = new Set(options.weakSpotCodes);
    pool = pool.filter((c) => weakSet.has(c.code));
  }

  return pool;
}

export function countCountriesByContinents(continents: Continent[]): number {
  return filterCountries({ continents }).length;
}

export function getPlayablePool(options: {
  continents: Continent[];
  mode: GameMode;
  questionType?: CoreQuestionType;
  weakSpotCodes?: string[];
}): Country[] {
  const filterMode =
    options.mode === "speed-round" && options.questionType
      ? options.questionType
      : options.mode;

  return filterCountries({
    continents: options.continents,
    mode: filterMode,
    weakSpotCodes: options.weakSpotCodes,
  });
}

export function getPlayablePoolSize(options: {
  continents: Continent[];
  mode: GameMode;
  questionType?: CoreQuestionType;
  weakSpotCodes?: string[];
}): number {
  return getPlayablePool(options).length;
}

export function getFlagPath(code: string): string {
  return `/flags/${code.toLowerCase()}.svg`;
}

export function getShapePath(code3: string): string {
  return `/shapes/${code3.toLowerCase()}.svg`;
}

export function formatPopulation(population: number): string {
  return new Intl.NumberFormat("en-US").format(population);
}
