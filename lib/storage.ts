import type {
  Continent,
  Difficulty,
  GameMode,
  GameScope,
  Profile,
  AchievementSessionContext,
  Question,
  SpeedRoundQuestionType,
} from "@/lib/types";
import {
  recordPlaceMapProgress,
  resolveMapProgressCategory,
  toMapProgressDifficulty,
  wouldCountTowardMapProgress,
} from "@/lib/map-progress";
import {
  AVATAR_COLORS,
  DEFAULT_ROUND_QUESTION_COUNT,
  DIFFICULTIES,
  GAME_MODES,
  SPEED_ROUND_ALL_TYPES,
  US_REGIONS,
  normalizeRoundQuestionSetting,
} from "@/lib/types";
import { checkAchievements as evaluateAchievements, reconcileAchievements } from "@/lib/achievements";
import { getDailyDateKey } from "@/lib/game-engine";
import { scopedDailyKey } from "@/lib/scope";
import {
  createEmptyGlobalStreaksByDifficulty,
  createEmptyModeStatsByDifficulty,
  createEmptyModeStatsByScope,
  createEmptyScopedGlobalStreaks,
  createEmptyScopedStats,
  emptyModeStats,
  isLegacyFlatModeStats,
  isLegacyUnscopedGlobalStreaks,
  isLegacyUnscopedStats,
  migrateCommonlyMissedCountries,
} from "@/lib/stats-helpers";

const STORAGE_KEY = "atlas-academy";
const LEGACY_STORAGE_KEY = "geography-game";

type LegacyProfileSettings = Omit<Profile["settings"], "includeTerritories"> & {
  includeTerritories?: boolean;
  lastTerritoryFilter?: Continent[];
};

type LegacyProfile = Omit<Profile, "settings"> & {
  settings: LegacyProfileSettings;
  globalCurrentStreak?: number;
  globalBestStreak?: number;
};

function createEmptyStats(): ReturnType<typeof createEmptyScopedStats> {
  return createEmptyScopedStats();
}

function createEmptyGlobalStreaks(): Profile["globalStreaks"] {
  return createEmptyScopedGlobalStreaks();
}

function questionTypeToBaseMode(questionType: SpeedRoundQuestionType): GameMode {
  return questionType === SPEED_ROUND_ALL_TYPES ? "mixed" : questionType;
}

function getDefaultProfileSettings(): Profile["settings"] {
  return {
    difficulty: "easy",
    lastContinentFilter: [
      "Africa",
      "Asia",
      "Europe",
      "North America",
      "Oceania",
      "South America",
    ],
    lastRegionFilter: [...US_REGIONS],
    includeTerritories: false,
    speedRoundQuestionType: "flag-to-country",
    marathonQuestionType: "flag-to-country",
    challengeModifier: "none",
    roundQuestionCount: DEFAULT_ROUND_QUESTION_COUNT,
    lastSelectedMode: "mixed",
    recentModes: ["mixed"],
  };
}

function migrateLegacyStats(profile: LegacyProfile): LegacyProfile {
  if (!profile.stats) {
    profile.stats = createEmptyStats();
  }

  if (isLegacyUnscopedStats(profile.stats)) {
    profile.stats = {
      world: profile.stats,
      usa: createEmptyModeStatsByScope(),
    };
  }

  for (const scope of ["world", "usa"] as const) {
    for (const mode of GAME_MODES) {
      const modeStats = profile.stats[scope][mode.id] as unknown;
      if (isLegacyFlatModeStats(modeStats)) {
        profile.stats[scope][mode.id] = {
          easy: {
            ...modeStats,
            missedCountries: [...modeStats.missedCountries],
          },
          medium: emptyModeStats(),
          hard: emptyModeStats(),
        };
      } else {
        for (const difficulty of DIFFICULTIES) {
          if (!profile.stats[scope][mode.id][difficulty]) {
            profile.stats[scope][mode.id][difficulty] = emptyModeStats();
          }
        }
      }
    }
  }

  if (isLegacyUnscopedGlobalStreaks(profile.globalStreaks)) {
    profile.globalStreaks = {
      world: profile.globalStreaks,
      usa: createEmptyGlobalStreaksByDifficulty(),
    };
  }

  if (!profile.globalStreaks) {
    const legacyCurrent = profile.globalCurrentStreak ?? 0;
    const legacyBest = profile.globalBestStreak ?? 0;
    profile.globalStreaks = {
      world: {
        easy: { currentStreak: legacyCurrent, bestStreak: legacyBest },
        medium: { currentStreak: 0, bestStreak: 0 },
        hard: { currentStreak: 0, bestStreak: 0 },
      },
      usa: createEmptyGlobalStreaksByDifficulty(),
    };
    delete profile.globalCurrentStreak;
    delete profile.globalBestStreak;
  }

  for (const scope of ["world", "usa"] as const) {
    for (const difficulty of DIFFICULTIES) {
      if (!profile.globalStreaks[scope][difficulty]) {
        profile.globalStreaks[scope][difficulty] = { currentStreak: 0, bestStreak: 0 };
      }
    }
  }

  return profile;
}

