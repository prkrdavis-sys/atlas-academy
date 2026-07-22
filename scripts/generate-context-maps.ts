/**
 * Generates continent and USA context-map SVG templates at public/maps/.
 * Country paths come from Natural Earth 10m data for high-detail coastlines at zoom.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error svg-path-bounds ships no type declarations
import getPathBounds from "svg-path-bounds";
import countriesData from "../data/countries.json";
import { getContextMapPathIds } from "../lib/context-maps";
import type { MapBoundsManifest, MapTemplateBounds, PathBounds } from "../lib/map-bounds";
import { formatViewBox } from "../lib/map-bounds";
import { CONTINENTS, type Continent, type Country } from "../lib/types";
import {
  buildNaturalEarthLocations,
  loadNaturalEarthFeatures,
  type SvgMapLocation,
} from "./natural-earth-map-data";

const OUT_DIR = join(process.cwd(), "public", "maps");
const countries = countriesData as Country[];

function toPathBounds(path: string): PathBounds {
  const [left, top, right, bottom] = getPathBounds(path);
  return [left, top, right, bottom];
}

function buildTemplate(
  locations: SvgMapLocation[],
): { svg: string; bounds: MapTemplateBounds } {
  if (locations.length === 0) {
    throw new Error("Cannot build context map with zero paths");
  }

  const pathBounds = locations.map((location) => ({
    id: location.id,
    bounds: toPathBounds(location.path),
  }));

  const left = Math.min(...pathBounds.map((entry) => entry.bounds[0]));
  const top = Math.min(...pathBounds.map((entry) => entry.bounds[1]));
  const right = Math.max(...pathBounds.map((entry) => entry.bounds[2]));
  const bottom = Math.max(...pathBounds.map((entry) => entry.bounds[3]));
  const width = right - left;
  const height = bottom - top;
  const pad = Math.max(width, height) * 0.04;
  const viewBox: PathBounds = [left - pad, top - pad, width + pad * 2, height + pad * 2];

  const pathMarkup = locations
    .map((location) => `<path id="${location.id}" d="${location.path}"/>`)
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${formatViewBox(viewBox)}">${pathMarkup}</svg>\n`;
  const bounds: MapTemplateBounds = {
    viewBox,
    paths: Object.fromEntries(pathBounds.map((entry) => [entry.id, entry.bounds])),
  };

  return { svg, bounds };
}

function filterLocationsForCountries(
  allLocations: SvgMapLocation[],
  countryList: Country[],
): SvgMapLocation[] {
  const ids = new Set<string>();
  for (const country of countryList) {
    for (const id of getContextMapPathIds(country)) {
      ids.add(id);
    }
  }

  return allLocations.filter((location) => ids.has(location.id));
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  console.log("Loading Natural Earth 10m features...");
  const features = await loadNaturalEarthFeatures();
  const { locations: worldLocations, missing } = buildNaturalEarthLocations(features);

  if (missing.length > 0) {
    const names = [...new Set(missing.map((country) => `${country.code} (${country.name})`))];
    throw new Error(`Missing Natural Earth geometry for: ${names.join(", ")}`);
  }

  console.log(`Built ${worldLocations.length} high-detail country paths`);

  const manifest: MapBoundsManifest = {} as MapBoundsManifest;

  for (const continent of CONTINENTS) {
    const continentCountries = countries.filter((country) => country.continent === continent);
    const locations = filterLocationsForCountries(worldLocations, continentCountries);

    const templateKey = continentToFileKey(continent);
    const { svg, bounds } = buildTemplate(locations);
    writeFileSync(join(OUT_DIR, `${templateKey}.svg`), svg);
    manifest[templateKey] = bounds;
    console.log(`Wrote ${templateKey}.svg (${locations.length} paths)`);
  }

  const usa = (await import("@svg-maps/usa")).default as { locations: SvgMapLocation[] };
  const usaLocations = usa.locations.filter((location) => location.id !== "dc");
  const usaTemplate = buildTemplate(usaLocations);
  writeFileSync(join(OUT_DIR, "usa.svg"), usaTemplate.svg);
  manifest.usa = usaTemplate.bounds;
  console.log(`Wrote usa.svg (${usaLocations.length} paths)`);

  const worldTemplate = buildTemplate(worldLocations);
  writeFileSync(join(OUT_DIR, "world.svg"), worldTemplate.svg);
  manifest.world = worldTemplate.bounds;
  console.log(
    `Wrote world.svg (${worldLocations.length} paths, ${(worldTemplate.svg.length / 1024 / 1024).toFixed(2)} MB)`,
  );

  writeFileSync(join(OUT_DIR, "bounds.json"), `${JSON.stringify(manifest)}\n`);
  console.log("Wrote bounds.json");
}

function continentToFileKey(continent: Continent): keyof MapBoundsManifest {
  switch (continent) {
    case "Africa":
      return "africa";
    case "Antarctica":
      return "antarctica";
    case "Asia":
      return "asia";
    case "Europe":
      return "europe";
    case "North America":
      return "north-america";
    case "Oceania":
      return "oceania";
    case "South America":
      return "south-america";
    default: {
      const _exhaustive: never = continent;
      return _exhaustive;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
