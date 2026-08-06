/**
 * Audits country silhouettes, context-map borders, and globe outlines for
 * completeness. Shape SVGs use per-place equal-area projections and are not
 * required to match world-map Natural Earth I aspects.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import globeData from "../data/globe-countries.json";
import countriesData from "../data/countries.json";
import { CONTEXT_MAP_TEMPLATES, getContextMapPathIds } from "../lib/context-maps";
import type { Country } from "../lib/types";
import type { GlobeTextureData } from "./generate-globe-texture-data";
import { MIN_SHAPE_VIEWBOX, parseShapeViewBox, shapeViewBoxTooSmall } from "./map-path-utils";

const countries = countriesData as Country[];
const globe = globeData as GlobeTextureData;

/** Overseas territories often live in NE map_units, not 50m countries. */
const GLOBE_OPTIONAL_CODES = new Set([
  "BV",
  "BQ",
  "CX",
  "CC",
  "GF",
  "GI",
  "GP",
  "MQ",
  "YT",
  "RE",
  "SJ",
  "TK",
  "UM",
]);

function parseMapPaths(svgText: string): Map<string, string> {
  const paths = new Map<string, string>();
  for (const match of svgText.matchAll(/<path\s+id="([^"]+)"\s+d="([^"]+)"\s*\/?>/g)) {
    paths.set(match[1], match[2]);
  }
  return paths;
}

async function main() {
  const failures: string[] = [];

  const worldPaths = parseMapPaths(readFileSync(join(process.cwd(), "public", "maps", "world.svg"), "utf8"));
  const globeCodes = new Set(globe.countries.map((entry) => entry.code));

  for (const template of CONTEXT_MAP_TEMPLATES) {
    if (!existsSync(join(process.cwd(), "public", "maps", `${template}.svg`))) {
      failures.push(`Missing context map: public/maps/${template}.svg`);
    }
  }

  if (!existsSync(join(process.cwd(), "public", "maps", "bounds.json"))) {
    failures.push("Missing context map bounds manifest: public/maps/bounds.json");
  }

  for (const country of countries) {
    if (country.code.startsWith("US-")) continue;

    const shapeFile = join(process.cwd(), "public", "shapes", `${country.code3.toLowerCase()}.svg`);

    if (country.hasShape && !existsSync(shapeFile)) {
      failures.push(`${country.name}: hasShape but missing shape file`);
    }

    if (country.hasShape) {
      const svg = readFileSync(shapeFile, "utf8");
      if (svg.includes("potrace")) {
        failures.push(`${country.name}: shape still uses outdated mapsicon/potrace asset`);
      }
      if (!svg.includes("<path")) {
        failures.push(`${country.name}: shape SVG has no paths`);
      }
      if (shapeViewBoxTooSmall(svg)) {
        const viewBox = parseShapeViewBox(svg);
        const detail = viewBox
          ? `${viewBox[2].toFixed(2)}×${viewBox[3].toFixed(2)} (min ${MIN_SHAPE_VIEWBOX})`
          : "missing or invalid viewBox";
        failures.push(`${country.name}: shape viewBox too small to render (${detail})`);
      }
    }

    for (const mapId of getContextMapPathIds(country)) {
      if (!worldPaths.has(mapId)) {
        failures.push(`${country.name}: missing world map path id "${mapId}"`);
      }
    }

    if (!globeCodes.has(country.code) && !GLOBE_OPTIONAL_CODES.has(country.code)) {
      failures.push(`${country.name}: missing globe outline (${country.code})`);
    }
  }

  console.log(`Audited ${countries.length} places.`);

  if (failures.length > 0) {
    console.error(`\nFailures (${failures.length}):`);
    for (const failure of failures) console.error(`  FAIL: ${failure}`);
    process.exit(1);
  }

  console.log("ALL GEOGRAPHY AUDITS PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
