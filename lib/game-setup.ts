import { getPlayablePoolSize } from "@/lib/countries";
import { getScopedModeInfo, scopeText } from "@/lib/scope";
import { getCommonlyMissedCountries } from "@/lib/stats-helpers";
import type { GameScope } from "@/lib/types";
import {
  CONTINENTS,
  DEFAULT_SELECTED_MODE,
  DIFFICULTY_LABELS,
  GAME_MODES,
  ROUND_ALL_QUESTIONS,
  SPEED_ROUND_ALL_TYPES,
  US_REGIONS,
  clampRoundQuestionSetting,
  normalizeRoundQuestionSetting,
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
  continents: Region[];
  includeTerritories: boolean;
  difficulty: Difficulty;
  questionType: SpeedRoundQuestionType;
  roundQuestionCount: RoundQuestionSetting;
};

export function isValidGameMode(value: string | null | undefined): value is GameMode {
  return GAME_MODES.some((mode) => mode.id === value);
}

export function createSetupDraftFromProfile(
  profile: Profile,
  mode: GameMode,
  scope: GameScope,
): GameSetupDraft {
  const isUsa = scope === "usa";
  return {
    mode,
    continents: isUsa
      ? profile.settings.lastRegionFilter ?? [...US_REGIONS]
      : profile.settings.lastContinentFilter ?? [...CONTINENTS],
    includeTerritories: profile.settings.includeTerritories ?? false,
    difficulty: profile.settings.difficulty ?? "easy",
    questionType:
      mode === "marathon"
        ? profile.settings.marathonQuestionType ?? "flag-to-country"
        : mode === "speed-round"
          ? profile.settings.speedRoundQuestionType ?? "flag-to-country"
          : "flag-to-country",
    roundQuestionCount: normalizeRoundQuestionSetting(profile.settings.roundQuestionCount),
  };
}

export function getQuestionTypeForMode(
  profile: Profile,
  mode: GameMode,
): SpeedRoundQuestionType {
  if (mode === "marathon") {
    return profile.settings.marathonQuestionType ?? "flag-to-country";
  }
  if (mode === "speed-round") {
    return profile.settings.speedRoundQuestionType ?? "flag-to-country";
  }
  return "flag-to-country";
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
    questionType:
      draft.mode === "speed-round" || draft.mode === "marathon"
        ? draft.questionType
        : undefined,
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
    difficulty: draft.difficulty,
    roundQuestionCount: effectiveRoundQuestionCount,
    ...(scope === "usa"
      ? { lastRegionFilter: draft.continents as UsRegion[] }
      : {
          lastContinentFilter: draft.continents as Continent[],
          includeTerritories: draft.includeTerritories,
        }),
    ...(draft.mode === "speed-round"
      ? { speedRoundQuestionType: draft.questionType }
      : {}),
    ...(draft.mode === "marathon" ? { marathonQuestionType: draft.questionType } : {}),
  };
}

export function resolvePlayMode(
  profile: Profile,
  scope: GameScope,
): { mode: GameMode; fallbackMessage?: string } {
  const mode = profile.settings.lastSelectedMode ?? DEFAULT_SELECTED_MODE;

  if (mode === "weak-spots") {
    const weakSpotCodes = getCommonlyMissedCountries(profile, scope);
    if (!weakSpotCodes.length) {
      return {
        mode: DEFAULT_SELECTED_MODE,
        fallbackMessage: "No weak spots yet — starting Mixed",
      };
    }
  }

  return { mode };
}

export function getQuestionTypeLabel(
  questionType: SpeedRoundQuestionType,
  scope: GameScope,
): string {
  if (questionType === SPEED_ROUND_ALL_TYPES) return "Mixed types";
  const info = getScopedModeInfo(questionType, scope);
  return info?.title ?? questionType;
}

export function getRoundCountLabel(
  mode: GameMode,
  roundQuestionCount: RoundQuestionSetting,
): string {
  if (mode === "daily-challenge") return "10 questions";
  if (mode === "speed-round") return "60 seconds";
  if (mode === "marathon") return "Until miss";
  if (roundQuestionCount === ROUND_ALL_QUESTIONS) return "All questions";
  return `${roundQuestionCount} questions`;
}

export function getActiveGameSummaryParts(
  profile: Profile,
  mode: GameMode,
  scope: GameScope,
): string[] {
  const modeInfo = getScopedModeInfo(mode, scope);
  const settings = profile.settings;
  const parts: string[] = [];

  if (modeInfo) {
    parts.push(`${modeInfo.icon} ${scopeText(modeInfo.title, scope)}`);
  }

  if (mode !== "daily-challenge") {
    parts.push(DIFFICULTY_LABELS[settings.difficulty]);
  }

  parts.push(getRoundCountLabel(mode, settings.roundQuestionCount));

  if (mode === "speed-round" || mode === "marathon") {
    const questionType = getQuestionTypeForMode(profile, mode);
    parts.push(getQuestionTypeLabel(questionType, scope));
  }

  return parts;
}
