/**
 * Generates small continent / US-region silhouettes at
 * public/shapes/continents/{key}.svg for the region picker thumbnails.
 *
 * Geometry comes from the already-generated world and USA context maps, so
 * outlines match the rest of the app. Since a thumbnail renders around 64px
 * wide, the paths are aggressively pruned and simplified — the full-detail
 * continent templates are 2-4 MB each, far too heavy to load a grid of.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import countriesData from "../data/countries.json";
import statesData from "../data/states.json";
import { getContextMapPathIds } from "../lib/context-maps";
import { REGION_SHAPE_KEYS } from "../lib/continent-shapes";
import { CONTINENTS, US_REGIONS, type Country, type Region } from "../lib/types";
import { MAP_WIDTH, boundsArea, type PathBounds } from "./map-path-utils";

const countries = countriesData as Country[];
const usStates = statesData as Country[];

const MAPS_DIR = join(process.cwd(), "public", "maps");
const OUT_DIR = join(process.cwd(), "public", "shapes", "continents");

/** Thumbnail canvas; coordinates are rounded to a tenth of a unit on this scale. */
const CANVAS = 400;
const PAD_RATIO = 0.02;
/**
 * Douglas-Peucker tolerance and island cutoff, as fractions of the region's
 * longest edge. Tuned so coastlines stay recognizable at thumbnail size while
 * dropping specks that only add bytes.
 */
const SIMPLIFY_TOLERANCE_RATIO = 0.0025;
const MIN_ISLAND_AREA_RATIO = 0.00035;
/** Rings farther than this (x core diagonal) from the landmass are dropped. */
const MAX_OUTLIER_DISTANCE_RATIO = 0.55;
/** Place centers outside this percentile band fall outside the framed crop. */
const CROP_PERCENTILE = 0.06;
const CROP_PAD_RATIO = 0.12;
/** Below this many places, framing is skipped and the full extent is used. */
const MIN_PLACES_FOR_CROP = 20;

type Point = [x: number, y: number];

type Ring = {
  /** Index of the place this ring came from, so the crop can be framed per place. */
  placeIndex: number;
  points: Point[];
  bounds: PathBounds;
  area: number;
};

function readTemplatePaths(templateKey: string): Map<string, string> {
  const svg = readFileSync(join(MAPS_DIR, `${templateKey}.svg`), "utf8");
  const paths = new Map<string, string>();
  const pattern = /<path id="([^"]+)" d="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(svg)) !== null) {
    paths.set(match[1], match[2]);
  }
  return paths;
}

function parseSubpaths(path: string): Point[][] {
  return (path.match(/M[^M]*/g) ?? []).map((subpath) =>
    [...subpath.matchAll(/(-?\d*\.?\d+(?:e[-+]?\d+)?),(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi)].map(
      (coordinate) => [Number(coordinate[1]), Number(coordinate[2])] as Point,
    ),
  );
}

function ringBounds(points: Point[]): PathBounds {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const [x, y] of points) {
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return [left, top, right, bottom];
}

function boundsCenter([left, top, right, bottom]: PathBounds): Point {
  return [(left + right) / 2, (top + bottom) / 2];
}

function unionBounds(list: PathBounds[]): PathBounds {
  return [
    Math.min(...list.map(([left]) => left)),
    Math.min(...list.map(([, top]) => top)),
    Math.max(...list.map(([, , right]) => right)),
    Math.max(...list.map(([, , , bottom]) => bottom)),
  ];
}

function intersectsBounds(a: PathBounds, b: PathBounds): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function toRing(placeIndex: number, points: Point[]): Ring {
  const bounds = ringBounds(points);
  return { placeIndex, points, bounds, area: boundsArea(bounds) };
}

function shiftRing(ring: Ring, dx: number): Ring {
  if (dx === 0) return ring;
  return toRing(
    ring.placeIndex,
    ring.points.map(([x, y]) => [x + dx, y] as Point),
  );
}

/**
 * Places that cross ±180° project to opposite edges of the world canvas, which
 * would stretch a region across the whole map (Russia's Chukotka, the Aleutians,
 * Fiji). Each ring is shifted by whole map widths to sit beside the region's
 * dominant landmass instead.
 */
function unwrapRings(rings: Ring[]): Ring[] {
  const anchor = rings.reduce((best, ring) => (ring.area > best.area ? ring : best));
  const [anchorX] = boundsCenter(anchor.bounds);

  return rings.map((ring) => {
    const [x] = boundsCenter(ring.bounds);
    let best = ring;
    let bestDistance = Math.abs(x - anchorX);
    for (const dx of [-MAP_WIDTH, MAP_WIDTH]) {
      const distance = Math.abs(x + dx - anchorX);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = shiftRing(ring, dx);
      }
    }
    return best;
  });
}

