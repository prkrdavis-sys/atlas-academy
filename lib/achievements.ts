import { getPlacesForScope } from "@/lib/countries";
import type {
  AchievementSessionContext,
  Difficulty,
  GameMode,
  GameScope,
  Profile,
  Region,
  UsRegion,
} from "@/lib/types";
import { ACHIEVEMENTS, GAME_MODES, US_REGIONS } from "@/lib/types";
import {
  difficultyCorrectCount,
  maxGlobalBestStreak,
  maxModeBestStreak,
  maxTodayBestStreak,
  modeCorrectCount,
  modePlayedCount,
  modesWithMinCorrect,
  modesWithMinPlayed,
  sumStatAcrossDifficulties,
} from "@/lib/stats-helpers";

const VALID_ACHIEVEMENT_IDS = new Set<string>(ACHIEVEMENTS.map((achievement) => achievement.id));

/** Maps retired achievement IDs to their closest replacement. */
const LEGACY_ACHIEVEMENT_MAP: Record<string, string> = {
  "streak-5": "peak-15",
  "streak-10": "peak-15",
  "streak-25": "peak-30",
  "streak-50": "peak-50",
  "streak-75": "peak-75",
  "streak-100": "peak-100",
  "best-streak-20": "peak-15",
  "best-streak-40": "peak-30",
  "correct-100": "correct-150",
  "correct-250": "correct-500",
  "correct-1000": "correct-1500",
  "flag-master": "flag-fanatic",
  "marathon-runner": "marathon-25",
  "marathon-40": "marathon-45",
  "marathon-60": "marathon-65",
  "speed-rookie": "speed-demon",
  "mode-master": "mode-specialist",
  "americas-master": "country-collector",
  "oceania-master": "country-collector",
  "antarctica-explorer": "country-collector",
  "country-completionist": "country-collector",
};

function sumStat(profile: Profile, field: "totalCorrect" | "totalPlayed"): number {
  return sumStatAcrossDifficulties(profile, field);
}

function scopePlayedCount(profile: Profile, scope: GameScope): number {
  return sumStatAcrossDifficulties(profile, "totalPlayed", scope);
}

function placeMastery(
  profile: Profile,
  regions: Region[],
  minPlaces: number,
  scope: GameScope,
  minAccuracy = 0.9,
): boolean {
  const progress = profile.countryProgress ?? {};
  const places = getPlacesForScope(scope);
  let correct = 0;
  let total = 0;
  let placesPlayed = 0;

  for (const place of places) {
    if (!regions.includes(place.continent)) continue;
    const entry = progress[place.code];
    if (!entry || entry.total === 0) continue;
    placesPlayed += 1;
    correct += entry.correct;
    total += entry.total;
  }

  if (placesPlayed < minPlaces || total === 0) return false;
  return correct / total >= minAccuracy;
}

function placesAnswered(profile: Profile, scope: GameScope): number {
  const progress = profile.countryProgress ?? {};
  const codes = new Set(getPlacesForScope(scope).map((place) => place.code));
  return Object.entries(progress).filter(
    ([code, entry]) => codes.has(code) && entry.total > 0,
  ).length;
}

function coastToCoastMastery(profile: Profile): boolean {
  return US_REGIONS.every((region) =>
    placeMastery(profile, [region], 5, "usa"),
  );
}

