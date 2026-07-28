/**
 * Precomputes the nearest mainland country for island and isolated places.
 * Output: data/closest-mainland.json (ISO code → ISO code).
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import globeData from "../data/globe-countries.json";
import countriesData from "../data/countries.json";
import type { Country } from "../lib/types";

type LatLng = { lat: number; lng: number };

type RawCountry = {
  cca2: string;
  latlng?: [number, number];
};

const countries = countriesData as Country[];
const globeCountries = globeData.countries as Array<{ code: string; rings: number[][] }>;

const CONTINENTAL_LANDMASSES = new Set(["AU", "GL"]);
const CONTINENTAL_MAINLAND = new Set(["AU"]);
const LARGE_MAINLAND_AREA = 250_000;
const ISLAND_AREA_THRESHOLD = 100_000;

function ringCentroid(ring: number[]): [number, number] {
  let sumX = 0;
  let sumY = 0;
  const pointCount = ring.length / 2;
  for (let index = 0; index < ring.length; index += 2) {
    sumX += ring[index];
    sumY += ring[index + 1];
  }
  return [sumX / pointCount, sumY / pointCount];
}

function normalizedToLatLng(x: number, y: number): LatLng {
  return { lat: 90 - y * 180, lng: x * 360 - 180 };
}

function haversine(a: LatLng, b: LatLng): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const root =
    sinLat * sinLat +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinLng * sinLng;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(root));
}

function isMainlandCandidate(country: Country): boolean {
  if (country.isTerritory) return false;
  if (country.borders.length > 0) return true;
  if (CONTINENTAL_MAINLAND.has(country.code)) return true;
  if (country.area >= LARGE_MAINLAND_AREA) return true;
  return false;
}

function shouldComputeClosestMainland(country: Country): boolean {
  if (CONTINENTAL_LANDMASSES.has(country.code)) return false;
  if (country.borders.length > 0) return false;
  if (country.area >= ISLAND_AREA_THRESHOLD) return false;
  return true;
}

function buildShapeCentroidMap(): Map<string, LatLng> {
  const centroids = new Map<string, LatLng>();
  for (const entry of globeCountries) {
    if (entry.rings.length === 0) continue;
    const [x, y] = ringCentroid(entry.rings[0]);
    centroids.set(entry.code, normalizedToLatLng(x, y));
  }
  return centroids;
}

async function buildCapitalLatLngMap(): Promise<Map<string, LatLng>> {
  const response = await fetch(
    "https://raw.githubusercontent.com/mledoze/countries/master/countries.json",
  );
  if (!response.ok) {
    throw new Error("Failed to fetch source countries for latlng data");
  }

  const raw = (await response.json()) as RawCountry[];
  const latlngByCode = new Map<string, LatLng>();
  for (const country of raw) {
    if (!country.latlng || country.latlng.length !== 2) continue;
    latlngByCode.set(country.cca2, { lat: country.latlng[0], lng: country.latlng[1] });
  }
  return latlngByCode;
}

function resolveLatLng(
  code: string,
  shapeCentroids: Map<string, LatLng>,
  capitalLatLng: Map<string, LatLng>,
): LatLng | undefined {
  return shapeCentroids.get(code) ?? capitalLatLng.get(code);
}

async function main() {
  const shapeCentroids = buildShapeCentroidMap();
  const capitalLatLng = await buildCapitalLatLngMap();

  const closestMainland: Record<string, string> = {};

  for (const country of countries) {
    if (!shouldComputeClosestMainland(country)) continue;

    const origin = resolveLatLng(country.code, shapeCentroids, capitalLatLng);
    if (!origin) continue;

    let nearestCode: string | undefined;
    let nearestDistance = Infinity;

    for (const candidate of countries) {
      if (candidate.code === country.code) continue;
      if (!isMainlandCandidate(candidate)) continue;

      const destination = resolveLatLng(candidate.code, shapeCentroids, capitalLatLng);
      if (!destination) continue;

      const distance = haversine(origin, destination);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestCode = candidate.code;
      }
    }

    if (nearestCode) {
      closestMainland[country.code] = nearestCode;
    }
  }

  writeFileSync(
    join(process.cwd(), "data/closest-mainland.json"),
    `${JSON.stringify(closestMainland, null, 2)}\n`,
  );

  console.log(`Wrote ${Object.keys(closestMainland).length} closest-mainland entries`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
