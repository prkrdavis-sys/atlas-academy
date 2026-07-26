/**
 * Generates data/globe-countries.json: country and U.S. state outlines
 * projected onto normalized equirectangular coordinates (x, y in 0..1),
 * keyed by the same codes as profile.placeMapProgress (ISO alpha-2 for
 * countries, "US-XX" for states). The globe rasterizes these onto a canvas
 * at whatever resolution the device supports, so coordinates are stored as
 * floats rather than pixels.
 *
 * Uses Natural Earth 50m data for crisp borders when zoomed in, matching the
 * fetch-at-generate-time approach of the other map scripts.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import countriesData from "../data/countries.json";
import statesData from "../data/states.json";
import type { Country } from "../lib/types";

const NATURAL_EARTH_50M_COUNTRIES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const NATURAL_EARTH_50M_STATES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson";

/** Decimal places kept for normalized coordinates (~0.6px at an 8192-wide texture). */
const COORD_PRECISION = 5;

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

function round(value: number): number {
  return Number(value.toFixed(COORD_PRECISION));
}

/**
 * Projects a lon/lat ring to normalized coordinates, unwrapping antimeridian
 * jumps so rings that straddle ±180° stay contiguous (the renderer draws
 * shifted copies to cover both sides of the seam).
 */
function projectRing(ring: Position[]): number[] | null {
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

    const px = round(x);
    const py = round(projectY(lat));
    const length = flat.length;
    if (length >= 2 && flat[length - 2] === px && flat[length - 1] === py) continue;
    flat.push(px, py);
  }

  return flat.length >= 6 ? flat : null;
}

function projectGeometryRings(geometry: Polygon | MultiPolygon): number[][] {
  const polygons: Position[][][] =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const rings: number[][] = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const projected = projectRing(ring);
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