/**
 * Drops specks and far-flung outliers so the crop frames the landmass. Outliers
 * are measured against the bounds of the rings holding most of the area, which
 * keeps remote dependencies from widening a continent to the whole world.
 */
function pruneRings(rings: Ring[]): Ring[] {
  const sorted = [...rings].sort((a, b) => b.area - a.area);
  const totalArea = sorted.reduce((sum, ring) => sum + ring.area, 0);
  if (totalArea === 0) return rings;

  let coreArea = 0;
  const core: Ring[] = [];
  for (const ring of sorted) {
    core.push(ring);
    coreArea += ring.area;
    if (coreArea >= totalArea * 0.9) break;
  }

  const coreBounds = unionBounds(core.map((ring) => ring.bounds));
  const coreCenter = boundsCenter(coreBounds);
  const coreDiagonal = Math.hypot(coreBounds[2] - coreBounds[0], coreBounds[3] - coreBounds[1]);
  const maxDistance = coreDiagonal * MAX_OUTLIER_DISTANCE_RATIO;
  const minArea = boundsArea(coreBounds) * MIN_ISLAND_AREA_RATIO;

  return sorted.filter((ring, index) => {
    if (index === 0) return true;
    if (ring.area < minArea) return false;
    const center = boundsCenter(ring.bounds);
    return Math.hypot(center[0] - coreCenter[0], center[1] - coreCenter[1]) <= maxDistance;
  });
}

function perpendicularDistance(point: Point, start: Point, end: Point): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared;
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(point[0] - (start[0] + clamped * dx), point[1] - (start[1] + clamped * dy));
}

function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];

  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * fraction)),
  );
  return sorted[index];
}

/**
 * Frames the crop on where a region's places cluster rather than on its full
 * extent. Europe would otherwise be dominated by Russia stretching to the
 * Pacific, and North America by Greenland, leaving the recognizable landmass a
 * smear. Geometry outside the frame stays in the file and is clipped by the
 * viewBox, so the outline still covers every place the region selects.
 */
function frameBounds(rings: Ring[]): PathBounds {
  const naturalBounds = unionBounds(rings.map((ring) => ring.bounds));

  const byPlace = new Map<number, PathBounds[]>();
  for (const ring of rings) {
    const existing = byPlace.get(ring.placeIndex);
    if (existing) existing.push(ring.bounds);
    else byPlace.set(ring.placeIndex, [ring.bounds]);
  }
  const placeBounds = [...byPlace.values()].map((list) => unionBounds(list));
  // Cropping only helps where there is a genuine long tail of outliers. On a
  // region with few places, trimming percentiles just slices off real land.
  if (placeBounds.length < MIN_PLACES_FOR_CROP) return naturalBounds;

  const centers = placeBounds.map((bounds) => boundsCenter(bounds));
  const xs = centers.map(([x]) => x).sort((a, b) => a - b);
  const ys = centers.map(([, y]) => y).sort((a, b) => a - b);

  const left = percentile(xs, CROP_PERCENTILE);
  const right = percentile(xs, 1 - CROP_PERCENTILE);
  const top = percentile(ys, CROP_PERCENTILE);
  const bottom = percentile(ys, 1 - CROP_PERCENTILE);

  const padX = Math.max((right - left) * CROP_PAD_RATIO, 1);
  const padY = Math.max((bottom - top) * CROP_PAD_RATIO, 1);

  return [
    Math.max(naturalBounds[0], left - padX),
    Math.max(naturalBounds[1], top - padY),
    Math.min(naturalBounds[2], right + padX),
    Math.min(naturalBounds[3], bottom + padY),
  ];
}

