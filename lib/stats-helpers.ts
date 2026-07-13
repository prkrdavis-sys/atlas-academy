import { getDailyDateKey } from "@/lib/game-engine";
import type { Difficulty, GameMode, GlobalStreakSnapshot, ModeStats, Profile } from "@/lib/types";
import { DIFFICULTIES, GAME_MODES } from "@/lib/types";

const ZERO_GLOBAL_STREAK: GlobalStreakSnapshot = { currentStreak: 0, bestStreak: 0 };

export function getGlobalStreak(
  profile: Profile,
  difficulty: Difficulty,
): GlobalStreakSnapshot {
  return profile.globalStreaks[difficulty];
}

export function getGlobalStreakOrZero(
  profile: Profile | null | undefined,
  difficulty: Difficulty,
): GlobalStreakSnapshot {
  return profile?.globalStreaks[difficulty] ?? ZERO_GLOBAL_STREAK;
}

export function getTodayBestStreakOrZero(
  profile: Profile | null | undefined,
  difficulty: Difficulty,
): number {
  const today = getDailyDateKey();
  const entry = profile?.todayBestStreaks?.[difficulty];
  if (!entry || entry.dateKey !== today) return 0;
  return entry.value;
}

export function getTodayBestStreakDisplay(
  profile: Profile | null | undefined,
  difficulty: Difficulty,
): number {
  const stored = getTodayBestStreakOrZero(profile, difficulty);
  const current = getGlobalStreakOrZero(profile, difficulty).currentStreak;
  return Math.max(stored, current);
}

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

export function isLegacyFlatModeStats(value: unknown): value is ModeStats {
  return (
    typeof value === "object" &&
    value !== null &&
    "totalPlayed" in value &&
    !("easy" in value)
  );
}

export function sumStatAcrossDifficulties(
  profile: Profile,
  field: "totalCorrect" | "totalPlayed",
): number {
  return GAME_MODES.reduce(
    (sum, mode) =>
      sum + DIFFICULTIES.reduce((dSum, difficulty) => dSum + profile.stats[mode.id][difficulty][field], 0),
    0,
  );
}

export function modeCorrectCount(profile: Profile, mode: GameMode): number {
  return DIFFICULTIES.reduce(
    (sum, difficulty) => sum + profile.stats[mode][difficulty].totalCorrect,
    0,
  );
}

export function modePlayedCount(profile: Profile, mode: GameMode): number {
  return DIFFICULTIES.reduce(
    (sum, difficulty) => sum + profile.stats[mode][difficulty].totalPlayed,
    0,
  );
}

export function maxGlobalBestStreak(profile: Profile): number {
  return Math.max(...DIFFICULTIES.map((difficulty) => profile.globalStreaks[difficulty].bestStreak));
}

export function collectMissedCountries(profile: Profile): string[] {
  const codes: string[] = [];
  for (const mode of GAME_MODES) {
    for (const difficulty of DIFFICULTIES) {
      codes.push(...profile.stats[mode.id][difficulty].missedCountries);
    }
  }
  return codes;
}

export function modesWithMinCorrect(profile: Profile, minCorrect: number): number {
  return GAME_MODES.filter((mode) => modeCorrectCount(profile, mode.id) >= minCorrect).length;
}

export function sortGameModesByMostPlayed<T extends { id: GameMode }>(
  modes: readonly T[],
  profile: Profile,
  difficulty: Difficulty,
): T[] {
  const defaultOrder = new Map(modes.map((mode, index) => [mode.id, index]));

  return [...modes].sort((a, b) => {
    const playedDiff =
      profile.stats[b.id][difficulty].totalPlayed -
      profile.stats[a.id][difficulty].totalPlayed;
    if (playedDiff !== 0) return playedDiff;
    return (defaultOrder.get(a.id) ?? 0) - (defaultOrder.get(b.id) ?? 0);
  });
}
