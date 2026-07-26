import globeData from "@/data/globe-countries.json";
import { getPlaceMasteryLevel } from "@/lib/map-progress";
import type { PlaceMasteryLevel, Profile } from "@/lib/types";

type GlobeCountryShape = { code: string; rings: number[][] };

type GlobeTextureData = {
  width: number;
  height: number;
  countries: GlobeCountryShape[];
  extras: number[][];
};

const data = globeData as GlobeTextureData;

/** Deep-space ocean and progress colors tuned to read against black space. */
const OCEAN_COLOR = "#0a1224";
const BORDER_COLOR = "rgba(2, 6, 23, 0.55)";

export const GLOBE_MASTERY_COLORS: Record<PlaceMasteryLevel, string> = {
  0: "#38455c",
  1: "#136059",
  2: "#0f9488",
  3: "#2dd4bf",
  4: "#6ef2dd",
};

/**
 * Normal-mode mastery only — the home globe mirrors Normal map progress for now.
 */
export function getGlobeMasteryLevel(code: string, profile: Profile): PlaceMasteryLevel {
  return getPlaceMasteryLevel(code, profile, "medium");
}

function addRingToPath(path: Path2D, ring: number[], offsetX: number) {
  path.moveTo(ring[0] + offsetX, ring[1]);
  for (let i = 2; i < ring.length; i += 2) {
    path.lineTo(ring[i] + offsetX, ring[i + 1]);
  }
  path.closePath();
}

/**
 * Builds a country path, duplicating rings that spill past the texture edges
 * so shapes crossing the antimeridian render on both sides of the seam.
 */
function buildPath(rings: number[][]): Path2D {
  const path = new Path2D();
  for (const ring of rings) {
    addRingToPath(path, ring, 0);
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < ring.length; i += 2) {
      if (ring[i] < minX) minX = ring[i];
      if (ring[i] > maxX) maxX = ring[i];
    }
    if (minX < 0) addRingToPath(path, ring, data.width);
    if (maxX > data.width) addRingToPath(path, ring, -data.width);
  }
  return path;
}

/**
 * Paints the equirectangular globe texture: dark ocean, dim base land, and
 * the player's Normal-mode mastery in brightening teal — the same progress
 * shown on the 2D map for Normal, wrapped around the planet.
 */
export function buildGlobeTextureCanvas(profile: Profile | null): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = OCEAN_COLOR;
  ctx.fillRect(0, 0, data.width, data.height);

  ctx.lineWidth = 1;
  ctx.strokeStyle = BORDER_COLOR;

  const drawShape = (rings: number[][], level: PlaceMasteryLevel) => {
    const path = buildPath(rings);
    if (level >= 3) {
      ctx.save();
      ctx.shadowColor = GLOBE_MASTERY_COLORS[4];
      ctx.shadowBlur = 8;
      ctx.fillStyle = GLOBE_MASTERY_COLORS[level];
      ctx.fill(path, "evenodd");
      ctx.restore();
    } else {
      ctx.fillStyle = GLOBE_MASTERY_COLORS[level];
      ctx.fill(path, "evenodd");
    }
    ctx.stroke(path);
  };

  drawShape(data.extras, 0);

  // Ascending mastery so glows from bright countries sit on top.
  const shapes = data.countries
    .map((country) => ({
      rings: country.rings,
      level: profile ? getGlobeMasteryLevel(country.code, profile) : (0 as PlaceMasteryLevel),
    }))
    .sort((a, b) => a.level - b.level);

  for (const shape of shapes) {
    drawShape(shape.rings, shape.level);
  }

  return canvas;
}
