import { countries } from "@/lib/countries";
import type {
  AchievementSessionContext,
  Continent,
  GameMode,
  Profile,
} from "@/lib/types";
import { ACHIEVEMENTS, GAME_MODES } from "@/lib/types";

function sumStat(profile: Profile, field: "totalCorrect" | "totalPlayed"): number {
  return GAME_MODES.reduce((sum, mode) => sum + profile.stats[mode.id][field], 0);
}

function maxBestStreak(profile: Profile): number {
  return profile.globalBestStreak;
}

function modeCorrectCount(profile: Profile, mode: GameMode): number {
  return profile.stats[mode].totalCorrect;
}

function continentMastery(
  profile: Profile,
  continents: Continent[],
  minCountries: number,
): boolean {
  const progress = profile.countryProgress ?? {};
  let correct = 0;
  let total = 0;
  let countriesPlayed = 0;

  for (const country of countries) {
    if (!continents.includes(country.continent as Continent)) continue;
    const entry = progress[country.code];
    if (!entry || entry.total === 0) continue;
    countriesPlayed += 1;
    correct += entry.correct;
    total += entry.total;
  }

  if (countriesPlayed < minCountries || total === 0) return false;
  return correct / total >= 0.9;
}

function countriesAnswered(profile: Profile): number {
  return Object.values(profile.countryProgress ?? {}).filter((entry) => entry.total > 0).length;
}

function modesWithMinCorrect(profile: Profile, minCorrect: number): number {
  return GAME_MODES.filter((mode) => profile.stats[mode.id].totalCorrect >= minCorrect).length;
}

export function buildAchievementChecks(
  profile: Profile,
  mode: GameMode,
  session?: AchievementSessionContext,
): Record<string, boolean> {
  const stats = profile.stats[mode];
  const globalStreak = profile.globalCurrentStreak ?? 0;
  const totalCorrect = sumStat(profile, "totalCorrect");
  const totalPlayed = sumStat(profile, "totalPlayed");
  const overallAccuracy = totalPlayed > 0 ? totalCorrect / totalPlayed : 0;
  const dailyCompletions = profile.dailyChallengeCompletions?.length ?? 0;
  const sessionCorrect = session?.sessionCorrect ?? 0;
  const sessionTotal = session?.sessionTotal ?? 0;
  const sessionEnded = session?.sessionEnded ?? false;

  return {
    "first-steps": totalPlayed >= 1,
    "streak-5": globalStreak >= 5,
    "streak-10": globalStreak >= 10,
    "streak-25": globalStreak >= 25,
    "streak-50": globalStreak >= 50,
    "streak-75": globalStreak >= 75,
    "streak-100": globalStreak >= 100,
    "best-streak-20": maxBestStreak(profile) >= 20,
    "best-streak-40": maxBestStreak(profile) >= 40,
    "played-50": totalPlayed >= 50,
    "played-250": totalPlayed >= 250,
    "correct-25": totalCorrect >= 25,
    "correct-100": totalCorrect >= 100,
    "correct-250": totalCorrect >= 250,
    "correct-500": totalCorrect >= 500,
    "correct-1000": totalCorrect >= 1000,
    "flag-rookie": modeCorrectCount(profile, "flag-to-country") >= 10,
    "flag-fanatic": modeCorrectCount(profile, "flag-to-country") >= 50,
    "flag-master": modeCorrectCount(profile, "flag-to-country") >= 150,
    "capital-hunter": modeCorrectCount(profile, "capital-to-country") >= 25,
    "capital-sage": modeCorrectCount(profile, "capital-to-country") >= 50,
    "capital-namer": modeCorrectCount(profile, "country-to-capital") >= 25,
    "shape-spotter": modeCorrectCount(profile, "shape-to-country") >= 25,
    "shape-master": modeCorrectCount(profile, "shape-to-country") >= 75,
    "flag-picker": modeCorrectCount(profile, "country-to-flag") >= 25,
    "border-boss": modeCorrectCount(profile, "neighbor-quiz") >= 25,
    "population-prophet": modeCorrectCount(profile, "population-showdown") >= 25,
    "marathon-runner": mode === "marathon" && stats.currentStreak >= 15,
    "marathon-25": mode === "marathon" && stats.currentStreak >= 25,
    "marathon-40": mode === "marathon" && stats.currentStreak >= 40,
    "marathon-60": mode === "marathon" && stats.currentStreak >= 60,
    "speed-rookie": modeCorrectCount(profile, "speed-round") >= 20,
    "speed-demon":
      mode === "speed-round" && sessionEnded && sessionCorrect >= 15,
    "speed-frenzy":
      mode === "speed-round" && sessionEnded && sessionCorrect >= 25,
    "daily-devotee": dailyCompletions >= 1,
    "daily-regular": dailyCompletions >= 5,
    "daily-veteran": dailyCompletions >= 20,
    "weak-spots-warrior": modeCorrectCount(profile, "weak-spots") >= 15,
    "accuracy-sharp": totalPlayed >= 75 && overallAccuracy >= 0.8,
    "perfect-session":
      sessionEnded && sessionTotal >= 10 && sessionCorrect === sessionTotal,
    "mode-explorer": GAME_MODES.every((gameMode) => profile.stats[gameMode.id].totalPlayed > 0),
    "mode-master": modesWithMinCorrect(profile, 25) >= 5,
    "africa-master": continentMastery(profile, ["Africa"], 20),
    "asia-master": continentMastery(profile, ["Asia"], 20),
    "europe-master": continentMastery(profile, ["Europe"], 20),
    "americas-master": continentMastery(profile, ["North America", "South America"], 15),
    "oceania-master": continentMastery(profile, ["Oceania"], 10),
    "antarctica-explorer": continentMastery(profile, ["Antarctica"], 3),
    "country-collector": countriesAnswered(profile) >= 50,
    "country-completionist": countriesAnswered(profile) >= 100,
  };
}

export function checkAchievements(
  profile: Profile,
  mode: GameMode,
  session?: AchievementSessionContext,
): string[] {
  const newAchievements: string[] = [];
  const checks = buildAchievementChecks(profile, mode, session);

  for (const achievement of ACHIEVEMENTS) {
    if (checks[achievement.id] && !profile.achievements.includes(achievement.id)) {
      newAchievements.push(achievement.id);
    }
  }

  return newAchievements;
}
