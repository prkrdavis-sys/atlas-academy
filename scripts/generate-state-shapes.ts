/**
 * Generates one silhouette SVG per US state at public/shapes/us-XX.svg.
 *
 * Uses the USA context-map land that intersects the learn-card crop, so a
 * state quiz shape shows the same islands and coast as its learn card.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import statesData from "../data/states.json";
import type { MapBoundsManifest } from "../lib/map-bounds";
import type { Country } from "../lib/types";
import boundsManifest from "../public/maps/bounds.json";
import { buildLearnCardSilhouetteSvg, loadContextMapPaths } from "./learn-card-silhouette";

const states = statesData as Country[];
const OUT_DIR = join(process.cwd(), "public", "shapes");
const manifest = boundsManifest as unknown as MapBoundsManifest;

mkdirSync(OUT_DIR, { recursive: true });

const pathsByTemplate = {
  world: loadContextMapPaths("world"),
  usa: loadContextMapPaths("usa"),
};

let count = 0;
for (const state of states) {
  const svg = buildLearnCardSilhouetteSvg(state, manifest, pathsByTemplate);
  if (!svg) {
    throw new Error(`Could not build learn-card silhouette for ${state.name}`);
  }

  writeFileSync(join(OUT_DIR, `${state.code3.toLowerCase()}.svg`), svg);
  count += 1;
}

console.log(`Wrote ${count} state shapes to public/shapes/`);
