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
  getMasterySolidColor,
  MASTERY_GLOW_BY_LEVEL,
  mastery4ShouldAnimate,
  masteryFxPhaseFromTime,
} from "@/lib/map-mastery-fx";
import { MASTERY_DIAMOND_ALBEDO_FALLBACK } from "@/lib/mastery-diamond-texture";
import {
  createGoldMaskCanvas,
  fillGoldMaskPath,
  MASTERY_GOLD_ALBEDO_FALLBACK,
} from "@/lib/mastery-gold-texture";
import { getOceanDepthCanvas } from "@/lib/globe-ocean-depth";
import { getLandColorCanvas } from "@/lib/globe-land-color";
import { awaitPaintYield, type PaintYieldGate } from "@/lib/globe-yield";
import { getPlaceMasteryLevel } from "@/lib/map-progress";
import type { MapProgressDifficulty, PlaceMasteryLevel, Profile } from "@/lib/types";

/** Shape strokes per animation-frame slice during cooperative texture builds. */
const TEXTURE_SHAPE_BATCH = 8;

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
  ocean: "#2a6aad",
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
 * Alpha for mastery 1–3 fills painted over the real land imagery — opaque
 * enough that the ladder reads at a glance, translucent enough that the
 * Blue Marble terrain still shows through. Mastery 4 (gold / diamond)
 * stays fully opaque.
 */
export const MASTERY_TINT_ALPHA = 0.62;

/**
 * Painted-water mottle over the ocean. Disabled while evaluating the pure
 * bathymetry look — the mottle also pinches into radial streaks at the poles.
 * Flip to true to bring the splotchy overlay back.
 */
export const GLOBE_OCEAN_MOTTLE_ENABLED = false;

/**
 * Overlays tactile grain across the canvas. `pixelScale` keeps the grain the
 * same physical size regardless of texture resolution; close-up patches pass
 * their own effective scale so grain detail grows as the player zooms in.
 * `originPx` is the canvas origin's world offset (in canvas pixels) so
 * close-up patches keep the grain world-anchored — rebuilt patches paint the
 * same grain instead of re-anchoring it (which reads as a texture "jump").
 */
