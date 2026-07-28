/**
 * Generates one silhouette SVG per US state at public/shapes/us-XX.svg,
 * using the same local-coordinate pipeline as country shapes.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import usa from "@svg-maps/usa";
import { buildShapeSvg } from "./map-path-utils";

const OUT_DIR = join(process.cwd(), "public", "shapes");
mkdirSync(OUT_DIR, { recursive: true });

let count = 0;
for (const location of usa.locations) {
  const id = location.id.toLowerCase();
  if (id === "dc") continue;
  writeFileSync(join(OUT_DIR, `us-${id}.svg`), buildShapeSvg([location.path]));
  count += 1;
}
console.log(`Wrote ${count} state shapes to public/shapes/`);
