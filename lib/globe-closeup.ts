import * as THREE from "three";
import { normalizedToLocalDirection } from "@/lib/globe-focus";
import { getOceanDepthCanvas } from "@/lib/globe-ocean-depth";
import { isGlobeFxConstrained } from "@/lib/globe-performance";
import {
  fillSelectedMapPath,
  getMapPalette,
  getProgressFillColor,
  MAP_SELECTION_GLOW_BLUR,
} from "@/lib/map-colors";
import { getMasterySolidColor } from "@/lib/map-mastery-fx";
import {
  createGoldMaskCanvas,
  fillGoldMaskPath,
  MASTERY_GOLD_ALBEDO_FALLBACK,
} from "@/lib/mastery-gold-texture";
import { getLandColorCanvas } from "@/lib/globe-land-color";
import { getPlaceMasteryLevel } from "@/lib/map-progress";
import {
  applyGlobeSurfaceGrain,
  GLOBE_BASE_TEXTURE_SIZE,
  GLOBE_OCEAN_MOTTLE_ENABLED,
  getGlobePalette,
  MASTERY_TINT_ALPHA,
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

/**
 * Extra footprint padding so edges stay outside the viewport while fading.
 * Generous on purpose: a wider patch survives more camera drift before it has
 * to be repainted, and repaints are the expensive part.
 */
const WINDOW_PADDING = 1.7;
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
  // The padded footprint tolerates a lot of drift before its edge is in view,
  // so rebuild late — every repaint is a multi-megapixel canvas plus upload.
  return dx > prev.halfX * 0.6 || dy > prev.halfY * 0.6 || spanShift > 0.5;
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
 * Adds one ring to the patch path. The ring is first unwrapped continuously
 * (each vertex relative to the previous one) so antimeridian-crossing shapes
 * with a wide longitudinal span — Russia, the US with the Aleutians, Fiji —
 * stay contiguous instead of tearing into a full-width band. The whole ring
 * is then shifted as a unit onto whichever wrap copies overlap the window.
 */
function addRingToPath(
  path: Path2D,
  ring: number[],
  window: CloseupWindow,
  width: number,
  height: number,
): void {
  const pointCount = ring.length / 2;
  const xs = new Float64Array(pointCount);
  let ringMinX = Infinity;
  let ringMaxX = -Infinity;

  let prevX = ring[0];
  xs[0] = prevX;
  ringMinX = ringMaxX = prevX;
  for (let i = 1; i < pointCount; i += 1) {
    let x = ring[i * 2];
    // Continuous unwrap: pick the copy of x nearest the previous vertex.
    x -= Math.round(x - prevX);
    xs[i] = x;
    prevX = x;
    if (x < ringMinX) ringMinX = x;
    if (x > ringMaxX) ringMaxX = x;
  }

  const minX = window.centerX - window.halfX;
  const maxX = window.centerX + window.halfX;
  const minY = window.centerY - window.halfY;
  const spanX = window.halfX * 2;
  const spanY = window.halfY * 2;

  // Emit the ring at every integer shift whose bbox overlaps the window
  // (a very wide ring plus a wide window can be visible at two shifts).
  for (let shift = Math.ceil(minX - ringMaxX); shift <= Math.floor(maxX - ringMinX); shift += 1) {
    path.moveTo(
      ((xs[0] + shift - minX) / spanX) * width,
      ((ring[1] - minY) / spanY) * height,
    );
    for (let i = 1; i < pointCount; i += 1) {
      path.lineTo(
        ((xs[i] + shift - minX) / spanX) * width,
        ((ring[i * 2 + 1] - minY) / spanY) * height,
      );
    }
    path.closePath();
  }
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
    addRingToPath(path, ring, window, width, height);
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

/**
 * Paints a world-anchored equirectangular source for the close-up window,
 * splitting the source rect in two when the window crosses the antimeridian
 * (mirroring the ring unwrap logic used for land shapes). Because sampling is
 * tied to world coordinates, rebuilt patches paint identical pixels — panning
 * never makes the surface visibly re-anchor.
 */
function drawWorldImageForWindow(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  window: CloseupWindow,
  width: number,
  height: number,
): void {
  const dw = source.width;
  const dh = source.height;

  // Wrap the window's left edge into [0, 1); spans are capped below 1.
  let minX = window.centerX - window.halfX;
  minX -= Math.floor(minX);
  const spanX = window.halfX * 2;
  const minY = Math.max(0, window.centerY - window.halfY);
  const maxY = Math.min(1, window.centerY + window.halfY);

  const sx = minX * dw;
  const sw = spanX * dw;
  const sy = minY * dh;
  const sh = Math.max(1e-3, (maxY - minY) * dh);

  if (sx + sw <= dw) {
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
    return;
  }
  // Window straddles the antimeridian — draw the two halves side by side.
  const firstW = dw - sx;
  const destSplit = (firstW / sw) * width;
  ctx.drawImage(source, sx, sy, firstW, sh, 0, 0, destSplit, height);
  ctx.drawImage(source, 0, sy, sw - firstW, sh, destSplit, 0, width - destSplit, height);
}

export type PaintCloseupOptions = {
  difficulty?: MapProgressDifficulty;
  usMode?: GlobeUsMode;
  isDark?: boolean;
  selectedCode?: string | null;
  /** Target texture width; height follows the window aspect. */
  textureWidth?: number;
  /** Preloaded grayscale bathymetry map — real ocean depth shading. */
  oceanDepthImage?: HTMLImageElement | null;
  /** Preloaded Blue Marble natural-color land imagery. */
  landColorImage?: HTMLImageElement | null;
};

export type CloseupPaintResult = {
  color: HTMLCanvasElement;
  /** White where Normal mastery-4 gold covers this window; null when none does. */
  goldMaskCanvas: HTMLCanvasElement | null;
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
    oceanDepthImage = null,
    landColorImage = null,
  }: PaintCloseupOptions = {},
): CloseupPaintResult {
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

  // World-anchored grain origin: how far (in canvas px) this patch's origin
  // sits from world (0, 0), so grain stays pinned to the planet across
  // rebuilds instead of re-anchoring to each new patch.
  const grainOrigin: [number, number] = [
    ((window.centerX - window.halfX) * width) / Math.max(window.halfX * 2, 1e-6),
    ((window.centerY - window.halfY) * height) / Math.max(window.halfY * 2, 1e-6),
  ];

  // Flat fill stays as the fallback until the bathymetry image is available.
  ctx.fillStyle = palette.ocean;
  ctx.fillRect(0, 0, width, height);
  if (oceanDepthImage) {
    drawWorldImageForWindow(
      ctx,
      getOceanDepthCanvas(oceanDepthImage, isDark),
      window,
      width,
      height,
    );
  }
  applyGlobeSurfaceGrain(
    ctx,
    width,
    height,
    Math.min(effectiveScale, CLOSEUP_GRAIN_SCALE_CAP),
    "ocean",
    grainOrigin,
  );

  const shapes = collectCloseupShapes(data, profile, difficulty, usMode, window);
  const shapePaths = shapes.map((shape) => ({
    shape,
    path: buildPatchPath(shape.rings, window, width, height),
  }));

  // Combined land silhouette (non-state shapes never overlap, so even-odd
  // only carves genuine holes) — clips the imagery and the land grain pass.
  const landPath = new Path2D();
  for (const { shape, path } of shapePaths) {
    if (!shape.isState) landPath.addPath(path);
  }

  // Sage underlay so land stays visible if Blue Marble fails to paint.
  const landUnderlay = getProgressFillColor(0, isDark, difficulty);
  ctx.fillStyle = landUnderlay;
  for (const { shape, path } of shapePaths) {
    if (shape.isState) continue;
    ctx.fill(path, "evenodd");
  }

  const landCanvas =
    landColorImage != null ? getLandColorCanvas(landColorImage, isDark) : null;
  const hasLandImagery = landCanvas != null;
  if (landCanvas) {
    // Real natural-color terrain clipped to land, sampled at world
    // coordinates so panning never shifts it.
    ctx.save();
    ctx.clip(landPath, "evenodd");
    drawWorldImageForWindow(ctx, landCanvas, window, width, height);
    ctx.restore();
  }

  const useGoldMask =
    difficulty === "medium" && shapes.some((shape) => shape.level === 4);
  const goldMask = useGoldMask ? createGoldMaskCanvas(width, height) : null;

  for (const { shape, path } of shapePaths) {
    const level = shape.level as 0 | 1 | 2 | 3 | 4;
    if (level === 4) {
      // Gold / legendary stays fully opaque over the imagery. Normal gold is a
      // flat base — the GPU adds the tiling grain, roughness, and relief.
      ctx.fillStyle =
        difficulty === "medium"
          ? MASTERY_GOLD_ALBEDO_FALLBACK
          : getMasterySolidColor(difficulty);
      if (goldMask) fillGoldMaskPath(goldMask, path);
      ctx.fill(path, "evenodd");
    } else if (level === 0) {
      // Unstarted land is the imagery itself; flat fill only as fallback.
      if (!hasLandImagery) {
        ctx.fillStyle = getProgressFillColor(level, isDark, difficulty);
        ctx.fill(path, "evenodd");
      }
    } else {
      // Mastery 1–3 tints stay translucent so the terrain reads through.
      ctx.fillStyle = getProgressFillColor(level, isDark, difficulty);
      if (hasLandImagery) {
        ctx.save();
        ctx.globalAlpha = MASTERY_TINT_ALPHA;
        ctx.fill(path, "evenodd");
        ctx.restore();
      } else {
        ctx.fill(path, "evenodd");
      }
    }

    ctx.lineWidth = shape.isState ? strokeWidth * 0.85 : strokeWidth;
    ctx.strokeStyle = shape.isState ? palette.stateBorder : palette.border;
    ctx.stroke(path);
  }

  // With the painted mottle off, keep the water as pure bathymetry: clip the
  // land grain pass to the land shapes instead of washing the whole patch.
  const clipGrainToLand = !GLOBE_OCEAN_MOTTLE_ENABLED;
  if (clipGrainToLand) {
    ctx.save();
    ctx.clip(landPath, "evenodd");
  }
  applyGlobeSurfaceGrain(
    ctx,
    width,
    height,
    Math.min(effectiveScale, CLOSEUP_GRAIN_SCALE_CAP),
    "land",
    grainOrigin,
  );
  if (clipGrainToLand) ctx.restore();

  if (selectedCode) {
    const selected = shapes.find((shape) => shape.code === selectedCode);
    if (selected) {
      const path = buildPatchPath(selected.rings, window, width, height);
      const pixelScale = width / GLOBE_BASE_TEXTURE_SIZE;
      fillSelectedMapPath(ctx, path, mapPalette.highlight.fill, {
        glowBlur: MAP_SELECTION_GLOW_BLUR * Math.max(pixelScale, 0.5),
        allowGlow: !isGlobeFxConstrained(),
      });
      ctx.lineWidth = selected.isState ? strokeWidth * 0.85 : strokeWidth;
      ctx.strokeStyle = selected.isState ? palette.stateBorder : palette.border;
      ctx.stroke(path);
    }
  }

  applyEdgeFeather(ctx, width, height);
  return { color: canvas, goldMaskCanvas: goldMask?.canvas ?? null };
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
