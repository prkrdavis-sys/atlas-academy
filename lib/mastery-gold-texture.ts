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

/** Matte land/ocean roughness (high value = low specular). */
export const GOLD_PBR_BASE_ROUGHNESS = "#c8c8c8";
/** Brushed gold roughness fallback when the image is missing (low = shinier). */
export const GOLD_PBR_GOLD_ROUGHNESS = "#383838";
/** Flat tangent-space normal for non-gold areas (OpenGL +Y). */
export const GOLD_PBR_FLAT_NORMAL = "#8080ff";

export type GoldPbrMapSet = {
  metalnessCanvas: HTMLCanvasElement;
  roughnessCanvas: HTMLCanvasElement;
  normalCanvas: HTMLCanvasElement;
  metalCtx: CanvasRenderingContext2D;
  roughCtx: CanvasRenderingContext2D;
  normalCtx: CanvasRenderingContext2D;
};

/** Initializes metal / roughness / normal canvases for a gold-vs-matte PBR mask. */
export function createGoldPbrMapSet(width: number, height: number): GoldPbrMapSet {
  const metalnessCanvas = document.createElement("canvas");
  metalnessCanvas.width = width;
  metalnessCanvas.height = height;
  const metalCtx = metalnessCanvas.getContext("2d")!;
  metalCtx.fillStyle = "#000000";
  metalCtx.fillRect(0, 0, width, height);

  const roughnessCanvas = document.createElement("canvas");
  roughnessCanvas.width = width;
  roughnessCanvas.height = height;
  const roughCtx = roughnessCanvas.getContext("2d")!;
  roughCtx.fillStyle = GOLD_PBR_BASE_ROUGHNESS;
  roughCtx.fillRect(0, 0, width, height);

  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = width;
  normalCanvas.height = height;
  const normalCtx = normalCanvas.getContext("2d")!;
  normalCtx.fillStyle = GOLD_PBR_FLAT_NORMAL;
  normalCtx.fillRect(0, 0, width, height);

  return {
    metalnessCanvas,
    roughnessCanvas,
    normalCanvas,
    metalCtx,
    roughCtx,
    normalCtx,
  };
}

/** Paints brushed-metal PBR response into the map set for one country path. */
export function paintGoldPbrForPath(
  maps: GoldPbrMapSet,
  path: Path2D,
  goldTilePx: number,
  goldRoughnessImage: HTMLImageElement | null,
  goldNormalImage: HTMLImageElement | null,
): void {
  const { metalCtx, roughCtx, normalCtx } = maps;
  const tilePx = Math.max(32, goldTilePx);

  metalCtx.fillStyle = "#ffffff";
  metalCtx.fill(path, "evenodd");

  const roughPattern =
    goldRoughnessImage != null
      ? createMasteryGoldPattern(roughCtx, goldRoughnessImage, tilePx)
      : null;
  const normalPattern =
    goldNormalImage != null
      ? createMasteryGoldPattern(normalCtx, goldNormalImage, tilePx)
      : null;

  roughCtx.save();
  roughCtx.fillStyle = roughPattern ?? GOLD_PBR_GOLD_ROUGHNESS;
  roughCtx.fill(path, "evenodd");
  roughCtx.restore();

  normalCtx.save();
  normalCtx.fillStyle = normalPattern ?? GOLD_PBR_FLAT_NORMAL;
  normalCtx.fill(path, "evenodd");
  normalCtx.restore();
}

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
