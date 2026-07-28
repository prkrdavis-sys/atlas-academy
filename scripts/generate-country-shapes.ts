/**
 * Generates quiz/library silhouette SVGs at public/shapes/{code3}.svg from
 * Natural Earth 10m — the same geometry pipeline as context maps and globe
 * borders — so shapes always match map outlines.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import countriesData from "../data/countries.json";
import { getContextMapPathIds } from "../lib/context-maps";
import type { Country } from "../lib/types";
import {
  buildNaturalEarthLocations,
  loadNaturalEarthFeatures,
} from "./natural-earth-map-data";
import { unwrapAntimeridianPath } from "./map-path-utils";
import {
  buildShapeSvg,
  isCustomShapeCode,
  writeCustomShape,
} from "./supplemental-shapes";

const countries = countriesData as Country[];
const SHAPES_DIR = join(process.cwd(), "public", "shapes");

export async function generateCountryShapes(
  shapesDir = SHAPES_DIR,
): Promise<{ written: number; skipped: string[]; missing: string[] }> {
  mkdirSync(shapesDir, { recursive: true });

  console.log("Loading Natural Earth 10m features...");
  const features = await loadNaturalEarthFeatures();
  console.log("Building country paths (geoBoundaries upgrades for microstates)...");
  const { locations, missing: neMissing, upgraded } = await buildNaturalEarthLocations(features);

  if (neMissing.length > 0) {
    const names = [...new Set(neMissing.map((country) => `${country.code} (${country.name})`))];
    throw new Error(`Missing Natural Earth geometry for: ${names.join(", ")}`);
  }

  if (upgraded.length > 0) {
    console.log(`Detail upgrades: ${upgraded.join(", ")}`);
  }

  const pathById = new Map(locations.map((location) => [location.id, location.path]));
  const skipped: string[] = [];
  const missing: string[] = [];
  let written = 0;

  for (const country of countries) {
    if (country.code.startsWith("US-")) continue;

    if (isCustomShapeCode(country.code)) {
      const ok = await writeCustomShape(country.code, country.code3, shapesDir);
      if (ok) written += 1;
      else missing.push(`${country.code} (${country.name}) custom shape failed`);
      continue;
    }

    const mapIds = getContextMapPathIds(country);
    const paths = mapIds
      .map((id) => pathById.get(id))
      .filter((path): path is string => Boolean(path))
      .map((path) => unwrapAntimeridianPath(path));

    if (paths.length !== mapIds.length) {
      missing.push(`${country.code} (${country.name}) missing map path ids: ${mapIds.join(", ")}`);
      continue;
    }

    writeFileSync(
      join(shapesDir, `${country.code3.toLowerCase()}.svg`),
      buildShapeSvg(paths),
    );
    written += 1;
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
