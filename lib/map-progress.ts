import { filterCountries, getRegionsForScope } from "@/lib/countries";
import {
  getCountryCodeByMapPathId,
  getStateCodeByUsaMapPathId,
} from "@/lib/context-maps";
import type { MapPathStyle } from "@/lib/map-colors";
import { getProgressPathStyle } from "@/lib/map-colors";
import type {
  Difficulty,
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

/** Flag quiz modes share one map-progress category. */
export const FLAG_MAP_PROGRESS_MODES = [
  "flag-to-country",
  "flag-crop-to-country",
  "country-to-flag",
  "inverted-flag-to-country",
  "inverted-country-to-flag",
] as const satisfies readonly GameMode[];

export const MAP_PROGRESS_CATEGORY_INFO: Record<
  MapProgressCategory,
  { label: string; icon: string; modes: readonly GameMode[] }
> = {
  flag: {
    label: "Flag",
    icon: "🏳️",
    modes: FLAG_MAP_PROGRESS_MODES,
  },
  shape: {
    label: "Shape",
    icon: "🗺️",
    modes: ["shape-to-country"],
  },
  capital: {
    label: "Capital",
    icon: "📍",
    modes: ["capital-to-country", "country-to-capital"],
  },
  trivia: {
    label: "Trivia",
    icon: "💡",
    modes: ["fact-to-country", "country-to-language"],
  },
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
    case "country-to-language":
      return "trivia";
    default:
      return null;
  }
}

export function toMapProgressDifficulty(
  difficulty: Difficulty,
): MapProgressDifficulty | null {
  return difficulty === "medium" || difficulty === "hard" ? difficulty : null;
}

export function wouldCountTowardMapProgress({
  question,
  statsMode,
  difficulty,
  correct,
  skipped = false,
  isPracticeMode = false,
}: {
  question: Question;
  statsMode: GameMode;
  difficulty: Difficulty;
  correct: boolean;
  skipped?: boolean;
  isPracticeMode?: boolean;
}): boolean {
  if (!correct || skipped || isPracticeMode) return false;
  if (!toMapProgressDifficulty(difficulty)) return false;
  return resolveMapProgressCategory(question, statsMode) !== null;
}

