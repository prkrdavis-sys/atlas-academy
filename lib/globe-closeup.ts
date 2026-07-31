import * as THREE from "three";
import { normalizedToLocalDirection } from "@/lib/globe-focus";
import { isGlobeFxConstrained } from "@/lib/globe-performance";
import {
  fillSelectedMapPath,
  getMapPalette,
  getProgressFillColor,
  MAP_SELECTION_GLOW_BLUR,
} from "@/lib/map-colors";
import { getMasterySolidColor } from "@/lib/map-mastery-fx";
import {
  createMasteryGoldPattern,
  MASTERY_GOLD_TILE_BASE_PX,
  MASTERY_GOLD_WARM_OVERLAY,
} from "@/lib/mastery-gold-texture";
import { getPlaceMasteryLevel } from "@/lib/map-progress";
import {
  applyGlobeSurfaceGrain,
  GLOBE_BASE_TEXTURE_SIZE,
  getGlobePalette,
  type GlobeCountryShape,
  type GlobeUsMode,
} from "@/lib/globe-texture";
import type { MapProgressDifficulty, Profile } from "@/lib/types";

export type GlobeCloseupData = {
  countries: GlobeCountryShape[];
  usStates: GlobeCountryShape[];
};

/** Camera distance at/below which the regional close-up patch activates. */
export const GLOBE_CLOSEUP_ACTIVATE_DISTANCE = 2.1;
/** Camera distance at/above which the close-up patch deactivates (hysteresis). */
export const GLOBE_CLOSEUP_DEACTIVATE_DISTANCE = 2.4;

/** Radius bias so the patch sits just above the textured sphere. */
export const GLOBE_CLOSEUP_MESH_RADIUS = 1.001;

/** Extra footprint padding so edges stay outside the viewport while fading. */
const WINDOW_PADDING = 1.35;
/** Minimum normalized span so tiny zooms still cover neighboring coasts. */
const MIN_NORMALIZED_HALF_SPAN = 0.012;
/** Soft edge feather as a fraction of the patch (each side). */
const EDGE_FEATHER = 0.08;
/** Grid density for the sphere patch mesh. */
const PATCH_SEGMENTS_U = 48;
const PATCH_SEGMENTS_V = 32;

let closeupLoadPromise: Promise<GlobeCloseupData> | null = null;

/** Lazy-loads NE 10m close-up rings on first close-zoom / place focus. */
export function loadGlobeCloseupData(): Promise<GlobeCloseupData> {
  if (!closeupLoadPromise) {
    closeupLoadPromise = import("@/data/globe-closeup-countries.json").then(
      (module) => module.default as GlobeCloseupData,
    );
  }
  return closeupLoadPromise;
}

export type CloseupWindow = {
  /** Center in normalized equirectangular space (0..1), unwrapped. */
  centerX: number;
  centerY: number;
  /** Half-span in normalized x (longitude fraction of full Earth). */
  halfX: number;
  /** Half-span in normalized y (latitude fraction of full Earth). */
  halfY: number;
};

/** Mesh-local unit direction → normalized equirectangular UV (matches SphereGeometry). */
export function localDirectionToNormalized(dir: THREE.Vector3): [number, number] {
  const n = dir.clone().normalize();
  const phi = Math.acos(THREE.MathUtils.clamp(n.y, -1, 1));
  let theta = Math.atan2(n.z, -n.x);
  if (theta < 0) theta += Math.PI * 2;
  const nx = theta / (Math.PI * 2);
  const ny = phi / Math.PI;
  return [nx, ny];
}

/**
 * Angular half-width on the unit sphere covered by a camera frustum half-angle
 * when the camera sits on +Z at `distance` looking at the origin.
 */
function surfaceAngleForFrustumHalf(distance: number, frustumHalf: number): number {
  const d = Math.max(distance, 1.001);
  const a = frustumHalf;
  const dx = Math.sin(a);
  const dz = -Math.cos(a);
  const B = 2 * d * dz;
  const C = d * d - 1;
  const disc = B * B - 4 * C;
  if (disc < 0) {
    return Math.acos(Math.min(1, 1 / d));
  }
  const t = (-B - Math.sqrt(disc)) / 2;
  if (t <= 0) {
    return Math.acos(Math.min(1, 1 / d));
  }
  const hit = new THREE.Vector3(t * dx, 0, d + t * dz).normalize();
  const front = new THREE.Vector3(0, 0, 1);
  return front.angleTo(hit);
}

/**
 * Builds the normalized lon/lat window around the camera-facing surface point.
 * `lookDirection` is mesh-local (origin → front-of-view surface).
 */
