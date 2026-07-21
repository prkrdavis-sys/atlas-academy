import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error svg-path-bounds ships no type declarations
import getPathBounds from "svg-path-bounds";

type SvgMapLocation = { id: string; path: string };

type GeoJsonFeature = {
  properties: { ISO_A2?: string };
  geometry:
    | { type: "Polygon"; coordinates: [number, number][][] }
    | { type: "MultiPolygon"; coordinates: [number, number][][][] };
};

type GeoJsonCollection = { features: GeoJsonFeature[] };

const NATURAL_EARTH_COUNTRIES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson";

/** Alpha-2 codes with better silhouettes than mapsicon provides. */
const CUSTOM_SHAPE_CODES = new Set(["AQ", "BS", "JE", "RW"]);

/** Alpha-2 codes mapsicon omits; filled from @svg-maps/world. */
const SUPPLEMENTAL_SHAPE_IDS: Record<string, string | string[]> = {
  FM: "fm",
  MH: "mh",
  MP: "mp",
  PS: "ps",
  TV: "tv",
  UM: ["um-dq", "um-fq", "um-hq", "um-jq", "um-mq", "um-wq"],
  XK: "xk",
};

let worldLocations: SvgMapLocation[] | null = null;

async function loadWorldLocations(): Promise<SvgMapLocation[]> {
  if (worldLocations) return worldLocations;
  const world = (await import("@svg-maps/world")).default as { locations: SvgMapLocation[] };
  worldLocations = world.locations;
  return worldLocations;
}

function buildShapeSvg(paths: string[]): string {
  const bounds = paths.map((path) => getPathBounds(path));
  const left = Math.min(...bounds.map(([l]) => l));
  const top = Math.min(...bounds.map(([, t]) => t));
  const right = Math.max(...bounds.map(([, , r]) => r));
  const bottom = Math.max(...bounds.map(([, , , b]) => b));
  const width = right - left;
  const height = bottom - top;
  const pad = Math.max(width, height) * 0.03;
  const viewBox = `${(left - pad).toFixed(2)} ${(top - pad).toFixed(2)} ${(width + pad * 2).toFixed(2)} ${(height + pad * 2).toFixed(2)}`;
  const pathMarkup = paths.map((path) => `<path d="${path}" fill="#000000"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${pathMarkup}</svg>\n`;
}

export function isCustomShapeCode(code: string): boolean {
  return CUSTOM_SHAPE_CODES.has(code.toUpperCase());
}

export function isSupplementalShapeCode(code: string): boolean {
  return code.toUpperCase() in SUPPLEMENTAL_SHAPE_IDS;
}

function ringArea(ring: [number, number][]): number {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function ringBounds(rings: [number, number][][]): {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
} {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
  }

  return { minLon, maxLon, minLat, maxLat };
}

function ringToProjectedPath(
  ring: [number, number][],
  bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  canvasSize = 1000,
): string | null {
  const { minLon, maxLon, minLat, maxLat } = bounds;
  const project = ([lon, lat]: [number, number]): [number, number] => [
    ((lon - minLon) / (maxLon - minLon)) * canvasSize,
    ((maxLat - lat) / (maxLat - minLat)) * canvasSize,
  ];

  const points = ring.map(project);
  if (points.length < 3) return null;

  let path = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let index = 1; index < points.length; index += 1) {
    path += ` L ${points[index][0].toFixed(2)} ${points[index][1].toFixed(2)}`;
  }
  return `${path} Z`;
}

/** Uses the Graham Bartram continent path from the AQ flag so shape matches flag. */
function writeAntarcticaShape(shapesDir: string): boolean {
  const flagPath = join(process.cwd(), "public", "flags", "aq.svg");
  const flagSvg = readFileSync(flagPath, "utf8");
  const match = flagSvg.match(/<path[^>]*fill="#fff"[^>]*d="([^"]+)"/);
  if (!match) return false;

  writeFileSync(join(shapesDir, "ata.svg"), buildShapeSvg([match[1]]));
  return true;
}

async function writeBahamasShape(shapesDir: string): Promise<boolean> {
  const response = await fetch(NATURAL_EARTH_COUNTRIES_URL);
  if (!response.ok) return false;

  const data = (await response.json()) as GeoJsonCollection;
  const feature = data.features.find((entry) => entry.properties.ISO_A2 === "BS");
  if (!feature || feature.geometry.type !== "MultiPolygon") return false;

  const polygons = feature.geometry.coordinates;
  const bounds = ringBounds(polygons.map((polygon) => polygon[0]));
  const maxArea = Math.max(...polygons.map((polygon) => ringArea(polygon[0])));
  const minArea = maxArea * 0.005;
  const paths = polygons
    .filter((polygon) => ringArea(polygon[0]) >= minArea)
    .map((polygon) => ringToProjectedPath(polygon[0], bounds))
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) return false;

  writeFileSync(join(shapesDir, "bhs.svg"), buildShapeSvg(paths));
  return true;
}

async function writeNaturalEarthPolygonShape(
  isoA2: string,
  outputBasename: string,
  shapesDir: string,
): Promise<boolean> {
  const response = await fetch(NATURAL_EARTH_COUNTRIES_URL);
  if (!response.ok) return false;

  const data = (await response.json()) as GeoJsonCollection;
  const feature = data.features.find((entry) => entry.properties.ISO_A2 === isoA2);
  if (!feature || feature.geometry.type !== "Polygon") return false;

  const ring = feature.geometry.coordinates[0];
  const bounds = ringBounds([ring]);
  const path = ringToProjectedPath(ring, bounds);
  if (!path) return false;

  writeFileSync(join(shapesDir, `${outputBasename}.svg`), buildShapeSvg([path]));
  return true;
}

async function writeRwandaShape(shapesDir: string): Promise<boolean> {
  return writeNaturalEarthPolygonShape("RW", "rwa", shapesDir);
}

async function writeJerseyShape(shapesDir: string): Promise<boolean> {
  return writeNaturalEarthPolygonShape("JE", "jey", shapesDir);
}

export async function writeCustomShape(
  code: string,
  _code3: string,
  shapesDir = join(process.cwd(), "public", "shapes"),
): Promise<boolean> {
  switch (code.toUpperCase()) {
    case "AQ":
      return writeAntarcticaShape(shapesDir);
    case "BS":
      return writeBahamasShape(shapesDir);
    case "JE":
      return writeJerseyShape(shapesDir);
    case "RW":
      return writeRwandaShape(shapesDir);
    default:
      return false;
  }
}

export async function writeSupplementalShape(
  code: string,
  code3: string,
  shapesDir = join(process.cwd(), "public", "shapes"),
): Promise<boolean> {
  const ids = SUPPLEMENTAL_SHAPE_IDS[code.toUpperCase()];
  if (!ids) return false;

  const locations = await loadWorldLocations();
  const idList = Array.isArray(ids) ? ids : [ids];
  const paths = idList
    .map((id) => locations.find((location) => location.id === id)?.path)
    .filter((path): path is string => Boolean(path));

  if (paths.length !== idList.length) return false;

  const destination = join(shapesDir, `${code3.toLowerCase()}.svg`);
  writeFileSync(destination, buildShapeSvg(paths));
  return true;
}