function normalizeProfiles(rawProfiles: unknown[]): Profile[] {
  const profiles: Profile[] = [];
  for (const raw of rawProfiles) {
    try {
      profiles.push(normalizeProfile(raw as Profile));
    } catch {
      // Skip corrupt entries so one bad profile does not wipe the rest.
    }
  }
  return profiles;
}

export function normalizeProfile(profile: Profile): Profile {
  const normalized = migrateLegacyStats({
    ...(profile as LegacyProfile),
    achievements: profile.achievements ?? [],
    settings: {
      ...getDefaultProfileSettings(),
      ...(profile.settings ?? {}),
    },
  });
  if (!normalized.settings.speedRoundQuestionType) {
    normalized.settings.speedRoundQuestionType = "flag-to-country";
  } else if ((normalized.settings.speedRoundQuestionType as string) === "mixed") {
    normalized.settings.speedRoundQuestionType = "all-types";
  }
  if (!normalized.settings.marathonQuestionType) {
    normalized.settings.marathonQuestionType = "flag-to-country";
  } else if ((normalized.settings.marathonQuestionType as string) === "mixed") {
    normalized.settings.marathonQuestionType = "all-types";
  }
  normalized.settings.roundQuestionCount = normalizeRoundQuestionSetting(normalized.settings.roundQuestionCount);
  if (!normalized.settings.challengeModifier) {
    if (normalized.settings.lastSelectedMode === "speed-round") {
      normalized.settings.challengeModifier = "speed-round";
      normalized.settings.lastSelectedMode = questionTypeToBaseMode(
        normalized.settings.speedRoundQuestionType ?? "flag-to-country",
      );
    } else if (normalized.settings.lastSelectedMode === "marathon") {
      normalized.settings.challengeModifier = "marathon";
      normalized.settings.lastSelectedMode = questionTypeToBaseMode(
        normalized.settings.marathonQuestionType ?? "flag-to-country",
      );
    } else {
      normalized.settings.challengeModifier = "none";
    }
  }
  if (normalized.settings.recentModes?.length) {
    normalized.settings.recentModes = [
      ...new Set(
        normalized.settings.recentModes
          .map((recentMode) => {
            if (recentMode === "speed-round") {
              return questionTypeToBaseMode(
                normalized.settings.speedRoundQuestionType ?? "flag-to-country",
              );
            }
            if (recentMode === "marathon") {
              return questionTypeToBaseMode(
                normalized.settings.marathonQuestionType ?? "flag-to-country",
              );
            }
            return recentMode;
          })
          .filter(
            (recentMode) =>
              recentMode !== "daily-challenge" &&
              recentMode !== "speed-round" &&
              recentMode !== "marathon",
          ),
      ),
    ].slice(0, 4);
  }
  if (!normalized.settings.lastRegionFilter) {
    normalized.settings.lastRegionFilter = [...US_REGIONS];
  }
  const { lastTerritoryFilter, ...settings } = normalized.settings;
  normalized.settings = {
    ...settings,
    // Territory selection is intentionally global now. Preserve whether the
    // player opted into any territories instead of retaining a hidden filter.
    includeTerritories:
      settings.includeTerritories ?? (lastTerritoryFilter?.length ?? 0) > 0,
  };
  if (!normalized.dailyChallengePlayedDates) {
    normalized.dailyChallengePlayedDates = [];
  }
  if (!normalized.dailyChallengeCompletions) {
    normalized.dailyChallengeCompletions = [];
  }
  if (!normalized.todayBestStreaks) {
    normalized.todayBestStreaks = {};
  } else if (!("world" in normalized.todayBestStreaks) && !("usa" in normalized.todayBestStreaks)) {
    const legacyTodayBest = normalized.todayBestStreaks as Partial<
      Record<Difficulty, { dateKey: string; value: number }>
    >;
    normalized.todayBestStreaks = {
      world: legacyTodayBest,
      usa: {},
    };
  }
  for (const scope of ["world", "usa"] as const) {
    for (const mode of GAME_MODES) {
      if (!normalized.stats[scope][mode.id]) {
        normalized.stats[scope][mode.id] = createEmptyModeStatsByDifficulty();
      }
    }
  }
  normalized.achievements = reconcileAchievements(normalized as Profile);
  migrateCommonlyMissedCountries(normalized as Profile);
  if (!normalized.settings.lastSelectedMode) {
    normalized.settings.lastSelectedMode = "mixed";
  }
  if (!normalized.settings.recentModes?.length) {
    normalized.settings.recentModes = [normalized.settings.lastSelectedMode];
  }
  return normalized as Profile;
}

