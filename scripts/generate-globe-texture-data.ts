/**
 * Generates data/globe-countries.json: country outlines projected onto an
 * equirectangular grid, keyed by uppercase ISO alpha-2 codes (the same codes
 * as profile.placeMapProgress). The home page paints these onto a canvas with
 * per-country mastery colors and wraps it around the 3D globe.
 *
 * Uses Natural Earth 110m data — small enough for a texture, matching the
 * fetch-at-generate-time approach of the other map scripts.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import countriesData from "../data/countries.json";
import type { Country } from "../lib/types";

const NATURAL_EARTH_110M_COUNTRIES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

/** Texture dimensions; equirectangular means width = 2 × height. */
const TEXTURE_WIDTH = 2048;
const TEXTURE_HEIGHT = 1024;

type NaturalEarthProperties = {
  ISO_A2?: string;
  ISO_A2_EH?: string;
  ISO_A3?: string;
  WB_A2?: string;
  ADM0_A3?: string;
  ADMIN?: string;
};

type CountryFeature = Feature<Polygon | MultiPolygon, NaturalEarthProperties>;

export type GlobeCountryShape = {
  code: string;
  /** Flat [x0, y0, x1, y1, ...] pixel rings; holes rely on evenodd filling. */
  rings: number[][];
};

export type GlobeTextureData = {
  width: number;
  height: number;
  countries: GlobeCountryShape[];
  /** Land that has no playable country (e.g. Antarctica), drawn as base land. */
  extras: number[][];
};

const countries = countriesData as Country[];

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

function projectX(lon: number): number {
  return ((lon + 180) / 360) * TEXTURE_WIDTH;
}

function projectY(lat: number): number {
  return ((90 - lat) / 180) * TEXTURE_HEIGHT;
}

/**
 * Projects a lon/lat ring to flat pixel coordinates, unwrapping antimeridian
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
      if (x - previousX > TEXTURE_WIDTH / 2) {
        shift -= TEXTURE_WIDTH;
        x -= TEXTURE_WIDTH;
      } else if (previousX - x > TEXTURE_WIDTH / 2) {
        shift += TEXTURE_WIDTH;
        x += TEXTURE_WIDTH;
      }
    }
    previousX = x;

    const px = Math.round(x);
    const py = Math.round(projectY(lat));
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

async function main() {
  console.log(`Fetching Natural Earth 110m countries...`);
  const response = await fetch(NATURAL_EARTH_110M_COUNTRIES_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Natural Earth data (${response.status})`);
  }
  const collection = (await response.json()) as FeatureCollection;
  const features = collection.features as CountryFeature[];

  const byCode = new Map<string, number[][]>();
  const extras: number[][] = [];

  for (const feature of features) {
    if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") {
      continue;
    }
    const rings = projectGeometryRings(feature.geometry);
    if (rings.length === 0) continue;

    const code = resolveFeatureCode(feature);
    if (code) {
      byCode.set(code, [...(byCode.get(code) ?? []), ...rings]);
    } else {
      extras.push(...rings);
    }
  }

  const data: GlobeTextureData = {
    width: TEXTURE_WIDTH,
    height: TEXTURE_HEIGHT,
    countries: [...byCode.entries()]
      .map(([code, rings]) => ({ code, rings }))
      .sort((a, b) => a.code.localeCompare(b.code)),
    extras,
  };

  const outPath = path.join(process.cwd(), "data", "globe-countries.json");
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(data));

  const missing = countries.filter((country) => !byCode.has(country.code) && !country.isTerritory);
  console.log(
    `Wrote ${data.countries.length} countries (+${extras.length} extra land rings) to data/globe-countries.json`,
  );
  if (missing.length > 0) {
    console.log(
      `No 110m outline for ${missing.length} places (too small at this scale): ${missing
        .map((c) => c.code)
        .join(", ")}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
