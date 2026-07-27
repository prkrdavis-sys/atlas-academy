import { getDailyDateKey } from "@/lib/game-engine";
import type {
  Difficulty,
  GameMode,
  GameScope,
  GlobalStreakSnapshot,
  GlobalStreaksByDifficulty,
  ModeStats,
  ModeStatsByScope,
  Profile,
  ScopedByGameScope,
} from "@/lib/types";
import { DIFFICULTIES, GAME_MODES, GAME_SCOPES } from "@/lib/types";

const ZERO_GLOBAL_STREAK: GlobalStreakSnapshot = { currentStreak: 0, bestStreak: 0 };

export function emptyModeStats(): ModeStats {
  return {
    currentStreak: 0,
    bestStreak: 0,
    totalCorrect: 0,
    totalPlayed: 0,
    missedCountries: [],
  };
}

export function createEmptyModeStatsByDifficulty(): Record<Difficulty, ModeStats> {
  return {
    easy: emptyModeStats(),
    medium: emptyModeStats(),
    hard: emptyModeStats(),
  };
}

export function createEmptyGlobalStreaksByDifficulty(): GlobalStreaksByDifficulty {
  return {
    easy: { currentStreak: 0, bestStreak: 0 },
    medium: { currentStreak: 0, bestStreak: 0 },
    hard: { currentStreak: 0, bestStreak: 0 },
  };
}

export function createEmptyModeStatsByScope(): ModeStatsByScope {
  const stats = {} as ModeStatsByScope;
  for (const mode of GAME_MODES) {
    stats[mode.id] = createEmptyModeStatsByDifficulty();
  }
  return stats;
}

export function createEmptyScopedGlobalStreaks(): ScopedByGameScope<GlobalStreaksByDifficulty> {
  return {
    world: createEmptyGlobalStreaksByDifficulty(),
    usa: createEmptyGlobalStreaksByDifficulty(),
  };
}

export function createEmptyScopedStats(): ScopedByGameScope<ModeStatsByScope> {
  return {
    world: createEmptyModeStatsByScope(),
    usa: createEmptyModeStatsByScope(),
  };
}

export function isLegacyFlatModeStats(value: unknown): value is ModeStats {
  return (
    typeof value === "object" &&
    value !== null &&
    "totalPlayed" in value &&
    !("easy" in value)
  );
}

export function isLegacyUnscopedGlobalStreaks(
  value: unknown,
): value is GlobalStreaksByDifficulty {
  return typeof value === "object" && value !== null && "easy" in value && !("world" in value);
}

export function isLegacyUnscopedStats(value: unknown): value is ModeStatsByScope {
  if (typeof value !== "object" || value === null || "world" in value) return false;
  const firstMode = GAME_MODES[0]?.id;
  return Boolean(firstMode && firstMode in value);
}

export function getGlobalStreak(
  profile: Profile,
  difficulty: Difficulty,
  scope: GameScope = "world",
): GlobalStreakSnapshot {
  return profile.globalStreaks[scope][difficulty];
}

export function getGlobalStreakOrZero(
  profile: Profile | null | undefined,
  difficulty: Difficulty,
  scope: GameScope = "world",
): GlobalStreakSnapshot {
  return profile?.globalStreaks[scope][difficulty] ?? ZERO_GLOBAL_STREAK;
}

export function getTodayBestStreakOrZero(
  profile: Profile | null | undefined,
  difficulty: Difficulty,
  scope: GameScope = "world",
): number {
  const today = getDailyDateKey();
  const entry = profile?.todayBestStreaks?.[scope]?.[difficulty];
  if (!entry || entry.dateKey !== today) return 0;
  return entry.value;
}

export function getTodayBestStreakDisplay(
  profile: Profile | null | undefined,
  difficulty: Difficulty,
  scope: GameScope = "world",
): number {
  const stored = getTodayBestStreakOrZero(profile, difficulty, scope);
  const current = getGlobalStreakOrZero(profile, difficulty, scope).currentStreak;
  return Math.max(stored, current);
}

