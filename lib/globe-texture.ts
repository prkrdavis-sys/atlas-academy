import globeData from "@/data/globe-countries.json";
import { getMapPalette, getProgressFillColor } from "@/lib/map-colors";
import { getPlaceMasteryLevel } from "@/lib/map-progress";
import type { MapProgressDifficulty, PlaceMasteryLevel, Profile } from "@/lib/types";

export type GlobeCountryShape = { code: string; rings: number[][] };

export type GlobeTextureData = {
  countries: GlobeCountryShape[];
  usStates: GlobeCountryShape[];
  extras: number[][];
};

/** How the USA renders on the globe: one country shape or 50 individual states. */
export type GlobeUsMode = "country" | "states";

export const GLOBE_TEXTURE_DATA = globeData as GlobeTextureData;

/** Base texture width (equirectangular, so height = width / 2). */
export const GLOBE_BASE_TEXTURE_SIZE = 2048;
/** Hard upper bound; a 4096x2048 RGBA texture is already ~32 MB of GPU memory. */
export const GLOBE_MAX_TEXTURE_SIZE = 4096;

/**
 * Picks the largest globe texture width the device can comfortably handle:
 * capped by the GPU's max texture size, and stepped down on low-memory or
 * small-screen devices where a giant canvas raster would hurt more than help.
 */
export function resolveGlobeTextureSize(maxGpuTextureSize: number): number {
  const gpuMax =
    Number.isFinite(maxGpuTextureSize) && maxGpuTextureSize > 0
      ? maxGpuTextureSize
      : GLOBE_BASE_TEXTURE_SIZE;
  let size = Math.min(GLOBE_MAX_TEXTURE_SIZE, gpuMax);

  if (typeof navigator !== "undefined") {
    const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory;
    if (deviceMemory !== undefined && deviceMemory < 8) {
      size = Math.min(size, 4096);
    }
  }
  if (typeof window !== "undefined") {
    const smallestSide = Math.min(window.screen.width, window.screen.height);
    if (smallestSide < 768) {
      size = Math.min(size, 4096);
    }
  }

  return Math.max(GLOBE_BASE_TEXTURE_SIZE, size);
}

type GlobePalette = {
  ocean: string;
  border: string;
  stateBorder: string;
};

/** Deep slate ocean — muted navy that reads as water in space, not neon cyan. */
const DARK_GLOBE_PALETTE: GlobePalette = {
  ocean: "#2d6888",
  border: "rgba(90, 120, 150, 0.5)",
  stateBorder: "rgba(90, 120, 150, 0.42)",
};

/** Soft Atlantic blue — globe-like in light mode without looking washed out. */
const LIGHT_GLOBE_PALETTE: GlobePalette = {
  ocean: "#5a96b5",
  border: "rgba(30, 41, 59, 0.45)",
  stateBorder: "rgba(30, 41, 59, 0.35)",
};

export function getGlobePalette(isDark: boolean): GlobePalette {
  return isDark ? DARK_GLOBE_PALETTE : LIGHT_GLOBE_PALETTE;
}

/**
 * Normal-mode mastery — used by explorer rank so rank tiers stay aligned with
 * the default globe coloring.
 */
export function getGlobeMasteryLevel(code: string, profile: Profile): PlaceMasteryLevel {
  return getPlaceMasteryLevel(code, profile, "medium");
}

/**
 * Builds a shape path from normalized rings, duplicating rings that spill past
 * the texture edges so shapes crossing the antimeridian render on both sides
 * of the seam.
 */
function buildPath(rings: number[][], width: number, height: number): Path2D {
  const path = new Path2D();
  for (const ring of rings) {
    addRing(path, ring, width, height, 0);
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < ring.length; i += 2) {
      if (ring[i] < minX) minX = ring[i];
      if (ring[i] > maxX) maxX = ring[i];
    }
    if (minX < 0) addRing(path, ring, width, height, width);
    if (maxX > 1) addRing(path, ring, width, height, -width);
  }
  return path;
}

