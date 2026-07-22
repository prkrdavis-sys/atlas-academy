import { filterCountries, getRegionsForScope } from "@/lib/countries";
import {
  getCountryCodeByMapPathId,
  getStateCodeByUsaMapPathId,
} from "@/lib/context-maps";
import type { MapPathStyle } from "@/lib/map-colors";
import { getProgressPathStyle } from "@/lib/map-colors";
import type {
  GameMode,
  GameScope,
  MapProgressCategory,
  MapProgressDifficulty,
  PlaceMasteryLevel,
  Profile,
  Question,
  Region,
} from "@/lib/types";
import { MAP_PROGRESS_CATEGORIES } from "@/lib/types";

/** Both flag quiz modes share one map-progress category. */
export const FLAG_MAP_PROGRESS_MODES = ["flag-to-country", "country-to-flag"] as const satisfies readonly GameMode[];

export const MAP_PROGRESS_CATEGORY_INFO: Record<
  MapProgressCategory,
  { label: string; icon: string; modes?: readonly GameMode[] }
> = {
  flag: {
    label: "Flag",
    icon: "🏳️",
    modes: FLAG_MAP_PROGRESS_MODES,
  },
  shape: { label: "Shape", icon: "🗺️" },
  capital: { label: "Capital", icon: "📍" },
  trivia: { label: "Trivia", icon: "💡" },
};

function resolveMapProgressCategoryFromGameMode(mode: GameMode): MapProgressCategory | null {
  if ((FLAG_MAP_PROGRESS_MODES as readonly GameMode[]).includes(mode)) {
    return "flag";
  }

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

export function resolveMapProgressCategory(
  question: Question,
  statsMode?: GameMode,
): MapProgressCategory | null {
  const fromQuestion = resolveMapProgressCategoryFromGameMode(question.mode);
  if (fromQuestion) return fromQuestion;

  switch (question.displayType) {
    case "flag":
    case "flags-grid":
      return "flag";
    case "shape":
      return "shape";
    case "capital":
      return "capital";
    default:
      break;
  }

  if (statsMode) {
    return resolveMapProgressCategoryFromGameMode(statsMode);
  }

  return null;
}

export function getPlaceMasteryLevel(
  code: string,
  profile: Profile,
  difficulty: MapProgressDifficulty,
): PlaceMasteryLevel {
  const progress = profile.placeMapProgress?.[code]?.[difficulty];
  if (!progress) return 0;

  let count = 0;
  for (const category of MAP_PROGRESS_CATEGORIES) {
    if (progress[category]) count += 1;
  }

  return Math.min(count, 4) as PlaceMasteryLevel;
}

export function isPlaceFullyMastered(
  code: string,
  profile: Profile,
  difficulty: MapProgressDifficulty,
): boolean {
  return getPlaceMasteryLevel(code, profile, difficulty) === 4;
}

export function getPlayablePlacesForScope(scope: GameScope) {
  return filterCountries({
    scope,
    continents: [...getRegionsForScope(scope)],
  });
}

export function getRegionMapProgress(
  scope: GameScope,
  region: Region,
  profile: Profile,
  difficulty: MapProgressDifficulty,
): { mastered: number; total: number } {
  const places = filterCountries({ scope, continents: [region] });
  let mastered = 0;
  for (const place of places) {
    if (isPlaceFullyMastered(place.code, profile, difficulty)) {
      mastered += 1;
    }
  }
  return { mastered, total: places.length };
}

export function getOverallMapProgress(
  scope: GameScope,
  profile: Profile,
  difficulty: MapProgressDifficulty,
): { mastered: number; total: number } {
  const places = getPlayablePlacesForScope(scope);
  let mastered = 0;
  for (const place of places) {
    if (isPlaceFullyMastered(place.code, profile, difficulty)) {
      mastered += 1;
    }
  }
  return { mastered, total: places.length };
}

export function buildProgressFillMap(
  profile: Profile,
  difficulty: MapProgressDifficulty,
  pathIds: readonly string[],
  resolveCode: (pathId: string) => string | undefined,
): Map<string, PlaceMasteryLevel> {
  const result = new Map<string, PlaceMasteryLevel>();
  for (const pathId of pathIds) {
    const code = resolveCode(pathId);
    result.set(pathId, code ? getPlaceMasteryLevel(code, profile, difficulty) : 0);
  }
  return result;
}

export function buildWorldProgressFillMap(
  profile: Profile,
  difficulty: MapProgressDifficulty,
  pathIds: readonly string[],
): Map<string, PlaceMasteryLevel> {
  return buildProgressFillMap(profile, difficulty, pathIds, getCountryCodeByMapPathId);
}

export function buildUsaProgressFillMap(
  profile: Profile,
  difficulty: MapProgressDifficulty,
  pathIds: readonly string[],
): Map<string, PlaceMasteryLevel> {
  return buildProgressFillMap(profile, difficulty, pathIds, getStateCodeByUsaMapPathId);
}

export function createProgressPathStyleResolver(
  fillMap: Map<string, PlaceMasteryLevel>,
  isDark: boolean,
  regionCodes?: Set<string>,
  resolveCode?: (pathId: string) => string | undefined,
): (pathId: string) => MapPathStyle | null {
  return (pathId: string) => {
    if (regionCodes && resolveCode) {
      const code = resolveCode(pathId);
      if (!code || !regionCodes.has(code)) {
        return null;
      }
    }
    const level = fillMap.get(pathId) ?? 0;
    return getProgressPathStyle(level, isDark);
  };
}

export function recordPlaceMapProgress(
  profile: Profile,
  countryCode: string,
  difficulty: MapProgressDifficulty,
  category: MapProgressCategory,
): void {
  if (!profile.placeMapProgress) profile.placeMapProgress = {};
  if (!profile.placeMapProgress[countryCode]) profile.placeMapProgress[countryCode] = {};
  if (!profile.placeMapProgress[countryCode]![difficulty]) {
    profile.placeMapProgress[countryCode]![difficulty] = {};
  }
  profile.placeMapProgress[countryCode]![difficulty]![category] = true;
}
