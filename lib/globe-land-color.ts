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
      img.onload = () => resolve(img);
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

/**
 * Returns the land imagery for the given theme at native resolution,
 * brightened and paled per {@link LandTone}. Computed once per theme and
 * cached; callers just `drawImage` the result.
 */
export function getLandColorCanvas(
  image: HTMLImageElement,
  isDark: boolean,
): HTMLCanvasElement {
  const key = isDark ? "dark" : "light";
  const cached = landCanvasByTheme.get(key);
  if (cached) return cached;

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, width, height);

  const tone = isDark ? DARK_LAND_TONE : LIGHT_LAND_TONE;
  ctx.globalAlpha = tone.paleAlpha;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  if (tone.brightness < 1) {
    const gray = Math.round(tone.brightness * 255);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  }

  landCanvasByTheme.set(key, canvas);
  return canvas;
}
