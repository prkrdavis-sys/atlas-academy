/**
 * Audits country silhouettes, context-map borders, and globe outlines for
 * completeness. Shape SVGs must include the same rings the learn card draws.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import globeData from "../data/globe-countries.json";
import countriesData from "../data/countries.json";
import statesData from "../data/states.json";
import { CONTEXT_MAP_TEMPLATES, getContextMapPathIds } from "../lib/context-maps";
import type { MapBoundsManifest } from "../lib/map-bounds";
import type { Country } from "../lib/types";
import boundsManifest from "../public/maps/bounds.json";
import type { GlobeTextureData } from "./generate-globe-texture-data";
import { learnCardVisibleSubpaths, loadContextMapPaths } from "./learn-card-silhouette";
import { MIN_SHAPE_VIEWBOX, parseShapeViewBox, shapeViewBoxTooSmall, splitPathSubpaths } from "./map-path-utils";

const countries = countriesData as Country[];
const states = statesData as Country[];
const manifest = boundsManifest as unknown as MapBoundsManifest;
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

function shapeRingCount(svg: string): number {
  return splitPathSubpaths(svg).length;
}

async function main() {
  const failures: string[] = [];

  const pathsByTemplate = {
    world: loadContextMapPaths("world"),
    usa: loadContextMapPaths("usa"),
  };
  const worldPaths = pathsByTemplate.world;
  const globeCodes = new Set(globe.countries.map((entry) => entry.code));

  function assertLearnCardLand(place: Country, shapeFile: string): void {
    if (!existsSync(shapeFile)) return;
    const visible = learnCardVisibleSubpaths(place, manifest, pathsByTemplate);
    if (!visible) {
      failures.push(`${place.name}: learn card has no visible land to match`);
      return;
    }
    const rings = shapeRingCount(readFileSync(shapeFile, "utf8"));
    if (rings !== visible.length) {
      failures.push(
        `${place.name}: silhouette has ${rings} rings but the learn card shows ${visible.length}`,
      );
    }
  }

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
      assertLearnCardLand(country, shapeFile);
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

  for (const state of states) {
    if (!state.hasShape) continue;
    const shapeFile = join(process.cwd(), "public", "shapes", `${state.code3.toLowerCase()}.svg`);
    if (!existsSync(shapeFile)) {
      failures.push(`${state.name}: hasShape but missing shape file`);
      continue;
    }
    assertLearnCardLand(state, shapeFile);
  }

  console.log(`Audited ${countries.length} countries and ${states.length} states.`);

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