export function resolveCloseupWindow(
  lookDirection: THREE.Vector3,
  cameraDistance: number,
  {
    fovDeg = 45,
    aspect = 1,
  }: {
    fovDeg?: number;
    aspect?: number;
  } = {},
): CloseupWindow {
  const [centerX, centerY] = localDirectionToNormalized(lookDirection);
  const halfV = THREE.MathUtils.degToRad(fovDeg / 2);
  const halfH = Math.atan(Math.tan(halfV) * Math.max(aspect, 0.25));
  const surfaceV = surfaceAngleForFrustumHalf(cameraDistance, halfV);
  const surfaceH = surfaceAngleForFrustumHalf(cameraDistance, halfH);

  const halfX = Math.max((surfaceH / (Math.PI * 2)) * WINDOW_PADDING, MIN_NORMALIZED_HALF_SPAN);
  const halfY = Math.max((surfaceV / Math.PI) * WINDOW_PADDING, MIN_NORMALIZED_HALF_SPAN * 0.5);

  return {
    centerX,
    centerY: THREE.MathUtils.clamp(centerY, halfY, 1 - halfY),
    halfX: Math.min(halfX, 0.45),
    halfY: Math.min(halfY, 0.45),
  };
}

/** True when the new window drifted enough to warrant a repaint. */
export function closeupWindowNeedsRebuild(
  prev: CloseupWindow | null,
  next: CloseupWindow,
): boolean {
  if (!prev) return true;
  const dx = Math.abs(unwrapDelta(next.centerX - prev.centerX));
  const dy = Math.abs(next.centerY - prev.centerY);
  const spanShift =
    Math.abs(next.halfX - prev.halfX) / Math.max(prev.halfX, 1e-6) +
    Math.abs(next.halfY - prev.halfY) / Math.max(prev.halfY, 1e-6);
  // Rebuild after ~15% of the current footprint or a notable zoom change.
  return dx > prev.halfX * 0.3 || dy > prev.halfY * 0.3 || spanShift > 0.25;
}

function unwrapDelta(dx: number): number {
  let value = dx;
  while (value > 0.5) value -= 1;
  while (value < -0.5) value += 1;
  return value;
}

function ringIntersectsWindow(ring: number[], window: CloseupWindow): boolean {
  const minX = window.centerX - window.halfX;
  const maxX = window.centerX + window.halfX;
  const minY = window.centerY - window.halfY;
  const maxY = window.centerY + window.halfY;

  for (let i = 0; i < ring.length; i += 2) {
    const y = ring[i + 1];
    if (y < minY || y > maxY) continue;
    // Test the point and ±1 unwraps against the (possibly wrapped) x window.
    const x = ring[i];
    for (const shift of [0, -1, 1]) {
      const sx = x + shift;
      if (sx >= minX && sx <= maxX) return true;
    }
  }

  // Also keep shapes whose bbox overlaps even if samples missed (sparse rings).
  let rMinX = Infinity;
  let rMaxX = -Infinity;
  let rMinY = Infinity;
  let rMaxY = -Infinity;
  for (let i = 0; i < ring.length; i += 2) {
    rMinX = Math.min(rMinX, ring[i]);
    rMaxX = Math.max(rMaxX, ring[i]);
    rMinY = Math.min(rMinY, ring[i + 1]);
    rMaxY = Math.max(rMaxY, ring[i + 1]);
  }
  if (rMaxY < minY || rMinY > maxY) return false;
  for (const shift of [0, -1, 1]) {
    if (rMaxX + shift >= minX && rMinX + shift <= maxX) return true;
  }
  return false;
}

function collectCloseupShapes(
  data: GlobeCloseupData,
  profile: Profile | null,
  difficulty: MapProgressDifficulty,
  usMode: GlobeUsMode,
  window: CloseupWindow,
): { code: string; rings: number[][]; level: number; isState: boolean }[] {
  const masteryOf = (code: string) =>
    profile ? getPlaceMasteryLevel(code, profile, difficulty) : 0;

  const shapes: { code: string; rings: number[][]; level: number; isState: boolean }[] = [];
  const showStates = usMode === "states";

  for (const country of data.countries) {
    if (showStates && country.code === "US") {
      // Neutral underlay — states carry mastery in states mode.
      const rings = country.rings.filter((ring) => ringIntersectsWindow(ring, window));
      if (rings.length === 0) continue;
      shapes.push({ code: country.code, rings, level: 0, isState: false });
      continue;
    }
    const rings = country.rings.filter((ring) => ringIntersectsWindow(ring, window));
    if (rings.length === 0) continue;
    shapes.push({
      code: country.code,
      rings,
      level: masteryOf(country.code),
      isState: false,
    });
  }

  if (showStates) {
    for (const state of data.usStates) {
      const rings = state.rings.filter((ring) => ringIntersectsWindow(ring, window));
      if (rings.length === 0) continue;
      shapes.push({
        code: state.code,
        rings,
        level: masteryOf(state.code),
        isState: true,
      });
    }
  }

  shapes.sort((a, b) => Number(a.isState) - Number(b.isState) || a.level - b.level);
  return shapes;
}

