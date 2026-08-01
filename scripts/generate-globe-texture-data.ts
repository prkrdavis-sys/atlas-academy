/**
 * Generates:
 * - data/globe-countries.json — NE 50m country/state outlines for the base
 *   equirectangular globe texture (distant viewing).
 * - data/globe-detail-countries.json — NE 10m (+ geoBoundaries upgrades) rings
 *   for small / under-tessellated places, used as vector overlays when zoomed in.
 * - data/globe-closeup-countries.json — NE 10m (+ geoBoundaries upgrades) rings
 *   for all playable countries/states, painted into regional close-up patches.
 *
 * Coordinates are normalized equirectangular floats (x, y in 0..1), keyed by the
 * same codes as profile.placeMapProgress.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import countriesData from "../data/countries.json";
import statesData from "../data/states.json";
import type { Country } from "../lib/types";
import {
  countCoordinates,
  findFeatureForCountry,
  loadDetailedGeometry,
  loadNaturalEarthFeatures,
  type NaturalEarthFeature,
} from "./natural-earth-map-data";

// The "_lakes" variants clip large lakes out of the polygons. Without them,
// admin boundaries follow legal water borders (e.g. Michigan extends to the
// middle of the Great Lakes), which looks wrong painted on the globe.
const NATURAL_EARTH_50M_COUNTRIES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries_lakes.geojson";
const NATURAL_EARTH_50M_STATES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces_lakes.geojson";
const NATURAL_EARTH_10M_STATES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces_lakes.geojson";

/** Decimal places for the base texture rings (~0.6px at an 8192-wide texture). */
const COORD_PRECISION = 5;

/**
 * Detail overlays need finer quantization: microstates span ≪ 1e-4 in
 * normalized space, so 5 decimals stair-step their coastlines.
 */
const DETAIL_COORD_PRECISION = 7;

/**
 * Include a place in the detail overlay set when its largest ring is small on
 * the globe. Vertex count alone is a bad proxy — Switzerland/Tunisia are
 * low-vert at 50m but huge on screen if drawn as vector overlays.
 */
const DETAIL_MAX_NORMALIZED_SPAN = 0.008;

/** Also keep extremely under-tessellated scraps even if slightly larger. */
const DETAIL_MAX_COARSE_VERTICES = 40;

/** Soft cap on total vertices stored per detail country (matches map pipeline). */
const DETAIL_MAX_PREFERRED_COORDINATES = 3500;

type NaturalEarthCountryProperties = {
  ISO_A2?: string;
  ISO_A2_EH?: string;
  ISO_A3?: string;
  WB_A2?: string;
  ADM0_A3?: string;
  ADMIN?: string;
};

type NaturalEarthStateProperties = {
  iso_3166_2?: string;
  adm0_a3?: string;
  postal?: string;
  name?: string;
};

type CountryFeature = Feature<Polygon | MultiPolygon, NaturalEarthCountryProperties>;
type StateFeature = Feature<Polygon | MultiPolygon, NaturalEarthStateProperties>;

export type GlobeCountryShape = {
  code: string;
  /** Flat [x0, y0, x1, y1, ...] normalized (0..1) rings; holes rely on evenodd filling. */
  rings: number[][];
};

export type GlobeTextureData = {
  /** Country outlines keyed by ISO alpha-2 code. */
  countries: GlobeCountryShape[];
  /** The 50 U.S. states keyed by "US-XX", drawn over the US when states mode is on. */
  usStates: GlobeCountryShape[];
  /** Land that has no playable country (e.g. Antarctica), drawn as base land. */
  extras: number[][];
};

export type GlobeDetailData = {
  countries: GlobeCountryShape[];
};

export type GlobeCloseupData = {
  countries: GlobeCountryShape[];
  usStates: GlobeCountryShape[];
};

const countries = countriesData as Country[];
const usStates = statesData as Country[];

function normalizeCode(value: string | undefined): string | undefined {
  if (!value || value === "-99") return undefined;
  return value.toUpperCase();
}

