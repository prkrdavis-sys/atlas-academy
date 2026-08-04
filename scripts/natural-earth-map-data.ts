import { geoArea, geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from "geojson";
import polygonClipping from "polygon-clipping";
import type { MultiPolygon as ClippingMultiPolygon } from "polygon-clipping";
import countriesData from "../data/countries.json";
import { SUPPLEMENTAL_MAP_IDS } from "../lib/context-maps";
import type { Country } from "../lib/types";

const NATURAL_EARTH_COUNTRIES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson";
/** Same coverage but with large lakes clipped out (e.g. Great Lakes) — used by the globe pipeline. */
const NATURAL_EARTH_COUNTRIES_LAKES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries_lakes.geojson";
// No "_lakes" variant exists for map units; they only back small places where
// uncut lakes don't matter.
const NATURAL_EARTH_MAP_UNITS_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_map_units.geojson";
/** Disputed/breakaway overlays — used to rebuild ISO-recognized borders. */
const NATURAL_EARTH_10M_DISPUTED_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_disputed_areas.geojson";
const NATURAL_EARTH_50M_DISPUTED_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_breakaway_disputed_areas.geojson";
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
  NAME?: string;
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

/**
 * Keep ISO-normalized Natural Earth geometry for these places. geoBoundaries
 * follows other conventions (e.g. Morocco includes Western Sahara).
 */
const SKIP_GEOBOUNDARIES_UPGRADE = new Set(["MA", "EH", "SO"]);

const countries = countriesData as Country[];

function normalizeCode(value: string | undefined): string | undefined {
  if (!value || value === "-99") return undefined;
  return value.toUpperCase();
}

export function countCoordinates(geometry: Geometry | null | undefined): number {
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

export function findFeatureForCountry(
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
export async function loadDetailedGeometry(
  country: Country,
  naturalEarthGeometry: Geometry,
): Promise<Geometry> {
  const naturalEarthCount = countCoordinates(naturalEarthGeometry);
  if (naturalEarthCount >= MIN_DETAIL_COORDINATES) {
    return naturalEarthGeometry;
  }

  if (SKIP_GEOBOUNDARIES_UPGRADE.has(country.code.toUpperCase())) {
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

type AreaGeometry = Polygon | MultiPolygon;

function isAreaGeometry(geometry: Geometry | null | undefined): geometry is AreaGeometry {
  return geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";
}

function toClippingGeom(geometry: AreaGeometry): ClippingMultiPolygon {
  // polygon-clipping accepts a single Polygon or MultiPolygon; normalize to MultiPolygon.
  return (
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates
  ) as ClippingMultiPolygon;
}

function fromClippingGeom(geom: ClippingMultiPolygon): AreaGeometry | null {
  if (geom.length === 0) return null;
  if (geom.length === 1) {
    return { type: "Polygon", coordinates: geom[0] as Position[][] };
  }
  return { type: "MultiPolygon", coordinates: geom as Position[][][] };
}

/** Drop degenerate boolean-op slivers (a few vertices / near-zero area). */
function cleanAreaGeometry(geometry: AreaGeometry): AreaGeometry | null {
  const polygons: Position[][][] =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  const kept = polygons.filter((polygon) => {
    const exterior = polygon[0];
    if (!exterior || exterior.length < 4) return false;
    const rawArea = geoArea({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: polygon },
    });
    // Clockwise rings report ~4π − area; take the smaller complement.
    const area = Math.min(rawArea, 4 * Math.PI - rawArea);
    // ~1e-6 sr ≈ a few km² — keeps microstates, drops clip artifacts.
    return area > 1e-6;
  });

  if (kept.length === 0) return null;
  if (kept.length === 1) return { type: "Polygon", coordinates: kept[0] };
  return { type: "MultiPolygon", coordinates: kept };
}

function unionAreaGeometries(geometries: AreaGeometry[]): AreaGeometry | null {
  if (geometries.length === 0) return null;
  if (geometries.length === 1) return cleanAreaGeometry(geometries[0]);

  const result = polygonClipping.union(
    toClippingGeom(geometries[0]),
    ...geometries.slice(1).map(toClippingGeom),
  );
  const merged = fromClippingGeom(result);
  return merged ? cleanAreaGeometry(merged) : null;
}

function differenceAreaGeometries(
  subject: AreaGeometry,
  clip: AreaGeometry,
): AreaGeometry | null {
  const result = polygonClipping.difference(toClippingGeom(subject), toClippingGeom(clip));
  const clipped = fromClippingGeom(result);
  return clipped ? cleanAreaGeometry(clipped) : null;
}

/**
 * Natural Earth ADM0_A3 codes that should be dissolved into a parent country
 * for ISO-recognized borders (de facto breakaways are not separate playable places).
 */
const ABSORB_INTO_ADM0: Record<string, string> = {
  /** Somaliland → Somalia (internationally unrecognized breakaway). */
  SOL: "SOM",
  /** Northern Cyprus → Cyprus. */
  CYN: "CYP",
  /** UN buffer zone on Cyprus → Cyprus (fills the green-line gap). */
  CNM: "CYP",
};

/** BRK_A3 for Moroccan-administered Western Sahara land that NE draws inside Morocco. */
const WESTERN_SAHARA_IN_MOROCCO_BRK = "B19";

/**
 * Rebuild ISO-recognized country polygons from Natural Earth's de facto split.
 *
 * - Somalia absorbs Somaliland (otherwise the Horn is missing / painted as ocean).
 * - Cyprus absorbs Northern Cyprus (+ UN buffer).
 * - Western Sahara reclaims Moroccan-administered land (NE BRK B19); Morocco is clipped
 *   back to the UN Morocco / Western Sahara frontier.
 *
 * Map-unit features for overseas territories are preserved; only the absorbed
 * breakaway ADM0 codes are removed.
 */
export function applyIsoRecognizedBorders(
  features: NaturalEarthFeature[],
  disputedFeatures: NaturalEarthFeature[],
): NaturalEarthFeature[] {
  const primaryByAdm0 = new Map<string, NaturalEarthFeature>();

  for (const feature of features) {
    if (!isAreaGeometry(feature.geometry)) continue;
    const code = normalizeCode(feature.properties.ADM0_A3);
    if (!code || primaryByAdm0.has(code)) continue;
    // First hit is the countries-layer polygon (map units are appended after).
    primaryByAdm0.set(code, feature);
  }

  const geometryOverrides = new Map<string, AreaGeometry>();

  for (const [source, target] of Object.entries(ABSORB_INTO_ADM0)) {
    const sourceFeature = primaryByAdm0.get(source);
    const targetFeature = primaryByAdm0.get(target);
    if (!sourceFeature || !targetFeature) continue;
    if (!isAreaGeometry(sourceFeature.geometry) || !isAreaGeometry(targetFeature.geometry)) {
      continue;
    }

    const existingOverride = geometryOverrides.get(target);
    const base = existingOverride ?? targetFeature.geometry;
    const merged = unionAreaGeometries([base, sourceFeature.geometry]);
    if (!merged) continue;
    geometryOverrides.set(target, ensureExteriorWinding(merged) as AreaGeometry);
  }

  const westernSaharaClaim = disputedFeatures.find(
    (feature) => normalizeCode(feature.properties.BRK_A3) === WESTERN_SAHARA_IN_MOROCCO_BRK,
  );
  const morocco = primaryByAdm0.get("MAR");
  const westernSahara = primaryByAdm0.get("SAH");
  if (
    westernSaharaClaim &&
    isAreaGeometry(westernSaharaClaim.geometry) &&
    morocco &&
    isAreaGeometry(morocco.geometry) &&
    westernSahara &&
    isAreaGeometry(westernSahara.geometry)
  ) {
    const moroccoBase = geometryOverrides.get("MAR") ?? morocco.geometry;
    const saharaBase = geometryOverrides.get("SAH") ?? westernSahara.geometry;
    const moroccoClipped = differenceAreaGeometries(moroccoBase, westernSaharaClaim.geometry);
    const saharaFull = unionAreaGeometries([saharaBase, westernSaharaClaim.geometry]);
    if (moroccoClipped) {
      geometryOverrides.set("MAR", ensureExteriorWinding(moroccoClipped) as AreaGeometry);
    }
    if (saharaFull) {
      geometryOverrides.set("SAH", ensureExteriorWinding(saharaFull) as AreaGeometry);
    }
  }

  const absorbed = new Set(Object.keys(ABSORB_INTO_ADM0));

  return features.flatMap((feature) => {
    const code = normalizeCode(feature.properties.ADM0_A3);
    if (code && absorbed.has(code)) {
      return [];
    }

    const override = code ? geometryOverrides.get(code) : undefined;
    if (!override) {
      return [feature];
    }

    // Only rewrite the primary countries-layer polygon; leave map-unit duplicates alone
    // so overseas territories that share a parent ADM0_A3 stay findable via GU_A3 / ISO.
    if (feature !== primaryByAdm0.get(code!)) {
      return [feature];
    }

    return [{ ...feature, geometry: override }];
  });
}

export async function loadDisputedFeatures(
  scale: "10m" | "50m" = "10m",
): Promise<NaturalEarthFeature[]> {
  const url = scale === "50m" ? NATURAL_EARTH_50M_DISPUTED_URL : NATURAL_EARTH_10M_DISPUTED_URL;
  return fetchFeatureCollection(url);
}

export async function loadNaturalEarthFeatures(
  { clipLakes = false }: { clipLakes?: boolean } = {},
): Promise<NaturalEarthFeature[]> {
  const [countryFeatures, mapUnitFeatures, disputedFeatures] = await Promise.all([
    fetchFeatureCollection(
      clipLakes ? NATURAL_EARTH_COUNTRIES_LAKES_URL : NATURAL_EARTH_COUNTRIES_URL,
    ),
    fetchFeatureCollection(NATURAL_EARTH_MAP_UNITS_URL),
    loadDisputedFeatures("10m"),
  ]);

  return applyIsoRecognizedBorders([...countryFeatures, ...mapUnitFeatures], disputedFeatures);
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
