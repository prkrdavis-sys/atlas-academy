import { getMasteryFinish } from "@/lib/mastery-finish";
import type { MapProgressDifficulty, PlaceMasteryLevel } from "@/lib/types";

export type MapProgressChrome = {
  selectedLabelClass: string;
  cardClass: string;
  percentClass: string;
  barClass: string;
  linkClass: string;
  gamePanelClass: string;
  gameLabelClass: string;
  gamePercentClass: string;
  /** Solid fill for progress that existed before this round. */
  gameBarBaseClass: string;
  /** Gradient fill for progress gained this round (ends in the accent/yellow). */
  gameBarGainClass: string;
};

const NORMAL_CHROME: MapProgressChrome = {
  selectedLabelClass: "bg-white text-teal-800 shadow-sm dark:bg-slate-900 dark:text-teal-300",
  cardClass:
    "rounded-2xl border-2 border-teal-400 bg-gradient-to-br from-teal-50 via-amber-50/50 to-emerald-50 p-4 shadow-sm dark:border-teal-500 dark:from-teal-950/40 dark:via-amber-950/20 dark:to-emerald-950/40",
  percentClass: "text-amber-700 dark:text-amber-300",
  barClass: "bg-gradient-to-r from-teal-400 via-amber-300 to-yellow-400",
  linkClass:
    "mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-teal-600 bg-teal-600 px-4 py-2 font-display text-sm font-extrabold text-white shadow-[0_3px_0_var(--color-teal-800)] transition-all hover:bg-teal-500 active:translate-y-[3px] active:shadow-none dark:border-teal-500 dark:bg-teal-600 dark:shadow-[0_3px_0_var(--color-teal-900)]",
  gamePanelClass:
    "mx-auto mt-4 max-w-sm rounded-xl border border-teal-200/70 bg-gradient-to-br from-teal-50/50 to-amber-50/40 px-3 py-2.5 dark:border-teal-800/70 dark:from-teal-950/25 dark:to-amber-950/15",
  gameLabelClass: "text-teal-800 dark:text-teal-300",
  gamePercentClass: "text-amber-700 dark:text-amber-300",
  gameBarBaseClass: "bg-teal-400",
  gameBarGainClass: "bg-gradient-to-r from-teal-400 via-amber-300 to-yellow-400",
};

const HARD_CHROME: MapProgressChrome = {
  selectedLabelClass: "bg-white text-fuchsia-800 shadow-sm dark:bg-slate-900 dark:text-fuchsia-300",
  cardClass:
    "rounded-2xl border-2 border-fuchsia-400 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-cyan-50 p-4 shadow-sm dark:border-fuchsia-500 dark:from-violet-950/40 dark:via-fuchsia-950/30 dark:to-cyan-950/30",
  percentClass: "text-fuchsia-700 dark:text-fuchsia-300",
  barClass: "bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-400",
  linkClass:
    "mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-fuchsia-600 bg-fuchsia-600 px-4 py-2 font-display text-sm font-extrabold text-white shadow-[0_3px_0_var(--color-fuchsia-800)] transition-all hover:bg-fuchsia-500 active:translate-y-[3px] active:shadow-none dark:border-fuchsia-500 dark:bg-fuchsia-600 dark:shadow-[0_3px_0_var(--color-fuchsia-900)]",
  gamePanelClass:
    "mx-auto mt-4 max-w-sm rounded-xl border border-fuchsia-200/70 bg-gradient-to-br from-violet-50/50 via-fuchsia-50/40 to-cyan-50/40 px-3 py-2.5 dark:border-fuchsia-800/70 dark:from-violet-950/25 dark:via-fuchsia-950/20 dark:to-cyan-950/15",
  gameLabelClass: "text-fuchsia-800 dark:text-fuchsia-300",
  gamePercentClass: "text-fuchsia-700 dark:text-fuchsia-300",
  gameBarBaseClass: "bg-violet-500",
  gameBarGainClass: "bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-400",
};

export function getMapProgressChrome(difficulty: MapProgressDifficulty): MapProgressChrome {
  return difficulty === "hard" ? HARD_CHROME : NORMAL_CHROME;
}

export function getMasteryPatternId(difficulty: MapProgressDifficulty): string {
  return getMasteryFinish(difficulty).patternId;
}

export function getMasterySolidColor(difficulty: MapProgressDifficulty): string {
  return getMasteryFinish(difficulty).albedoFallback;
}

export type MasteryGlowIntensity = {
  /** Canvas shadowBlur multiplier (relative to texture pixel scale). */
  blur: number;
  /** Glow opacity 0–1 for CSS drop-shadow / canvas shadow. */
  opacity: number;
};

/**
 * Soft edge presence only — no pulse. Kept low so fills stay sharp and
 * metallic texture reads first.
 */
export const MASTERY_GLOW_BY_LEVEL: Record<PlaceMasteryLevel, MasteryGlowIntensity> = {
  0: { blur: 0, opacity: 0 },
  1: { blur: 0, opacity: 0 },
  2: { blur: 0.8, opacity: 0.18 },
  3: { blur: 1.6, opacity: 0.22 },
  4: { blur: 2.2, opacity: 0.28 },
};

/** CSS class for SVG path edge presence at a mastery level (no pulse). */
export function getMasteryGlowClass(
  level: PlaceMasteryLevel,
  difficulty: MapProgressDifficulty = "medium",
): string | undefined {
  if (level <= 1) return undefined;
  if (level === 4) return getMasteryFinish(difficulty).metalClass;
  const accent = difficulty === "hard" ? "mastery-glow-hard" : "mastery-glow-normal";
  return [`mastery-glow-${level}`, accent].join(" ");
}

/** CSS class for mastery-4 swatch fills (static gold / diamond camo). */
export function getMasteryTextureClass(difficulty: MapProgressDifficulty): string {
  return getMasteryFinish(difficulty).textureClass;
}
