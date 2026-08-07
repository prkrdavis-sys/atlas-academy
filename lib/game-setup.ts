import { getPlayablePoolSize } from "@/lib/countries";
import { getScopedModeInfo, scopeText, SCOPE_INFO } from "@/lib/scope";
import { getRegionSelectionLabel } from "@/lib/region-presets";
import { getCommonlyMissedCountries } from "@/lib/stats-helpers";
import type { GameScope } from "@/lib/types";
import {
  CONTINENTS,
  DEFAULT_SELECTED_MODE,
  DIFFICULTY_LABELS,
  GAME_MODES,
  LEGACY_CHALLENGE_MODES,
  ROUND_ALL_QUESTIONS,
  SETUP_MODES,
  SPEED_ROUND_ALL_TYPES,
  US_REGIONS,
  clampRoundQuestionSetting,
  getDifficultyHint,
  isChallengeModifierActive,
  normalizeRoundQuestionSetting,
  type ChallengeModifier,
  type Continent,
  type Difficulty,
  type GameMode,
  type Profile,
  type Region,
  type RoundQuestionSetting,
  type SpeedRoundQuestionType,
  type UsRegion,
} from "@/lib/types";

export type GameSetupDraft = {
  mode: GameMode;
  challengeModifier: ChallengeModifier;
  continents: Region[];
  includeTerritories: boolean;
  difficulty: Difficulty;
  roundQuestionCount: RoundQuestionSetting;
};

export type ResolvedPlayConfig = {
  mode: GameMode;
  challengeModifier: ChallengeModifier;
  fallbackMessage?: string;
};

export function isValidGameMode(value: string | null | undefined): value is GameMode {
  return GAME_MODES.some((mode) => mode.id === value);
}

export function isValidSetupMode(value: string | null | undefined): value is GameMode {
  return SETUP_MODES.includes(value as GameMode);
}

function questionTypeToBaseMode(questionType: SpeedRoundQuestionType): GameMode {
  return questionType === SPEED_ROUND_ALL_TYPES ? "mixed" : questionType;
}

export function resolveLegacyChallengeMode(
  mode: GameMode,
  profile: Profile,
): ResolvedPlayConfig | null {
  if (mode === "speed-round") {
    return {
      mode: questionTypeToBaseMode(profile.settings.speedRoundQuestionType ?? "flag-to-country"),
      challengeModifier: "speed-round",
    };
  }
  if (mode === "marathon") {
    return {
      mode: questionTypeToBaseMode(profile.settings.marathonQuestionType ?? "flag-to-country"),
      challengeModifier: "marathon",
    };
  }
  return null;
}

export function resolvePlayConfig(
  profile: Profile,
  requestedMode: GameMode,
  scope: GameScope,
): ResolvedPlayConfig {
  const legacy = resolveLegacyChallengeMode(requestedMode, profile);
  if (legacy) return legacy;

  const mode = requestedMode;
  const challengeModifier = profile.settings.challengeModifier ?? "none";

  if (mode === "weak-spots") {
    const weakSpotCodes = getCommonlyMissedCountries(profile, scope);
    if (!weakSpotCodes.length) {
      return {
        mode: DEFAULT_SELECTED_MODE,
        challengeModifier: profile.settings.challengeModifier ?? "none",
        fallbackMessage: "No weak spots yet — starting Mixed",
      };
    }
  }

  return { mode, challengeModifier };
}

export function createSetupDraftFromProfile(
  profile: Profile,
  mode: GameMode,
  scope: GameScope,
): GameSetupDraft {
  const isUsa = scope === "usa";
  const legacy = resolveLegacyChallengeMode(mode, profile);

  return {
    mode: legacy?.mode ?? mode,
    challengeModifier: legacy?.challengeModifier ?? profile.settings.challengeModifier ?? "none",
    continents: isUsa
      ? profile.settings.lastRegionFilter ?? [...US_REGIONS]
      : profile.settings.lastContinentFilter ?? [...CONTINENTS],
    includeTerritories: profile.settings.includeTerritories ?? false,
    difficulty: profile.settings.difficulty ?? "medium",
    roundQuestionCount: normalizeRoundQuestionSetting(profile.settings.roundQuestionCount),
  };
}

export function getPlayablePoolForDraft(
  profile: Profile,
  draft: GameSetupDraft,
  scope: GameScope,
): number {
  const modeInfo = getScopedModeInfo(draft.mode, scope);
  if (!modeInfo) return 0;

  const weakSpotCodes =
    draft.mode === "weak-spots" ? getCommonlyMissedCountries(profile, scope) : undefined;

  return getPlayablePoolSize({
    continents: draft.continents,
    includeTerritories: draft.includeTerritories,
    mode: draft.mode,
    weakSpotCodes,
    scope,
  });
}

