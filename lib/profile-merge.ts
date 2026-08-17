import {
  createEmptyGlobalStreaksByDifficulty,
  createEmptyModeStatsByDifficulty,
  emptyModeStats,
} from "@/lib/stats-helpers";
import type {
  Difficulty,
  GameScope,
  GlobalStreaksByDifficulty,
  MapProgressCategory,
  ModeStats,
  ModeStatsByScope,
  PlaceMapProgressByDifficulty,
  Profile,
  ScopedByGameScope,
} from "@/lib/types";
import {
  DIFFICULTIES,
  GAME_MODES,
  GAME_SCOPES,
  MAP_PROGRESS_CATEGORIES,
  MAP_PROGRESS_DIFFICULTIES,
} from "@/lib/types";

function maxNumber(a: number | undefined, b: number | undefined) {
  return Math.max(a ?? 0, b ?? 0);
}

function unionStrings(preferred: string[] | undefined, other: string[] | undefined) {
  return [...new Set([...(preferred ?? []), ...(other ?? [])])];
}

function laterDateKey(a: string | undefined, b: string | undefined) {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

function mergeModeStats(preferred: ModeStats, other: ModeStats | undefined): ModeStats {
  if (!other) {
    return {
      ...preferred,
      missedCountries: [...preferred.missedCountries],
    };
  }

  const totalPlayed = maxNumber(preferred.totalPlayed, other.totalPlayed);
  const totalCorrect = maxNumber(preferred.totalCorrect, other.totalCorrect);
  const currentStreak =
    (preferred.totalPlayed ?? 0) === (other.totalPlayed ?? 0)
      ? maxNumber(preferred.currentStreak, other.currentStreak)
      : (preferred.totalPlayed ?? 0) > (other.totalPlayed ?? 0)
        ? preferred.currentStreak
        : other.currentStreak;

  return {
    currentStreak,
    bestStreak: maxNumber(preferred.bestStreak, other.bestStreak),
    totalCorrect: Math.min(totalCorrect, totalPlayed),
    bestGameCorrect: maxNumber(preferred.bestGameCorrect, other.bestGameCorrect),
    totalPlayed,
    missedCountries: unionStrings(preferred.missedCountries, other.missedCountries),
  };
}

function mergeModeStatsByScope(
  preferred: ModeStatsByScope,
  other: ModeStatsByScope | undefined,
): ModeStatsByScope {
  const merged = {} as ModeStatsByScope;
  for (const mode of GAME_MODES) {
    const preferredMode = preferred[mode.id] ?? createEmptyModeStatsByDifficulty();
    const otherMode = other?.[mode.id];
    merged[mode.id] = {
      easy: mergeModeStats(preferredMode.easy ?? emptyModeStats(), otherMode?.easy),
      medium: mergeModeStats(preferredMode.medium ?? emptyModeStats(), otherMode?.medium),
      hard: mergeModeStats(preferredMode.hard ?? emptyModeStats(), otherMode?.hard),
    };
  }
  return merged;
}

function totalPlayedForDifficulty(
  stats: ScopedByGameScope<ModeStatsByScope> | undefined,
  scope: GameScope,
  difficulty: Difficulty,
) {
  if (!stats?.[scope]) return 0;
  return GAME_MODES.reduce(
    (sum, mode) => sum + (stats[scope][mode.id]?.[difficulty]?.totalPlayed ?? 0),
    0,
  );
}

function mergeGlobalStreaks(
  preferred: Profile["globalStreaks"],
  other: Profile["globalStreaks"] | undefined,
  preferredStats: Profile["stats"],
  otherStats: Profile["stats"] | undefined,
): Profile["globalStreaks"] {
  const merged = {} as Profile["globalStreaks"];
  for (const scope of GAME_SCOPES) {
    const preferredScope = preferred[scope] ?? createEmptyGlobalStreaksByDifficulty();
    const otherScope = other?.[scope];
    const next = {} as GlobalStreaksByDifficulty;
    for (const difficulty of DIFFICULTIES) {
      const preferredStreak = preferredScope[difficulty];
      const otherStreak = otherScope?.[difficulty];
      const preferredPlays = totalPlayedForDifficulty(preferredStats, scope, difficulty);
      const otherPlays = totalPlayedForDifficulty(otherStats, scope, difficulty);
      const currentStreak = !otherStreak
        ? preferredStreak.currentStreak
        : preferredPlays === otherPlays
          ? maxNumber(preferredStreak.currentStreak, otherStreak.currentStreak)
          : preferredPlays > otherPlays
            ? preferredStreak.currentStreak
            : otherStreak.currentStreak;
      next[difficulty] = {
        currentStreak,
        bestStreak: maxNumber(preferredStreak.bestStreak, otherStreak?.bestStreak),
      };
    }
    merged[scope] = next;
  }
  return merged;
}

function mergePlaceCategoryFlags(
  preferred: Partial<Record<MapProgressCategory, true>> | undefined,
  other: Partial<Record<MapProgressCategory, true>> | undefined,
) {
  const merged: Partial<Record<MapProgressCategory, true>> = {};
  for (const category of MAP_PROGRESS_CATEGORIES) {
    if (preferred?.[category] || other?.[category]) {
      merged[category] = true;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergePlaceMapProgress(
  preferred: Profile["placeMapProgress"],
  other: Profile["placeMapProgress"],
): Profile["placeMapProgress"] {
  const codes = new Set([
    ...Object.keys(preferred ?? {}),
    ...Object.keys(other ?? {}),
  ]);
  if (codes.size === 0) return preferred;

  const merged: Record<string, PlaceMapProgressByDifficulty> = {};
  for (const code of codes) {
    const next: PlaceMapProgressByDifficulty = {};
    for (const difficulty of MAP_PROGRESS_DIFFICULTIES) {
      const flags = mergePlaceCategoryFlags(
        preferred?.[code]?.[difficulty],
        other?.[code]?.[difficulty],
      );
      if (flags) next[difficulty] = flags;
    }
    if (Object.keys(next).length > 0) merged[code] = next;
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeCountryProgress(
  preferred: Profile["countryProgress"],
  other: Profile["countryProgress"],
): Profile["countryProgress"] {
  const codes = new Set([
    ...Object.keys(preferred ?? {}),
    ...Object.keys(other ?? {}),
  ]);
  if (codes.size === 0) return preferred;

  const merged: NonNullable<Profile["countryProgress"]> = {};
  for (const code of codes) {
    const total = maxNumber(preferred?.[code]?.total, other?.[code]?.total);
    const correct = Math.min(total, maxNumber(preferred?.[code]?.correct, other?.[code]?.correct));
    merged[code] = { correct, total };
  }
  return merged;
}

function mergeActivityByDate(
  preferred: Profile["activityByDate"],
  other: Profile["activityByDate"],
): Profile["activityByDate"] {
  const keys = new Set([
    ...Object.keys(preferred ?? {}),
    ...Object.keys(other ?? {}),
  ]);
  if (keys.size === 0) return preferred;

  const merged: Record<string, number> = {};
  for (const dateKey of keys) {
    merged[dateKey] = maxNumber(preferred?.[dateKey], other?.[dateKey]);
  }
  return merged;
}

function mergeLoginStreak(
  preferred: Profile["loginStreak"],
  other: Profile["loginStreak"],
): Profile["loginStreak"] {
  if (!other) return preferred;
  if (!preferred) return other;
  if (preferred.lastDateKey !== other.lastDateKey) {
    return preferred.lastDateKey >= other.lastDateKey ? preferred : other;
  }
  return {
    lastDateKey: preferred.lastDateKey,
    length: maxNumber(preferred.length, other.length),
  };
}

function mergeTodayBestStreaks(
  preferred: Profile["todayBestStreaks"],
  other: Profile["todayBestStreaks"],
): Profile["todayBestStreaks"] {
  if (!preferred && !other) return preferred;
  const merged: NonNullable<Profile["todayBestStreaks"]> = {};
  for (const scope of GAME_SCOPES) {
    const preferredScope = preferred?.[scope];
    const otherScope = other?.[scope];
    if (!preferredScope && !otherScope) continue;
    const next: Partial<Record<Difficulty, { dateKey: string; value: number }>> = {};
    for (const difficulty of DIFFICULTIES) {
      const preferredEntry = preferredScope?.[difficulty];
      const otherEntry = otherScope?.[difficulty];
      if (!preferredEntry) {
        if (otherEntry) next[difficulty] = otherEntry;
        continue;
      }
      if (!otherEntry) {
        next[difficulty] = preferredEntry;
        continue;
      }
      if (preferredEntry.dateKey === otherEntry.dateKey) {
        next[difficulty] = {
          dateKey: preferredEntry.dateKey,
          value: maxNumber(preferredEntry.value, otherEntry.value),
        };
        continue;
      }
      next[difficulty] =
        preferredEntry.dateKey >= otherEntry.dateKey ? preferredEntry : otherEntry;
    }
    merged[scope] = next;
  }
  return merged;
}

function mergeCommonlyMissed(
  preferred: Profile["commonlyMissedCountries"],
  other: Profile["commonlyMissedCountries"],
): Profile["commonlyMissedCountries"] {
  if (!preferred && !other) return preferred;
  const merged: NonNullable<Profile["commonlyMissedCountries"]> = {};
  for (const scope of GAME_SCOPES) {
    const codes = unionStrings(preferred?.[scope], other?.[scope]);
    if (codes.length) merged[scope] = codes;
  }
  return Object.keys(merged).length > 0 ? merged : preferred;
}

function mergeDailyChallengeResults(
  preferred: Profile["dailyChallengeResults"],
  other: Profile["dailyChallengeResults"],
): Profile["dailyChallengeResults"] {
  if (!other) return preferred;
  if (!preferred) return other;
  return { ...other, ...preferred };
}

/**
 * Union monotonic progress from two copies of the same profile.
 * Identity and settings stay on `preferred` so a device does not import the
 * other device's sound / last-mode choices.
 */
export function mergeProfileProgress(preferred: Profile, other: Profile | undefined): Profile {
  if (!other) return structuredClone(preferred);

  const merged = structuredClone(preferred);
  merged.stats = {
    world: mergeModeStatsByScope(preferred.stats.world, other.stats?.world),
    usa: mergeModeStatsByScope(preferred.stats.usa, other.stats?.usa),
  };
  merged.globalStreaks = mergeGlobalStreaks(
    preferred.globalStreaks,
    other.globalStreaks,
    preferred.stats,
    other.stats,
  );
  merged.placeMapProgress = mergePlaceMapProgress(preferred.placeMapProgress, other.placeMapProgress);
  merged.countryProgress = mergeCountryProgress(preferred.countryProgress, other.countryProgress);
  merged.achievements = unionStrings(preferred.achievements, other.achievements);
  merged.activityByDate = mergeActivityByDate(preferred.activityByDate, other.activityByDate);
  merged.loginStreak = mergeLoginStreak(preferred.loginStreak, other.loginStreak);
  merged.loginDates = unionStrings(preferred.loginDates, other.loginDates).sort();
  merged.dailyChallengePlayedDates = unionStrings(
    preferred.dailyChallengePlayedDates,
    other.dailyChallengePlayedDates,
  );
  merged.dailyChallengeCompletions = unionStrings(
    preferred.dailyChallengeCompletions,
    other.dailyChallengeCompletions,
  );
  merged.dailyChallengeResults = mergeDailyChallengeResults(
    preferred.dailyChallengeResults,
    other.dailyChallengeResults,
  );
  merged.todayBestStreaks = mergeTodayBestStreaks(preferred.todayBestStreaks, other.todayBestStreaks);
  merged.commonlyMissedCountries = mergeCommonlyMissed(
    preferred.commonlyMissedCountries,
    other.commonlyMissedCountries,
  );
  return merged;
}

export function mergeProfileLists(preferred: Profile[], other: Profile[]): Profile[] {
  const otherById = new Map(other.map((profile) => [profile.id, profile]));
  const seen = new Set<string>();
  const merged: Profile[] = [];

  for (const profile of preferred) {
    seen.add(profile.id);
    merged.push(mergeProfileProgress(profile, otherById.get(profile.id)));
  }
  for (const profile of other) {
    if (seen.has(profile.id)) continue;
    merged.push(structuredClone(profile));
  }
  return merged;
}

export function progressFingerprint(profile: Profile) {
  return JSON.stringify({
    stats: profile.stats,
    globalStreaks: profile.globalStreaks,
    placeMapProgress: profile.placeMapProgress ?? {},
    countryProgress: profile.countryProgress ?? {},
    achievements: [...profile.achievements].sort(),
    activityByDate: profile.activityByDate ?? {},
    loginStreak: profile.loginStreak ?? null,
    loginDates: [...(profile.loginDates ?? [])].sort(),
    dailyChallengePlayedDates: [...(profile.dailyChallengePlayedDates ?? [])].sort(),
    dailyChallengeCompletions: [...(profile.dailyChallengeCompletions ?? [])].sort(),
    dailyChallengeResults: profile.dailyChallengeResults ?? {},
    todayBestStreaks: profile.todayBestStreaks ?? {},
    commonlyMissedCountries: profile.commonlyMissedCountries ?? {},
  });
}

export function cloudProfilesNeedSave(merged: Profile[], cloud: Profile[]) {
  if (merged.length !== cloud.length) return true;
  const cloudById = new Map(cloud.map((profile) => [profile.id, profile]));
  return merged.some((profile) => {
    const remote = cloudById.get(profile.id);
    return !remote || progressFingerprint(profile) !== progressFingerprint(remote);
  });
}
