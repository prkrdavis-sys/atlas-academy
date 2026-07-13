import type {
  Continent,
  SpeedRoundQuestionType,
  Difficulty,
  GameMode,
  ModeStats,
  Profile,
  AchievementSessionContext,
  RoundQuestionSetting,
} from "@/lib/types";
import {
  AVATAR_COLORS,
  DEFAULT_ROUND_QUESTION_COUNT,
  DIFFICULTIES,
  GAME_MODES,
  normalizeRoundQuestionSetting,
} from "@/lib/types";
import { checkAchievements as evaluateAchievements } from "@/lib/achievements";
import { getDailyDateKey } from "@/lib/game-engine";
import {
  createEmptyModeStatsByDifficulty,
  emptyModeStats,
  isLegacyFlatModeStats,
} from "@/lib/stats-helpers";

const STORAGE_KEY = "atlas-academy";
const LEGACY_STORAGE_KEY = "geography-game";

type LegacyProfile = Profile & {
  globalCurrentStreak?: number;
  globalBestStreak?: number;
};

function createEmptyStats(): Record<GameMode, ReturnType<typeof createEmptyModeStatsByDifficulty>> {
  const stats = {} as Record<GameMode, ReturnType<typeof createEmptyModeStatsByDifficulty>>;
  for (const mode of GAME_MODES) {
    stats[mode.id] = createEmptyModeStatsByDifficulty();
  }
  return stats;
}

function createEmptyGlobalStreaks(): Profile["globalStreaks"] {
  return {
    easy: { currentStreak: 0, bestStreak: 0 },
    medium: { currentStreak: 0, bestStreak: 0 },
    hard: { currentStreak: 0, bestStreak: 0 },
  };
}

function migrateLegacyStats(profile: LegacyProfile): Profile {
  for (const mode of GAME_MODES) {
    const modeStats = profile.stats[mode.id] as unknown;
    if (isLegacyFlatModeStats(modeStats)) {
      profile.stats[mode.id] = {
        easy: {
          ...modeStats,
          missedCountries: [...modeStats.missedCountries],
        },
        medium: emptyModeStats(),
        hard: emptyModeStats(),
      };
    } else {
      for (const difficulty of DIFFICULTIES) {
        if (!profile.stats[mode.id][difficulty]) {
          profile.stats[mode.id][difficulty] = emptyModeStats();
        }
      }
    }
  }

  if (!profile.globalStreaks) {
    const legacyCurrent = profile.globalCurrentStreak ?? 0;
    const legacyBest = profile.globalBestStreak ?? 0;
    profile.globalStreaks = {
      easy: { currentStreak: legacyCurrent, bestStreak: legacyBest },
      medium: { currentStreak: 0, bestStreak: 0 },
      hard: { currentStreak: 0, bestStreak: 0 },
    };
    delete profile.globalCurrentStreak;
    delete profile.globalBestStreak;
  }

  for (const difficulty of DIFFICULTIES) {
    if (!profile.globalStreaks[difficulty]) {
      profile.globalStreaks[difficulty] = { currentStreak: 0, bestStreak: 0 };
    }
  }

  return profile;
}

export function normalizeProfile(profile: Profile): Profile {
  const normalized = migrateLegacyStats(profile as LegacyProfile);
  if (!normalized.settings.speedRoundQuestionType) {
    normalized.settings.speedRoundQuestionType = "flag-to-country";
  } else if ((normalized.settings.speedRoundQuestionType as string) === "mixed") {
    normalized.settings.speedRoundQuestionType = "all-types";
  }
  normalized.settings.roundQuestionCount = normalizeRoundQuestionSetting(normalized.settings.roundQuestionCount);
  if (normalized.settings.includeTerritories === undefined) {
    const legacyTerritoryFilter = (normalized.settings as { lastTerritoryFilter?: Continent[] }).lastTerritoryFilter;
    normalized.settings.includeTerritories = (legacyTerritoryFilter?.length ?? 0) > 0;
    delete (normalized.settings as { lastTerritoryFilter?: Continent[] }).lastTerritoryFilter;
  }
  if (!normalized.dailyChallengePlayedDates) {
    normalized.dailyChallengePlayedDates = [];
  }
  if (!normalized.dailyChallengeCompletions) {
    normalized.dailyChallengeCompletions = [];
  }
  for (const mode of GAME_MODES) {
    if (!normalized.stats[mode.id]) {
      normalized.stats[mode.id] = createEmptyModeStatsByDifficulty();
    }
  }
  return normalized;
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
    settings: {
      difficulty: "easy",
      lastContinentFilter: [
        "Africa",
        "Asia",
        "Europe",
        "North America",
        "Oceania",
        "South America",
      ],
      includeTerritories: false,
      speedRoundQuestionType: "flag-to-country",
      roundQuestionCount: DEFAULT_ROUND_QUESTION_COUNT,
    },
    achievements: [],
  };
}

export function getDefaultState() {
  return { profiles: [] as Profile[], activeProfileId: null as string | null };
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
    return {
      profiles: (parsed.profiles ?? []).map(normalizeProfile),
      activeProfileId: parsed.activeProfileId ?? null,
    };
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
  if (!state.activeProfileId) state.activeProfileId = profile.id;
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
  settings: Partial<{
    difficulty: Difficulty;
    lastContinentFilter: Continent[];
    includeTerritories: boolean;
    speedRoundQuestionType: SpeedRoundQuestionType;
    roundQuestionCount: RoundQuestionSetting;
  }>,
) {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return state;
  profile.settings = { ...profile.settings, ...settings };
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
) {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return state;

  const stats = profile.stats[mode][difficulty];
  const globalStreak = profile.globalStreaks[difficulty];
  stats.totalPlayed += 1;

  if (correct && !skipped) {
    stats.totalCorrect += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    globalStreak.currentStreak += 1;
    globalStreak.bestStreak = Math.max(globalStreak.bestStreak, globalStreak.currentStreak);
  } else if (!skipped) {
    stats.currentStreak = 0;
    globalStreak.currentStreak = 0;
    if (!stats.missedCountries.includes(countryCode)) {
      stats.missedCountries.push(countryCode);
    }
  }

  if (!skipped) {
    if (!profile.countryProgress) profile.countryProgress = {};
    const entry = profile.countryProgress[countryCode] ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (correct) entry.correct += 1;
    profile.countryProgress[countryCode] = entry;
  }

  saveState(state);
  return { state, stats };
}

export function recordDailyChallengeCompletion(profileId: string) {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return state;

  const today = getDailyDateKey();
  if (!profile.dailyChallengeCompletions) {
    profile.dailyChallengeCompletions = [];
  }
  if (!profile.dailyChallengeCompletions.includes(today)) {
    profile.dailyChallengeCompletions.push(today);
    saveState(state);
  }
  return state;
}

export function markDailyChallengePlayed(profileId: string) {
  const state = loadState();
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return state;

  const today = getDailyDateKey();
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
): string[] {
  const newAchievements = evaluateAchievements(profile, mode, difficulty, session);

  if (newAchievements.length > 0) {
    profile.achievements = [...profile.achievements, ...newAchievements];
    upsertProfile(profile);
  }

  return newAchievements;
}