/**
 * Maps a normalized equirectangular point into patch pixel space. Points that
 * need an antimeridian unwrap pick the shift that lands inside the window.
 */
function toPatchPoint(
  nx: number,
  ny: number,
  window: CloseupWindow,
  width: number,
  height: number,
): [number, number] {
  const minX = window.centerX - window.halfX;
  const minY = window.centerY - window.halfY;
  const spanX = window.halfX * 2;
  const spanY = window.halfY * 2;

  let bestX = nx;
  let bestDist = Infinity;
  for (const shift of [0, -1, 1, -2, 2]) {
    const sx = nx + shift;
    const dist = Math.abs(sx - window.centerX);
    if (dist < bestDist) {
      bestDist = dist;
      bestX = sx;
    }
  }

  return [((bestX - minX) / spanX) * width, ((ny - minY) / spanY) * height];
}

function buildPatchPath(
  rings: number[][],
  window: CloseupWindow,
  width: number,
  height: number,
): Path2D {
  const path = new Path2D();
  for (const ring of rings) {
    if (ring.length < 6) continue;
    const [x0, y0] = toPatchPoint(ring[0], ring[1], window, width, height);
    path.moveTo(x0, y0);
    for (let i = 2; i < ring.length; i += 2) {
      const [x, y] = toPatchPoint(ring[i], ring[i + 1], window, width, height);
      path.lineTo(x, y);
    }
    path.closePath();
  }
  return path;
}

function applyEdgeFeather(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const featherX = Math.max(1, Math.floor(width * EDGE_FEATHER));
  const featherY = Math.max(1, Math.floor(height * EDGE_FEATHER));
  const mask = ctx.createLinearGradient(0, 0, width, 0);
  // Horizontal feather
  const fx = featherX / width;
  mask.addColorStop(0, "rgba(0,0,0,0)");
  mask.addColorStop(fx, "rgba(0,0,0,1)");
  mask.addColorStop(1 - fx, "rgba(0,0,0,1)");
  mask.addColorStop(1, "rgba(0,0,0,0)");

  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, width, height);

  const vmask = ctx.createLinearGradient(0, 0, 0, height);
  const fy = featherY / height;
  vmask.addColorStop(0, "rgba(0,0,0,0)");
  vmask.addColorStop(fy, "rgba(0,0,0,1)");
  vmask.addColorStop(1 - fy, "rgba(0,0,0,1)");
  vmask.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vmask;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export type PaintCloseupOptions = {
  difficulty?: MapProgressDifficulty;
  usMode?: GlobeUsMode;
  isDark?: boolean;
  selectedCode?: string | null;
  /** Target texture width; height follows the window aspect. */
  textureWidth?: number;
  /** Preloaded gold foil albedo so Normal mastery-4 keeps its texture up close. */
  goldColorImage?: HTMLImageElement | null;
};

/** Grain scale cap so the tile never stretches into blur at extreme zoom. */
const CLOSEUP_GRAIN_SCALE_CAP = 8;

/**
 * Paints a high-density regional equirectangular patch for the given window.
 * Selection changes fill only — borders stay the normal globe stroke.
 */
