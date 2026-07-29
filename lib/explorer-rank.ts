import { getGlobeMasteryLevel } from "@/lib/globe-texture";
import { getPlayablePlacesForScope } from "@/lib/map-progress";
import type { GameScope, MapProgressDifficulty, Profile } from "@/lib/types";

export type MasteredProgress = { mastered: number; total: number };

/**
 * Places fully mastered on the active map-progress track — the same measure
 * the home globe glows with, so the counter and the planet always agree.
 */
export function getMasteredProgress(
  scope: GameScope,
  profile: Profile,
  difficulty: MapProgressDifficulty = "medium",
): MasteredProgress {
  const places = getPlayablePlacesForScope(scope);
  let mastered = 0;
  for (const place of places) {
    if (getGlobeMasteryLevel(place.code, profile, difficulty) === 4) mastered += 1;
  }
  return { mastered, total: places.length };
}

export type ExplorerRank = {
  title: string;
  icon: string;
  /** 1-based rank level. */
  level: number;
  /** Mastered-place count needed for the next rank, or null at max rank. */
  nextAt: number | null;
};

export type ExplorerRankNext = {
  title: string;
  icon: string;
  /** Absolute mastered-place count required to earn this rank. */
  at: number;
  /** How many more places must be mastered from the current count. */
  remaining: number;
};

/** Thresholds are fractions of the scope's total so World and USA both level fairly. */
const RANK_TIERS = [
  { fraction: 0, title: "Cadet", icon: "🎒" },
  { fraction: 0.02, title: "Scout", icon: "🔭" },
  { fraction: 0.06, title: "Trailblazer", icon: "🥾" },
  { fraction: 0.14, title: "Navigator", icon: "🧭" },
  { fraction: 0.28, title: "Cartographer", icon: "🗺️" },
  { fraction: 0.5, title: "Globetrotter", icon: "✈️" },
  { fraction: 0.75, title: "Atlas Master", icon: "🌍" },
] as const;

function rankThresholds(total: number): number[] {
  return RANK_TIERS.map((tier) =>
    Math.max(tier.fraction === 0 ? 0 : 1, Math.round(tier.fraction * total)),
  );
}

export function getExplorerRank(progress: MasteredProgress): ExplorerRank {
  const thresholds = rankThresholds(progress.total);

  let index = 0;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (progress.mastered >= thresholds[i]) index = i;
  }

  const tier = RANK_TIERS[index];
  const next = index + 1 < thresholds.length ? thresholds[index + 1] : null;
  return { title: tier.title, icon: tier.icon, level: index + 1, nextAt: next };
}

/** Details for the rank above the player's current one, or null at max rank. */
export function getNextExplorerRank(progress: MasteredProgress): ExplorerRankNext | null {
  const thresholds = rankThresholds(progress.total);

  let index = 0;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (progress.mastered >= thresholds[i]) index = i;
  }

  const nextIndex = index + 1;
  if (nextIndex >= RANK_TIERS.length) return null;

  const at = thresholds[nextIndex];
  const next = RANK_TIERS[nextIndex];
  return {
    title: next.title,
    icon: next.icon,
    at,
    remaining: Math.max(0, at - progress.mastered),
  };
}
