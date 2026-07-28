/**
 * Audits country silhouettes, context-map borders, and globe outlines for
 * completeness and consistency with Natural Earth geography.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error svg-path-bounds ships no type declarations
import getPathBounds from "svg-path-bounds";
import globeData from "../data/globe-countries.json";
import countriesData from "../data/countries.json";
import { CONTEXT_MAP_TEMPLATES, getContextMapPathIds } from "../lib/context-maps";
import type { Country } from "../lib/types";
import type { GlobeTextureData } from "./generate-globe-texture-data";
import { MIN_SHAPE_VIEWBOX, parseShapeViewBox, shapeViewBoxTooSmall } from "./map-path-utils";
import { isCustomShapeCode } from "./supplemental-shapes";

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

function combinedAspect(pathStrings: string[]): number | null {
  const bounds = getPathBounds(pathStrings.join(" "));
  const width = bounds[2] - bounds[0];
  const height = bounds[3] - bounds[1];
  if (width <= 0 || height <= 0) return null;
  return width / height;
}

function aspectMismatchRatio(a: number, b: number): number {
  return Math.max(a, b) / Math.min(a, b);
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

  for (const country of countries) {
    if (!country.hasShape || country.code.startsWith("US-") || isCustomShapeCode(country.code)) {
      continue;
    }

    const shapeFile = join(process.cwd(), "public", "shapes", `${country.code3.toLowerCase()}.svg`);
    const shapePaths = [...readFileSync(shapeFile, "utf8").matchAll(/d="([^"]+)"/g)].map((m) => m[1]);
    const mapPaths = getContextMapPathIds(country)
      .map((id) => worldPaths.get(id))
      .filter((path): path is string => Boolean(path));

    if (mapPaths.length !== getContextMapPathIds(country).length) {
      failures.push(`${country.name}: missing world map geometry for shape comparison`);
      continue;
    }

    if (shapePaths.length !== mapPaths.length) {
      failures.push(
        `${country.name}: shape has ${shapePaths.length} path elements but map has ${mapPaths.length}`,
      );
      continue;
    }

    const shapeAspect = combinedAspect(shapePaths);
    const mapAspect = combinedAspect(mapPaths);
    if (shapeAspect !== null && mapAspect !== null) {
      const mismatch = aspectMismatchRatio(shapeAspect, mapAspect);
      if (mismatch > 1.02) {
        failures.push(
          `${country.name}: shape/map aspect mismatch (${shapeAspect.toFixed(2)} vs ${mapAspect.toFixed(2)})`,
        );
      }
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
