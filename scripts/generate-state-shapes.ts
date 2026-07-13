/**
 * Generates one silhouette SVG per US state at public/shapes/us-XX.svg,
 * mirroring the mapsicon style used for country shapes (solid black fill,
 * tight per-state viewBox with padding).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import usa from "@svg-maps/usa";
// @ts-expect-error svg-path-bounds ships no type declarations
import getPathBounds from "svg-path-bounds";

const OUT_DIR = join(process.cwd(), "public", "shapes");
mkdirSync(OUT_DIR, { recursive: true });

let count = 0;
for (const location of usa.locations) {
  const id = location.id.toLowerCase();
  if (id === "dc") continue;
  const [left, top, right, bottom] = getPathBounds(location.path);
  const width = right - left;
  const height = bottom - top;
  const pad = Math.max(width, height) * 0.03;
  const viewBox = `${(left - pad).toFixed(2)} ${(top - pad).toFixed(2)} ${(width + pad * 2).toFixed(2)} ${(height + pad * 2).toFixed(2)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${location.path}" fill="#000000"/></svg>\n`;
  writeFileSync(join(OUT_DIR, `us-${id}.svg`), svg);
  count += 1;
}
console.log(`Wrote ${count} state shapes to public/shapes/`);
