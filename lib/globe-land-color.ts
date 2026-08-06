/**
 * Real natural-color land imagery for the globe. NASA's Blue Marble Next
 * Generation July composite (Terra MODIS, public domain) provides true
 * land-cover color — green Amazon, tan Sahara, white Arctic — with
 * topographic relief shading baked in. Because it's a world-anchored
 * equirectangular image (like the ocean bathymetry), close-up patches sample
 * identical pixels on every rebuild, so panning never makes land "refresh".
 *
 * Source convention (public/globe/land-color.jpg, 5400x2700 equirectangular):
 * standard [-180..180] x [90..-90] layout matching the globe UV mapping.
 * Ocean pixels are irrelevant — callers clip to the painted land shapes.
 */

export const LAND_COLOR_TEXTURE_PATH = "/globe/land-color.jpg";

/**
 * Cap the working canvas well under common mobile max-canvas budgets.
 * The source is 5400×2700 (~58 MB RGBA); keeping that around alongside the
 * globe texture + bathymetry + WebGL buffers can empty the canvas on iOS,
 * which previously left ocean blue showing through every country.
 */
export const LAND_COLOR_WORKING_MAX_WIDTH = 2048;

let landColorImagePromise: Promise<HTMLImageElement> | null = null;

/** Lazily loads the Blue Marble land imagery (browser only). */
export function loadLandColorImage(): Promise<HTMLImageElement> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Land color texture requires a browser environment"));
  }
  if (!landColorImagePromise) {
    landColorImagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        // Ensure pixels are decoded before callers sample naturalWidth / draw.
        if (typeof img.decode === "function") {
          img
            .decode()
            .then(() => resolve(img))
            .catch(() => resolve(img));
        } else {
          resolve(img);
        }
      };
      img.onerror = () => reject(new Error(`Failed to load texture: ${LAND_COLOR_TEXTURE_PATH}`));
      img.src = LAND_COLOR_TEXTURE_PATH;
    });
  }
  return landColorImagePromise;
}

/**
 * Per-theme tone adjustment. Raw Blue Marble reads too dark on the globe
 * (dense rainforest is nearly black), swallowing the country border strokes,
 * so both themes wash the imagery toward white: `paleAlpha` is the white
 * overlay mixed in (lightens and desaturates in one pass) and `brightness`
 * is an optional multiply afterward. Terrain variation (desert / forest /
 * arctic) must still read, but nothing should approach black.
 */
type LandTone = { paleAlpha: number; brightness: number };

const LIGHT_LAND_TONE: LandTone = { paleAlpha: 0.34, brightness: 1 };
const DARK_LAND_TONE: LandTone = { paleAlpha: 0.26, brightness: 0.9 };

const landCanvasByTheme = new Map<string, HTMLCanvasElement>();

function landWorkingSize(
  image: HTMLImageElement,
  maxWidth: number,
): { width: number; height: number } | null {
  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;
  if (!(srcW > 0 && srcH > 0)) return null;
  const width = Math.min(srcW, Math.max(64, Math.round(maxWidth)));
  const height = Math.max(1, Math.round((width / srcW) * srcH));
  return { width, height };
}

/**
 * Returns the land imagery for the given theme, scaled to at most
 * `maxWidth` (default {@link LAND_COLOR_WORKING_MAX_WIDTH}), brightened and
 * paled per {@link LandTone}. Computed once per theme+size and cached;
 * callers just `drawImage` the result.
 *
 * Returns `null` when the source image has no usable dimensions or the
 * working canvas could not be painted — callers must fall back to flat land.
 */
export function getLandColorCanvas(
  image: HTMLImageElement,
  isDark: boolean,
  maxWidth: number = LAND_COLOR_WORKING_MAX_WIDTH,
): HTMLCanvasElement | null {
  const size = landWorkingSize(image, maxWidth);
  if (!size) return null;

  const key = `${isDark ? "dark" : "light"}:${size.width}`;
  const cached = landCanvasByTheme.get(key);
  if (cached && cached.width === size.width && cached.height === size.height) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(image, 0, 0, size.width, size.height);

  // Guard against silent canvas eviction / failed draws: Sahara should be
  // warm tan, never the near-black empty-canvas default.
  try {
    const sample = ctx.getImageData(
      Math.floor(size.width * 0.55),
      Math.floor(size.height * 0.42),
      1,
      1,
    ).data;
    const [r, g, b, a] = sample;
    if (a < 128 || r + g + b < 30) return null;
  } catch {
    // Tainted or unsupported — still attempt to use the canvas below.
  }

  const tone = isDark ? DARK_LAND_TONE : LIGHT_LAND_TONE;
  ctx.globalAlpha = tone.paleAlpha;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.globalAlpha = 1;
  if (tone.brightness < 1) {
    const gray = Math.round(tone.brightness * 255);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.globalCompositeOperation = "source-over";
  }

  landCanvasByTheme.set(key, canvas);
  return canvas;
}
