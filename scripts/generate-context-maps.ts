/**
 * Generates continent and USA context-map SVG templates at public/maps/.
 * Country paths come from Natural Earth 10m, with geoBoundaries ADM0 upgrades for
 * microstates and other low-vertex places so close-up crops stay accurate.
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

/** Matches the Natural Earth fitSize width in natural-earth-map-data.ts. */
const MAP_WIDTH = 10000;

function toPathBounds(path: string): PathBounds {
  const [left, top, right, bottom] = getPathBounds(path);
  return [left, top, right, bottom];
}

function boundsArea([left, top, right, bottom]: PathBounds): number {
  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

function boundsDistance(a: PathBounds, b: PathBounds): number {
  const dx = Math.max(0, a[0] - b[2], b[0] - a[2]);
  const dy = Math.max(0, a[1] - b[3], b[1] - a[3]);
  return Math.hypot(dx, dy);
}

/** Shift only X coordinates in d3-geo M/L path segments. */
function shiftPathX(path: string, dx: number): string {
  if (dx === 0) return path;
  return path.replace(/([ML])(-?\d*\.?\d+(?:e[-+]?\d+)?),(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi, (
    _,
    command: string,
    x: string,
    y: string,
  ) => `${command}${Number(x) + dx},${y}`);
}

/**
 * Countries that cross ±180° (Russia, Fiji, …) project as split pieces on opposite
 * sides of the canvas. Move far-side subpaths so the shape is one contiguous
 * landmass. Natural Earth is not equirectangular, so after a ±MAP_WIDTH guess we
 * snap residual gaps shut against the primary landmass.
 */
function unwrapAntimeridianPath(path: string): string {
  const subpaths = path.match(/M[^M]*/g);
  if (!subpaths || subpaths.length <= 1) return path;

  const analyzed = subpaths.map((subpath) => {
    const bounds = toPathBounds(subpath);
    return {
      subpath,
      bounds,
      area: boundsArea(bounds),
      cx: (bounds[0] + bounds[2]) / 2,
    };
  });
  analyzed.sort((a, b) => b.area - a.area);

  const primary = analyzed[0];
  const needsUnwrap = analyzed.some(
    (entry) => Math.abs(entry.cx - primary.cx) > MAP_WIDTH * 0.45,
  );
  if (!needsUnwrap) return path;

  const originalBounds = toPathBounds(path);
  const originalWidth = originalBounds[2] - originalBounds[0];

  const unwrapped = analyzed
    .map((entry, index) => {
      if (index === 0) return entry.subpath;

      let bestDx = 0;
      let bestScore = Infinity;
      for (const k of [0, -2, -1, 1, 2]) {
        const dx = k * MAP_WIDTH;
        const shifted: PathBounds = [
          entry.bounds[0] + dx,
          entry.bounds[1],
          entry.bounds[2] + dx,
          entry.bounds[3],
        ];
        const score = boundsDistance(shifted, primary.bounds) * 10 + Math.abs(entry.cx + dx - primary.cx);
        if (score < bestScore) {
          bestScore = score;
          bestDx = dx;
        }
      }

      if (bestDx !== 0) {
        const shiftedLeft = entry.bounds[0] + bestDx;
        const shiftedRight = entry.bounds[2] + bestDx;
        if (shiftedLeft > primary.bounds[2]) {
          const gap = shiftedLeft - primary.bounds[2];
          if (gap > 0 && gap < MAP_WIDTH * 0.35) bestDx -= gap - 1;
        } else if (shiftedRight < primary.bounds[0]) {
          const gap = primary.bounds[0] - shiftedRight;
          if (gap > 0 && gap < MAP_WIDTH * 0.35) bestDx += gap - 1;
        }
      }

      return shiftPathX(entry.subpath, bestDx);
    })
    .join("");

  const unwrappedBounds = toPathBounds(unwrapped);
  const unwrappedWidth = unwrappedBounds[2] - unwrappedBounds[0];
  // Only keep the rewrite when it actually joins the split halves.
  return unwrappedWidth < originalWidth * 0.92 ? unwrapped : path;
}

/**
 * Keeps the main connected landmass and nearby substantial islands in frame,
 * while excluding remote territories that make the featured place unreadably small.
 */
function toFocusBounds(path: string): PathBounds {
  const subpathBounds = (path.match(/M[^M]*/g) ?? [path])
    .map(toPathBounds)
    .sort((a, b) => boundsArea(b) - boundsArea(a));
  const primary = subpathBounds[0];
  const primaryArea = boundsArea(primary);
  const primaryDiagonal = Math.hypot(primary[2] - primary[0], primary[3] - primary[1]);
  // Keep nearby islands / the Far East tip after antimeridian unwrap; drop only
  // remote overseas territories (Caribbean Netherlands, French Guiana, etc.).
  const included = subpathBounds.filter(
    (bounds) =>
      boundsArea(bounds) >= primaryArea * 0.005 &&
      boundsDistance(primary, bounds) <= primaryDiagonal * 1.75,
  );

  return [
    Math.min(...included.map((bounds) => bounds[0])),
    Math.min(...included.map((bounds) => bounds[1])),
    Math.max(...included.map((bounds) => bounds[2])),
    Math.max(...included.map((bounds) => bounds[3])),
  ];
}

function buildTemplate(
  locations: SvgMapLocation[],
): { svg: string; bounds: MapTemplateBounds } {
  if (locations.length === 0) {
    throw new Error("Cannot build context map with zero paths");
  }

  const normalizedLocations = locations.map((location) => ({
    ...location,
    path: unwrapAntimeridianPath(location.path),
  }));

  const pathBounds = normalizedLocations.map((location) => ({
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

  const pathMarkup = normalizedLocations
    .map((location) => `<path id="${location.id}" d="${location.path}"/>`)
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${formatViewBox(viewBox)}">${pathMarkup}</svg>\n`;
  const bounds: MapTemplateBounds = {
    viewBox,
    paths: Object.fromEntries(pathBounds.map((entry) => [entry.id, entry.bounds])),
    focusPaths: Object.fromEntries(
      normalizedLocations.map((location) => [location.id, toFocusBounds(location.path)]),
    ),
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
  console.log("Building paths (upgrading low-detail microstates via geoBoundaries)...");
  const { locations: worldLocations, missing, upgraded } =
    await buildNaturalEarthLocations(features);

  if (missing.length > 0) {
    const names = [...new Set(missing.map((country) => `${country.code} (${country.name})`))];
    throw new Error(`Missing Natural Earth geometry for: ${names.join(", ")}`);
  }

  console.log(
    `Built ${worldLocations.length} country paths (${upgraded.length} upgraded for detail: ${upgraded.join(", ")})`,
  )

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