function addRing(path: Path2D, ring: number[], width: number, height: number, offsetX: number) {
  path.moveTo(ring[0] * width + offsetX, ring[1] * height);
  for (let i = 2; i < ring.length; i += 2) {
    path.lineTo(ring[i] * width + offsetX, ring[i + 1] * height);
  }
  path.closePath();
}

export type GlobeTextureOptions = {
  difficulty?: MapProgressDifficulty;
  usMode?: GlobeUsMode;
  isDark?: boolean;
  /** Texture width in pixels; height is width / 2. */
  size?: number;
  /** Place code currently selected on the map globe (shows teal highlight). */
  selectedCode?: string | null;
};

/**
 * Paints the equirectangular globe texture: ocean, dim base land, and the
 * player's mastery in the same fill scale as the 2D progress map (teal for
 * Normal, red for Hard), wrapped around the planet. In "states" mode the USA
 * is painted as 50 individually colored states instead of one country.
 * When `selectedCode` is set, that place is overpainted with the same
 * highlight fill used by the 2D progress map.
 */
export function buildGlobeTextureCanvas(
  profile: Profile | null,
  {
    difficulty = "medium",
    usMode = "states",
    isDark = true,
    size = GLOBE_BASE_TEXTURE_SIZE,
    selectedCode = null,
  }: GlobeTextureOptions = {},
): HTMLCanvasElement {
  const width = size;
  const height = size / 2;
  const palette = getGlobePalette(isDark);
  const mapPalette = getMapPalette(isDark);
  const pixelScale = width / GLOBE_BASE_TEXTURE_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = palette.ocean;
  ctx.fillRect(0, 0, width, height);

  const levelColor = (level: PlaceMasteryLevel) =>
    getProgressFillColor(level, isDark, difficulty);

  const drawShape = (
    rings: number[][],
    level: PlaceMasteryLevel,
    { isState = false }: { isState?: boolean } = {},
  ) => {
    const path = buildPath(rings, width, height);
    if (level >= 3) {
      ctx.save();
      ctx.shadowColor = levelColor(4);
      ctx.shadowBlur = 8 * pixelScale;
      ctx.fillStyle = levelColor(level);
      ctx.fill(path, "evenodd");
      ctx.restore();
    } else {
      ctx.fillStyle = levelColor(level);
      ctx.fill(path, "evenodd");
    }
    ctx.lineWidth = (isState ? 0.7 : 1) * pixelScale;
    ctx.strokeStyle = isState ? palette.stateBorder : palette.border;
    ctx.stroke(path);
  };

  drawShape(GLOBE_TEXTURE_DATA.extras, 0);

  const masteryOf = (code: string): PlaceMasteryLevel =>
    profile ? getPlaceMasteryLevel(code, profile, difficulty) : 0;

  const showStates = usMode === "states";

  // Ascending mastery so glows from bright places sit on top.
  const shapes = GLOBE_TEXTURE_DATA.countries
    .map((country) => ({
      code: country.code,
      rings: country.rings,
      // In states mode the US country shape is just neutral base land under
      // the states; US-country mastery is intentionally ignored there.
      level: showStates && country.code === "US" ? (0 as PlaceMasteryLevel) : masteryOf(country.code),
      isState: false,
    }))
    .concat(
      showStates
        ? GLOBE_TEXTURE_DATA.usStates.map((state) => ({
            code: state.code,
            rings: state.rings,
            level: masteryOf(state.code),
            isState: true,
          }))
        : [],
    )
    .sort((a, b) => Number(a.isState) - Number(b.isState) || a.level - b.level);

  for (const shape of shapes) {
    drawShape(shape.rings, shape.level, { isState: shape.isState });
  }

  if (selectedCode) {
    const selected = shapes.find((shape) => shape.code === selectedCode);
    if (selected) {
      const path = buildPath(selected.rings, width, height);
      const highlight = mapPalette.highlight;
      ctx.fillStyle = highlight.fill;
      ctx.fill(path, "evenodd");
      ctx.lineWidth = (selected.isState ? 1.6 : 2.2) * pixelScale;
      ctx.strokeStyle = highlight.stroke;
      ctx.stroke(path);
    }
  }

  return canvas;
}
