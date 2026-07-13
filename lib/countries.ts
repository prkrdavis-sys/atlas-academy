import countriesData from "@/data/countries.json";
import {
  CORE_QUESTION_TYPES,
  SPEED_ROUND_ALL_TYPES,
  type Continent,
  type CoreQuestionType,
  type Country,
  type GameMode,
  type SpeedRoundQuestionType,
} from "@/lib/types";

export const countries = countriesData as Country[];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code || c.code3 === code);
}

export function getCountryName(code: string): string {
  return getCountryByCode(code)?.name ?? code;
}

export function filterCountries(options: {
  continents: Continent[];
  territoryContinents?: Continent[];
  mode?: GameMode;
  weakSpotCodes?: string[];
}): Country[] {
  const territoryContinents = options.territoryContinents ?? [];
  const sovereignPool = options.continents.length > 0
    ? countries.filter(
        (c) =>
          !c.isTerritory && options.continents.includes(c.continent as Continent),
      )
    : [];
  const territoryPool = territoryContinents.length > 0
    ? countries.filter(
        (c) =>
          c.isTerritory && territoryContinents.includes(c.continent as Continent),
      )
    : [];

  let pool = [...sovereignPool, ...territoryPool];

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

export function countSovereignCountriesByContinents(continents: Continent[]): number {
  return countries.filter(
    (c) => !c.isTerritory && continents.includes(c.continent as Continent),
  ).length;
}

export function countTerritoriesByContinents(continents: Continent[]): number {
  if (continents.length === 0) return 0;

  return countries.filter(
    (c) => c.isTerritory && continents.includes(c.continent as Continent),
  ).length;
}

export function countPlayableCountries(options: {
  continents: Continent[];
  territoryContinents?: Continent[];
  mode?: GameMode;
  weakSpotCodes?: string[];
}): number {
  return filterCountries(options).length;
}

export function getEligibleCoreQuestionTypes(country: Country): CoreQuestionType[] {
  const types: CoreQuestionType[] = [];
  if (country.hasFlag) types.push("flag-to-country");
  if (country.capital.length > 0) {
    types.push("capital-to-country", "country-to-capital");
  }
  if (country.shapeQuizEligible) types.push("shape-to-country");
  return types;
}

export function getMixedCoreQuestionPool(options: {
  continents: Continent[];
  territoryContinents?: Continent[];
  weakSpotCodes?: string[];
}): Country[] {
  const byCode = new Map<string, Country>();
  for (const type of CORE_QUESTION_TYPES) {
    for (const country of filterCountries({
      continents: options.continents,
      territoryContinents: options.territoryContinents,
      mode: type,
      weakSpotCodes: options.weakSpotCodes,
    })) {
      byCode.set(country.code, country);
    }
  }
  return [...byCode.values()];
}

export function getPlayablePool(options: {
  continents: Continent[];
  territoryContinents?: Continent[];
  mode: GameMode;
  questionType?: SpeedRoundQuestionType;
  weakSpotCodes?: string[];
}): Country[] {
  if (
    options.mode === "mixed" ||
    (options.mode === "speed-round" && options.questionType === SPEED_ROUND_ALL_TYPES)
  ) {
    return getMixedCoreQuestionPool({
      continents: options.continents,
      territoryContinents: options.territoryContinents,
      weakSpotCodes: options.weakSpotCodes,
    });
  }

  const filterMode: GameMode =
    options.mode === "speed-round" &&
    options.questionType &&
    options.questionType !== SPEED_ROUND_ALL_TYPES
      ? options.questionType
      : options.mode;

  return filterCountries({
    continents: options.continents,
    territoryContinents: options.territoryContinents,
    mode: filterMode,
    weakSpotCodes: options.weakSpotCodes,
  });
}

export function getPlayablePoolSize(options: {
  continents: Continent[];
  territoryContinents?: Continent[];
  mode: GameMode;
  questionType?: SpeedRoundQuestionType;
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

export function formatBorderFact(borderCount: number): string {
  return `It borders ${borderCount} countr${borderCount === 1 ? "y" : "ies"}.`;
}
