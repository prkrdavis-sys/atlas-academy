import { geoArea, geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import countriesData from "../data/countries.json";
import { SUPPLEMENTAL_MAP_IDS } from "../lib/context-maps";
import type { Country } from "../lib/types";

const NATURAL_EARTH_COUNTRIES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson";
const NATURAL_EARTH_MAP_UNITS_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_map_units.geojson";
const GEOBOUNDARIES_API_URL = "https://www.geoboundaries.org/api/current/gbOpen";

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

/**
 * Large canvas so microstate coastlines keep sub-pixel precision after projection.
 * Natural Earth 10m collapses tiny places on a 1000×500 world canvas.
 */
const MAP_WIDTH = 10000;
const MAP_HEIGHT = 5000;

/** Upgrade any Natural Earth geometry below this vertex count. */
const MIN_DETAIL_COORDINATES = 300;
/** Prefer full geoBoundaries polygons at or under this size; else use simplified. */
const MAX_PREFERRED_COORDINATES = 3500;

/**
 * geoBoundaries boundary ISO3 codes that differ from ISO 3166-1 alpha-3.
 * Kosovo uses the user-assigned XK / XKX pair.
 */
const GEOBOUNDARIES_ISO3_OVERRIDES: Record<string, string> = {
  XK: "XKX",
};

const countries = countriesData as Country[];

function normalizeCode(value: string | undefined): string | undefined {
  if (!value || value === "-99") return undefined;
  return value.toUpperCase();
}

function countCoordinates(geometry: Geometry | null | undefined): number {
  if (!geometry || geometry.type === "GeometryCollection") return 0;

  let count = 0;
  const walk = (coords: unknown): void => {
    if (!Array.isArray(coords) || coords.length === 0) return;
    if (typeof coords[0] === "number") {
      count += 1;
      return;
    }
    for (const child of coords) walk(child);
  };
  walk(geometry.coordinates);
  return count;
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

function resolveGeoBoundariesIso3(country: Country): string {
  return GEOBOUNDARIES_ISO3_OVERRIDES[country.code] ?? country.code3.toUpperCase();
}

async function fetchFeatureCollection(url: string): Promise<NaturalEarthFeature[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Natural Earth data: ${url}`);
  }

  const collection = (await response.json()) as FeatureCollection;
  return collection.features as NaturalEarthFeature[];
}

async function fetchJson<T>(url: string, attempts = 4): Promise<T | null> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return (await response.json()) as T;
      }
      // Retry transient CDN / rate-limit failures.
      if (response.status !== 404 && attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
        continue;
      }
      return null;
    } catch {
      if (attempt >= attempts) return null;
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }
  return null;
}

function geometryFromGeoJson(data: FeatureCollection | Feature | Geometry): Geometry | null {
  if (!data || typeof data !== "object") return null;
  if ("type" in data && data.type === "FeatureCollection") {
    return data.features[0]?.geometry ?? null;
  }
  if ("type" in data && data.type === "Feature") {
    return data.geometry;
  }
  if ("type" in data && "coordinates" in data) {
    return data as Geometry;
  }
  return null;
}

function reverseRing(ring: Position[]): Position[] {
  return [...ring].reverse();
}

/**
 * geoBoundaries polygons are often clockwise. d3-geo treats those as the
 * sphere-minus-country (area ≈ 4π), which projects as a world-spanning blob.
 */
function ensureExteriorWinding(geometry: Geometry): Geometry {
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
    return geometry;
  }

  const area = geoArea({ type: "Feature", properties: {}, geometry });
  if (area < 1) {
    return geometry;
  }

  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map(reverseRing),
    };
  }

  return {
    type: "MultiPolygon",
    coordinates: geometry.coordinates.map((polygon) => polygon.map(reverseRing)),
  };
}

type GeoBoundariesApiResponse = {
  gjDownloadURL?: string;
  simplifiedGeometryGeoJSON?: string;
  meanVertices?: number;
};

/**
 * Natural Earth 10m heavily simplifies microstates (Monaco ≈ 12 verts).
 * Prefer geoBoundaries ADM0 when it offers a clearly more detailed outline.
 */
async function loadDetailedGeometry(
  country: Country,
  naturalEarthGeometry: Geometry,
): Promise<Geometry> {
  const naturalEarthCount = countCoordinates(naturalEarthGeometry);
  if (naturalEarthCount >= MIN_DETAIL_COORDINATES) {
    return naturalEarthGeometry;
  }

  const iso3 = resolveGeoBoundariesIso3(country);
  const api = await fetchJson<GeoBoundariesApiResponse>(
    `${GEOBOUNDARIES_API_URL}/${iso3}/ADM0/`,
  );
  if (!api?.gjDownloadURL) {
    return naturalEarthGeometry;
  }

  const candidates: Geometry[] = [];

  const fullCollection = await fetchJson<FeatureCollection | Feature>(api.gjDownloadURL);
  const fullGeometry = geometryFromGeoJson(fullCollection ?? ({} as FeatureCollection));
  if (fullGeometry) candidates.push(fullGeometry);

  if (api.simplifiedGeometryGeoJSON) {
    const simplifiedCollection = await fetchJson<FeatureCollection | Feature>(
      api.simplifiedGeometryGeoJSON,
    );
    const simplifiedGeometry = geometryFromGeoJson(
      simplifiedCollection ?? ({} as FeatureCollection),
    );
    if (simplifiedGeometry) candidates.push(simplifiedGeometry);
  }

  const upgrades = candidates
    .map((geometry) => ({ geometry, count: countCoordinates(geometry) }))
    .filter((entry) => entry.count > naturalEarthCount);

  if (upgrades.length === 0) {
    return naturalEarthGeometry;
  }

  // Prefer the most detailed outline under the size cap; otherwise the smallest upgrade.
  const underCap = upgrades.filter((entry) => entry.count <= MAX_PREFERRED_COORDINATES);
  if (underCap.length > 0) {
    underCap.sort((a, b) => b.count - a.count);
    return ensureExteriorWinding(underCap[0].geometry);
  }

  upgrades.sort((a, b) => a.count - b.count);
  return ensureExteriorWinding(upgrades[0].geometry);
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function loadNaturalEarthFeatures(): Promise<NaturalEarthFeature[]> {
  const [countryFeatures, mapUnitFeatures] = await Promise.all([
    fetchFeatureCollection(NATURAL_EARTH_COUNTRIES_URL),
    fetchFeatureCollection(NATURAL_EARTH_MAP_UNITS_URL),
  ]);

  return [...countryFeatures, ...mapUnitFeatures];
}

export async function buildNaturalEarthLocations(
  features: NaturalEarthFeature[],
  countryList: Country[] = countries,
): Promise<{ locations: SvgMapLocation[]; missing: Country[]; upgraded: string[] }> {
  const projection = geoNaturalEarth1();
  projection.fitSize([MAP_WIDTH, MAP_HEIGHT], {
    type: "FeatureCollection",
    features,
  } as FeatureCollection);

  const pathGenerator = geoPath(projection).digits(4);
  const locations: SvgMapLocation[] = [];
  const seenIds = new Set<string>();
  const missing: Country[] = [];
  const upgraded: string[] = [];

  const resolvedFeatures = await mapPool(countryList, 3, async (country) => {
    const baseFeature = findFeatureForCountry(features, country);
    if (!baseFeature?.geometry) {
      return { country, feature: null as NaturalEarthFeature | null, didUpgrade: false };
    }

    const detailedGeometry = await loadDetailedGeometry(country, baseFeature.geometry);
    const didUpgrade = detailedGeometry !== baseFeature.geometry;
    const feature: NaturalEarthFeature = didUpgrade
      ? { ...baseFeature, geometry: detailedGeometry }
      : baseFeature;

    return { country, feature, didUpgrade };
  });

  for (const { country, feature, didUpgrade } of resolvedFeatures) {
    for (const id of resolveMapIds(country)) {
      if (seenIds.has(id)) continue;

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
      if (didUpgrade) {
        upgraded.push(country.code);
      }
    }
  }

  return { locations, missing, upgraded };
}