export function applyGlobeSurfaceGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pixelScale: number,
  kind: GlobeGrainKind,
  originPx: readonly [number, number] = [0, 0],
): void {
  if (kind === "ocean" && !GLOBE_OCEAN_MOTTLE_ENABLED) return;
  const tile = kind === "ocean" ? getOceanMottleTile() : getLandGrainTile();
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;
  pattern.setTransform(
    new DOMMatrix()
      .translate(-originPx[0], -originPx[1])
      .scale(Math.max(0.25, pixelScale)),
  );

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

function createMastery4FillStyle(difficulty: MapProgressDifficulty): string {
  // Flat base only — grain, roughness, and relief are sampled on the GPU
  // from tiling maps so they stay locked to geography.
  return difficulty === "hard" ? MASTERY_DIAMOND_ALBEDO_FALLBACK : MASTERY_GOLD_ALBEDO_FALLBACK;
}

function drawShapeFill(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  level: PlaceMasteryLevel,
  {
    isDark,
    difficulty,
    pixelScale,
    allowCanvasGlow,
    hasLandImagery,
  }: {
    isDark: boolean;
    difficulty: MapProgressDifficulty;
    pixelScale: number;
    width: number;
    height: number;
    phase: number;
    allowCanvasGlow: boolean;
    hasLandImagery: boolean;
  },
) {
  // With real land imagery underneath, unstarted land is the imagery itself.
  if (level === 0 && hasLandImagery) return;

  const glow = MASTERY_GLOW_BY_LEVEL[level];
  const solid = getProgressFillColor(level, isDark, difficulty);

  ctx.save();
  // Skip canvas glow for mastery 4 — metal / diamond tiles should stay crisp.
  // Phones skip shadowBlur entirely (very expensive on large canvases).
  const allowGlow = allowCanvasGlow && glow.blur > 0 && level !== 4;
  if (allowGlow) {
    ctx.shadowColor = solid;
    ctx.shadowBlur = glow.blur * pixelScale;
  }

  if (level === 4) {
    ctx.fillStyle = createMastery4FillStyle(difficulty);
  } else {
    // Mastery 1–3 tints stay translucent over the imagery so terrain reads.
    if (hasLandImagery) ctx.globalAlpha = MASTERY_TINT_ALPHA;
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
  /** Place code currently selected on the map globe (teal fill, normal border). */
  selectedCode?: string | null;
  /** 0–1 animation phase kept for the paint-frame API (mastery-4 is static). */
  phase?: number;
  /** When false, skip canvas shadowBlur (phones). Default: not constrained. */
  allowCanvasGlow?: boolean;
  /** When false, mastery-4 paints a static mid-phase sample. */
  allowMastery4Animation?: boolean;
  /** Preloaded grayscale bathymetry map — real ocean depth shading. */
  oceanDepthImage?: HTMLImageElement | null;
  /** Preloaded Blue Marble natural-color land imagery. */
  landColorImage?: HTMLImageElement | null;
};

export type GlobeTexturePaintHandle = {
  canvas: HTMLCanvasElement;
  /**
   * White where mastery-4 gold or diamond covers the surface. The shader
   * uses it to gate the tiling albedo / roughness / relief.
   */
  goldMaskCanvas: HTMLCanvasElement | null;
  /** True when any mastery-4 places exist. */
  hasMastery4: boolean;
  /** True when mastery-4 fills should animate (unused — both tiles are static). */
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
 *
 * Prefer {@link createGlobeTexturePaintAsync} while the globe may be spinning —
 * this sync path can stall auto-rotation for a noticeable beat at 4K.
 */
export function createGlobeTexturePaint(
  profile: Profile | null,
  options: GlobeTextureOptions = {},
): GlobeTexturePaintHandle {
  // Sync one-shot path for exports/tests. Runtime globe uses the async builder.
  return buildGlobeTexturePaintSync(profile, options);
}

/**
 * Same result as {@link createGlobeTexturePaint}, but yields between shape
 * batches so orbit auto-rotation keeps running while borders upscale.
 * Returns null if `gate.shouldContinue` becomes false mid-paint.
 */
export async function createGlobeTexturePaintAsync(
  profile: Profile | null,
  options: GlobeTextureOptions = {},
  gate: PaintYieldGate,
): Promise<GlobeTexturePaintHandle | null> {
  return buildGlobeTexturePaintAsync(profile, options, gate);
}

function resolveTextureOptions({
  difficulty = "medium",
  usMode = "states",
  isDark = true,
  size = GLOBE_BASE_TEXTURE_SIZE,
  selectedCode = null,
  phase = masteryFxPhaseFromTime(0),
  allowCanvasGlow = !isGlobeFxConstrained(),
  allowMastery4Animation = !isGlobeFxConstrained(),
  oceanDepthImage = null,
  landColorImage = null,
}: GlobeTextureOptions = {}) {
  return {
    difficulty,
    usMode,
    isDark,
    size,
    selectedCode,
    phase,
    allowCanvasGlow,
    allowMastery4Animation,
    oceanDepthImage,
    landColorImage,
  };
}

function buildGlobeTexturePaintSync(
  profile: Profile | null,
  options: GlobeTextureOptions = {},
): GlobeTexturePaintHandle {
  const {
    difficulty,
    usMode,
    isDark,
    size,
    selectedCode,
    phase,
    allowCanvasGlow,
    allowMastery4Animation,
    oceanDepthImage,
    landColorImage,
  } = resolveTextureOptions(options);

  const width = size;
  const height = size / 2;
  const palette = getGlobePalette(isDark);
  const mapPalette = getMapPalette(isDark);
  const pixelScale = width / GLOBE_BASE_TEXTURE_SIZE;
  const shapes = collectShapes(profile, difficulty, usMode);
  const mastery4Shapes = shapes.filter((shape) => shape.level === 4);
  const hasMastery4 = mastery4Shapes.length > 0;
  let activeSelectedCode = selectedCode;

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
  if (oceanDepthImage) {
    baseCtx.drawImage(getOceanDepthCanvas(oceanDepthImage, isDark), 0, 0, width, height);
  }
  applyGlobeSurfaceGrain(baseCtx, width, height, pixelScale, "ocean");

  const extrasPath = buildPath(GLOBE_TEXTURE_DATA.extras, width, height);
  const landPath = new Path2D();
  landPath.addPath(extrasPath);
  for (const shape of shapes) {
    if (!shape.isState) landPath.addPath(pathFor(shape.code, shape.rings));
  }

  const landUnderlay = getProgressFillColor(0, isDark, difficulty);
  baseCtx.fillStyle = landUnderlay;
  baseCtx.fill(extrasPath, "evenodd");
  for (const shape of shapes) {
    if (shape.isState) continue;
    baseCtx.fill(pathFor(shape.code, shape.rings), "evenodd");
  }

  const landCanvas =
    landColorImage != null ? getLandColorCanvas(landColorImage, isDark, width) : null;
  const hasLandImagery = landCanvas != null;
  if (landCanvas) {
    baseCtx.save();
    baseCtx.clip(landPath, "evenodd");
    baseCtx.drawImage(landCanvas, 0, 0, width, height);
    baseCtx.restore();
  }

  const drawOpts = {
    isDark,
    difficulty,
    pixelScale,
    width,
    height,
    phase: 0.35,
    allowCanvasGlow,
    hasLandImagery,
  };

  drawShapeFill(baseCtx, extrasPath, 0, drawOpts);
  strokeShape(baseCtx, extrasPath, false, palette, pixelScale);

  for (const shape of shapes) {
    const path = pathFor(shape.code, shape.rings);
    if (shape.level === 4) {
      if (!hasLandImagery) {
        baseCtx.fillStyle = getProgressFillColor(0, isDark, difficulty);
        baseCtx.fill(path, "evenodd");
      }
      strokeShape(baseCtx, path, shape.isState, palette, pixelScale);
      continue;
    }
    drawShapeFill(baseCtx, path, shape.level, drawOpts);
    strokeShape(baseCtx, path, shape.isState, palette, pixelScale);
  }

  const clipGrainToLand = !GLOBE_OCEAN_MOTTLE_ENABLED;
  if (clipGrainToLand) {
    baseCtx.save();
    baseCtx.clip(landPath, "evenodd");
  }
  applyGlobeSurfaceGrain(baseCtx, width, height, pixelScale, "land");
  if (clipGrainToLand) baseCtx.restore();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const useGoldMask = hasMastery4;
  let goldMaskCanvas: HTMLCanvasElement | null = null;

  if (useGoldMask) {
    const mask = createGoldMaskCanvas(width, height);
    goldMaskCanvas = mask.canvas;
    for (const shape of mastery4Shapes) {
      fillGoldMaskPath(mask, pathFor(shape.code, shape.rings));
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
        const path = pathFor(selected.code, selected.rings);
        fillSelectedMapPath(ctx, path, mapPalette.highlight.fill, {
          glowBlur: MAP_SELECTION_GLOW_BLUR * pixelScale,
          allowGlow: allowCanvasGlow,
        });
        strokeShape(ctx, path, selected.isState, palette, pixelScale);
      }
    }
  };

  paintFrame(phase);

  return {
    canvas,
    goldMaskCanvas,
    hasMastery4,
    animateMastery4:
      hasMastery4 && allowMastery4Animation && mastery4ShouldAnimate(difficulty),
    paintFrame,
    setSelectedCode: (code) => {
      activeSelectedCode = code;
    },
  };
}

async function buildGlobeTexturePaintAsync(
  profile: Profile | null,
  options: GlobeTextureOptions = {},
  gate: PaintYieldGate,
): Promise<GlobeTexturePaintHandle | null> {
  const {
    difficulty,
    usMode,
    isDark,
    size,
    selectedCode,
    phase,
    allowCanvasGlow,
    allowMastery4Animation,
    oceanDepthImage,
    landColorImage,
  } = resolveTextureOptions(options);

  const width = size;
  const height = size / 2;
  const palette = getGlobePalette(isDark);
  const mapPalette = getMapPalette(isDark);
  const pixelScale = width / GLOBE_BASE_TEXTURE_SIZE;
  const shapes = collectShapes(profile, difficulty, usMode);
  const mastery4Shapes = shapes.filter((shape) => shape.level === 4);
  const hasMastery4 = mastery4Shapes.length > 0;
  let activeSelectedCode = selectedCode;

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
  if (oceanDepthImage) {
    baseCtx.drawImage(getOceanDepthCanvas(oceanDepthImage, isDark), 0, 0, width, height);
  }
  applyGlobeSurfaceGrain(baseCtx, width, height, pixelScale, "ocean");
  await awaitPaintYield(gate);
  if (!gate.shouldContinue()) return null;

  const extrasPath = buildPath(GLOBE_TEXTURE_DATA.extras, width, height);
  const landPath = new Path2D();
  landPath.addPath(extrasPath);
  for (const shape of shapes) {
    if (!shape.isState) landPath.addPath(pathFor(shape.code, shape.rings));
  }

  const landUnderlay = getProgressFillColor(0, isDark, difficulty);
  baseCtx.fillStyle = landUnderlay;
  baseCtx.fill(extrasPath, "evenodd");
  for (let i = 0; i < shapes.length; i += 1) {
    const shape = shapes[i];
    if (shape.isState) continue;
    baseCtx.fill(pathFor(shape.code, shape.rings), "evenodd");
    if (i % TEXTURE_SHAPE_BATCH === TEXTURE_SHAPE_BATCH - 1) {
      await awaitPaintYield(gate);
      if (!gate.shouldContinue()) return null;
    }
  }

  const landCanvas =
    landColorImage != null ? getLandColorCanvas(landColorImage, isDark, width) : null;
  const hasLandImagery = landCanvas != null;
  if (landCanvas) {
    baseCtx.save();
    baseCtx.clip(landPath, "evenodd");
    baseCtx.drawImage(landCanvas, 0, 0, width, height);
    baseCtx.restore();
  }
  await awaitPaintYield(gate);
  if (!gate.shouldContinue()) return null;

  const drawOpts = {
    isDark,
    difficulty,
    pixelScale,
    width,
    height,
    phase: 0.35,
    allowCanvasGlow,
    hasLandImagery,
  };

  drawShapeFill(baseCtx, extrasPath, 0, drawOpts);
  strokeShape(baseCtx, extrasPath, false, palette, pixelScale);

  for (let i = 0; i < shapes.length; i += 1) {
    const shape = shapes[i];
    const path = pathFor(shape.code, shape.rings);
    if (shape.level === 4) {
      if (!hasLandImagery) {
        baseCtx.fillStyle = getProgressFillColor(0, isDark, difficulty);
        baseCtx.fill(path, "evenodd");
      }
      strokeShape(baseCtx, path, shape.isState, palette, pixelScale);
    } else {
      drawShapeFill(baseCtx, path, shape.level, drawOpts);
      strokeShape(baseCtx, path, shape.isState, palette, pixelScale);
    }
    if (i % TEXTURE_SHAPE_BATCH === TEXTURE_SHAPE_BATCH - 1) {
      await awaitPaintYield(gate);
      if (!gate.shouldContinue()) return null;
    }
  }

  const clipGrainToLand = !GLOBE_OCEAN_MOTTLE_ENABLED;
  if (clipGrainToLand) {
    baseCtx.save();
    baseCtx.clip(landPath, "evenodd");
  }
  applyGlobeSurfaceGrain(baseCtx, width, height, pixelScale, "land");
  if (clipGrainToLand) baseCtx.restore();
  await awaitPaintYield(gate);
  if (!gate.shouldContinue()) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const useGoldMask = hasMastery4;
  let goldMaskCanvas: HTMLCanvasElement | null = null;

  if (useGoldMask) {
    const mask = createGoldMaskCanvas(width, height);
    goldMaskCanvas = mask.canvas;
    for (const shape of mastery4Shapes) {
      fillGoldMaskPath(mask, pathFor(shape.code, shape.rings));
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
        const path = pathFor(selected.code, selected.rings);
        fillSelectedMapPath(ctx, path, mapPalette.highlight.fill, {
          glowBlur: MAP_SELECTION_GLOW_BLUR * pixelScale,
          allowGlow: allowCanvasGlow,
        });
        strokeShape(ctx, path, selected.isState, palette, pixelScale);
      }
    }
  };

  paintFrame(phase);

  return {
    canvas,
    goldMaskCanvas,
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
 * for Normal, violet→diamond for Hard), wrapped around the planet.
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
