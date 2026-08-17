import type {
  Continent,
  Difficulty,
  GameMode,
  GameScope,
  Profile,
  ProfileAvatarSelection,
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
  DEFAULT_SELECTED_MODE,
  DIFFICULTIES,
  GAME_MODES,
  SPEED_ROUND_ALL_TYPES,
  US_REGIONS,
  normalizeRoundQuestionSetting,
} from "@/lib/types";
import { checkAchievements as evaluateAchievements, reconcileAchievements } from "@/lib/achievements";
import { isValidSetupMode } from "@/lib/game-setup";
import { getDailyDateKey, offsetDailyDateKey } from "@/lib/game-engine";
import { MAX_LOGIN_DATE_HISTORY_DAYS } from "@/lib/login-streak";
import { isProfileAvatarId } from "@/lib/profile-avatars";
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
export const PROFILE_STORAGE_CHANGE_EVENT = "atlas-academy-profile-storage-change";

type SaveStateOptions = {
  notify?: boolean;
  deletedProfileId?: string;
};

type StorageChangeDetail = {
  deletedProfileId?: string;
};

let activeStorageAccountId: string | null = null;

function getStorageKey() {
  return activeStorageAccountId ? `${STORAGE_KEY}:${activeStorageAccountId}` : STORAGE_KEY;
}

export function setStorageAccount(accountId: string | null) {
  activeStorageAccountId = accountId;
}

export function getStorageAccount() {
  return activeStorageAccountId;
}