export function paintGlobeCloseupRegion(
  data: GlobeCloseupData,
  profile: Profile | null,
  window: CloseupWindow,
  {
    difficulty = "medium",
    usMode = "states",
    isDark = true,
    selectedCode = null,
    textureWidth = 2048,
    goldColorImage = null,
  }: PaintCloseupOptions = {},
): HTMLCanvasElement {
  const aspect = (window.halfY * 2) / Math.max(window.halfX * 2, 1e-6);
  const width = Math.max(64, Math.round(textureWidth));
  const height = Math.max(64, Math.round(width * aspect));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const palette = getGlobePalette(isDark);
  const mapPalette = getMapPalette(isDark);
  const strokeWidth = Math.max(0.8, (width / 1024) * 1.15);
  // How many px one full-Earth texture pixel spans inside this patch — keeps
  // grain and gold foil the same apparent size as the base globe texture.
  const effectiveScale =
    width / Math.max(window.halfX * 2, 1e-6) / GLOBE_BASE_TEXTURE_SIZE;

  ctx.fillStyle = palette.ocean;
  ctx.fillRect(0, 0, width, height);
  applyGlobeSurfaceGrain(
    ctx,
    width,
    height,
    Math.min(effectiveScale, CLOSEUP_GRAIN_SCALE_CAP),
    "ocean",
  );

  const goldPattern =
    difficulty === "medium" && goldColorImage
      ? createMasteryGoldPattern(
          ctx,
          goldColorImage,
          Math.max(40, Math.round(MASTERY_GOLD_TILE_BASE_PX * effectiveScale)),
        )
      : null;

  const shapes = collectCloseupShapes(data, profile, difficulty, usMode, window);

  for (const shape of shapes) {
    const path = buildPatchPath(shape.rings, window, width, height);
    const level = shape.level as 0 | 1 | 2 | 3 | 4;
    if (level === 4) {
      ctx.fillStyle = goldPattern ?? getMasterySolidColor(difficulty);
    } else {
      ctx.fillStyle = getProgressFillColor(level, isDark, difficulty);
    }
    ctx.fill(path, "evenodd");

    // Warm the gold foil like the base texture does.
    if (level === 4 && goldPattern) {
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = MASTERY_GOLD_WARM_OVERLAY;
      ctx.fill(path, "evenodd");
      ctx.restore();
    }

    ctx.lineWidth = shape.isState ? strokeWidth * 0.85 : strokeWidth;
    ctx.strokeStyle = shape.isState ? palette.stateBorder : palette.border;
    ctx.stroke(path);
  }

  applyGlobeSurfaceGrain(
    ctx,
    width,
    height,
    Math.min(effectiveScale, CLOSEUP_GRAIN_SCALE_CAP),
    "land",
  );

  if (selectedCode) {
    const selected = shapes.find((shape) => shape.code === selectedCode);
    if (selected) {
      const path = buildPatchPath(selected.rings, window, width, height);
      const pixelScale = width / GLOBE_BASE_TEXTURE_SIZE;
      fillSelectedMapPath(ctx, path, mapPalette.highlight.fill, {
        glowBlur: MAP_SELECTION_GLOW_BLUR * Math.max(pixelScale, 0.5),
        allowGlow: !isGlobeFxConstrained(),
      });
      // Re-stroke with the normal border so the fill doesn't erase the outline.
      ctx.lineWidth = Math.max(0.8, (selected.isState ? 0.9 : 1.25) * (width / 1024));
      ctx.strokeStyle = selected.isState ? palette.stateBorder : palette.border;
      ctx.stroke(path);
    }
  }

  applyEdgeFeather(ctx, width, height);
  return canvas;
}

/**
 * Builds a sphere-hugging mesh covering the close-up window, with UVs that
 * match {@link paintGlobeCloseupRegion}'s canvas.
 */
export function buildCloseupPatchGeometry(
  window: CloseupWindow,
  radius = GLOBE_CLOSEUP_MESH_RADIUS,
): THREE.BufferGeometry {
  const segU = PATCH_SEGMENTS_U;
  const segV = PATCH_SEGMENTS_V;
  const vertexCount = (segU + 1) * (segV + 1);
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  const minX = window.centerX - window.halfX;
  const minY = window.centerY - window.halfY;
  const spanX = window.halfX * 2;
  const spanY = window.halfY * 2;

  for (let v = 0; v <= segV; v += 1) {
    const vFrac = v / segV;
    const ny = minY + spanY * vFrac;
    for (let u = 0; u <= segU; u += 1) {
      const uFrac = u / segU;
      // Keep unwrapped longitude so antimeridian-spanning patches stay contiguous;
      // cos/sin in normalizedToLocalDirection are periodic in nx.
      const nx = minX + spanX * uFrac;
      const dir = normalizedToLocalDirection(nx, THREE.MathUtils.clamp(ny, 0, 1));
      const index = v * (segU + 1) + u;
      positions[index * 3] = dir.x * radius;
      positions[index * 3 + 1] = dir.y * radius;
      positions[index * 3 + 2] = dir.z * radius;
      uvs[index * 2] = uFrac;
      uvs[index * 2 + 1] = 1 - vFrac;
    }
  }

  for (let v = 0; v < segV; v += 1) {
    for (let u = 0; u < segU; u += 1) {
      const a = v * (segU + 1) + u;
      const b = a + 1;
      const c = a + (segU + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function disposeCloseupResources(
  texture: THREE.Texture | null,
  geometry: THREE.BufferGeometry | null,
  material: THREE.Material | null,
) {
  texture?.dispose();
  geometry?.dispose();
  material?.dispose();
}
