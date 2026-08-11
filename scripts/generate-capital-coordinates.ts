/**
 * Builds data/capital-coordinates.json — exact capital lat/lng for Learn/Library
 * map pins. Source: Natural Earth 10m populated places (Admin-0 / Admin-1 capitals),
 * plus curated overrides for territories NE omits or mislabels.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import countriesData from "../data/countries.json";
import statesData from "../data/states.json";
import type { Country } from "../lib/types";

type LatLng = { lat: number; lng: number };

type NeProperties = {
  NAME?: string;
  NAMEASCII?: string;
  FEATURECLA?: string;
  ADM0CAP?: number;
  ISO_A2?: string;
  ADM0_A3?: string;
  ADM0NAME?: string;
  ADM1NAME?: string;
  LATITUDE?: number;
  LONGITUDE?: number;
};

type NeFeature = {
  properties: NeProperties;
  geometry: { type: string; coordinates: [number, number] };
};

const NATURAL_EARTH_PLACES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson";

const countries = countriesData as Country[];
const usStates = statesData as Country[];

/** Manual capital points when Natural Earth has no reliable match. */
const MANUAL_CAPITALS: Record<string, LatLng> = {
  AI: { lat: 18.2148, lng: -63.0574 }, // The Valley
  VG: { lat: 18.4314, lng: -64.6231 }, // Road Town
  BQ: { lat: 12.1444, lng: -68.2655 }, // Kralendijk (Bonaire)
  CX: { lat: -10.4217, lng: 105.6791 }, // Flying Fish Cove
  CC: { lat: -12.1888, lng: 96.829 }, // West Island
  FO: { lat: 62.0079, lng: -6.771 }, // Tórshavn
  GU: { lat: 13.475, lng: 144.75 }, // Hagåtña
  JE: { lat: 49.1858, lng: -2.11 }, // Saint Helier
  NR: { lat: -0.5477, lng: 166.9209 }, // Yaren
  NC: { lat: -22.2758, lng: 166.458 }, // Nouméa
  MP: { lat: 15.2137, lng: 145.7546 }, // Saipan
  PN: { lat: -25.0662, lng: -130.1005 }, // Adamstown
  BL: { lat: 17.8962, lng: -62.8498 }, // Gustavia
  MF: { lat: 18.0731, lng: -63.0822 }, // Marigot
  SX: { lat: 18.0297, lng: -63.0458 }, // Philipsburg
  TK: { lat: -9.2005, lng: -171.848 }, // Fakaofo
  TC: { lat: 21.4603, lng: -71.1419 }, // Cockburn Town
  WF: { lat: -13.2825, lng: -176.1764 }, // Mata-Utu
  EH: { lat: 27.1536, lng: -13.2033 }, // El Aaiún
  HK: { lat: 22.2783, lng: 114.1747 }, // Victoria / central HK
  MO: { lat: 22.1987, lng: 113.5439 }, // Macau (no capital string)
  IO: { lat: -7.3195, lng: 72.4229 }, // Diego Garcia
  TF: { lat: -49.3494, lng: 70.2194 }, // Port-aux-Français
  GG: { lat: 49.4551, lng: -2.537 }, // St. Peter Port
  IM: { lat: 54.1509, lng: -4.4815 }, // Douglas
  MS: { lat: 16.7055, lng: -62.2129 }, // Plymouth (historic)
  NF: { lat: -29.0565, lng: 167.959 }, // Kingston
  PR: { lat: 18.4655, lng: -66.1057 }, // San Juan
  RE: { lat: -20.8789, lng: 55.4481 }, // Saint-Denis
  SH: { lat: -15.9244, lng: -5.7195 }, // Jamestown
  PM: { lat: 46.7811, lng: -56.171 }, // Saint-Pierre
  GS: { lat: -54.2833, lng: -36.5 }, // King Edward Point
  YT: { lat: -12.7806, lng: 45.2278 }, // Mamoudzou
  VI: { lat: 18.3419, lng: -64.9307 }, // Charlotte Amalie
  XK: { lat: 42.6629, lng: 21.1655 }, // Pristina
};

const US_STATE_NAME_BY_POSTAL: Record<string, string> = Object.fromEntries(
  usStates.map((state) => [state.code.slice(3), state.name]),
);

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isAdmin0Capital(props: NeProperties): boolean {
  if (props.ADM0CAP === 1 || props.ADM0CAP === 1.0) return true;
  return props.FEATURECLA === "Admin-0 capital";
}

function isRegionCapital(props: NeProperties): boolean {
  const feature = props.FEATURECLA ?? "";
  return (
    feature === "Admin-0 region capital" ||
    feature === "Admin-1 capital" ||
    feature === "Admin-1 region capital"
  );
}

