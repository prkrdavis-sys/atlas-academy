import closestMainlandData from "@/data/closest-mainland.json";
import countriesData from "@/data/countries.json";
import statesData from "@/data/states.json";
import { isAtlasleEligible } from "@/lib/atlasle";
import { isFlagCropEligible } from "@/lib/flag-crop";
import { namedIslandKind } from "@/lib/place-geography";
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

/** Official languages split from the ` · `-joined country field. */
export function getCountryLanguages(country: Country): string[] {
  if (!country.languages?.trim()) return [];
  return country.languages
    .split(" · ")
    .map((language) => language.trim())
    .filter((language) => language.length > 0);
}

export function getPrimaryLanguage(country: Country): string | undefined {
  return getCountryLanguages(country)[0];
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

function countryMatchesQuestionMode(country: Country, mode: GameMode): boolean {
  switch (mode) {
    case "globe-hunt":
      return !country.isTerritory;
    case "shape-to-country":
      return country.hasShape;
    case "flag-to-country":
    case "country-to-flag":
    case "inverted-flag-to-country":
    case "inverted-country-to-flag":
      return country.hasFlag;
    case "flag-crop-to-country":
    case "inverted-flag-crop-to-country":
      return country.hasFlag && isFlagCropEligible(country.code);
    case "capital-to-country":
      return country.capital.length > 0 && country.hasCapitalImage;
    case "country-to-capital":
      return country.capital.length > 0;
    case "country-to-language":
      return getPrimaryLanguage(country) !== undefined;
    case "neighbor-quiz":
      return country.borders.length > 0;
    case "population-showdown":
      return country.population > 0 && country.hasFlag;
    case "fact-to-country":
      return country.factQuestion.trim().length > 0 || country.factQuestion2.trim().length > 0;
    case "atlasle":
      return isAtlasleEligible(country);
    case "daily-challenge":
    case "marathon":
    case "speed-round":
    case "weak-spots":
    case "mixed":
      return true;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function filterCountries(options: FilterOptions): Country[] {
  const scope = options.scope ?? "world";
  const dataset = getPlacesForScope(scope);
  // The USA scope has no territories; the toggle only applies to the world.
  const includeTerritories =
    scope === "world" &&
    options.mode !== "globe-hunt" &&
    (options.includeTerritories ?? false);
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

  if (options.mode) {
    const mode = options.mode;
    pool = pool.filter((country) => countryMatchesQuestionMode(country, mode));
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
  return CORE_QUESTION_TYPES.filter((type) => countryMatchesQuestionMode(country, type));
}

export function getEligibleMixedQuestionTypes(country: Country): MixedQuestionType[] {
  const types: MixedQuestionType[] = [...getEligibleCoreQuestionTypes(country)];
  if (country.hasFlag) types.push("country-to-flag");
  if (country.factQuestion.trim().length > 0 || country.factQuestion2.trim().length > 0) {
    types.push("fact-to-country");
  }
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

/** The single shared daily pool: sovereign places plus the USA state pool. */
export function getCombinedDailyChallengePool(): Country[] {
  const byCode = new Map<string, Country>();
  const scopes: { scope: GameScope; regions: Region[] }[] = [
    { scope: "world", regions: [...CONTINENTS] },
    { scope: "usa", regions: [...US_REGIONS] },
  ];

  for (const { scope, regions } of scopes) {
    for (const country of getDailyChallengePool({
      continents: regions,
      includeTerritories: false,
      scope,
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

/** Formats land-surface elevation extremes for library detail chips. */
export function formatAltitudeRange(elevation: { min: number; max: number }): string {
  const formatMeters = (meters: number) =>
    meters === 0 ? "Sea level" : `${formatPopulation(meters)} m`;

  if (elevation.min === elevation.max) {
    return formatMeters(elevation.max);
  }

  const low = elevation.min === 0 ? "Sea level" : formatPopulation(elevation.min);
  return `${low} – ${formatPopulation(elevation.max)} m`;
}

export function formatBorderFact(borderCount: number, scope: GameScope = "world"): string {
  if (scope === "usa") {
    return `It borders ${borderCount} state${borderCount === 1 ? "" : "s"}.`;
  }
  return `It borders ${borderCount} countr${borderCount === 1 ? "y" : "ies"}.`;
}


const ISLAND_SUBREGIONS = new Set([
  "Caribbean",
  "Polynesia",
  "Micronesia",
  "Melanesia",
  "Australia and New Zealand",
]);

const REGIONS_WITH_THE = new Set(["Caribbean", "Middle East", "Pacific"]);

const closestMainlandByCode = closestMainlandData as Record<string, string>;

const CONTINENTAL_LANDMASSES = new Set(["AU", "GL"]);
const ISLAND_AREA_THRESHOLD = 100_000;

function formatLearnSubregionLabel(country: Country): string {
  const subregion = country.subregion.trim();
  if (subregion) return subregion;
  return country.continent;
}

function shouldShowClosestMainland(country: Country): boolean {
  if (CONTINENTAL_LANDMASSES.has(country.code)) return false;
  if (country.borders.length > 0) return false;
  if (country.area >= ISLAND_AREA_THRESHOLD) return false;
  return true;
}

/** Region line for learn cards: UN subregion when available; islands add closest mainland. */
export function formatLearnRegionLabel(country: Country, scope: GameScope = "world"): string {
  if (scope === "usa") {
    return country.continent;
  }

  const subregion = country.subregion.trim();
  const subregionLabel = formatLearnSubregionLabel(country);

  if (shouldShowClosestMainland(country)) {
    const closestCode = closestMainlandByCode[country.code];
    const closestName = closestCode ? getCountryName(closestCode) : undefined;
    if (closestName) {
      if (subregion && subregion !== country.continent) {
        return `${subregion} · Closest to ${closestName}`;
      }
      return `Closest to ${closestName}`;
    }
  }

  return subregionLabel;
}

function getRegionLabel(country: Country): string {
  const label = country.subregion || country.continent;
  return REGIONS_WITH_THE.has(label) ? `the ${label}` : label;
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

  const islandKind = namedIslandKind(country);
  if (islandKind === "archipelago") {
    return `${country.name} is an island archipelago in ${region} with no land neighbors.`;
  }

  if (islandKind === "remote-island") {
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
