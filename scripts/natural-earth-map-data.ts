import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import countriesData from "../data/countries.json";
import { SUPPLEMENTAL_MAP_IDS } from "../lib/context-maps";
import type { Country } from "../lib/types";

const NATURAL_EARTH_COUNTRIES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson";
const NATURAL_EARTH_MAP_UNITS_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_map_units.geojson";

export type SvgMapLocation = { id: string; path: string };

type NaturalEarthProperties = {
  ISO_A2?: string;
  ISO_A2_EH?: string;
  ISO_A3?: string;
  WB_A2?: string;
  ADM0_A3?: string;
  ADM0_A3_US?: string;
  GU_A3?: string;
  BRK_A3?: string;
  ADMIN?: string;
};

export type NaturalEarthFeature = Feature<Geometry, NaturalEarthProperties>;

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 500;

const countries = countriesData as Country[];

function normalizeCode(value: string | undefined): string | undefined {
  if (!value || value === "-99") return undefined;
  return value.toUpperCase();
}

function featureMatchesCountry(feature: NaturalEarthFeature, country: Country): boolean {
  const code = country.code.toUpperCase();
  const code3 = country.code3.toUpperCase();
  const properties = feature.properties;

  const isoCandidates = [
    normalizeCode(properties.ISO_A2),
    normalizeCode(properties.ISO_A2_EH),
    normalizeCode(properties.WB_A2),
  ];
  if (isoCandidates.some((candidate) => candidate === code)) {
    return true;
  }

  const iso3Candidates = [
    normalizeCode(properties.ADM0_A3),
    normalizeCode(properties.ADM0_A3_US),
    normalizeCode(properties.GU_A3),
    normalizeCode(properties.BRK_A3),
    normalizeCode(properties.ISO_A3),
  ];
  return iso3Candidates.some((candidate) => candidate === code3);
}

function findFeatureForCountry(
  features: NaturalEarthFeature[],
  country: Country,
): NaturalEarthFeature | undefined {
  return features.find((feature) => featureMatchesCountry(feature, country));
}

function resolveMapIds(country: Country): string[] {
  const supplemental = SUPPLEMENTAL_MAP_IDS[country.code];
  if (supplemental) {
    return Array.isArray(supplemental) ? supplemental : [supplemental];
  }
  return [country.code.toLowerCase()];
}

async function fetchFeatureCollection(url: string): Promise<NaturalEarthFeature[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Natural Earth data: ${url}`);
  }

  const collection = (await response.json()) as FeatureCollection;
  return collection.features as NaturalEarthFeature[];
}

export async function loadNaturalEarthFeatures(): Promise<NaturalEarthFeature[]> {
  const [countryFeatures, mapUnitFeatures] = await Promise.all([
    fetchFeatureCollection(NATURAL_EARTH_COUNTRIES_URL),
    fetchFeatureCollection(NATURAL_EARTH_MAP_UNITS_URL),
  ]);

  return [...countryFeatures, ...mapUnitFeatures];
}

export function buildNaturalEarthLocations(
  features: NaturalEarthFeature[],
  countryList: Country[] = countries,
): { locations: SvgMapLocation[]; missing: Country[] } {
  const projection = geoNaturalEarth1();
  projection.fitSize([MAP_WIDTH, MAP_HEIGHT], {
    type: "FeatureCollection",
    features,
  } as FeatureCollection);

  const pathGenerator = geoPath(projection);
  const locations: SvgMapLocation[] = [];
  const seenIds = new Set<string>();
  const missing: Country[] = [];

  for (const country of countryList) {
    for (const id of resolveMapIds(country)) {
      if (seenIds.has(id)) continue;

      const feature = findFeatureForCountry(features, country);
      if (!feature) {
        missing.push(country);
        continue;
      }

      const path = pathGenerator(feature);
      if (!path) {
        missing.push(country);
        continue;
      }

      seenIds.add(id);
      locations.push({ id, path });
    }
  }

  return { locations, missing };
}
