/**
 * Paths and helpers for the Hard mastery-4 diamond PBR set. The maps are
 * procedurally generated as a Call of Duty–style diamond camo — a grid of
 * princess-cut gems in a gold setting (see scripts/generate-mastery-diamond-pbr.ts).
 */

export const MASTERY_DIAMOND_TEXTURE_PATH = "/textures/mastery-diamond-color.jpg";
export const MASTERY_DIAMOND_ROUGHNESS_PATH = "/textures/mastery-diamond-roughness.jpg";
export const MASTERY_DIAMOND_NORMAL_PATH = "/textures/mastery-diamond-normal.webp";

/** Icy blue-white solid fallback before the tiling maps decode. */
export const MASTERY_DIAMOND_ALBEDO_FALLBACK = "#c5dce8";
/**
 * Tile width at 1024px texture width. Smaller than gold so several gems
 * read on a mid-size country instead of one blown-up facet.
 */
export const MASTERY_DIAMOND_TILE_BASE_PX = 160;
