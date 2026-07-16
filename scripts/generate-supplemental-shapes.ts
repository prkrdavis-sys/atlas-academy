/**
 * Generates silhouette SVGs for countries omitted by mapsicon, using @svg-maps/world.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { isSupplementalShapeCode, writeSupplementalShape } from "./supplemental-shapes";
import countriesData from "../data/countries.json";

async function main() {
  const outDir = join(process.cwd(), "public", "shapes");
  mkdirSync(outDir, { recursive: true });

  let count = 0;
  for (const country of countriesData) {
    if (!isSupplementalShapeCode(country.code)) continue;
    const ok = await writeSupplementalShape(country.code, country.code3, outDir);
    if (ok) {
      count += 1;
      console.log(`Wrote ${country.code3.toLowerCase()}.svg (${country.name})`);
    } else {
      console.error(`Failed to write shape for ${country.name}`);
      process.exitCode = 1;
    }
  }

  console.log(`Wrote ${count} supplemental shapes to public/shapes/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
