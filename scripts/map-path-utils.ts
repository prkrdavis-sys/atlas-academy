/**
 * Shared SVG path helpers for Natural Earth context maps and country silhouettes.
 */
// @ts-expect-error svg-path-bounds ships no type declarations
import getPathBounds from "svg-path-bounds";

export type PathBounds = [left: number, top: number, right: number, bottom: number];

/** Matches the Natural Earth fitSize canvas in natural-earth-map-data.ts. */
export const MAP_WIDTH = 10000;
export const MAP_HEIGHT = 5000;

/** Target canvas for library/quiz silhouette SVGs (local coords, not map space). */
export const SHAPE_OUTPUT_CANVAS = 1000;
export const SHAPE_PAD_RATIO = 0.03;
/** Reject silhouettes whose viewBox edge is too small to render reliably as `<img>`. */
export const MIN_SHAPE_VIEWBOX = SHAPE_OUTPUT_CANVAS * 0.1;

export function toPathBounds(path: string): PathBounds {
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
 * Countries that cross ±180° project as split pieces on opposite sides of the
 * canvas. Move far-side subpaths so the shape is one contiguous landmass.
 */
export function unwrapAntimeridianPath(path: string): string {
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
  return unwrappedWidth < originalWidth * 0.92 ? unwrapped : path;
}

export function parseShapeViewBox(svg: string): [number, number, number, number] | null {
  const match = svg.match(/viewBox="([^"]+)"/);
  if (!match) return null;
  const parts = match[1].trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return null;
  return [parts[0], parts[1], parts[2], parts[3]];
}

export function shapeViewBoxTooSmall(svg: string): boolean {
  const viewBox = parseShapeViewBox(svg);
  if (!viewBox) return true;
  const [, , width, height] = viewBox;
  return width < MIN_SHAPE_VIEWBOX || height < MIN_SHAPE_VIEWBOX;
}

/**
 * Builds a silhouette SVG in local coordinates (~1000px canvas) from paths in
 * Natural Earth / map projected space. Uses an SVG group transform so every
 * path command type (curves, relative segments, etc.) stays intact.
 */
export function buildShapeSvg(paths: string[]): string {
  const bounds = paths.map((path) => toPathBounds(path));
  const left = Math.min(...bounds.map(([l]) => l));
  const top = Math.min(...bounds.map(([, t]) => t));
  const right = Math.max(...bounds.map(([, , r]) => r));
  const bottom = Math.max(...bounds.map(([, , , b]) => b));
  const width = right - left;
  const height = bottom - top;
  const span = Math.max(width, height, 1e-9);
  const pad = SHAPE_OUTPUT_CANVAS * SHAPE_PAD_RATIO;
  const scale = (SHAPE_OUTPUT_CANVAS - pad * 2) / span;
  const outWidth = width * scale + pad * 2;
  const outHeight = height * scale + pad * 2;
  const transform = `translate(${pad.toFixed(2)} ${pad.toFixed(2)}) scale(${scale.toFixed(6)}) translate(${(-left).toFixed(2)} ${(-top).toFixed(2)})`;
  const pathMarkup = paths.map((path) => `<path d="${path}" fill="#000000"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outWidth.toFixed(2)} ${outHeight.toFixed(2)}"><g transform="${transform}">${pathMarkup}</g></svg>\n`;
}