export function buildSettingsPatch(
  draft: GameSetupDraft,
  scope: GameScope,
  poolSize: number,
): Partial<Profile["settings"]> {
  const effectiveRoundQuestionCount = clampRoundQuestionSetting(
    draft.roundQuestionCount,
    poolSize,
  );

  return {
    lastSelectedMode: draft.mode,
    challengeModifier: draft.challengeModifier,
    difficulty: draft.difficulty,
    roundQuestionCount: effectiveRoundQuestionCount,
    ...(scope === "usa"
      ? { lastRegionFilter: draft.continents as UsRegion[] }
      : {
          lastContinentFilter: draft.continents as Continent[],
          includeTerritories: draft.mode === "globe-hunt" ? false : draft.includeTerritories,
        }),
  };
}

/** Last setup-screen mode used for the home Play button (excludes daily and legacy modes). */
export function getMainPlayMode(profile: Profile): GameMode {
  const lastSelected = profile.settings.lastSelectedMode ?? DEFAULT_SELECTED_MODE;
  if (isValidSetupMode(lastSelected)) {
    return lastSelected;
  }

  const fromRecent = profile.settings.recentModes?.find((mode) => isValidSetupMode(mode));
  if (fromRecent) {
    return fromRecent;
  }

  return DEFAULT_SELECTED_MODE;
}

/** @deprecated Use resolvePlayConfig instead. */
export function resolvePlayMode(
  profile: Profile,
  scope: GameScope,
): { mode: GameMode; fallbackMessage?: string } {
  const resolved = resolvePlayConfig(profile, getMainPlayMode(profile), scope);
  return { mode: resolved.mode, fallbackMessage: resolved.fallbackMessage };
}

export function getRoundCountLabel(
  mode: GameMode,
  roundQuestionCount: RoundQuestionSetting,
  challengeModifier: ChallengeModifier = "none",
): string {
  if (mode === "daily-challenge") return "10 questions";
  if (challengeModifier === "speed-round") return "60 seconds";
  if (challengeModifier === "marathon") return "Until miss";
  if (roundQuestionCount === ROUND_ALL_QUESTIONS) return "All questions";
  return `${roundQuestionCount} questions`;
}

export function getChallengeModifierLabel(challengeModifier: ChallengeModifier): string | null {
  switch (challengeModifier) {
    case "none":
      return null;
    case "speed-round":
      return "⚡ Speed Round";
    case "marathon":
      return "🏃 Marathon";
    default: {
      const _exhaustive: never = challengeModifier;
      return _exhaustive;
    }
  }
}

export type SettingSummary = {
  /** Bold current value, e.g. "Normal" or "20 questions". */
  value: string;
  /** What that choice means in play, shown in smaller text beneath. */
  detail: string;
};

export function getDifficultySummary(mode: GameMode, difficulty: Difficulty): SettingSummary {
  return {
    value: DIFFICULTY_LABELS[difficulty],
    detail: getDifficultyHint(mode, difficulty).replace(/^ - /, ""),
  };
}

export function getRoundLengthSummary(
  mode: GameMode,
  roundQuestionCount: RoundQuestionSetting,
  challengeModifier: ChallengeModifier,
  poolSize: number,
): SettingSummary {
  if (challengeModifier === "speed-round") {
    return { value: "⚡ Speed Round", detail: "60 seconds — as many as you can" };
  }
  if (challengeModifier === "marathon") {
    return { value: "🏃 Marathon", detail: "Keep going until your first mistake" };
  }

  const effective = clampRoundQuestionSetting(roundQuestionCount, poolSize);
  if (effective === ROUND_ALL_QUESTIONS) {
    return { value: "Every question", detail: `All ${poolSize} in your selection` };
  }
  return { value: `${effective} questions`, detail: `Picked from a pool of ${poolSize}` };
}

export function getPlacesSummary(
  continents: Region[],
  includeTerritories: boolean,
  scope: GameScope,
  poolSize: number,
): SettingSummary {
  const scopeInfo = SCOPE_INFO[scope];
  return {
    value: getRegionSelectionLabel(continents, includeTerritories, scope),
    detail: `${poolSize} ${poolSize === 1 ? scopeInfo.noun : scopeInfo.nounPlural} in play`,
  };
}

export function getActiveGameSummaryParts(
  profile: Profile,
  mode: GameMode,
  scope: GameScope,
): string[] {
  const modeInfo = getScopedModeInfo(mode, scope);
  const settings = profile.settings;
  const challengeModifier = settings.challengeModifier ?? "none";
  const parts: string[] = [];

  if (modeInfo) {
    parts.push(`${modeInfo.icon} ${scopeText(modeInfo.title, scope)}`);
  }

  const modifierLabel = getChallengeModifierLabel(challengeModifier);
  if (modifierLabel) {
    parts.push(modifierLabel);
  }

  if (mode !== "daily-challenge") {
    parts.push(DIFFICULTY_LABELS[settings.difficulty]);
  }

  parts.push(getRoundCountLabel(mode, settings.roundQuestionCount, challengeModifier));

  return parts;
}

export function getStatsMode(mode: GameMode, challengeModifier: ChallengeModifier): GameMode {
  if (isChallengeModifierActive(challengeModifier)) {
    return challengeModifier;
  }
  return mode;
}

export function isLegacyChallengeMode(mode: GameMode): boolean {
  return LEGACY_CHALLENGE_MODES.includes(mode);
}