export function createProfile(name: string, avatarColor: string): Profile {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    avatarColor: AVATAR_COLORS.includes(avatarColor as (typeof AVATAR_COLORS)[number])
      ? avatarColor
      : AVATAR_COLORS[0],
    createdAt: new Date().toISOString(),
    globalStreaks: createEmptyGlobalStreaks(),
    stats: createEmptyStats(),
    settings: getDefaultProfileSettings(),
    achievements: [],
  };
}

export function getDefaultState() {
  return { profiles: [] as Profile[], activeProfileId: null as string | null };
}

function resolveActiveProfileId(
  profiles: Profile[],
  activeProfileId: string | null,
): string | null {
  if (profiles.length === 0) return null;
  if (activeProfileId && profiles.some((profile) => profile.id === activeProfileId)) {
    return activeProfileId;
  }
  return profiles[0]?.id ?? null;
}

export function loadState() {
  if (typeof window === "undefined") return getDefaultState();
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw) as ReturnType<typeof getDefaultState>;
    const profiles = normalizeProfiles(parsed.profiles ?? []);
    const activeProfileId = resolveActiveProfileId(profiles, parsed.activeProfileId ?? null);
    const state = { profiles, activeProfileId };
    if (activeProfileId !== (parsed.activeProfileId ?? null)) {
      saveState(state);
    }
    return state;
  } catch {
    return getDefaultState();
  }
}

