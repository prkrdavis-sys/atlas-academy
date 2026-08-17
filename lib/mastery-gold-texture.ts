/**
 * Paths and helpers for the Normal mastery-4 gold PBR set. The maps are
 * procedurally generated from a synthetic worked-metal height field (hammered
 * dents, scratches, polish waviness) — see scripts/generate-mastery-gold-pbr.ts.
 */

export const MASTERY_GOLD_TEXTURE_PATH = "/textures/mastery-gold-color.jpg";
export const MASTERY_GOLD_ROUGHNESS_PATH = "/textures/mastery-gold-roughness.jpg";
export const MASTERY_GOLD_NORMAL_PATH = "/textures/mastery-gold-normal.webp";

/** Classic yellow-gold solid fallback (not orange). */
export const MASTERY_GOLD_ALBEDO_FALLBACK = "#d4af37";
/** Tile width at 1024px texture width; large enough that dents/scratches read. */
export const MASTERY_GOLD_TILE_BASE_PX = 128;

/**
 * Mask resolution relative to the albedo canvas. Gold coverage is a per-place
 * silhouette, not detail, so half resolution is indistinguishable and costs a
 * quarter of the paint and upload.
 */
export const GOLD_MASK_SCALE = 0.5;

export type GoldMaskCanvas = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Canvas-space scale applied to paths painted at albedo resolution. */
  scale: number;
};

/** Black canvas that gold places are painted white into. */
export function createGoldMaskCanvas(width: number, height: number): GoldMaskCanvas {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * GOLD_MASK_SCALE));
  canvas.height = Math.max(1, Math.round(height * GOLD_MASK_SCALE));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(GOLD_MASK_SCALE, GOLD_MASK_SCALE);
  return { canvas, ctx, scale: GOLD_MASK_SCALE };
}

/** Marks one place as mastered gold. The shader reads this as coverage. */
export function fillGoldMaskPath(mask: GoldMaskCanvas, path: Path2D): void {
  mask.ctx.fillStyle = "#ffffff";
  mask.ctx.fill(path, "evenodd");
}
