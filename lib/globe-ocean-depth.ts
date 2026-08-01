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

type RampStop = { t: number; color: [number, number, number] };

/**
 * Depth → blue ramps, same hue family as the flat palette ocean so the
 * painted-storybook look is preserved. `t` is normalized depth: 0 = shallow
 * (gray 255), 1 = deepest (gray 0). The mid stop sits near the old flat fill
 * (#1d4d85 dark / #2e6096 light) so the overall globe brightness is unchanged.
 */
const DARK_OCEAN_RAMP: RampStop[] = [
  { t: 0.0, color: [0x3a, 0x70, 0xa9] }, // shelf / coastal shallows
  { t: 0.35, color: [0x27, 0x59, 0x93] },
  { t: 0.62, color: [0x1d, 0x4d, 0x85] }, // ≈ old flat ocean
  { t: 1.0, color: [0x12, 0x35, 0x63] }, // abyssal / trench
];

const LIGHT_OCEAN_RAMP: RampStop[] = [
  { t: 0.0, color: [0x4c, 0x83, 0xba] },
  { t: 0.35, color: [0x39, 0x6c, 0xa4] },
  { t: 0.62, color: [0x2e, 0x60, 0x96] }, // ≈ old flat ocean
  { t: 1.0, color: [0x1e, 0x45, 0x74] },
];

/** 256 RGB entries indexed by source gray (0 = deepest .. 255 = shallowest). */
function buildDepthLut(ramp: RampStop[]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let gray = 0; gray < 256; gray += 1) {
    const t = 1 - gray / 255;
    let lo = ramp[0];
    let hi = ramp[ramp.length - 1];
    for (let i = 0; i < ramp.length - 1; i += 1) {
      if (t >= ramp[i].t && t <= ramp[i + 1].t) {
        lo = ramp[i];
        hi = ramp[i + 1];
        break;
      }
    }
    const span = Math.max(hi.t - lo.t, 1e-6);
    const f = Math.min(1, Math.max(0, (t - lo.t) / span));
    lut[gray * 3] = lo.color[0] + (hi.color[0] - lo.color[0]) * f;
    lut[gray * 3 + 1] = lo.color[1] + (hi.color[1] - lo.color[1]) * f;
    lut[gray * 3 + 2] = lo.color[2] + (hi.color[2] - lo.color[2]) * f;
  }
  return lut;
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

/**
 * Returns the bathymetry map recolored into the palette blues for the given
 * theme, at the image's native resolution. The per-pixel pass runs once per
 * theme and is cached; callers just `drawImage` (and scale) the result.
 */
export function getOceanDepthCanvas(
  image: HTMLImageElement,
  isDark: boolean,
): HTMLCanvasElement {
  const key = isDark ? "dark" : "light";
  const cached = tintedCanvasByTheme.get(key);
  if (cached) return cached;

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, width, height);

  const lut = buildDepthLut(isDark ? DARK_OCEAN_RAMP : LIGHT_OCEAN_RAMP);
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
