import type { MapProgressDifficulty } from "@/lib/types";

export type MasteryFinishId = "gold" | "diamond";

export type MasteryFinish = {
  id: MasteryFinishId;
  colorPath: string;
  roughnessPath: string;
  normalPath: string;
  tileBasePx: number;
  albedoFallback: string;
  metalness: number;
  emissive: string;
  emissiveIntensity: number;
  envMapIntensity: number;
  normalScale: readonly [number, number];
  patternId: string;
  patternTile: number;
  textureClass: string;
  metalClass: string;
};

const GOLD_FINISH: MasteryFinish = {
  id: "gold",
  colorPath: "/textures/mastery-gold-color.jpg",
  roughnessPath: "/textures/mastery-gold-roughness.jpg",
  normalPath: "/textures/mastery-gold-normal.webp",
  tileBasePx: 128,
  albedoFallback: "#d4af37",
  metalness: 0.96,
  emissive: "#c4921a",
  emissiveIntensity: 0.07,
  envMapIntensity: 1.35,
  normalScale: [2.4, 2.4],
  patternId: "map-mastery-gold",
  patternTile: 0.18,
  textureClass: "mastery-texture-gold",
  metalClass: "mastery-metal-gold",
};

const DIAMOND_FINISH: MasteryFinish = {
  id: "diamond",
  colorPath: "/textures/mastery-diamond-color.jpg",
  roughnessPath: "/textures/mastery-diamond-roughness.jpg",
  normalPath: "/textures/mastery-diamond-normal.webp",
  tileBasePx: 160,
  albedoFallback: "#c5dce8",
  metalness: 0.84,
  emissive: "#9ec4dc",
  emissiveIntensity: 0.09,
  envMapIntensity: 1.65,
  normalScale: [3.1, 3.1],
  patternId: "map-mastery-diamond",
  patternTile: 0.38,
  textureClass: "mastery-texture-diamond",
  metalClass: "mastery-metal-diamond",
};

export const MASTERY_FINISHES: readonly MasteryFinish[] = [GOLD_FINISH, DIAMOND_FINISH];

export function getMasteryFinish(difficulty: MapProgressDifficulty): MasteryFinish {
  return difficulty === "hard" ? DIAMOND_FINISH : GOLD_FINISH;
}

/**
 * Mask resolution relative to the albedo canvas. Coverage is a per-place
 * silhouette, not detail, so half resolution is indistinguishable and costs a
 * quarter of the paint and upload.
 */
export const MASTERY_MASK_SCALE = 0.5;

export type MasteryMaskCanvas = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Canvas-space scale applied to paths painted at albedo resolution. */
  scale: number;
};

/** Black canvas that mastered places are painted white into. */
export function createMasteryMaskCanvas(width: number, height: number): MasteryMaskCanvas {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * MASTERY_MASK_SCALE));
  canvas.height = Math.max(1, Math.round(height * MASTERY_MASK_SCALE));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(MASTERY_MASK_SCALE, MASTERY_MASK_SCALE);
  return { canvas, ctx, scale: MASTERY_MASK_SCALE };
}

/** Marks one place as mastery-4. The shader reads this as coverage. */
export function fillMasteryMaskPath(mask: MasteryMaskCanvas, path: Path2D): void {
  mask.ctx.fillStyle = "#ffffff";
  mask.ctx.fill(path, "evenodd");
}