export function sumStatAcrossDifficulties(
  profile: Profile,
  field: "totalCorrect" | "totalPlayed",
  scope?: GameScope,
): number {
  const scopes = scope ? [scope] : GAME_SCOPES;
  return scopes.reduce(
    (scopeSum, activeScope) =>
      scopeSum +
      GAME_MODES.reduce(
        (sum, mode) =>
          sum +
          DIFFICULTIES.reduce(
            (dSum, difficulty) => dSum + profile.stats[activeScope][mode.id][difficulty][field],
            0,
          ),
        0,
      ),
    0,
  );
}

export function modeCorrectCount(
  profile: Profile,
  mode: GameMode,
  scope?: GameScope,
): number {
  const scopes = scope ? [scope] : GAME_SCOPES;
  return scopes.reduce(
    (scopeSum, activeScope) =>
      scopeSum +
      DIFFICULTIES.reduce(
        (sum, difficulty) => sum + profile.stats[activeScope][mode][difficulty].totalCorrect,
        0,
      ),
    0,
  );
}

export function modePlayedCount(
  profile: Profile,
  mode: GameMode,
  scope?: GameScope,
): number {
  const scopes = scope ? [scope] : GAME_SCOPES;
  return scopes.reduce(
    (scopeSum, activeScope) =>
      scopeSum +
      DIFFICULTIES.reduce(
        (sum, difficulty) => sum + profile.stats[activeScope][mode][difficulty].totalPlayed,
        0,
      ),
    0,
  );
}

export function maxGlobalBestStreak(profile: Profile, scope?: GameScope): number {
  const scopes = scope ? [scope] : GAME_SCOPES;
  return Math.max(
    ...scopes.flatMap((activeScope) =>
      DIFFICULTIES.map((difficulty) => profile.globalStreaks[activeScope][difficulty].bestStreak),
    ),
  );
}

export function collectMissedCountries(profile: Profile, scope?: GameScope): string[] {
  const scopes = scope ? [scope] : GAME_SCOPES;
  const codes: string[] = [];
  for (const activeScope of scopes) {
    for (const mode of GAME_MODES) {
      for (const difficulty of DIFFICULTIES) {
        codes.push(...profile.stats[activeScope][mode.id][difficulty].missedCountries);
      }
    }
  }
  return codes;
}

export function getCommonlyMissedCountries(profile: Profile, scope: GameScope): string[] {
  return profile.commonlyMissedCountries?.[scope] ?? [];
}

/** One-time migration from legacy per-mode missedCountries lists. */
export function migrateCommonlyMissedCountries(profile: Profile): void {
  if (!profile.commonlyMissedCountries) {
    profile.commonlyMissedCountries = {};
  }

  for (const scope of GAME_SCOPES) {
    if (profile.commonlyMissedCountries[scope]?.length) continue;
    profile.commonlyMissedCountries[scope] = [...new Set(collectMissedCountries(profile, scope))];
  }
}

export function modesWithMinCorrect(
  profile: Profile,
  minCorrect: number,
  scope?: GameScope,
): number {
  return GAME_MODES.filter((mode) => modeCorrectCount(profile, mode.id, scope) >= minCorrect).length;
}

export function modesWithMinPlayed(
  profile: Profile,
  minPlayed: number,
  scope?: GameScope,
): number {
  return GAME_MODES.filter((mode) => modePlayedCount(profile, mode.id, scope) >= minPlayed).length;
}

export function maxModeBestStreak(
  profile: Profile,
  mode: GameMode,
  scope?: GameScope,
): number {
  const scopes = scope ? [scope] : GAME_SCOPES;
  return Math.max(
    ...scopes.flatMap((activeScope) =>
      DIFFICULTIES.map((difficulty) => profile.stats[activeScope][mode][difficulty].bestStreak),
    ),
    0,
  );
}

export function difficultyCorrectCount(
  profile: Profile,
  difficulty: Difficulty,
  scope?: GameScope,
): number {
  const scopes = scope ? [scope] : GAME_SCOPES;
  return scopes.reduce(
    (scopeSum, activeScope) =>
      scopeSum +
      GAME_MODES.reduce(
        (sum, mode) => sum + profile.stats[activeScope][mode.id][difficulty].totalCorrect,
        0,
      ),
    0,
  );
}

