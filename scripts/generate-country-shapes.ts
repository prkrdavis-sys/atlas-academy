/**
 * Generates quiz/library silhouette SVGs at public/shapes/{code3}.svg.
 *
 * Each shape is the land the learn card already draws: context-map rings that
 * intersect the learn-card crop. Overseas scraps outside that crop stay out;
 * islands inside it stay in, instead of being dropped by a distance filter.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import countriesData from "../data/countries.json";
import type { MapBoundsManifest } from "../lib/map-bounds";
import type { Country } from "../lib/types";
import boundsManifest from "../public/maps/bounds.json";
import { buildLearnCardSilhouetteSvg, loadContextMapPaths } from "./learn-card-silhouette";

const countries = countriesData as Country[];
const SHAPES_DIR = join(process.cwd(), "public", "shapes");
const manifest = boundsManifest as unknown as MapBoundsManifest;

export async function generateCountryShapes(
  shapesDir = SHAPES_DIR,
): Promise<{ written: number; skipped: string[]; missing: string[] }> {
  mkdirSync(shapesDir, { recursive: true });

  const pathsByTemplate = {
    world: loadContextMapPaths("world"),
    usa: loadContextMapPaths("usa"),
  };

  const playable = countries.filter((country) => !country.code.startsWith("US-"));
  const missing: string[] = [];
  const skipped: string[] = [];
  let written = 0;

  for (const country of playable) {
    const svg = buildLearnCardSilhouetteSvg(country, manifest, pathsByTemplate);
    if (!svg) {
      missing.push(`${country.code} (${country.name})`);
      continue;
    }

    writeFileSync(join(shapesDir, `${country.code3.toLowerCase()}.svg`), svg);
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

const entry = process.argv[1]?.replaceAll("\\", "/");
if (entry?.endsWith("generate-country-shapes.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
