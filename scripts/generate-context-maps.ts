/**
 * Generates continent and USA context-map SVG templates at public/maps/.
 * Paths use @svg-maps ids so runtime components can highlight places by id.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error svg-path-bounds ships no type declarations
import getPathBounds from "svg-path-bounds";
import countriesData from "../data/countries.json";
import { SUPPLEMENTAL_MAP_IDS } from "../lib/context-maps";
import type { MapBoundsManifest, MapTemplateBounds, PathBounds } from "../lib/map-bounds";
import { formatViewBox } from "../lib/map-bounds";
import { CONTINENTS, type Continent, type Country } from "../lib/types";

type SvgMapLocation = { id: string; path: string };

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

function resolveMapIds(country: Country): string[] {
  const supplemental = SUPPLEMENTAL_MAP_IDS[country.code];
  if (supplemental) {
    return Array.isArray(supplemental) ? supplemental : [supplemental];
  }
  return [country.code.toLowerCase()];
}

function readAntarcticaPath(): string | null {
  const shapePath = join(process.cwd(), "public", "shapes", "ata.svg");
  if (!existsSync(shapePath)) return null;
  const svg = readFileSync(shapePath, "utf8");
  const match = svg.match(/<path[^>]*d="([^"]+)"/);
  return match?.[1] ?? null;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const world = (await import("@svg-maps/world")).default as { locations: SvgMapLocation[] };
  const usa = (await import("@svg-maps/usa")).default as { locations: SvgMapLocation[] };
  const worldById = new Map(world.locations.map((location) => [location.id, location.path]));

  const antarcticaPath = readAntarcticaPath();
  if (antarcticaPath) {
    worldById.set("aq", antarcticaPath);
  } else {
    console.warn("Warning: Antarctica shape missing; antarctica.svg will omit AQ.");
  }

  const manifest: MapBoundsManifest = {} as MapBoundsManifest;

  for (const continent of CONTINENTS) {
    const continentCountries = countries.filter((country) => country.continent === continent);
    const locations: SvgMapLocation[] = [];
    const seenIds = new Set<string>();

    for (const country of continentCountries) {
      for (const id of resolveMapIds(country)) {
        if (seenIds.has(id)) continue;
        const path = worldById.get(id);
        if (!path) {
          console.warn(`Warning: missing world path for ${country.code} (${id})`);
          continue;
        }
        seenIds.add(id);
        locations.push({ id, path });
      }
    }

    const templateKey = continentToFileKey(continent);
    const { svg, bounds } = buildTemplate(locations);
    writeFileSync(join(OUT_DIR, `${templateKey}.svg`), svg);
    manifest[templateKey] = bounds;
    console.log(`Wrote ${templateKey}.svg (${locations.length} paths)`);
  }

  const usaLocations = usa.locations.filter((location) => location.id !== "dc");
  const usaTemplate = buildTemplate(usaLocations);
  writeFileSync(join(OUT_DIR, "usa.svg"), usaTemplate.svg);
  manifest.usa = usaTemplate.bounds;
  console.log(`Wrote usa.svg (${usaLocations.length} paths)`);

  const worldLocations = world.locations.map((location) =>
    location.id === "aq" && antarcticaPath ? { ...location, path: antarcticaPath } : location,
  );
  const worldTemplate = buildTemplate(worldLocations);
  writeFileSync(join(OUT_DIR, "world.svg"), worldTemplate.svg);
  manifest.world = worldTemplate.bounds;
  console.log(`Wrote world.svg (${worldLocations.length} paths)`);

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
