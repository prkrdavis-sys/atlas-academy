/**
 * Generates quiz/library silhouette SVGs at public/shapes/{code3}.svg.
 *
 * Each place is projected alone with an azimuthal equal-area view centered on
 * its landmass so outlines keep true proportions — not the world Natural Earth I
 * stretch used by context maps.
 *
 * Remote overseas scraps that share an ADM0 polygon (e.g. Caribbean
 * Netherlands inside NLD) are dropped via toFocusGeometry so the recognizable
 * mainland fills the frame.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import countriesData from "../data/countries.json";
import type { Country } from "../lib/types";
import {
  findFeatureForCountry,
  loadDetailedGeometry,
  loadNaturalEarthFeatures,
  type NaturalEarthFeature,
} from "./natural-earth-map-data";
import { buildTrueShapeSvg } from "./shape-projection";

const countries = countriesData as Country[];
const SHAPES_DIR = join(process.cwd(), "public", "shapes");

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

export async function generateCountryShapes(
  shapesDir = SHAPES_DIR,
): Promise<{ written: number; skipped: string[]; missing: string[] }> {
  mkdirSync(shapesDir, { recursive: true });

  console.log("Loading Natural Earth 10m features...");
  const features = await loadNaturalEarthFeatures();
  console.log("Building true-shape silhouettes (geoBoundaries upgrades for microstates)...");

  const playable = countries.filter((country) => !country.code.startsWith("US-"));
  const missing: string[] = [];
  const skipped: string[] = [];
  let written = 0;

  const resolved = await mapPool(playable, 3, async (country) => {
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

  const upgraded: string[] = [];

  for (const { country, feature, didUpgrade } of resolved) {
    if (!feature?.geometry) {
      missing.push(`${country.code} (${country.name})`);
      continue;
    }

    const svg = buildTrueShapeSvg(feature.geometry, {
      southPole: country.code.toUpperCase() === "AQ",
    });
    if (!svg) {
      missing.push(`${country.code} (${country.name}) failed to project`);
      continue;
    }

    writeFileSync(join(shapesDir, `${country.code3.toLowerCase()}.svg`), svg);
    written += 1;
    if (didUpgrade) upgraded.push(country.code);
  }

  if (upgraded.length > 0) {
    console.log(`Detail upgrades: ${upgraded.join(", ")}`);
  }

  return { written, skipped, missing };
}

async function main() {
  const { written, missing } = await generateCountryShapes();
  console.log(`Wrote ${written} country shapes to public/shapes/`);

  if (missing.length > 0) {
    console.error("Missing shapes:");
    for (const entry of missing) console.error(`  - ${entry}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