function resolveFeatureCode(feature: CountryFeature): string | undefined {
  const properties = feature.properties;
  const alpha2 =
    normalizeCode(properties.ISO_A2) ??
    normalizeCode(properties.ISO_A2_EH) ??
    normalizeCode(properties.WB_A2);
  if (alpha2 && countries.some((country) => country.code === alpha2)) {
    return alpha2;
  }

  const alpha3 = normalizeCode(properties.ADM0_A3) ?? normalizeCode(properties.ISO_A3);
  if (alpha3) {
    const match = countries.find((country) => country.code3 === alpha3);
    if (match) return match.code;
  }
  return undefined;
}

function resolveStateCode(feature: StateFeature): string | undefined {
  const properties = feature.properties;
  if (normalizeCode(properties.adm0_a3) !== "USA") return undefined;

  const iso = normalizeCode(properties.iso_3166_2);
  if (iso && usStates.some((state) => state.code === iso)) return iso;

  const postal = normalizeCode(properties.postal);
  if (postal) {
    const code = `US-${postal}`;
    if (usStates.some((state) => state.code === code)) return code;
  }
  return undefined;
}

function projectX(lon: number): number {
  return (lon + 180) / 360;
}

function projectY(lat: number): number {
  return (90 - lat) / 180;
}

function round(value: number, precision = COORD_PRECISION): number {
  return Number(value.toFixed(precision));
}

/**
 * Projects a lon/lat ring to normalized coordinates, unwrapping antimeridian
 * jumps so rings that straddle ±180° stay contiguous (the renderer draws
 * shifted copies to cover both sides of the seam).
 */
function projectRing(ring: Position[], precision = COORD_PRECISION): number[] | null {
  const flat: number[] = [];
  let previousX: number | null = null;
  let shift = 0;

  for (const [lon, lat] of ring) {
    let x = projectX(lon) + shift;
    if (previousX !== null) {
      if (x - previousX > 0.5) {
        shift -= 1;
        x -= 1;
      } else if (previousX - x > 0.5) {
        shift += 1;
        x += 1;
      }
    }
    previousX = x;

    const px = round(x, precision);
    const py = round(projectY(lat), precision);
    const length = flat.length;
    if (length >= 2 && flat[length - 2] === px && flat[length - 1] === py) continue;
    flat.push(px, py);
  }

  return flat.length >= 6 ? flat : null;
}

function projectGeometryRings(
  geometry: Polygon | MultiPolygon,
  precision = COORD_PRECISION,
): number[][] {
  const polygons: Position[][][] =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const rings: number[][] = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const projected = projectRing(ring, precision);
      if (projected) rings.push(projected);
    }
  }
  return rings;
}

