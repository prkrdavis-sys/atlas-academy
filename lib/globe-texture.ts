import globeData from "@/data/globe-countries.json";
import {
  getGlobePerfTier,
  GLOBE_TEXTURE_SIZE_BY_TIER,
  isGlobeFxConstrained,
  type GlobePerfTier,
} from "@/lib/globe-performance";
import {
  fillSelectedMapPath,
  getMapPalette,
  getProgressFillColor,
  MAP_SELECTION_GLOW_BLUR,
} from "@/lib/map-colors";
import {
  getMasteryGradientStops,
  getMasterySolidColor,
  MASTERY_GLOW_BY_LEVEL,
  mastery4ShouldAnimate,
  masteryFxPhaseFromTime,
  sampleGradientColor,
} from "@/lib/map-mastery-fx";
import {
  createMasteryGoldPattern,
  MASTERY_GOLD_ALBEDO_FALLBACK,
} from "@/lib/mastery-gold-texture";
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
/** Phone / low-memory floor — close-up patches cover zoomed-in fidelity. */
export const GLOBE_MOBILE_TEXTURE_SIZE = GLOBE_TEXTURE_SIZE_BY_TIER.phone;

/**
 * Picks a globe texture width for the device: phone/tablet 2048,
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

/** Rich saturated storybook blue with crisp dark borders (concept-art match). */
const DARK_GLOBE_PALETTE: GlobePalette = {
  ocean: "#1d4d85",
  border: "rgba(13, 27, 51, 0.62)",
  stateBorder: "rgba(13, 27, 51, 0.48)",
};

/** Same painted-blue water, slightly lifted so it sits well on the sunset sky. */
const LIGHT_GLOBE_PALETTE: GlobePalette = {
  ocean: "#2e6096",
  border: "rgba(23, 37, 66, 0.55)",
  stateBorder: "rgba(23, 37, 66, 0.42)",
};

export function getGlobePalette(isDark: boolean): GlobePalette {
  return isDark ? DARK_GLOBE_PALETTE : LIGHT_GLOBE_PALETTE;
}

/* ------------------------------------------------------------------ *
 * Tactile surface grain — soft plaster/paper mottling painted over the
 * flat fills so water and land look touchable, like the concept art.
 * ------------------------------------------------------------------ */

/** Deterministic PRNG so grain never pops between texture rebuilds. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type GrainTileOptions = {
  size: number;
  /** Soft light/dark blobs (plaster mottle). */
  blotches: number;
  /** Blotch radius range as a fraction of tile size. */
  minRadius: number;
  maxRadius: number;
  blotchAlpha: number;
  /** Tiny 1–2px flecks (paper tooth). */
  speckles: number;
  speckleAlpha: number;
  seed: number;
};

