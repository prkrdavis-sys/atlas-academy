import countriesData from "@/data/countries.json";
import statesData from "@/data/states.json";
import {
  CONTINENTS,
  CORE_QUESTION_TYPES,
  DAILY_CHALLENGE_QUESTION_TYPES,
  MIXED_QUESTION_TYPES,
  US_REGIONS,
  type CoreQuestionType,
  type Country,
  type GameMode,
  type GameScope,
  type MixedQuestionType,
  type Region,
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

/** Whether a place belongs to the selected continent filters. */
function matchesContinentSelection(country: Country, continents: Region[]): boolean {
  if (!continents.includes(country.continent)) return false;
  // Antarctica has no sovereign states in our dataset — all entries are territories.
  if (country.continent === "Antarctica") return true;
  return !country.isTerritory;
}

export function filterCountries(options: FilterOptions): Country[] {
  const scope = options.scope ?? "world";
  const dataset = getPlacesForScope(scope);
  // The USA scope has no territories; the toggle only applies to the world.
  const includeTerritories = scope === "world" && (options.includeTerritories ?? false);
  const continentPool = options.continents.length > 0
    ? dataset.filter((c) => matchesContinentSelection(c, options.continents))
    : [];
  const territoryPool = includeTerritories
    ? dataset.filter((c) => c.isTerritory)
    : [];

  const byCode = new Map<string, Country>();
  for (const country of [...continentPool, ...territoryPool]) {
    byCode.set(country.code, country);
  }
  let pool = [...byCode.values()];

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

  if (options.mode === "fact-to-country") {
    pool = pool.filter((c) => c.factQuestion.trim().length > 0);
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
  return getPlacesForScope(scope).filter((c) =>
    matchesContinentSelection(c, continents),
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
  return CORE_QUESTION_TYPES.filter((type) => {
    switch (type) {
      case "flag-to-country":
        return country.hasFlag;
      case "shape-to-country":
        return country.hasShape;
      case "capital-to-country":
        return country.capital.length > 0 && country.hasCapitalImage;
      case "country-to-capital":
        return country.capital.length > 0;
      default: {
        const _exhaustive: never = type;
        return _exhaustive;
      }
    }
  });
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

export function getDailyChallengePool(options: Omit<FilterOptions, "mode">): Country[] {
  const byCode = new Map<string, Country>();
  for (const type of DAILY_CHALLENGE_QUESTION_TYPES) {
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
};

export function getPlayablePool(options: PoolOptions): Country[] {
  if (options.mode === "daily-challenge") {
    return getDailyChallengePool({
      continents: options.continents,
      includeTerritories: options.includeTerritories,
      weakSpotCodes: options.weakSpotCodes,
      scope: options.scope,
    });
  }

  if (options.mode === "mixed") {
    return getMixedCoreQuestionPool({
      continents: options.continents,
      includeTerritories: options.includeTerritories,
      weakSpotCodes: options.weakSpotCodes,
      scope: options.scope,
    });
  }

  return filterCountries({
    continents: options.continents,
    includeTerritories: options.includeTerritories,
    mode: options.mode,
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

export { getContextMapPathIds, getContextMapTemplatePath } from "@/lib/context-maps";

export function formatPopulation(population: number): string {
  return new Intl.NumberFormat("en-US").format(population);
}

export function formatBorderFact(borderCount: number, scope: GameScope = "world"): string {
  if (scope === "usa") {
    return `It borders ${borderCount} state${borderCount === 1 ? "" : "s"}.`;
  }
  return `It borders ${borderCount} countr${borderCount === 1 ? "y" : "ies"}.`;
}

const NON_ARCHIPELAGO_AND_NAMES = new Set(["Bosnia and Herzegovina"]);

const ISLAND_SUBREGIONS = new Set([
  "Caribbean",
  "Polynesia",
  "Micronesia",
  "Melanesia",
  "Australia and New Zealand",
]);

const REGIONS_WITH_THE = new Set(["Caribbean", "Middle East", "Pacific"]);

function getRegionLabel(country: Country): string {
  const label = country.subregion || country.continent;
  return REGIONS_WITH_THE.has(label) ? `the ${label}` : label;
}

function isArchipelagoPlace(country: Country): boolean {
  if (NON_ARCHIPELAGO_AND_NAMES.has(country.name)) return false;
  if (/\bIslands\b/i.test(country.name)) return true;
  return /\band\b/i.test(country.name);
}

/** Explains why a place has no bordering neighbors in the library view. */
export function formatNoNeighborsMessage(country: Country, scope: GameScope = "world"): string {
  if (scope === "usa") {
    if (country.code === "US-HI") {
      return "Hawaii is an island state in the Pacific and does not share a land border with any other U.S. state.";
    }
    if (country.code === "US-AK") {
      return "Alaska is separated from the contiguous United States and does not share a land border with any other U.S. state.";
    }
    return `${country.name} does not share a land border with any other U.S. state.`;
  }

  const region = getRegionLabel(country);

  if (country.continent === "Antarctica") {
    return `${country.name} lies in Antarctica and has no land neighbors — only ice and ocean surround it.`;
  }

  if (isArchipelagoPlace(country)) {
    return `${country.name} is an island archipelago in ${region} with no land neighbors.`;
  }

  if (/\bIsland\b/i.test(country.name)) {
    return `${country.name} is a remote island in ${region} with no land neighbors.`;
  }

  if (country.isTerritory) {
    return `${country.name} is an island territory in ${region} with no land neighbors.`;
  }

  if (
    ISLAND_SUBREGIONS.has(country.subregion) ||
    country.continent === "Oceania" ||
    !country.isTerritory
  ) {
    return `${country.name} is an island nation in ${region} with no land neighbors.`;
  }

  return `${country.name} is surrounded by water and has no land neighbors.`;
}