function buildRegionSvg(rings: Ring[], frame: PathBounds): string {
  const [left, top, right, bottom] = frame;
  const span = Math.max(right - left, bottom - top, 1e-9);
  const pad = CANVAS * PAD_RATIO;
  const scale = (CANVAS - pad * 2) / span;
  const width = (right - left) * scale + pad * 2;
  const height = (bottom - top) * scale + pad * 2;
  const tolerance = SIMPLIFY_TOLERANCE_RATIO * span;

  const markup = rings
    .map((ring) => {
      const simplified = simplify(ring.points, tolerance);
      if (simplified.length < 3) return "";
      return `${simplified
        .map(([x, y], index) => {
          const localX = ((x - left) * scale + pad).toFixed(1);
          const localY = ((y - top) * scale + pad).toFixed(1);
          return `${index === 0 ? "M" : "L"}${localX},${localY}`;
        })
        .join("")}Z`;
    })
    .filter(Boolean)
    .join("");

  // Solid black: these are consumed as CSS masks, where only alpha matters.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(1)} ${height.toFixed(1)}"><path d="${markup}" fill="#000000"/></svg>\n`;
}

/** Places whose checkbox a region owns — sovereign states, plus Antarctic bases. */
function placesForRegion(region: Region, dataset: Country[]): Country[] {
  return dataset.filter((place) => {
    if (place.continent !== region) return false;
    if (region === "Antarctica") return true;
    return !place.isTerritory;
  });
}

function generate(region: Region, dataset: Country[], templatePaths: Map<string, string>): number {
  const places = placesForRegion(region, dataset);

  const rings: Ring[] = [];
  places.forEach((place, placeIndex) => {
    for (const id of getContextMapPathIds(place)) {
      const path = templatePaths.get(id);
      if (!path) continue;
      for (const points of parseSubpaths(path)) {
        if (points.length >= 3) rings.push(toRing(placeIndex, points));
      }
    }
  });

  if (rings.length === 0) {
    throw new Error(`No geometry found for region ${region}`);
  }

  const kept = pruneRings(unwrapRings(rings));
  const frame = frameBounds(kept);
  // Rings the frame already hides contribute nothing but bytes.
  const visible = kept.filter((ring) => intersectsBounds(ring.bounds, frame));
  const svg = buildRegionSvg(visible, frame);
  writeFileSync(join(OUT_DIR, `${REGION_SHAPE_KEYS[region]}.svg`), svg);
  return svg.length;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const worldPaths = readTemplatePaths("world");
  const usaPaths = readTemplatePaths("usa");

  let total = 0;
  for (const continent of CONTINENTS) {
    const bytes = generate(continent, countries, worldPaths);
    total += bytes;
    console.log(`  ${continent.padEnd(15)} ${(bytes / 1024).toFixed(1)} KB`);
  }
  for (const region of US_REGIONS) {
    const bytes = generate(region, usStates, usaPaths);
    total += bytes;
    console.log(`  ${`US ${region}`.padEnd(15)} ${(bytes / 1024).toFixed(1)} KB`);
  }

  console.log(
    `Wrote ${CONTINENTS.length + US_REGIONS.length} region shapes to public/shapes/continents/ (${(total / 1024).toFixed(1)} KB total)`,
  );
}

main();
