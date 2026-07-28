import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error svg-path-bounds ships no type declarations
import getPathBounds from "svg-path-bounds";

type SvgMapLocation = { id: string; path: string };

/** Alpha-2 codes with non–Natural Earth silhouettes (Antarctica matches flag art). */
const CUSTOM_SHAPE_CODES = new Set(["AQ"]);

/** Alpha-2 codes Natural Earth omits; filled from @svg-maps/world. */
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

export function buildShapeSvg(paths: string[]): string {
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

/** Uses the Graham Bartram continent path from the AQ flag so shape matches flag. */
function writeAntarcticaShape(shapesDir: string): boolean {
  const flagPath = join(process.cwd(), "public", "flags", "aq.svg");
  const flagSvg = readFileSync(flagPath, "utf8");
  const match = flagSvg.match(/<path[^>]*fill="#fff"[^>]*d="([^"]+)"/);
  if (!match) return false;

  writeFileSync(join(shapesDir, "ata.svg"), buildShapeSvg([match[1]]));
  return true;
}

export async function writeCustomShape(
  code: string,
  _code3: string,
  shapesDir = join(process.cwd(), "public", "shapes"),
): Promise<boolean> {
  switch (code.toUpperCase()) {
    case "AQ":
      return writeAntarcticaShape(shapesDir);
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