export function saveState(state: ReturnType<typeof getDefaultState>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getActiveProfile(state = loadState()): Profile | null {
  if (!state.activeProfileId) return null;
  return state.profiles.find((p) => p.id === state.activeProfileId) ?? null;
}

export function upsertProfile(profile: Profile) {
  const state = loadState();
  const index = state.profiles.findIndex((p) => p.id === profile.id);
  if (index >= 0) state.profiles[index] = profile;
  else state.profiles.push(profile);
  const activeExists = state.activeProfileId
    ? state.profiles.some((p) => p.id === state.activeProfileId)
    : false;
  if (!activeExists) state.activeProfileId = profile.id;
  saveState(state);
  return state;
}

export function setActiveProfile(profileId: string) {
  const state = loadState();
  if (state.profiles.some((p) => p.id === profileId)) {
    state.activeProfileId = profileId;
    saveState(state);
  }
  return state;
}

export function deleteProfile(profileId: string) {
  const state = loadState();
  state.profiles = state.profiles.filter((p) => p.id !== profileId);
  if (state.activeProfileId === profileId) {
    state.activeProfileId = state.profiles[0]?.id ?? null;
  }
  saveState(state);
  return state;
}

export function updateProfileSettings(
  profileId: string,
  settings: Partial<Profile["settings"]>,
) {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return state;
  profile.settings = { ...profile.settings, ...settings };
  saveState(state);
  return state;
}

export function recordModeSelection(profileId: string, mode: GameMode) {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return state;

  const recent = profile.settings.recentModes ?? [];
  const deduped = [mode, ...recent.filter((entry) => entry !== mode)].slice(0, 4);

  profile.settings = {
    ...profile.settings,
    lastSelectedMode: mode,
    recentModes: deduped,
  };
  saveState(state);
  return state;
}

export function recordAnswer(
  profileId: string,
  mode: GameMode,
  difficulty: Difficulty,
  correct: boolean,
  countryCode: string,
  skipped = false,
  scope: GameScope = "world",
  isPracticeMode = mode === "weak-spots",
  question?: Question,
) {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return state;

  const stats = profile.stats[scope][mode][difficulty];
  const globalStreak = profile.globalStreaks[scope][difficulty];
  stats.totalPlayed += 1;

  if (correct && !skipped) {
    stats.totalCorrect += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    globalStreak.currentStreak += 1;
    globalStreak.bestStreak = Math.max(globalStreak.bestStreak, globalStreak.currentStreak);

    const today = getDailyDateKey();
    if (!profile.todayBestStreaks) profile.todayBestStreaks = {};
    if (!profile.todayBestStreaks[scope]) profile.todayBestStreaks[scope] = {};
    const todayBest = profile.todayBestStreaks[scope]![difficulty];
    if (!todayBest || todayBest.dateKey !== today) {
      profile.todayBestStreaks[scope]![difficulty] = { dateKey: today, value: globalStreak.currentStreak };
    } else {
      todayBest.value = Math.max(todayBest.value, globalStreak.currentStreak);
    }
  } else if (!skipped) {
    stats.currentStreak = 0;
    globalStreak.currentStreak = 0;
    if (!stats.missedCountries.includes(countryCode)) {
      stats.missedCountries.push(countryCode);
    }
  }

  if (!skipped) {
    if (!profile.commonlyMissedCountries) profile.commonlyMissedCountries = {};
    if (!profile.commonlyMissedCountries[scope]) profile.commonlyMissedCountries[scope] = [];
    const pool = profile.commonlyMissedCountries[scope]!;

    if (!correct) {
      if (!pool.includes(countryCode)) {
        pool.push(countryCode);
      }
    } else if (!isPracticeMode) {
      const poolIndex = pool.indexOf(countryCode);
      if (poolIndex >= 0) {
        pool.splice(poolIndex, 1);
      }
    }

    if (!profile.countryProgress) profile.countryProgress = {};
    const entry = profile.countryProgress[countryCode] ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (correct) entry.correct += 1;
    profile.countryProgress[countryCode] = entry;

    if (
      question &&
      wouldCountTowardMapProgress({
        question,
        statsMode: mode,
        difficulty,
        correct,
        skipped,
        isPracticeMode,
      })
    ) {
      const category = resolveMapProgressCategory(question, mode)!;
      recordPlaceMapProgress(
        profile,
        countryCode,
        toMapProgressDifficulty(difficulty)!,
        category,
      );
    }
  }

  saveState(state);
  return { state, stats };
}

export function recordDailyChallengeCompletion(profileId: string, scope: GameScope = "world") {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return state;

  const today = scopedDailyKey(getDailyDateKey(), scope);
  if (!profile.dailyChallengeCompletions) {
    profile.dailyChallengeCompletions = [];
  }
  if (!profile.dailyChallengeCompletions.includes(today)) {
    profile.dailyChallengeCompletions.push(today);
    saveState(state);
  }
  return state;
}

export function markDailyChallengePlayed(profileId: string, scope: GameScope = "world") {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return state;

  const today = scopedDailyKey(getDailyDateKey(), scope);
  if (!profile.dailyChallengePlayedDates) {
    profile.dailyChallengePlayedDates = [];
  }
  if (!profile.dailyChallengePlayedDates.includes(today)) {
    profile.dailyChallengePlayedDates.push(today);
    saveState(state);
  }
  return state;
}

export function exportProfile(profileId: string): string | null {
  const profile = loadState().profiles.find((p) => p.id === profileId);
  if (!profile) return null;
  return JSON.stringify(profile, null, 2);
}

export function importProfile(json: string): Profile | null {
  try {
    const profile = normalizeProfile(JSON.parse(json) as Profile);
    if (!profile.id || !profile.name) return null;
    profile.id = crypto.randomUUID();
    upsertProfile(profile);
    return profile;
  } catch {
    return null;
  }
}

export function checkAchievements(
  profile: Profile,
  mode: GameMode,
  difficulty: Difficulty,
  session?: AchievementSessionContext,
  scope: GameScope = "world",
): string[] {
  const newAchievements = evaluateAchievements(profile, mode, difficulty, session, scope);

  if (newAchievements.length > 0) {
    profile.achievements = [...profile.achievements, ...newAchievements];
    upsertProfile(profile);
  }

  return newAchievements;
}
