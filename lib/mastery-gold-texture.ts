/** Paths and helpers for the Normal mastery-4 ornate gold PBR set (CC0). */

export const MASTERY_GOLD_TEXTURE_PATH = "/textures/mastery-gold-brushed.jpg";
export const MASTERY_GOLD_ROUGHNESS_PATH = "/textures/mastery-gold-roughness.jpg";
export const MASTERY_GOLD_NORMAL_PATH = "/textures/mastery-gold-normal.jpg";

/** Classic yellow-gold solid fallback (not orange). */
export const MASTERY_GOLD_ALBEDO_FALLBACK = "#d4af37";
/** Canvas overlay — pushes cool scans toward warm crinkled foil. */
export const MASTERY_GOLD_WARM_OVERLAY = "rgba(255, 120, 20, 0.58)";
/** Tile width at 2048px texture width; smaller repeats = finer crinkle. */
export const MASTERY_GOLD_TILE_BASE_PX = 64;

let colorImagePromise: Promise<HTMLImageElement> | null = null;
let roughnessImagePromise: Promise<HTMLImageElement> | null = null;
let normalImagePromise: Promise<HTMLImageElement> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load texture: ${src}`));
    img.src = src;
  });
}

/** Lazily loads the brushed gold albedo (browser only). */
export function loadMasteryGoldColorImage(): Promise<HTMLImageElement> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Gold texture requires a browser environment"));
  }
  if (!colorImagePromise) {
    colorImagePromise = loadImage(MASTERY_GOLD_TEXTURE_PATH);
  }
  return colorImagePromise;
}

/** Lazily loads the brushed gold roughness map (browser only). */
export function loadMasteryGoldRoughnessImage(): Promise<HTMLImageElement> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Gold roughness requires a browser environment"));
  }
  if (!roughnessImagePromise) {
    roughnessImagePromise = loadImage(MASTERY_GOLD_ROUGHNESS_PATH);
  }
  return roughnessImagePromise;
}

/** Lazily loads the brushed gold normal map (OpenGL, browser only). */
export function loadMasteryGoldNormalImage(): Promise<HTMLImageElement> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Gold normal requires a browser environment"));
  }
  if (!normalImagePromise) {
    normalImagePromise = loadImage(MASTERY_GOLD_NORMAL_PATH);
  }
  return normalImagePromise;
}

export type MasteryGoldPbrImages = {
  color: HTMLImageElement;
  roughness: HTMLImageElement;
  normal: HTMLImageElement;
};

/** Loads the full brushed-gold PBR set used by Normal mastery 4. */
export function loadMasteryGoldPbrImages(): Promise<MasteryGoldPbrImages> {
  return Promise.all([
    loadMasteryGoldColorImage(),
    loadMasteryGoldRoughnessImage(),
    loadMasteryGoldNormalImage(),
  ]).then(([color, roughness, normal]) => ({ color, roughness, normal }));
}

/**
 * Canvas fill pattern for Normal mastery-4. `tilePx` is the on-canvas tile
 * size so brush streaks stay readable at the globe texture resolution.
 */
export function createMasteryGoldPattern(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  tilePx: number,
): CanvasPattern | null {
  const pattern = ctx.createPattern(image, "repeat");
  if (!pattern) return null;
  const tile = Math.max(32, tilePx);
  const scale = tile / Math.max(1, image.width);
  pattern.setTransform(new DOMMatrix().scale(scale, scale));
  return pattern;
}