function featureLatLng(feature: NeFeature): LatLng {
  const [lng, lat] = feature.geometry.coordinates;
  return { lat, lng };
}

function pickBestCapital(
  candidates: NeFeature[],
  preferredName: string,
): NeFeature | undefined {
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  const preferred = normalizeName(preferredName);
  const nameMatch = candidates.find((feature) => {
    const names = [feature.properties.NAME, feature.properties.NAMEASCII]
      .filter(Boolean)
      .map((name) => normalizeName(name as string));
    return names.some((name) => name === preferred || name.includes(preferred) || preferred.includes(name));
  });
  if (nameMatch) return nameMatch;

  // Prefer true Admin-0 capitals over regional seats.
  const admin0 = candidates.find((feature) => isAdmin0Capital(feature.properties));
  return admin0 ?? candidates[0];
}

async function loadNaturalEarthPlaces(): Promise<NeFeature[]> {
  const response = await fetch(NATURAL_EARTH_PLACES_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Natural Earth places (${response.status})`);
  }
  const collection = (await response.json()) as { features: NeFeature[] };
  return collection.features;
}

function buildCountryCapitals(places: NeFeature[]): Record<string, [number, number]> {
  const byIso2 = new Map<string, NeFeature[]>();
  const byIso3 = new Map<string, NeFeature[]>();

  for (const feature of places) {
    const props = feature.properties;
    if (!isAdmin0Capital(props) && !isRegionCapital(props)) continue;

    const iso2 = props.ISO_A2 && props.ISO_A2 !== "-99" ? props.ISO_A2.toUpperCase() : undefined;
    const iso3 = props.ADM0_A3?.toUpperCase();
    if (iso2) {
      const list = byIso2.get(iso2) ?? [];
      list.push(feature);
      byIso2.set(iso2, list);
    }
    if (iso3) {
      const list = byIso3.get(iso3) ?? [];
      list.push(feature);
      byIso3.set(iso3, list);
    }
  }

  const result: Record<string, [number, number]> = {};

  for (const country of countries) {
    const manual = MANUAL_CAPITALS[country.code];
    if (manual) {
      result[country.code] = [manual.lat, manual.lng];
      continue;
    }

    if (!country.capital) continue;

    const isoCandidates = [
      ...(byIso2.get(country.code) ?? []),
      ...(byIso3.get(country.code3) ?? []),
    ];
    // Prefer Admin-0 capitals first.
    const admin0 = isoCandidates.filter((feature) => isAdmin0Capital(feature.properties));
    const pool = admin0.length > 0 ? admin0 : isoCandidates;
    const chosen = pickBestCapital(pool, country.capital);
    if (!chosen) continue;

    const { lat, lng } = featureLatLng(chosen);
    result[country.code] = [lat, lng];
  }

  return result;
}

function buildStateCapitals(places: NeFeature[]): Record<string, [number, number]> {
  const byStateName = new Map<string, NeFeature>();

  for (const feature of places) {
    const props = feature.properties;
    if (props.ADM0_A3 !== "USA") continue;
    if (props.FEATURECLA !== "Admin-1 capital") continue;
    const stateName = props.ADM1NAME;
    if (!stateName) continue;
    byStateName.set(normalizeName(stateName), feature);
  }

  const result: Record<string, [number, number]> = {};
  for (const state of usStates) {
    const postal = state.code.slice(3);
    const stateName = US_STATE_NAME_BY_POSTAL[postal] ?? state.name;
    const feature = byStateName.get(normalizeName(stateName));
    if (!feature) {
      throw new Error(`Missing Natural Earth capital for ${state.code} (${stateName})`);
    }
    const { lat, lng } = featureLatLng(feature);
    result[state.code] = [lat, lng];
  }
  return result;
}

async function main() {
  console.log("Fetching Natural Earth populated places...");
  const places = await loadNaturalEarthPlaces();

  const countryCapitals = buildCountryCapitals(places);
  const stateCapitals = buildStateCapitals(places);
  const coordinates = { ...countryCapitals, ...stateCapitals };

  const missingCountries = countries
    .filter((country) => country.capital && !coordinates[country.code])
    .map((country) => country.code);

  if (missingCountries.length > 0) {
    throw new Error(`Missing capital coordinates for: ${missingCountries.join(", ")}`);
  }

  const outPath = join(process.cwd(), "data/capital-coordinates.json");
  writeFileSync(outPath, `${JSON.stringify(coordinates, null, 2)}\n`);
  console.log(
    `Wrote ${Object.keys(coordinates).length} capital coordinates (${Object.keys(countryCapitals).length} countries, ${Object.keys(stateCapitals).length} states)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