function notifyStateChange(detail: StorageChangeDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<StorageChangeDetail>(PROFILE_STORAGE_CHANGE_EVENT, {
      detail,
    }),
  );
}

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
    difficulty: "medium",
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
    soundEnabled: true,
    hapticsEnabled: true,
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
      const modeStatsByDifficulty = profile.stats[scope][mode.id];
      if (!modeStatsByDifficulty) {
        profile.stats[scope][mode.id] = createEmptyModeStatsByDifficulty();
        continue;
      }
      const modeStats = modeStatsByDifficulty as unknown;
      if (isLegacyFlatModeStats(modeStats)) {
        profile.stats[scope][mode.id] = {
          easy: {
            ...modeStats,
            bestGameCorrect: modeStats.bestGameCorrect ?? 0,
            missedCountries: [...modeStats.missedCountries],
          },
          medium: emptyModeStats(),
          hard: emptyModeStats(),
        };
      } else {
        for (const difficulty of DIFFICULTIES) {
          if (!profile.stats[scope][mode.id][difficulty]) {
            profile.stats[scope][mode.id][difficulty] = emptyModeStats();
          } else if (
            !Number.isFinite(profile.stats[scope][mode.id][difficulty].bestGameCorrect) ||
            profile.stats[scope][mode.id][difficulty].bestGameCorrect < 0
          ) {
            profile.stats[scope][mode.id][difficulty].bestGameCorrect = 0;
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

function normalizeDailyDateKey(stored: string): string {
  return stored.includes(":") ? stored.slice(stored.indexOf(":") + 1) : stored;
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
  if (typeof normalized.avatarColor !== "string") {
    normalized.avatarColor = "";
  }
  if (normalized.avatarId !== undefined && !isProfileAvatarId(normalized.avatarId)) {
    normalized.avatarId = undefined;
  }
  if (
    !normalized.avatarId &&
    !AVATAR_COLORS.includes(normalized.avatarColor as (typeof AVATAR_COLORS)[number])
  ) {
    normalized.avatarColor = AVATAR_COLORS[0];
  }
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
  if (!normalized.loginDates) {
    normalized.loginDates = [];
  }
  normalized.dailyChallengePlayedDates = [
    ...new Set((normalized.dailyChallengePlayedDates ?? []).map(normalizeDailyDateKey)),
  ];
  normalized.dailyChallengeCompletions = [
    ...new Set((normalized.dailyChallengeCompletions ?? []).map(normalizeDailyDateKey)),
  ];
  const dailyResults: NonNullable<Profile["dailyChallengeResults"]> = {};
  for (const [storedKey, result] of Object.entries(normalized.dailyChallengeResults ?? {})) {
    const dateKey = normalizeDailyDateKey(storedKey);
    if (
      result &&
      typeof result === "object" &&
      Number.isFinite(result.elapsedCentiseconds) &&
      Number.isFinite(result.correctAnswers) &&
      Number.isFinite(result.questionCount)
    ) {
      dailyResults[dateKey] = { ...result, dateKey };
    }
  }
  normalized.dailyChallengeResults = dailyResults;
  if (!normalized.activityByDate) {
    normalized.activityByDate = {};
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
        continue;
      }
      for (const difficulty of DIFFICULTIES) {
        const modeStats = normalized.stats[scope][mode.id][difficulty];
        if (!modeStats) {
          normalized.stats[scope][mode.id][difficulty] = emptyModeStats();
        } else if (
          !Number.isFinite(modeStats.bestGameCorrect) ||
          modeStats.bestGameCorrect < 0
        ) {
          modeStats.bestGameCorrect = 0;
        }
      }
    }
  }
  normalized.achievements = reconcileAchievements(normalized as Profile);
  migrateCommonlyMissedCountries(normalized as Profile);
  if (!normalized.settings.lastSelectedMode) {
    normalized.settings.lastSelectedMode = DEFAULT_SELECTED_MODE;
  }
  if (!isValidSetupMode(normalized.settings.lastSelectedMode)) {
    normalized.settings.lastSelectedMode =
      normalized.settings.recentModes?.find((mode) => isValidSetupMode(mode)) ??
      DEFAULT_SELECTED_MODE;
  }
  if (!normalized.settings.recentModes?.length) {
    normalized.settings.recentModes = [normalized.settings.lastSelectedMode];
  }
  return normalized as Profile;
}

export function createProfile(name: string, selection: ProfileAvatarSelection): Profile {
  const avatarId =
    selection.type === "portrait" && isProfileAvatarId(selection.avatarId)
      ? selection.avatarId
      : undefined;
  const avatarColor =
    selection.type === "color" &&
    AVATAR_COLORS.includes(selection.color as (typeof AVATAR_COLORS)[number])
      ? selection.color
      : avatarId
        ? ""
        : AVATAR_COLORS[0];

  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    avatarColor,
    ...(avatarId ? { avatarId } : {}),
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
    const storageKey = getStorageKey();
    let raw = localStorage.getItem(storageKey);
    if (!raw && !activeStorageAccountId) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(storageKey, raw);
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

export function saveState(
  state: ReturnType<typeof getDefaultState>,
  options: SaveStateOptions = {},
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  } catch {
    // Quota / private-mode failures must not crash a round; in-memory state remains.
  }
  if (options.notify !== false) {
    notifyStateChange({ deletedProfileId: options.deletedProfileId });
  }
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
  saveState(state, { deletedProfileId: profileId });
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
  if (!isValidSetupMode(mode)) return state;
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

  const activityDateKey = getDailyDateKey();
  if (!profile.activityByDate) profile.activityByDate = {};
  profile.activityByDate[activityDateKey] =
    (profile.activityByDate[activityDateKey] ?? 0) + 1;

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

export function recordBestGameScore(
  profileId: string,
  mode: GameMode,
  difficulty: Difficulty,
  correctAnswers: number,
  scope: GameScope = "world",
  options: { notify?: boolean } = {},
) {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile || !Number.isFinite(correctAnswers) || correctAnswers < 0) return state;

  const stats = profile.stats[scope][mode][difficulty];
  const nextBest = Math.max(stats.bestGameCorrect, Math.floor(correctAnswers));
  if (nextBest === stats.bestGameCorrect) return state;

  stats.bestGameCorrect = nextBest;
  saveState(state, { notify: options.notify });
  return state;
}

export type DailyLoginResult = {
  state: ReturnType<typeof getDefaultState>;
  /** True when this call secured a new day (first open of the EST day). */
  extended: boolean;
  /** Streak length after recording, for milestone celebrations. */
  streakLength: number;
};

/**
 * Records that the player opened the app today (EST). Extends the login
 * streak when yesterday was the last recorded day, otherwise restarts it.
 */
export function recordDailyLogin(profileId: string): DailyLoginResult {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return { state, extended: false, streakLength: 0 };

  const today = getDailyDateKey();
  if (profile.loginStreak?.lastDateKey === today) {
    return { state, extended: false, streakLength: profile.loginStreak.length };
  }

  const yesterday = offsetDailyDateKey(today, -1);
  profile.loginStreak =
    profile.loginStreak?.lastDateKey === yesterday
      ? { lastDateKey: today, length: profile.loginStreak.length + 1 }
      : { lastDateKey: today, length: 1 };

  const cutoff = offsetDailyDateKey(today, -(MAX_LOGIN_DATE_HISTORY_DAYS - 1));
  profile.loginDates = [...new Set([...(profile.loginDates ?? []), today])]
    .filter((dateKey) => dateKey >= cutoff)
    .sort();

  saveState(state);
  return { state, extended: true, streakLength: profile.loginStreak.length };
}

export function recordDailyChallengeCompletion(profileId: string, dateKey = getDailyDateKey()) {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return state;

  if (!profile.dailyChallengeCompletions) {
    profile.dailyChallengeCompletions = [];
  }
  if (!profile.dailyChallengeCompletions.includes(dateKey)) {
    profile.dailyChallengeCompletions.push(dateKey);
    saveState(state);
  }
  return state;
}

export function markDailyChallengePlayed(profileId: string, dateKey = getDailyDateKey()) {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return state;

  if (!profile.dailyChallengePlayedDates) {
    profile.dailyChallengePlayedDates = [];
  }
  if (!profile.dailyChallengePlayedDates.includes(dateKey)) {
    profile.dailyChallengePlayedDates.push(dateKey);
    saveState(state);
  }
  return state;
}

export function recordDailyChallengeResult(
  profileId: string,
  result: NonNullable<Profile["dailyChallengeResults"]>[string],
) {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return state;

  if (!profile.dailyChallengeResults) {
    profile.dailyChallengeResults = {};
  }
  if (!profile.dailyChallengeResults[result.dateKey]) {
    profile.dailyChallengeResults[result.dateKey] = result;
    saveState(state);
    recordDailyChallengeCompletion(profileId, result.dateKey);
    return loadState();
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