export function resolveMapProgressCategory(
  question: Question,
  statsMode?: GameMode,
): MapProgressCategory | null {
  const fromQuestion = resolveMapProgressCategoryFromGameMode(question.mode);
  if (fromQuestion) return fromQuestion;

  switch (question.displayType) {
    case "flag":
    case "flag-crop":
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

export function getPlaceCategoryCompletion(
  code: string,
  profile: Profile,
  difficulty: MapProgressDifficulty,
): Record<MapProgressCategory, boolean> {
  const progress = profile.placeMapProgress?.[code]?.[difficulty];
  return {
    flag: Boolean(progress?.flag),
    shape: Boolean(progress?.shape),
    capital: Boolean(progress?.capital),
    trivia: Boolean(progress?.trivia),
  };
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

export type RegionMapProgress = {
  region: Region;
  mastered: number;
  total: number;
  completedCategories: number;
  totalCategories: number;
  percentComplete: number;
};

export type CategoryMapProgress = {
  category: MapProgressCategory;
  completed: number;
  total: number;
  percentComplete: number;
};

function summarizePlacesProgress(
  places: ReturnType<typeof getPlayablePlacesForScope>,
  profile: Profile,
  difficulty: MapProgressDifficulty,
): MapProgressSummary {
  const totalPlaces = places.length;
  const totalCategories = totalPlaces * MAP_PROGRESS_CATEGORIES.length;
  let completedCategories = 0;
  let masteredPlaces = 0;

  for (const place of places) {
    const level = getPlaceMasteryLevel(place.code, profile, difficulty);
    completedCategories += level;
    if (level === 4) masteredPlaces += 1;
  }

  return {
    completedCategories,
    totalCategories,
    masteredPlaces,
    totalPlaces,
    percentComplete:
      totalCategories > 0 ? Math.round((completedCategories / totalCategories) * 100) : 0,
  };
}

export function getRegionMapProgress(
  scope: GameScope,
  region: Region,
  profile: Profile,
  difficulty: MapProgressDifficulty,
): { mastered: number; total: number } {
  const summary = getRegionMapProgressSummary(scope, region, profile, difficulty);
  return { mastered: summary.mastered, total: summary.total };
}

export function getRegionMapProgressSummary(
  scope: GameScope,
  region: Region,
  profile: Profile,
  difficulty: MapProgressDifficulty,
): RegionMapProgress {
  const places = filterCountries({ scope, continents: [region] });
  const summary = summarizePlacesProgress(places, profile, difficulty);
  return {
    region,
    mastered: summary.masteredPlaces,
    total: summary.totalPlaces,
    completedCategories: summary.completedCategories,
    totalCategories: summary.totalCategories,
    percentComplete: summary.percentComplete,
  };
}

export function getRegionsMapProgress(
  scope: GameScope,
  profile: Profile,
  difficulty: MapProgressDifficulty,
): RegionMapProgress[] {
  return getRegionsForScope(scope)
    .map((region) => getRegionMapProgressSummary(scope, region, profile, difficulty))
    .filter((entry) => entry.total > 0);
}

export function getCategoryMapProgress(
  scope: GameScope,
  profile: Profile,
  difficulty: MapProgressDifficulty,
): CategoryMapProgress[] {
  const places = getPlayablePlacesForScope(scope);
  const total = places.length;

  return MAP_PROGRESS_CATEGORIES.map((category) => {
    let completed = 0;
    for (const place of places) {
      if (getPlaceCategoryCompletion(place.code, profile, difficulty)[category]) {
        completed += 1;
      }
    }
    return {
      category,
      completed,
      total,
      percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });
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

export type MapProgressSummary = {
  completedCategories: number;
  totalCategories: number;
  masteredPlaces: number;
  totalPlaces: number;
  percentComplete: number;
};

export type MapProgressDelta = {
  completedCategories: number;
  masteredPlaces: number;
  percentComplete: number;
};

export function getMapProgressDelta(
  before: MapProgressSummary,
  after: MapProgressSummary,
): MapProgressDelta {
  return {
    completedCategories: after.completedCategories - before.completedCategories,
    masteredPlaces: after.masteredPlaces - before.masteredPlaces,
    percentComplete: after.percentComplete - before.percentComplete,
  };
}

export function getMapProgressSummary(
  scope: GameScope,
  profile: Profile,
  difficulty: MapProgressDifficulty,
  continents?: readonly Region[],
): MapProgressSummary {
  const selected =
    continents && continents.length > 0 ? continents : getRegionsForScope(scope);
  return summarizePlacesProgress(
    filterCountries({ scope, continents: [...selected] }),
    profile,
    difficulty,
  );
}

/** Short label for what a progress percentage covers (e.g. "Europe", "World"). */
export function formatMapProgressAreaLabel(
  scope: GameScope,
  continents: readonly Region[],
): string {
  const allRegions = getRegionsForScope(scope);
  const selected =
    continents.length > 0 ? continents : allRegions;
  const isFullScope =
    selected.length >= allRegions.length && allRegions.every((region) => selected.includes(region));

  if (isFullScope) {
    return scope === "world" ? "World" : "USA";
  }
  return selected.join(" · ");
}

export function isFullMapProgressSelection(
  scope: GameScope,
  continents: readonly Region[],
): boolean {
  const allRegions = getRegionsForScope(scope);
  const selected = continents.length > 0 ? continents : allRegions;
  return (
    selected.length >= allRegions.length && allRegions.every((region) => selected.includes(region))
  );
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
  difficulty: MapProgressDifficulty = "medium",
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
    return getProgressPathStyle(level, isDark, difficulty);
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
