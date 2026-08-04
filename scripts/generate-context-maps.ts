/**
 * Generates continent and USA context-map SVG templates at public/maps/.
 * Country paths come from Natural Earth 10m, with geoBoundaries ADM0 upgrades for
 * microstates and other low-vertex places so close-up crops stay accurate.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import countriesData from "../data/countries.json";
import { getContextMapPathIds, getNeighborContextMapPathIds } from "../lib/context-maps";
import type { MapBoundsManifest, MapTemplateBounds, PathBounds } from "../lib/map-bounds";
import { formatViewBox } from "../lib/map-bounds";
import { CONTINENTS, type Continent, type Country } from "../lib/types";
import {
  buildNaturalEarthLocations,
  loadNaturalEarthFeatures,
  type SvgMapLocation,
} from "./natural-earth-map-data";
import {
  MAP_WIDTH,
  toFocusBounds,
  toPathBounds,
  unwrapAntimeridianPath,
} from "./map-path-utils";

const OUT_DIR = join(process.cwd(), "public", "maps");
const countries = countriesData as Country[];

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

function boundsIntersect(a: PathBounds, b: PathBounds): boolean {
  return !(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]);
}

/** Absolute pad cap so Russia-sized members do not halo the whole globe. */
const MAX_HALO_PAD = 380;
/** Ignore oversized members as spatial seeds (Russia, Antarctica, etc.). */
const MAX_HALO_SEED_SPAN = 1800;
/** Do not spatially import other oversized shapes as "nearby" detail. */
const MAX_HALO_EXTRA_SPAN = 2000;

/** Pad focus bounds the way Learn cards do, so nearby overseas land stays in-template. */
function paddedFocusBounds(subject: PathBounds, paddingRatio: number): PathBounds {
  const [left, top, right, bottom] = subject;
  const span = Math.max(right - left, bottom - top, 1e-6);
  const pad = Math.min(span * paddingRatio, MAX_HALO_PAD);
  return [left - pad, top - pad, right + pad, bottom + pad];
}

function focusSpan(bounds: PathBounds): number {
  return Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]);
}

/**
 * Continent templates otherwise omit land across seas (Yemen next to Ethiopia,
 * Spain north of Morocco). Pull in those nearby shapes so Learn/Library crops
 * do not show empty ocean where countries should be.
 */
function enrichWithNearbyLocations(
  memberLocations: SvgMapLocation[],
  worldLocations: SvgMapLocation[],
  continentCountries: Country[],
): { locations: SvgMapLocation[]; extras: string[] } {
  const memberIds = new Set(memberLocations.map((location) => location.id));
  const focusById = new Map(
    worldLocations.map((location) => [location.id, toFocusBounds(location.path)]),
  );

  const halos = memberLocations.flatMap((location) => {
    const focus = focusById.get(location.id) ?? toPathBounds(location.path);
    if (focusSpan(focus) > MAX_HALO_SEED_SPAN) return [];
    return [paddedFocusBounds(focus, 0.55)];
  });

  const extraIds = new Set<string>();
  for (const location of worldLocations) {
    if (memberIds.has(location.id)) continue;
    const focus = focusById.get(location.id);
    if (!focus || focusSpan(focus) > MAX_HALO_EXTRA_SPAN) continue;
    if (halos.some((halo) => boundsIntersect(focus, halo))) {
      extraIds.add(location.id);
    }
  }

  for (const country of continentCountries) {
    for (const id of getNeighborContextMapPathIds(country)) {
      if (!memberIds.has(id)) extraIds.add(id);
    }
  }

  const extras = worldLocations.filter((location) => extraIds.has(location.id));
  return {
    locations: [...memberLocations, ...extras],
    extras: extras.map((location) => location.id).sort(),
  };
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
    const memberLocations = filterLocationsForCountries(worldLocations, continentCountries);
    const { locations, extras } = enrichWithNearbyLocations(
      memberLocations,
      worldLocations,
      continentCountries,
    );

    const templateKey = continentToFileKey(continent);
    const { svg, bounds } = buildTemplate(locations);
    writeFileSync(join(OUT_DIR, `${templateKey}.svg`), svg);
    manifest[templateKey] = bounds;
    console.log(
      `Wrote ${templateKey}.svg (${locations.length} paths` +
        (extras.length > 0 ? `, +${extras.length} nearby: ${extras.join(", ")}` : "") +
        `)`,
    );
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