/** Paints a wrap-around (seamlessly tiling) grain tile of light/dark blobs. */
function createGrainTile({
  size,
  blotches,
  minRadius,
  maxRadius,
  blotchAlpha,
  speckles,
  speckleAlpha,
  seed,
}: GrainTileOptions): HTMLCanvasElement {
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext("2d")!;
  const random = mulberry32(seed);

  const wrapOffsets = [
    [0, 0],
    [-size, 0],
    [size, 0],
    [0, -size],
    [0, size],
    [-size, -size],
    [size, -size],
    [-size, size],
    [size, size],
  ] as const;

  for (let i = 0; i < blotches; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = size * (minRadius + random() * (maxRadius - minRadius));
    const light = random() > 0.5;
    const alpha = blotchAlpha * (0.5 + random() * 0.5);
    const channel = light ? "255, 255, 255" : "0, 0, 0";
    for (const [ox, oy] of wrapOffsets) {
      const gradient = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, radius);
      gradient.addColorStop(0, `rgba(${channel}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${channel}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x + ox - radius, y + oy - radius, radius * 2, radius * 2);
    }
  }

  for (let i = 0; i < speckles; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const light = random() > 0.5;
    const alpha = speckleAlpha * (0.4 + random() * 0.6);
    ctx.fillStyle = light ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
    const dot = random() > 0.75 ? 2 : 1;
    ctx.fillRect(x, y, dot, dot);
  }

  return tile;
}

const GRAIN_TILE_SIZE = 256;

let oceanMottleTile: HTMLCanvasElement | null = null;
let landGrainTile: HTMLCanvasElement | null = null;

/** Broad soft mottle — painted-water depth variation. */
function getOceanMottleTile(): HTMLCanvasElement {
  if (!oceanMottleTile) {
    oceanMottleTile = createGrainTile({
      size: GRAIN_TILE_SIZE,
      blotches: 42,
      minRadius: 0.09,
      maxRadius: 0.28,
      blotchAlpha: 0.16,
      speckles: 160,
      speckleAlpha: 0.1,
      seed: 0x0cea,
    });
  }
  return oceanMottleTile;
}

/** Finer stone/paper tooth for land (and a whisper over everything else). */
function getLandGrainTile(): HTMLCanvasElement {
  if (!landGrainTile) {
    landGrainTile = createGrainTile({
      size: GRAIN_TILE_SIZE,
      blotches: 64,
      minRadius: 0.03,
      maxRadius: 0.12,
      blotchAlpha: 0.14,
      speckles: 700,
      speckleAlpha: 0.12,
      seed: 0x1a4d,
    });
  }
  return landGrainTile;
}

export type GlobeGrainKind = "ocean" | "land";

/**
 * Overlays tactile grain across the canvas. `pixelScale` keeps the grain the
 * same physical size regardless of texture resolution; close-up patches pass
 * their own effective scale so grain detail grows as the player zooms in.
 */
export function applyGlobeSurfaceGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pixelScale: number,
  kind: GlobeGrainKind,
): void {
  const tile = kind === "ocean" ? getOceanMottleTile() : getLandGrainTile();
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;
  pattern.setTransform(new DOMMatrix().scale(Math.max(0.25, pixelScale)));

  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = kind === "ocean" ? 0.85 : 0.6;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Mastery for the active map-progress track — used by explorer rank so rank
 * tiers stay aligned with the globe coloring for that difficulty.
 */
export function getGlobeMasteryLevel(
  code: string,
  profile: Profile,
  difficulty: MapProgressDifficulty = "medium",
): PlaceMasteryLevel {
  return getPlaceMasteryLevel(code, profile, difficulty);
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

function createMastery4FillStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  difficulty: MapProgressDifficulty,
  phase: number,
  goldPattern: CanvasPattern | null,
): string | CanvasGradient | CanvasPattern {
  if (difficulty === "medium") {
    return goldPattern ?? MASTERY_GOLD_ALBEDO_FALLBACK;
  }

  const stops = getMasteryGradientStops(difficulty);
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
    goldPattern,
  }: {
    isDark: boolean;
    difficulty: MapProgressDifficulty;
    pixelScale: number;
    width: number;
    height: number;
    phase: number;
    allowCanvasGlow: boolean;
    goldPattern: CanvasPattern | null;
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
    ctx.fillStyle = createMastery4FillStyle(
      ctx,
      width,
      height,
      difficulty,
      phase,
      goldPattern,
    );
  } else {
    ctx.fillStyle = solid;
  }
  ctx.fill(path, "evenodd");

  // Warm the metal texture toward rich foil gold (the source scan is cool).
  if (level === 4 && difficulty === "medium" && goldPattern) {
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = "rgba(255, 168, 41, 0.4)";
    ctx.fill(path, "evenodd");
  }
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
  /** Preloaded brushed-gold albedo (Normal mastery 4). */
  goldColorImage?: HTMLImageElement | null;
  /** Preloaded brushed-gold roughness (Normal mastery 4 specular response). */
  goldRoughnessImage?: HTMLImageElement | null;
  /** Preloaded brushed-gold normal map (OpenGL). */
  goldNormalImage?: HTMLImageElement | null;
};

export type GlobeTexturePaintHandle = {
  canvas: HTMLCanvasElement;
  /** Metalness map — bright on Normal mastery-4 gold, dark elsewhere. */
  metalnessCanvas: HTMLCanvasElement | null;
  /** Roughness map — smoother (shinier) on Normal mastery-4 gold. */
  roughnessCanvas: HTMLCanvasElement | null;
  /** Normal map — brushed grain on Normal mastery-4 gold, flat elsewhere. */
  normalCanvas: HTMLCanvasElement | null;
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
    goldColorImage = null,
    goldRoughnessImage = null,
    goldNormalImage = null,
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

  // ~96px tiles at 2048 width — big enough that the foil crinkle reads.
  const goldTilePx = Math.max(48, Math.round(96 * pixelScale));
  const goldPattern =
    difficulty === "medium" && goldColorImage
      ? createMasteryGoldPattern(baseCtx, goldColorImage, goldTilePx)
      : null;

  baseCtx.fillStyle = palette.ocean;
  baseCtx.fillRect(0, 0, width, height);
  // Painted-water mottle beneath the land shapes.
  applyGlobeSurfaceGrain(baseCtx, width, height, pixelScale, "ocean");

  const drawOpts = {
    isDark,
    difficulty,
    pixelScale,
    width,
    height,
    phase: 0.35,
    allowCanvasGlow,
    goldPattern,
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

  // Stone/paper tooth over the finished base so land feels touchable (the
  // whisper it adds over the ocean mottle keeps the whole surface cohesive).
  applyGlobeSurfaceGrain(baseCtx, width, height, pixelScale, "land");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Specular + normal response maps — only meaningful for Normal gold mastery.
  const useMetalMaps = difficulty === "medium" && hasMastery4;
  let metalnessCanvas: HTMLCanvasElement | null = null;
  let roughnessCanvas: HTMLCanvasElement | null = null;
  let normalCanvas: HTMLCanvasElement | null = null;

  if (useMetalMaps) {
    metalnessCanvas = document.createElement("canvas");
    metalnessCanvas.width = width;
    metalnessCanvas.height = height;
    const metalCtx = metalnessCanvas.getContext("2d")!;
    metalCtx.fillStyle = "#050505";
    metalCtx.fillRect(0, 0, width, height);

    roughnessCanvas = document.createElement("canvas");
    roughnessCanvas.width = width;
    roughnessCanvas.height = height;
    const roughCtx = roughnessCanvas.getContext("2d")!;
    // Default land/ocean stay fairly matte (high roughness).
    roughCtx.fillStyle = "#c4c4c4";
    roughCtx.fillRect(0, 0, width, height);

    normalCanvas = document.createElement("canvas");
    normalCanvas.width = width;
    normalCanvas.height = height;
    const normalCtx = normalCanvas.getContext("2d")!;
    // Flat tangent normal (#8080ff) everywhere until gold mastery paints grain.
    normalCtx.fillStyle = "#8080ff";
    normalCtx.fillRect(0, 0, width, height);

    const roughPattern =
      goldRoughnessImage != null
        ? createMasteryGoldPattern(roughCtx, goldRoughnessImage, goldTilePx)
        : null;
    const normalPattern =
      goldNormalImage != null
        ? createMasteryGoldPattern(normalCtx, goldNormalImage, goldTilePx)
        : null;

    for (const shape of mastery4Shapes) {
      const path = pathFor(shape.code, shape.rings);
      // White mask — material.metalness factor sets how metallic (keeps diffuse gold).
      metalCtx.fillStyle = "#ffffff";
      metalCtx.fill(path, "evenodd");

      roughCtx.save();
      roughCtx.fillStyle = roughPattern ?? "#7a7a7a";
      roughCtx.fill(path, "evenodd");
      roughCtx.restore();

      normalCtx.save();
      normalCtx.fillStyle = normalPattern ?? "#8080ff";
      normalCtx.fill(path, "evenodd");
      normalCtx.restore();
    }
  }

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
        // Fill only — keep the base border stroke so selection doesn't thicken
        // or recolor outlines (which reads as pixelation at high zoom).
        const path = pathFor(selected.code, selected.rings);
        fillSelectedMapPath(ctx, path, mapPalette.highlight.fill, {
          glowBlur: MAP_SELECTION_GLOW_BLUR * pixelScale,
          allowGlow: allowCanvasGlow,
        });
      }
    }
  };

  paintFrame(phase);

  return {
    canvas,
    metalnessCanvas,
    roughnessCanvas,
    normalCanvas,
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
