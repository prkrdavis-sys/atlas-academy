/**
 * Real ocean depth shading for the globe. A grayscale GEBCO bathymetry map
 * (NASA NEO, public domain) is recolored at runtime into the globe palette
 * blues so the light/dark water variation matches actual ocean depth:
 * shallow shelves read lighter, abyssal plains and trenches read darker.
 *
 * Source convention (public/globe/ocean-depth.png, 2048x1024 equirectangular):
 * gray 0 = deepest (Mariana Trench), 255 = shallowest. Land is also 255, so
 * any coastline sliver not covered by the painted land shapes just reads as
 * shallow water instead of a visible halo.
 */

import { buildOceanDepthLut } from "@/lib/ocean-depth-lut";

export const OCEAN_DEPTH_TEXTURE_PATH = "/globe/ocean-depth.png";

let depthImagePromise: Promise<HTMLImageElement> | null = null;

/** Lazily loads the grayscale bathymetry map (browser only). */
export function loadOceanDepthImage(): Promise<HTMLImageElement> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Ocean depth texture requires a browser environment"));
  }
  if (!depthImagePromise) {
    depthImagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load texture: ${OCEAN_DEPTH_TEXTURE_PATH}`));
      img.src = OCEAN_DEPTH_TEXTURE_PATH;
    });
  }
  return depthImagePromise;
}

const tintedCanvasByTheme = new Map<string, HTMLCanvasElement>();

/** Latitude band (fraction of texture height) smoothed at each pole. */
const POLAR_SMOOTH_BAND = 0.035;

/**
 * Equirectangular rows shrink to a point at the poles, so any longitudinal
 * variation there wraps into a radial "pinwheel" on the sphere. Blend the
 * top/bottom rows toward their row average (full blend at the pole edge)
 * so the caps render calm.
 */
function smoothPolarRows(pixels: Uint8ClampedArray, width: number, height: number): void {
  const band = Math.max(2, Math.round(height * POLAR_SMOOTH_BAND));
  const blendRow = (row: number, weight: number) => {
    const offset = row * width * 4;
    let sum = 0;
    for (let x = 0; x < width; x += 1) sum += pixels[offset + x * 4];
    const mean = sum / width;
    for (let x = 0; x < width; x += 1) {
      const i = offset + x * 4;
      pixels[i] = pixels[i] + (mean - pixels[i]) * weight;
    }
  };
  for (let r = 0; r < band; r += 1) {
    const weight = 1 - r / band;
    blendRow(r, weight);
    blendRow(height - 1 - r, weight);
  }
}

/** Rows of LUT recolor per animation-frame slice (2048-wide ≈ 8k px). */
const OCEAN_TINT_ROWS_PER_SLICE = 48;

type OceanTintGate = {
  shouldContinue: () => boolean;
  yieldIfNeeded: () => void | Promise<void>;
};

/**
 * Returns the bathymetry map recolored into the palette blues for the given
 * theme, at the image's native resolution. The per-pixel pass runs once per
 * theme and is cached; callers just `drawImage` (and scale) the result.
 *
 * Prefer {@link ensureOceanDepthCanvas} when the globe may be spinning — the
 * sync path can stall auto-rotation for a noticeable beat on first tint.
 */
export function getOceanDepthCanvas(
  image: HTMLImageElement,
  isDark: boolean,
): HTMLCanvasElement {
  const key = isDark ? "dark:v2" : "light:v2";
  const cached = tintedCanvasByTheme.get(key);
  if (cached) return cached;

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, width, height);

  const lut = buildOceanDepthLut(isDark);
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  smoothPolarRows(pixels, width, height);
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = pixels[i];
    pixels[i] = lut[gray * 3];
    pixels[i + 1] = lut[gray * 3 + 1];
    pixels[i + 2] = lut[gray * 3 + 2];
    pixels[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  tintedCanvasByTheme.set(key, canvas);
  return canvas;
}

/**
 * Same result as {@link getOceanDepthCanvas}, but yields between row batches so
 * the globe can keep rotating while the first tint is computed.
 * Returns null if `gate.shouldContinue` becomes false mid-pass.
 */
export async function ensureOceanDepthCanvas(
  image: HTMLImageElement,
  isDark: boolean,
  gate?: OceanTintGate,
): Promise<HTMLCanvasElement | null> {
  const key = isDark ? "dark:v2" : "light:v2";
  const cached = tintedCanvasByTheme.get(key);
  if (cached) return cached;

  if (!gate) return getOceanDepthCanvas(image, isDark);

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, width, height);

  const lut = buildOceanDepthLut(isDark);
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  smoothPolarRows(pixels, width, height);

  const rowBytes = width * 4;
  for (let row = 0; row < height; row += 1) {
    const rowStart = row * rowBytes;
    const rowEnd = rowStart + rowBytes;
    for (let i = rowStart; i < rowEnd; i += 4) {
      const gray = pixels[i];
      pixels[i] = lut[gray * 3];
      pixels[i + 1] = lut[gray * 3 + 1];
      pixels[i + 2] = lut[gray * 3 + 2];
      pixels[i + 3] = 255;
    }
    if ((row + 1) % OCEAN_TINT_ROWS_PER_SLICE === 0) {
      const wait = gate.yieldIfNeeded();
      if (wait) await wait;
      if (!gate.shouldContinue()) return null;
    }
  }

  // Another build may have finished while we yielded.
  const raced = tintedCanvasByTheme.get(key);
  if (raced) return raced;

  ctx.putImageData(imageData, 0, 0);
  tintedCanvasByTheme.set(key, canvas);
  return canvas;
}
