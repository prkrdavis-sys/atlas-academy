import countriesData from "@/data/countries.json";
import type { Continent, Country } from "@/lib/types";
import { CONTINENTS } from "@/lib/types";
import { getCountryByCode } from "@/lib/countries";
import { isStateCode } from "@/lib/scope";

const worldCountries = countriesData as Country[];

/** Alpha-2 codes whose @svg-maps/world id differs from lowercase code. */
export const SUPPLEMENTAL_MAP_IDS: Record<string, string | string[]> = {
  FM: "fm",
  MH: "mh",
  MP: "mp",
  PS: "ps",
  TV: "tv",
  UM: "um",
  XK: "xk",
};

const CONTINENT_TEMPLATE_KEYS: Record<Continent, string> = {
  Africa: "africa",
  Antarctica: "antarctica",
  Asia: "asia",
  Europe: "europe",
  "North America": "north-america",
  Oceania: "oceania",
  "South America": "south-america",
};

export const CONTEXT_MAP_TEMPLATES = [
  "world",
  ...Object.values(CONTINENT_TEMPLATE_KEYS),
  "usa",
] as const;

export type ContextMapTemplateKey = (typeof CONTEXT_MAP_TEMPLATES)[number];

export function continentToTemplateKey(continent: Continent): ContextMapTemplateKey {
  return CONTINENT_TEMPLATE_KEYS[continent];
}

export function getContextMapTemplatePath(templateKey: ContextMapTemplateKey): string {
  return `/maps/${templateKey}.svg`;
}

export function getContextMapTemplateKey(country: Country): ContextMapTemplateKey {
  if (isStateCode(country.code)) {
    return "usa";
  }
  if (CONTINENTS.includes(country.continent as Continent)) {
    return continentToTemplateKey(country.continent as Continent);
  }
  return "asia";
}

/** Resolves a place to one or more @svg-maps path ids. */
export function getContextMapPathIds(country: Country): string[] {
  if (isStateCode(country.code)) {
    return [country.code.slice(3).toLowerCase()];
  }

  const supplemental = SUPPLEMENTAL_MAP_IDS[country.code];
  if (supplemental) {
    return Array.isArray(supplemental) ? supplemental : [supplemental];
  }

  return [country.code.toLowerCase()];
}

export function getNeighborContextMapPathIds(country: Country): string[] {
  const ids = new Set<string>();
  for (const borderCode of country.borders) {
    const neighbor = getCountryByCode(borderCode);
    if (!neighbor) continue;
    for (const id of getContextMapPathIds(neighbor)) {
      ids.add(id);
    }
  }
  return [...ids];
}

export function countryHasContextMap(country: Country): boolean {
  return getContextMapPathIds(country).length > 0;
}

export function getContextMapAriaLabel(country: Country, isState: boolean): string {
  if (isState) {
    return `Map showing the location of ${country.name} within the United States`;
  }
  return `Map showing the location of ${country.name} in ${country.continent}`;
}

const MAP_PATH_ID_TO_COUNTRY_CODE = buildMapPathIdToCountryCodeMap();

function buildMapPathIdToCountryCodeMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const country of worldCountries) {
    for (const pathId of getContextMapPathIds(country)) {
      map.set(pathId, country.code);
    }
  }
  return map;
}

export function getCountryCodeByMapPathId(pathId: string): string | undefined {
  return MAP_PATH_ID_TO_COUNTRY_CODE.get(pathId);
}

/** Path ids on the world template used to focus the interactive world map. */
export function getWorldMapPathIds(country: Country): string[] {
  if (isStateCode(country.code)) {
    return ["us"];
  }
  return getContextMapPathIds(country);
}

export function buildWorldMapHref(code: string): string {
  return `/map?place=${encodeURIComponent(code.toLowerCase())}`;
}

export function resolvePlaceCodeFromParam(param: string | null | undefined): string | undefined {
  if (!param) return undefined;
  const trimmed = param.trim();
  if (!trimmed) return undefined;
  return trimmed.toUpperCase();
}