export function buildAchievementChecks(
  profile: Profile,
  mode: GameMode,
  difficulty: Difficulty,
  session?: AchievementSessionContext,
  scope: GameScope = "world",
): Record<string, boolean> {
  const totalCorrect = sumStat(profile, "totalCorrect");
  const totalPlayed = sumStat(profile, "totalPlayed");
  const overallAccuracy = totalPlayed > 0 ? totalCorrect / totalPlayed : 0;
  const dailyCompletions = profile.dailyChallengeCompletions?.length ?? 0;
  const sessionCorrect = session?.sessionCorrect ?? 0;
  const sessionTotal = session?.sessionTotal ?? 0;
  const sessionEnded = session?.sessionEnded ?? false;
  const bestStreak = maxGlobalBestStreak(profile);
  const marathonBest = maxModeBestStreak(profile, "marathon");

  return {
    "first-steps": totalPlayed >= 1,
    "mode-curious": modesWithMinPlayed(profile, 1) >= 4,
    "around-the-map": scopePlayedCount(profile, "world") >= 10 && scopePlayedCount(profile, "usa") >= 10,
    "daily-devotee": dailyCompletions >= 1,
    "played-50": totalPlayed >= 50,
    "played-250": totalPlayed >= 250,
    "played-750": totalPlayed >= 750,
    "played-2000": totalPlayed >= 2000,
    "correct-25": totalCorrect >= 25,
    "correct-150": totalCorrect >= 150,
    "correct-500": totalCorrect >= 500,
    "correct-1500": totalCorrect >= 1500,
    "peak-15": bestStreak >= 15,
    "peak-30": bestStreak >= 30,
    "peak-50": bestStreak >= 50,
    "peak-75": bestStreak >= 75,
    "peak-100": bestStreak >= 100,
    "daily-regular": dailyCompletions >= 7,
    "daily-veteran": dailyCompletions >= 30,
    "hot-day": maxTodayBestStreak(profile) >= 20,
    "perfect-session":
      sessionEnded && sessionTotal >= 10 && sessionCorrect === sessionTotal,
    "flag-rookie": modeCorrectCount(profile, "flag-to-country") >= 15,
    "capital-hunter": modeCorrectCount(profile, "capital-to-country") >= 15,
    "capital-namer": modeCorrectCount(profile, "country-to-capital") >= 15,
    "shape-spotter": modeCorrectCount(profile, "shape-to-country") >= 15,
    "mixed-starter": modeCorrectCount(profile, "mixed") >= 15,
    "flag-picker": modeCorrectCount(profile, "country-to-flag") >= 15,
    "flag-fanatic": modeCorrectCount(profile, "flag-to-country") >= 75,
    "capital-sage": modeCorrectCount(profile, "capital-to-country") >= 75,
    "capital-legend": modeCorrectCount(profile, "country-to-capital") >= 75,
    "shape-master": modeCorrectCount(profile, "shape-to-country") >= 75,
    "mixed-veteran": modeCorrectCount(profile, "mixed") >= 75,
    "border-boss": modeCorrectCount(profile, "neighbor-quiz") >= 50,
    "population-prophet": modeCorrectCount(profile, "population-showdown") >= 50,
    "marathon-25": marathonBest >= 25,
    "marathon-45": marathonBest >= 45,
    "marathon-65": marathonBest >= 65,
    "speed-demon":
      mode === "speed-round" && sessionEnded && sessionCorrect >= 15,
    "speed-frenzy":
      mode === "speed-round" && sessionEnded && sessionCorrect >= 25,
    "weak-spots-warrior": modeCorrectCount(profile, "weak-spots") >= 50,
    "mode-explorer": GAME_MODES.every((gameMode) => modePlayedCount(profile, gameMode.id) > 0),
    "mode-specialist": modesWithMinCorrect(profile, 50) >= 8,
    "accuracy-sharp": totalPlayed >= 100 && overallAccuracy >= 0.8,
    "hard-earned": difficultyCorrectCount(profile, "hard") >= 50,
    "africa-master": placeMastery(profile, ["Africa"], 20, "world"),
    "asia-master": placeMastery(profile, ["Asia"], 20, "world"),
    "europe-master": placeMastery(profile, ["Europe"], 20, "world"),
    "coast-to-coast": coastToCoastMastery(profile),
    "state-collector": placesAnswered(profile, "usa") >= 35,
    "country-collector": placesAnswered(profile, "world") >= 100,
  };
}

export function reconcileAchievements(profile: Profile): string[] {
  const mapped = (profile.achievements ?? []).map(
    (id) => LEGACY_ACHIEVEMENT_MAP[id] ?? id,
  );
  const retained = [...new Set(mapped.filter((id) => VALID_ACHIEVEMENT_IDS.has(id)))];

  const checks = buildAchievementChecks(profile, "flag-to-country", "easy");
  const earnedFromStats = ACHIEVEMENTS.filter(
    (achievement) => checks[achievement.id],
  ).map((achievement) => achievement.id);

  return [...new Set([...retained, ...earnedFromStats])];
}

export function checkAchievements(
  profile: Profile,
  mode: GameMode,
  difficulty: Difficulty,
  session?: AchievementSessionContext,
  scope: GameScope = "world",
): string[] {
  const newAchievements: string[] = [];
  const checks = buildAchievementChecks(profile, mode, difficulty, session, scope);

  for (const achievement of ACHIEVEMENTS) {
    if (checks[achievement.id] && !profile.achievements.includes(achievement.id)) {
      newAchievements.push(achievement.id);
    }
  }

  return newAchievements;
}
