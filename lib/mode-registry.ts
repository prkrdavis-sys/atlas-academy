import type { GameMode, MapProgressCategory } from "@/lib/types";

/** Modes that pick a question kind at runtime instead of being a kind themselves. */
export const SESSION_POLICY_MODES = [
  "daily-challenge",
  "marathon",
  "speed-round",
  "weak-spots",
  "mixed",
] as const satisfies readonly GameMode[];

export type SessionPolicyMode = (typeof SESSION_POLICY_MODES)[number];

/** Flag quiz modes share one map-progress category. */
export const FLAG_QUESTION_MODES = [
  "flag-to-country",
  "flag-crop-to-country",
  "inverted-flag-crop-to-country",
  "country-to-flag",
  "inverted-flag-to-country",
  "inverted-country-to-flag",
] as const satisfies readonly GameMode[];

export type FlagQuestionMode = (typeof FLAG_QUESTION_MODES)[number];

export const FLAG_CROP_QUESTION_MODES = [
  "flag-crop-to-country",
  "inverted-flag-crop-to-country",
] as const satisfies readonly GameMode[];

/** Shuffle / challenge modes that fill mastery via category questions. */
export const COMPOSITE_MAP_PROGRESS_MODES = [
  "mixed",
  "daily-challenge",
  "marathon",
  "speed-round",
] as const satisfies readonly GameMode[];

export function isFlagQuestionMode(mode: GameMode): mode is FlagQuestionMode {
  return (FLAG_QUESTION_MODES as readonly GameMode[]).includes(mode);
}

export function isFlagCropQuestionMode(mode: GameMode): boolean {
  return (FLAG_CROP_QUESTION_MODES as readonly GameMode[]).includes(mode);
}

export function isSessionPolicyMode(mode: GameMode): mode is SessionPolicyMode {
  return (SESSION_POLICY_MODES as readonly GameMode[]).includes(mode);
}

export function mapProgressCategoryForMode(mode: GameMode): MapProgressCategory | null {
  if (isFlagQuestionMode(mode)) return "flag";

  switch (mode) {
    case "shape-to-country":
      return "shape";
    case "capital-to-country":
    case "country-to-capital":
      return "capital";
    case "fact-to-country":
      return "trivia";
    default:
      return null;
  }
}

export function modeCountsTowardMapProgress(mode: GameMode): boolean {
  if ((COMPOSITE_MAP_PROGRESS_MODES as readonly GameMode[]).includes(mode)) {
    return true;
  }
  return mapProgressCategoryForMode(mode) !== null;
}