export function maxTodayBestStreak(profile: Profile): number {
  const today = getDailyDateKey();
  let max = 0;

  for (const scope of GAME_SCOPES) {
    for (const difficulty of DIFFICULTIES) {
      const entry = profile.todayBestStreaks?.[scope]?.[difficulty];
      if (entry?.dateKey === today) {
        max = Math.max(max, entry.value);
      }
      max = Math.max(max, getTodayBestStreakDisplay(profile, difficulty, scope));
    }
  }

  return max;
}

export function sortGameModesByMostPlayed<T extends { id: GameMode }>(
  modes: readonly T[],
  profile: Profile,
  difficulty: Difficulty,
  scope: GameScope = "world",
): T[] {
  const defaultOrder = new Map(modes.map((mode, index) => [mode.id, index]));

  return [...modes].sort((a, b) => {
    const playedDiff =
      profile.stats[scope][b.id][difficulty].totalPlayed -
      profile.stats[scope][a.id][difficulty].totalPlayed;
    if (playedDiff !== 0) return playedDiff;
    return (defaultOrder.get(a.id) ?? 0) - (defaultOrder.get(b.id) ?? 0);
  });
}

export type ModeStatRow = {
  mode: GameMode;
  icon: string;
  title: string;
  currentStreak: number;
  bestStreak: number;
  totalCorrect: number;
  totalPlayed: number;
  accuracy: number;
};

export function getModeStatRows(
  profile: Profile,
  difficulty: Difficulty,
  scope: GameScope,
): ModeStatRow[] {
  return sortGameModesByMostPlayed(GAME_MODES, profile, difficulty, scope).map((mode) => {
    const stats = profile.stats[scope][mode.id][difficulty];
    return {
      mode: mode.id,
      icon: mode.icon,
      title: mode.title,
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      totalCorrect: stats.totalCorrect,
      totalPlayed: stats.totalPlayed,
      accuracy:
        stats.totalPlayed > 0
          ? Math.round((stats.totalCorrect / stats.totalPlayed) * 100)
          : 0,
    };
  });
}

export function getDifficultyTotals(
  profile: Profile,
  difficulty: Difficulty,
  scope: GameScope,
): { totalCorrect: number; totalPlayed: number; accuracy: number } {
  const totals = GAME_MODES.reduce(
    (acc, mode) => {
      const stats = profile.stats[scope][mode.id][difficulty];
      acc.totalCorrect += stats.totalCorrect;
      acc.totalPlayed += stats.totalPlayed;
      return acc;
    },
    { totalCorrect: 0, totalPlayed: 0 },
  );

  return {
    ...totals,
    accuracy:
      totals.totalPlayed > 0
        ? Math.round((totals.totalCorrect / totals.totalPlayed) * 100)
        : 0,
  };
}

export function getScopeTotals(
  profile: Profile,
  scope: GameScope,
): { totalCorrect: number; totalPlayed: number; accuracy: number } {
  const totalCorrect = sumStatAcrossDifficulties(profile, "totalCorrect", scope);
  const totalPlayed = sumStatAcrossDifficulties(profile, "totalPlayed", scope);
  return {
    totalCorrect,
    totalPlayed,
    accuracy: totalPlayed > 0 ? Math.round((totalCorrect / totalPlayed) * 100) : 0,
  };
}

export function getTopMissedPlaces(
  profile: Profile,
  scope: GameScope,
  limit = 8,
): { code: string; misses: number }[] {
  const counts = new Map<string, number>();

  for (const mode of GAME_MODES) {
    for (const difficulty of DIFFICULTIES) {
      for (const code of profile.stats[scope][mode.id][difficulty].missedCountries) {
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }
  }

  for (const code of getCommonlyMissedCountries(profile, scope)) {
    if (!counts.has(code)) counts.set(code, 1);
  }

  return [...counts.entries()]
    .map(([code, misses]) => ({ code, misses }))
    .sort((a, b) => b.misses - a.misses || a.code.localeCompare(b.code))
    .slice(0, limit);
}
