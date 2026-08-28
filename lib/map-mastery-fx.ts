import type { MapProgressDifficulty, PlaceMasteryLevel } from "@/lib/types";

/** SVG paint ids for mastery-4 fills on the 2D progress map. */
export const MASTERY_GOLD_GRADIENT_ID = "map-mastery-gold";
export const MASTERY_DIAMOND_GRADIENT_ID = "map-mastery-diamond";

export type MasteryGradientStop = { offset: number; color: string };

/** Classic metallic gold — bronze → amber with a sharp specular highlight band. */
export const MASTERY_GOLD_STOPS: readonly MasteryGradientStop[] = [
  { offset: 0, color: "#713f12" },
  { offset: 0.14, color: "#a16207" },
  { offset: 0.28, color: "#ca8a04" },
  { offset: 0.42, color: "#fbbf24" },
  { offset: 0.5, color: "#fff7ed" },
  { offset: 0.58, color: "#f59e0b" },
  { offset: 0.74, color: "#b45309" },
  { offset: 0.88, color: "#92400e" },
  { offset: 1, color: "#eab308" },
];

/** Icy diamond fallback for consumers that cannot paint the tiled camo. */
export const MASTERY_DIAMOND_STOPS: readonly MasteryGradientStop[] = [
  { offset: 0, color: "#7aa3bd" },
  { offset: 0.28, color: "#c5dce8" },
  { offset: 0.5, color: "#f4fbff" },
  { offset: 0.72, color: "#b7d0e0" },
  { offset: 1, color: "#8eb4cc" },
];

/** Representative solid for consumers that cannot paint a texture. */
export const MASTERY_GOLD_SOLID = "#d4af37";
export const MASTERY_DIAMOND_SOLID = "#c5dce8";

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

export function getMasteryGradientStops(difficulty: MapProgressDifficulty): readonly MasteryGradientStop[] {
  return difficulty === "hard" ? MASTERY_DIAMOND_STOPS : MASTERY_GOLD_STOPS;
}

export function getMasteryGradientId(difficulty: MapProgressDifficulty): string {
  return difficulty === "hard" ? MASTERY_DIAMOND_GRADIENT_ID : MASTERY_GOLD_GRADIENT_ID;
}

export function getMasterySolidColor(difficulty: MapProgressDifficulty): string {
  return difficulty === "hard" ? MASTERY_DIAMOND_SOLID : MASTERY_GOLD_SOLID;
}

/** CSS class for SVG path edge presence at a mastery level (no pulse). */
export function getMasteryGlowClass(
  level: PlaceMasteryLevel,
  difficulty: MapProgressDifficulty = "medium",
): string | undefined {
  if (level <= 1) return undefined;
  const accent = difficulty === "hard" ? "mastery-glow-hard" : "mastery-glow-normal";
  if (level === 4) {
    // Gold and diamond are texture-only so facet/metal edges stay crisp.
    return difficulty === "hard" ? "mastery-metal-diamond" : "mastery-metal-gold";
  }
  return [`mastery-glow-${level}`, accent].join(" ");
}

/** CSS class for mastery-4 swatch fills (static gold / diamond camo). */
export function getMasteryTextureClass(difficulty: MapProgressDifficulty): string {
  return difficulty === "hard" ? "mastery-texture-diamond" : "mastery-texture-gold";
}

/** Mastery-4 fills are static photo tiles — nothing drifts. */
export function mastery4ShouldAnimate(_difficulty: MapProgressDifficulty): boolean {
  return false;
}

/**
 * Samples a looping gradient at `t` in [0, 1). Used by the globe canvas so
 * gold/diamond fallbacks sample a looping ramp when a solid isn't enough.
 */
export function sampleGradientColor(
  stops: readonly MasteryGradientStop[],
  t: number,
): string {
  if (stops.length === 0) return "#ffffff";
  const wrapped = ((t % 1) + 1) % 1;
  // Treat stops as a loop: last blends into first across the seam.
  const extended = [...stops, { offset: 1, color: stops[0].color }];
  for (let i = 0; i < extended.length - 1; i++) {
    const a = extended[i];
    const b = extended[i + 1];
    if (wrapped >= a.offset && wrapped <= b.offset) {
      const span = b.offset - a.offset || 1;
      return mixHexColors(a.color, b.color, (wrapped - a.offset) / span);
    }
  }
  return extended[extended.length - 1].color;
}

/** Phase-shifted stop list for SVG / CSS backgrounds that share a clock. */
export function shiftGradientStops(
  stops: readonly MasteryGradientStop[],
  phase: number,
): MasteryGradientStop[] {
  const wrapped = ((phase % 1) + 1) % 1;
  return stops.map((stop) => ({
    offset: stop.offset,
    color: sampleGradientColor(stops, stop.offset + wrapped),
  }));
}

export function masteryFxPhaseFromTime(nowMs: number, periodMs = 3200): number {
  return (nowMs % periodMs) / periodMs;
}

function mixHexColors(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return a;
  const u = Math.min(1, Math.max(0, t));
  const r = Math.round(ca.r + (cb.r - ca.r) * u);
  const g = Math.round(ca.g + (cb.g - ca.g) * u);
  const bCh = Math.round(ca.b + (cb.b - ca.b) * u);
  return rgbToHex(r, g, bCh);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return null;
  const n = Number.parseInt(raw, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Builds a CSS linear-gradient string from stops (for legend/summary swatches). */
export function masteryGradientCss(
  difficulty: MapProgressDifficulty,
  angleDeg = 125,
): string {
  const stops = getMasteryGradientStops(difficulty)
    .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
    .join(", ");
  return `linear-gradient(${angleDeg}deg, ${stops})`;
}
