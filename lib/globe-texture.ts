import globeData from "@/data/globe-countries.json";
import {
  getGlobePerfTier,
  GLOBE_TEXTURE_SIZE_BY_TIER,
  isGlobeFxConstrained,
  type GlobePerfTier,
} from "@/lib/globe-performance";
import { getMapPalette, getProgressFillColor } from "@/lib/map-colors";
import {
  getMasteryGradientStops,
  getMasterySolidColor,
  MASTERY_GLOW_BY_LEVEL,
  mastery4ShouldAnimate,
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

/** Reference texture width for stroke/glow scaling (equirectangular height = width / 2). */
export const GLOBE_BASE_TEXTURE_SIZE = 2048;
/** Hard upper bound; a 4096x2048 RGBA texture is already ~32 MB of GPU memory. */
export const GLOBE_MAX_TEXTURE_SIZE = 4096;
/** Phone / low-memory floor — detail overlays cover close-up fidelity. */
export const GLOBE_MOBILE_TEXTURE_SIZE = GLOBE_TEXTURE_SIZE_BY_TIER.phone;

/**
 * Picks a globe texture width for the device: phone 1024, tablet 2048,
 * desktop up to 4096 — always capped by the GPU's max texture size.
 */
export function resolveGlobeTextureSize(
  maxGpuTextureSize: number,
  tier: GlobePerfTier = getGlobePerfTier(),
): number {
  const gpuMax =
    Number.isFinite(maxGpuTextureSize) && maxGpuTextureSize > 0
      ? maxGpuTextureSize
      : GLOBE_BASE_TEXTURE_SIZE;
  const tierSize = GLOBE_TEXTURE_SIZE_BY_TIER[tier];
  return Math.min(GLOBE_MAX_TEXTURE_SIZE, gpuMax, tierSize);
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

  if (difficulty === "medium") {
    // Static brushed-metal diagonal — texture only, no phase drift.
    const grad = ctx.createLinearGradient(0, 0, width * 0.85, height * 0.75);
    for (const stop of stops) {
      grad.addColorStop(Math.min(0.999, Math.max(0, stop.offset)), stop.color);
    }
    return grad;
  }

  // Hard legendary: gentle holographic crawl across the map.
  const ox = ((phase * 0.55) % 1) * width * 0.35;
  const oy = ((phase * 0.3) % 1) * height * 0.25;
  const grad = ctx.createLinearGradient(ox, oy, ox + width * 0.7, oy + height * 0.55);
  for (const stop of stops) {
    const t = Math.min(0.999, Math.max(0, stop.offset));
    grad.addColorStop(t, sampleGradientColor(stops, stop.offset + phase * 0.35));
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
    allowCanvasGlow,
  }: {
    isDark: boolean;
    difficulty: MapProgressDifficulty;
    pixelScale: number;
    width: number;
    height: number;
    phase: number;
    allowCanvasGlow: boolean;
  },
) {
  const glow = MASTERY_GLOW_BY_LEVEL[level];
  const solid = getProgressFillColor(level, isDark, difficulty);

  ctx.save();
  // Skip canvas glow for Normal gold — metallic texture should stay crisp.
  // Phones skip shadowBlur entirely (very expensive on large canvases).
  const allowGlow =
    allowCanvasGlow && glow.blur > 0 && !(difficulty === "medium" && level === 4);
  if (allowGlow) {
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
  /** When false, skip canvas shadowBlur (phones). Default: not constrained. */
  allowCanvasGlow?: boolean;
  /** When false, mastery-4 paints a static mid-phase sample. */
  allowMastery4Animation?: boolean;
};

export type GlobeTexturePaintHandle = {
  canvas: HTMLCanvasElement;
  /** True when any mastery-4 places exist. */
  hasMastery4: boolean;
  /** True when mastery-4 fills should animate (Hard legendary only, non-constrained). */
  animateMastery4: boolean;
  /** Recompose the visible canvas from the cached base + mastery-4 layer. */
  paintFrame: (phase: number) => void;
  /**
   * Updates the selection highlight without rebuilding the base texture.
   * Call `paintFrame` afterward to refresh the visible canvas.
   */
  setSelectedCode: (code: string | null) => void;
};

/**
 * Builds a layered globe texture: a static base (ocean + mastery 0–3) cached
 * once, plus a mastery-4 overlay that can be redrawn cheaply each animation
 * frame. Selected highlight is part of the animated layer so it stays on top
 * without rebuilding the base.
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
    allowCanvasGlow = !isGlobeFxConstrained(),
    allowMastery4Animation = !isGlobeFxConstrained(),
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
  let activeSelectedCode = selectedCode;

  // Cache Path2Ds so shimmer frames don't re-walk every ring.
  const pathByCode = new Map<string, Path2D>();
  const pathFor = (code: string, rings: number[][]) => {
    let path = pathByCode.get(code);
    if (!path) {
      path = buildPath(rings, width, height);
      pathByCode.set(code, path);
    }
    return path;
  };

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
    allowCanvasGlow,
  };

  {
    const extrasPath = buildPath(GLOBE_TEXTURE_DATA.extras, width, height);
    drawShapeFill(baseCtx, extrasPath, 0, drawOpts);
    strokeShape(baseCtx, extrasPath, false, palette, pixelScale);
  }

  for (const shape of shapes) {
    if (shape.level === 4) {
      // Leave a neutral underlay so borders still read when the overlay animates.
      const path = pathFor(shape.code, shape.rings);
      baseCtx.fillStyle = getProgressFillColor(0, isDark, difficulty);
      baseCtx.fill(path, "evenodd");
      strokeShape(baseCtx, path, shape.isState, palette, pixelScale);
      continue;
    }
    const path = pathFor(shape.code, shape.rings);
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
      const path = pathFor(shape.code, shape.rings);
      drawShapeFill(ctx, path, 4, frameOpts);
      strokeShape(ctx, path, shape.isState, palette, pixelScale);
    }

    if (activeSelectedCode) {
      const selected = shapes.find((shape) => shape.code === activeSelectedCode);
      if (selected) {
        const path = pathFor(selected.code, selected.rings);
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

  return {
    canvas,
    hasMastery4,
    animateMastery4:
      hasMastery4 && allowMastery4Animation && mastery4ShouldAnimate(difficulty),
    paintFrame,
    setSelectedCode: (code) => {
      activeSelectedCode = code;
    },
  };
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
