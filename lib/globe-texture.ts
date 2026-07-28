import globeData from "@/data/globe-countries.json";
import { getMapPalette, getProgressFillColor } from "@/lib/map-colors";
import {
  getMasteryGradientStops,
  getMasterySolidColor,
  MASTERY_GLOW_BY_LEVEL,
  masteryFxPhaseFromTime,
  sampleGradientColor,
} from "@/lib/map-mastery-fx";
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

type PaintedShape = {
  code: string;
  rings: number[][];
  level: PlaceMasteryLevel;
  isState: boolean;
};

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

function collectShapes(
  profile: Profile | null,
  difficulty: MapProgressDifficulty,
  usMode: GlobeUsMode,
): PaintedShape[] {
  const masteryOf = (code: string): PlaceMasteryLevel =>
    profile ? getPlaceMasteryLevel(code, profile, difficulty) : 0;

  const showStates = usMode === "states";

  return GLOBE_TEXTURE_DATA.countries
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
}

export function profileHasMastery4(
  profile: Profile | null,
  difficulty: MapProgressDifficulty,
  usMode: GlobeUsMode = "states",
): boolean {
  if (!profile) return false;
  return collectShapes(profile, difficulty, usMode).some((shape) => shape.level === 4);
}

function createMastery4Gradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  difficulty: MapProgressDifficulty,
  phase: number,
): CanvasGradient {
  const stops = getMasteryGradientStops(difficulty);
  // Drift the gradient origin so the holographic band crawls across the map.
  const ox = ((phase * 1.4) % 1) * width;
  const oy = ((phase * 0.7) % 1) * height;
  const grad = ctx.createLinearGradient(ox, oy, ox + width * 0.65, oy + height * 0.55);
  for (const stop of stops) {
    const t = Math.min(0.999, Math.max(0, stop.offset));
    grad.addColorStop(t, sampleGradientColor(stops, stop.offset + phase));
  }
  return grad;
}

function drawShapeFill(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  level: PlaceMasteryLevel,
  {
    isDark,
    difficulty,
    pixelScale,
    width,
    height,
    phase,
  }: {
    isDark: boolean;
    difficulty: MapProgressDifficulty;
    pixelScale: number;
    width: number;
    height: number;
    phase: number;
  },
) {
  const glow = MASTERY_GLOW_BY_LEVEL[level];
  const solid = getProgressFillColor(level, isDark, difficulty);

  ctx.save();
  if (glow.blur > 0) {
    const glowColor =
      level === 4
        ? sampleGradientColor(getMasteryGradientStops(difficulty), phase)
        : solid;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glow.blur * pixelScale;
  }

  if (level === 4) {
    ctx.fillStyle = createMastery4Gradient(ctx, width, height, difficulty, phase);
  } else {
    ctx.fillStyle = solid;
  }
  ctx.fill(path, "evenodd");
  ctx.restore();
}

function strokeShape(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  isState: boolean,
  palette: GlobePalette,
  pixelScale: number,
) {
  ctx.lineWidth = (isState ? 0.7 : 1) * pixelScale;
  ctx.strokeStyle = isState ? palette.stateBorder : palette.border;
  ctx.stroke(path);
}

export type GlobeTextureOptions = {
  difficulty?: MapProgressDifficulty;
  usMode?: GlobeUsMode;
  isDark?: boolean;
  /** Texture width in pixels; height is width / 2. */
  size?: number;
  /** Place code currently selected on the map globe (shows teal highlight). */
  selectedCode?: string | null;
  /** 0–1 animation phase for mastery-4 holographic / gold drift. */
  phase?: number;
};

export type GlobeTexturePaintHandle = {
  canvas: HTMLCanvasElement;
  /** True when any mastery-4 places need per-frame repaints. */
  hasMastery4: boolean;
  /** Recompose the visible canvas from the cached base + animated mastery-4 layer. */
  paintFrame: (phase: number) => void;
};

/**
 * Builds a layered globe texture: a static base (ocean + mastery 0–3) cached
 * once, plus a mastery-4 overlay that can be redrawn cheaply each animation
 * frame. Selected highlight is part of the animated layer so it stays on top.
 */
export function createGlobeTexturePaint(
  profile: Profile | null,
  {
    difficulty = "medium",
    usMode = "states",
    isDark = true,
    size = GLOBE_BASE_TEXTURE_SIZE,
    selectedCode = null,
    phase = masteryFxPhaseFromTime(0),
  }: GlobeTextureOptions = {},
): GlobeTexturePaintHandle {
  const width = size;
  const height = size / 2;
  const palette = getGlobePalette(isDark);
  const mapPalette = getMapPalette(isDark);
  const pixelScale = width / GLOBE_BASE_TEXTURE_SIZE;
  const shapes = collectShapes(profile, difficulty, usMode);
  const mastery4Shapes = shapes.filter((shape) => shape.level === 4);
  const hasMastery4 = mastery4Shapes.length > 0;

  const base = document.createElement("canvas");
  base.width = width;
  base.height = height;
  const baseCtx = base.getContext("2d")!;

  baseCtx.fillStyle = palette.ocean;
  baseCtx.fillRect(0, 0, width, height);

  const drawOpts = {
    isDark,
    difficulty,
    pixelScale,
    width,
    height,
    phase: 0.35,
  };

  {
    const extrasPath = buildPath(GLOBE_TEXTURE_DATA.extras, width, height);
    drawShapeFill(baseCtx, extrasPath, 0, drawOpts);
    strokeShape(baseCtx, extrasPath, false, palette, pixelScale);
  }

  for (const shape of shapes) {
    if (shape.level === 4) {
      // Leave a neutral underlay so borders still read when the overlay animates.
      const path = buildPath(shape.rings, width, height);
      baseCtx.fillStyle = getProgressFillColor(0, isDark, difficulty);
      baseCtx.fill(path, "evenodd");
      strokeShape(baseCtx, path, shape.isState, palette, pixelScale);
      continue;
    }
    const path = buildPath(shape.rings, width, height);
    drawShapeFill(baseCtx, path, shape.level, drawOpts);
    strokeShape(baseCtx, path, shape.isState, palette, pixelScale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const paintFrame = (nextPhase: number) => {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(base, 0, 0);

    const frameOpts = { ...drawOpts, phase: nextPhase };
    for (const shape of mastery4Shapes) {
      const path = buildPath(shape.rings, width, height);
      drawShapeFill(ctx, path, 4, frameOpts);
      strokeShape(ctx, path, shape.isState, palette, pixelScale);
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
  };

  paintFrame(phase);

  return { canvas, hasMastery4, paintFrame };
}

/**
 * Paints the equirectangular globe texture: ocean, dim base land, and the
 * player's mastery in the same fill scale as the 2D progress map (teal/gold
 * for Normal, violet→legendary for Hard), wrapped around the planet.
 */
export function buildGlobeTextureCanvas(
  profile: Profile | null,
  options: GlobeTextureOptions = {},
): HTMLCanvasElement {
  return createGlobeTexturePaint(profile, options).canvas;
}

/** Mid-phase static sample used when motion is reduced. */
export const MASTERY_FX_STATIC_PHASE = 0.35;

/** Solid used when a quick non-animated mastery-4 sample is needed. */
export function getGlobeMastery4Fallback(difficulty: MapProgressDifficulty): string {
  return getMasterySolidColor(difficulty);
}
