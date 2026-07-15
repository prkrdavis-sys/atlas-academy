import countriesData from "@/data/countries.json";
import statesData from "@/data/states.json";
import {
  CONTINENTS,
  MIXED_QUESTION_TYPES,
  SPEED_ROUND_ALL_TYPES,
  US_REGIONS,
  type CoreQuestionType,
  type Country,
  type GameMode,
  type GameScope,
  type MixedQuestionType,
  type Region,
  type SpeedRoundQuestionType,
} from "@/lib/types";

export const countries = countriesData as Country[];
export const usStates = statesData as Country[];

// State codes (US-XX) never collide with ISO country codes, so code lookups
// search both datasets and don't need a scope.
const allPlaces = [...countries, ...usStates];

export function getPlacesForScope(scope: GameScope): Country[] {
  return scope === "usa" ? usStates : countries;
}

export function getCountryByCode(code: string): Country | undefined {
  return allPlaces.find((c) => c.code === code || c.code3 === code);
}

export function getCountryName(code: string): string {
  return getCountryByCode(code)?.name ?? code;
}

type FilterOptions = {
  continents: Region[];
  includeTerritories?: boolean;
  mode?: GameMode;
  weakSpotCodes?: string[];
  scope?: GameScope;
};

export function filterCountries(options: FilterOptions): Country[] {
  const scope = options.scope ?? "world";
  const dataset = getPlacesForScope(scope);
  // The USA scope has no territories; the toggle only applies to the world.
  const includeTerritories = scope === "world" && (options.includeTerritories ?? false);
  const sovereignPool = options.continents.length > 0
    ? dataset.filter(
        (c) => !c.isTerritory && options.continents.includes(c.continent),
      )
    : [];
  const territoryPool = includeTerritories
    ? dataset.filter((c) => c.isTerritory)
    : [];

  let pool = [...sovereignPool, ...territoryPool];

  if (options.mode === "shape-to-country") {
    pool = pool.filter((c) => c.hasShape);
  }

  if (options.mode === "flag-to-country" || options.mode === "country-to-flag") {
    pool = pool.filter((c) => c.hasFlag);
  }

  if (options.mode === "capital-to-country") {
    pool = pool.filter((c) => c.capital.length > 0 && c.hasCapitalImage);
  }

  if (options.mode === "country-to-capital") {
    pool = pool.filter((c) => c.capital.length > 0);
  }

  if (options.mode === "neighbor-quiz") {
    pool = pool.filter((c) => c.borders.length > 0);
  }

  if (options.mode === "population-showdown") {
    pool = pool.filter((c) => c.population > 0 && c.hasFlag);
  }

  if (options.mode === "weak-spots" && options.weakSpotCodes?.length) {
    const weakSet = new Set(options.weakSpotCodes);
    pool = pool.filter((c) => weakSet.has(c.code));
  }

  return pool;
}

export function countSovereignCountriesByContinents(
  continents: Region[],
  scope: GameScope = "world",
): number {
  return getPlacesForScope(scope).filter(
    (c) => !c.isTerritory && continents.includes(c.continent),
  ).length;
}

export function countAllTerritories(): number {
  return countries.filter((c) => c.isTerritory).length;
}

export function countPlayableCountries(options: FilterOptions): number {
  return filterCountries(options).length;
}

export function getRegionsForScope(scope: GameScope): readonly Region[] {
  return scope === "usa" ? US_REGIONS : CONTINENTS;
}

export function getEligibleCoreQuestionTypes(country: Country): CoreQuestionType[] {
  const types: CoreQuestionType[] = [];
  if (country.hasFlag) types.push("flag-to-country");
  if (country.capital.length > 0) {
    types.push("country-to-capital");
  }
  if (country.hasCapitalImage) {
    types.push("capital-to-country");
  }
  if (country.hasShape) types.push("shape-to-country");
  return types;
}

export function getEligibleMixedQuestionTypes(country: Country): MixedQuestionType[] {
  const types: MixedQuestionType[] = [...getEligibleCoreQuestionTypes(country)];
  if (country.hasFlag) types.push("country-to-flag");
  return types;
}

export function getMixedCoreQuestionPool(options: Omit<FilterOptions, "mode">): Country[] {
  const byCode = new Map<string, Country>();
  for (const type of MIXED_QUESTION_TYPES) {
    for (const country of filterCountries({
      ...options,
      mode: type,
    })) {
      byCode.set(country.code, country);
    }
  }
  return [...byCode.values()];
}

type PoolOptions = FilterOptions & {
  mode: GameMode;
  questionType?: SpeedRoundQuestionType;
};

export function getPlayablePool(options: PoolOptions): Country[] {
  if (
    options.mode === "mixed" ||
    ((options.mode === "speed-round" || options.mode === "marathon") &&
      options.questionType === SPEED_ROUND_ALL_TYPES)
  ) {
    return getMixedCoreQuestionPool({
      continents: options.continents,
      includeTerritories: options.includeTerritories,
      weakSpotCodes: options.weakSpotCodes,
      scope: options.scope,
    });
  }

  const filterMode: GameMode =
    (options.mode === "speed-round" || options.mode === "marathon") &&
    options.questionType &&
    options.questionType !== SPEED_ROUND_ALL_TYPES
      ? options.questionType
      : options.mode;

  return filterCountries({
    continents: options.continents,
    includeTerritories: options.includeTerritories,
    mode: filterMode,
    weakSpotCodes: options.weakSpotCodes,
    scope: options.scope,
  });
}

export function getPlayablePoolSize(options: PoolOptions): number {
  return getPlayablePool(options).length;
}

export function getFlagPath(code: string): string {
  return `/flags/${code.toLowerCase()}.svg`;
}

export function getShapePath(code3: string): string {
  return `/shapes/${code3.toLowerCase()}.svg`;
}

export function getCapitalPath(code: string): string {
  return `/capitals/${code.toLowerCase()}.jpg`;
}

export function formatPopulation(population: number): string {
  return new Intl.NumberFormat("en-US").format(population);
}

export function formatBorderFact(borderCount: number, scope: GameScope = "world"): string {
  if (scope === "usa") {
    return `It borders ${borderCount} state${borderCount === 1 ? "" : "s"}.`;
  }
  return `It borders ${borderCount} countr${borderCount === 1 ? "y" : "ies"}.`;
}
