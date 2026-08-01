/**
 * Natural Earth–projected Blue Marble land imagery for Learn/Library context
 * maps. Same source as the globe (`public/globe/land-color.jpg`), warped into
 * the SVG map coordinate system so country paths can fill with a world-anchored
 * topographic pattern.
 *
 * Overview: baked `land-color-ne.jpg` (patternUnits userSpaceOnUse).
 * Zoomed Learn/Library crops: runtime sampling via {@link renderMapLandTextureCrop}.
 */

/** Baked NE-projected overview texture (see scripts/generate-map-land-texture.ts). */
export const MAP_LAND_TEXTURE_PATH = "/maps/land-color-ne.jpg";
export const MAP_LAND_TEXTURE_META_PATH = "/maps/land-color-ne.json";
export const USA_MAP_PROJECTION_META_PATH = "/maps/usa-projection.json";

/** Pattern size in SVG user units — matches the NE fitSize canvas (10000×5000). */
export const MAP_LAND_TEXTURE_WIDTH = 10000;
export const MAP_LAND_TEXTURE_HEIGHT = 5000;

export type MapLandProjectionParams = {
  scale: number;
  translate: [number, number];
  center: [number, number];
  rotate: [number, number, number];
};

export type MapLandTextureMeta = {
  width: number;
  height: number;
  mapWidth: number;
  mapHeight: number;
  scale: number;
  source: string;
  projection: "naturalEarth1";
  projectionParams: MapLandProjectionParams;
};

export type UsaMapProjectionMeta = {
  mapWidth: number;
  mapHeight: number;
  projection: "albersUsa";
  scale: number;
  translate: [number, number];
};

/**
 * Templates whose path coordinates live in Natural Earth world space.
 * USA uses a separate Albers-style atlas and cannot share this pattern.
 */
export function contextMapSupportsLandTexture(templateKey: string): boolean {
  return templateKey.length > 0;
}

/** Theme wash over the raw bake — mirrors globe land-color tones. */
export function getMapLandTextureWashOpacity(isDark: boolean): number {
  return isDark ? 0.26 : 0.34;
}

export function getMapLandTextureBrightness(isDark: boolean): number {
  return isDark ? 0.9 : 1;
}

/**
 * Translucent role tints over the terrain so the featured country still reads
 * while desert / forest / relief stay visible underneath.
 */
export const MAP_LAND_HIGHLIGHT_TINT_OPACITY = 0.42;
export const MAP_LAND_NEIGHBOR_TINT_OPACITY = 0.28;

/** Target width for runtime viewBox crops (height follows aspect). */
export const MAP_LAND_CROP_TARGET_WIDTH = 1280;