async function fetchFeatureCollection(url: string): Promise<FeatureCollection> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Natural Earth data from ${url} (${response.status})`);
  }
  return (await response.json()) as FeatureCollection;
}

function isAreaGeometry(
  geometry: Feature["geometry"] | null | undefined,
): geometry is Polygon | MultiPolygon {
  return geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";
}

function countRingVertices(rings: number[][]): number {
  let count = 0;
  for (const ring of rings) count += ring.length / 2;
  return count;
}

/** Axis-aligned span of the largest ring in normalized equirectangular space. */
function largestRingNormalizedSpan(rings: number[][]): number {
  let best = 0;
  for (const ring of rings) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < ring.length; i += 2) {
      const x = ring[i];
      const y = ring[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const span = Math.max(maxX - minX, maxY - minY);
    if (span > best) best = span;
  }
  return best;
}

function needsDetailOverlay(rings: number[][] | undefined): boolean {
  if (!rings || rings.length === 0) return true;
  const normalizedSpan = largestRingNormalizedSpan(rings);
  if (normalizedSpan < DETAIL_MAX_NORMALIZED_SPAN) return true;
  const verts = countRingVertices(rings);
  // Crude scraps that are still relatively small (not continental outlines).
  if (verts < DETAIL_MAX_COARSE_VERTICES && normalizedSpan < 0.03) return true;
  return false;
}

/**
 * Drop every Nth vertex on oversized rings while keeping endpoints, so detail
 * overlays stay within a memory budget without losing overall shape.
 */
function simplifyRings(rings: number[][], maxVertices: number): number[][] {
  const total = countRingVertices(rings);
  if (total <= maxVertices) return rings;

  const keepRatio = maxVertices / total;
  return rings.map((ring) => {
    const pointCount = ring.length / 2;
    if (pointCount <= 4) return ring;
    const stride = Math.max(1, Math.ceil(1 / keepRatio));
    const simplified: number[] = [];
    for (let i = 0; i < pointCount; i += 1) {
      if (i === 0 || i === pointCount - 1 || i % stride === 0) {
        simplified.push(ring[i * 2], ring[i * 2 + 1]);
      }
    }
    // Ensure a closed triangle at minimum.
    if (simplified.length < 6) return ring;
    return simplified;
  });
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

async function buildDetailCountries(
  coarseByCode: Map<string, number[][]>,
  missingCodes: string[],
): Promise<GlobeCountryShape[]> {
  const candidates = countries.filter(
    (country) => needsDetailOverlay(coarseByCode.get(country.code)) || missingCodes.includes(country.code),
  );

  console.log(
    `Building high-detail overlays for ${candidates.length} small/low-detail places...`,
  );

  const features = await loadNaturalEarthFeatures({ clipLakes: true });
  const featureByCode = new Map<string, NaturalEarthFeature>();
  for (const country of candidates) {
    const feature = findFeatureForCountry(features, country);
    if (feature) featureByCode.set(country.code, feature);
  }

  const resolved = await mapPool(candidates, 3, async (country) => {
    const baseFeature = featureByCode.get(country.code);
    if (!baseFeature?.geometry || !isAreaGeometry(baseFeature.geometry)) {
      return null;
    }

    const detailed = await loadDetailedGeometry(country, baseFeature.geometry);
    if (!isAreaGeometry(detailed)) return null;

    const rings = simplifyRings(
      projectGeometryRings(detailed, DETAIL_COORD_PRECISION),
      DETAIL_MAX_PREFERRED_COORDINATES,
    );
    if (rings.length === 0) return null;

    return { code: country.code, rings } satisfies GlobeCountryShape;
  });

  return resolved
    .filter((entry): entry is GlobeCountryShape => entry !== null)
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * NE 10m (+ geoBoundaries) rings for every playable country — used by the
 * regional close-up texture painter when the camera zooms in.
 */
async function buildCloseupCountries(): Promise<GlobeCountryShape[]> {
  console.log(`Building close-up rings for ${countries.length} places...`);

  const features = await loadNaturalEarthFeatures({ clipLakes: true });
  const featureByCode = new Map<string, NaturalEarthFeature>();
  for (const country of countries) {
    const feature = findFeatureForCountry(features, country);
    if (feature) featureByCode.set(country.code, feature);
  }

  const resolved = await mapPool(countries, 3, async (country) => {
    const baseFeature = featureByCode.get(country.code);
    if (!baseFeature?.geometry || !isAreaGeometry(baseFeature.geometry)) {
      return null;
    }

    const detailed = await loadDetailedGeometry(country, baseFeature.geometry);
    if (!isAreaGeometry(detailed)) return null;

    const rings = simplifyRings(
      projectGeometryRings(detailed, DETAIL_COORD_PRECISION),
      DETAIL_MAX_PREFERRED_COORDINATES,
    );
    if (rings.length === 0) return null;

    return { code: country.code, rings } satisfies GlobeCountryShape;
  });

  return resolved
    .filter((entry): entry is GlobeCountryShape => entry !== null)
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** NE 10m US state rings for close-up patches in states mode. */
async function buildCloseupUsStates(): Promise<GlobeCountryShape[]> {
  console.log("Fetching Natural Earth 10m states/provinces for close-up...");
  const statesCollection = await fetchFeatureCollection(NATURAL_EARTH_10M_STATES_URL);
  const stateByCode = new Map<string, number[][]>();

  for (const feature of statesCollection.features as StateFeature[]) {
    if (!isAreaGeometry(feature.geometry)) continue;
    const code = resolveStateCode(feature);
    if (!code) continue;
    const rings = simplifyRings(
      projectGeometryRings(feature.geometry, DETAIL_COORD_PRECISION),
      DETAIL_MAX_PREFERRED_COORDINATES,
    );
    if (rings.length === 0) continue;
    stateByCode.set(code, [...(stateByCode.get(code) ?? []), ...rings]);
  }

  return [...stateByCode.entries()]
    .map(([code, rings]) => ({ code, rings }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

async function main() {
  console.log("Fetching Natural Earth 50m countries...");
  const countryCollection = await fetchFeatureCollection(NATURAL_EARTH_50M_COUNTRIES_URL);
  console.log("Fetching Natural Earth 50m states/provinces...");
  const statesCollection = await fetchFeatureCollection(NATURAL_EARTH_50M_STATES_URL);

  const byCode = new Map<string, number[][]>();
  const extras: number[][] = [];

  for (const feature of countryCollection.features as CountryFeature[]) {
    if (!isAreaGeometry(feature.geometry)) continue;
    const rings = projectGeometryRings(feature.geometry);
    if (rings.length === 0) continue;

    const code = resolveFeatureCode(feature);
    if (code) {
      byCode.set(code, [...(byCode.get(code) ?? []), ...rings]);
    } else {
      extras.push(...rings);
    }
  }

  const stateByCode = new Map<string, number[][]>();
  for (const feature of statesCollection.features as StateFeature[]) {
    if (!isAreaGeometry(feature.geometry)) continue;
    const code = resolveStateCode(feature);
    if (!code) continue;
    const rings = projectGeometryRings(feature.geometry);
    if (rings.length === 0) continue;
    stateByCode.set(code, [...(stateByCode.get(code) ?? []), ...rings]);
  }

  const data: GlobeTextureData = {
    countries: [...byCode.entries()]
      .map(([code, rings]) => ({ code, rings }))
      .sort((a, b) => a.code.localeCompare(b.code)),
    usStates: [...stateByCode.entries()]
      .map(([code, rings]) => ({ code, rings }))
      .sort((a, b) => a.code.localeCompare(b.code)),
    extras,
  };

  const outPath = path.join(process.cwd(), "data", "globe-countries.json");
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(data));

  const missingCountries = countries.filter(
    (country) => !byCode.has(country.code) && !country.isTerritory,
  );
  const missingStates = usStates.filter((state) => !stateByCode.has(state.code));
  console.log(
    `Wrote ${data.countries.length} countries, ${data.usStates.length} US states ` +
      `(+${extras.length} extra land rings) to data/globe-countries.json`,
  );
  if (missingCountries.length > 0) {
    console.log(
      `No 50m outline for ${missingCountries.length} places (too small at this scale): ${missingCountries
        .map((c) => c.code)
        .join(", ")}`,
    );
  }
  if (missingStates.length > 0) {
    console.log(`Missing state outlines: ${missingStates.map((s) => s.code).join(", ")}`);
  }

  const detailCountries = await buildDetailCountries(
    byCode,
    missingCountries.map((c) => c.code),
  );
  const detailData: GlobeDetailData = { countries: detailCountries };
  const detailPath = path.join(process.cwd(), "data", "globe-detail-countries.json");
  await writeFile(detailPath, JSON.stringify(detailData));

  const detailVerts = detailCountries.reduce(
    (sum, country) => sum + countRingVertices(country.rings),
    0,
  );
  console.log(
    `Wrote ${detailCountries.length} detail overlays (${detailVerts} verts) to data/globe-detail-countries.json`,
  );

  const closeupCountries = await buildCloseupCountries();
  const closeupUsStates = await buildCloseupUsStates();
  const closeupData: GlobeCloseupData = {
    countries: closeupCountries,
    usStates: closeupUsStates,
  };
  const closeupPath = path.join(process.cwd(), "data", "globe-closeup-countries.json");
  await writeFile(closeupPath, JSON.stringify(closeupData));

  const closeupVerts =
    closeupCountries.reduce((sum, country) => sum + countRingVertices(country.rings), 0) +
    closeupUsStates.reduce((sum, state) => sum + countRingVertices(state.rings), 0);
  console.log(
    `Wrote ${closeupCountries.length} close-up countries + ${closeupUsStates.length} US states ` +
      `(${closeupVerts} verts) to data/globe-closeup-countries.json`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
