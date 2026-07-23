import { modeRef } from "@/lib/mode-ref";
import { getScopedModeInfo, SCOPE_INFO } from "@/lib/scope";
import {
  getCommonlyMissedCountries,
  maxGlobalBestStreak,
  modesWithMinPlayed,
  sumStatAcrossDifficulties,
} from "@/lib/stats-helpers";
import { getStreakTier } from "@/lib/streak-tier";
import type { GameScope, GlobalStreakSnapshot, Profile } from "@/lib/types";
import { ACHIEVEMENTS } from "@/lib/types";

export type HomeHeroTaglineContext = {
  profile: Profile;
  scope: GameScope;
  streak: GlobalStreakSnapshot;
  todayBest: number;
  storedTodayBest: number;
  dailyRun: number;
  dailyCompletedToday: boolean;
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function pickRandomExcluding<T>(items: T[], exclude?: T): T {
  if (!exclude || items.length <= 1) {
    return pickRandom(items);
  }

  const filtered = items.filter((item) => item !== exclude);
  return pickRandom(filtered.length ? filtered : items);
}

export function pickHomeHeroTagline(context: HomeHeroTaglineContext): string {
  const candidates = buildHomeHeroTaglineCandidates(context);
  return pickRandom(candidates);
}

export function pickHomeHeroTaglineExcluding(
  context: HomeHeroTaglineContext,
  exclude?: string,
): string {
  const candidates = buildHomeHeroTaglineCandidates(context);
  return pickRandomExcluding(candidates, exclude);
}

export function buildHomeHeroTaglineCandidates({
  profile,
  scope,
  streak,
  todayBest,
  storedTodayBest,
  dailyRun,
  dailyCompletedToday,
}: HomeHeroTaglineContext): string[] {
  const { currentStreak, bestStreak } = streak;
  const scopeInfo = SCOPE_INFO[scope];
  const streakTier = getStreakTier(currentStreak);
  const chasingTodayBest =
    storedTodayBest > 0 && currentStreak > 0 && currentStreak < storedTodayBest;
  const beatTodayBest = storedTodayBest > 0 && currentStreak > storedTodayBest;
  const weakSpotCount = getCommonlyMissedCountries(profile, scope).length;
  const totalPlayed = sumStatAcrossDifficulties(profile, "totalPlayed", scope);
  const totalCorrect = sumStatAcrossDifficulties(profile, "totalCorrect", scope);
  const achievementCount = profile.achievements.length;
  const modesTried = modesWithMinPlayed(profile, 1, scope);
  const allTimeBest = maxGlobalBestStreak(profile, scope);
  const lastMode = getScopedModeInfo(profile.settings.lastSelectedMode, scope);
  const otherScope = scope === "world" ? "usa" : "world";
  const otherScopeInfo = SCOPE_INFO[otherScope];

  const candidates: string[] = [];

  if (currentStreak >= 10) {
    candidates.push(
      `${currentStreak} in a row — ${streakTier.label.toLowerCase()} energy. Keep it going.`,
      `You're on a ${currentStreak}-answer streak. That is serious atlas momentum.`,
    );
  } else if (currentStreak >= 3) {
    candidates.push(
      `${currentStreak} correct in a row — nice rhythm. One more round?`,
      `A ${currentStreak}-answer streak is building. Stay sharp.`,
    );
  } else if (currentStreak > 0) {
    candidates.push("Every correct answer builds your streak — keep stacking them.");
  }

  if (beatTodayBest) {
    candidates.push(
      `New personal best for today at ${currentStreak}! See how far you can push it.`,
      `You just beat today's best with a ${currentStreak} streak. Keep climbing.`,
    );
  } else if (chasingTodayBest) {
    const gap = storedTodayBest - currentStreak;
    candidates.push(
      `${gap} away from today's best of ${storedTodayBest} — one strong round could do it.`,
      `You're chasing today's best (${storedTodayBest}). ${gap} more correct answers to match it.`,
    );
  }

  const dailyChallenge = modeRef("daily-challenge");
  const practiceWeakSpots = modeRef("weak-spots");

  if (dailyRun > 0 && !dailyCompletedToday) {
    candidates.push(
      `${dailyRun}-day daily run on the line — finish today's ${dailyChallenge} to keep the chain alive.`,
      `Your ${dailyRun}-day daily run is waiting. Complete today's ${dailyChallenge} before midnight Eastern.`,
    );
  } else if (dailyRun > 0 && dailyCompletedToday) {
    candidates.push(
      `${dailyRun}-day daily run secured. Can you beat today's best of ${todayBest}?`,
      `Daily run intact at ${dailyRun} days — now chase a new best for today.`,
    );
  } else if (!dailyCompletedToday) {
    candidates.push(
      `Finish today's ${dailyChallenge} to start your daily run streak.`,
      `${dailyChallenge} is 10 mixed questions — a quick way to warm up every day.`,
    );
  }

  if (weakSpotCount > 0) {
    candidates.push(
      `${practiceWeakSpots} is ready with ${weakSpotCount} commonly missed ${weakSpotCount === 1 ? scopeInfo.noun : scopeInfo.nounPlural}.`,
      `You have ${weakSpotCount} weak spots saved — ${practiceWeakSpots} drills the places you miss most.`,
      `Try ${practiceWeakSpots} to review ${weakSpotCount} ${weakSpotCount === 1 ? "place" : "places"} you commonly miss.`,
    );
  } else {
    candidates.push(
      `${practiceWeakSpots} builds a personalized review list from the places you miss.`,
      `Miss a few answers and ${practiceWeakSpots} will start collecting weak spots for you.`,
    );
  }

  if (totalPlayed >= 50) {
    candidates.push(
      `${totalCorrect} correct out of ${totalPlayed} ${scopeInfo.nounPlural} answered — real progress.`,
      `${totalPlayed} questions played in ${scopeInfo.shortLabel}. Keep exploring.`,
    );
  } else if (totalPlayed === 0) {
    candidates.push(
      `Jump in and set the bar for today in ${scopeInfo.label}.`,
      `Your first ${scopeInfo.noun} is waiting — tap Play to start.`,
    );
  } else {
    candidates.push("A few rounds today and you'll feel the map start to stick.");
  }

  if (bestStreak > 0 && bestStreak > currentStreak) {
    candidates.push(
      `Your all-time best is ${allTimeBest}. Today is a good day to chase it.`,
      `Best streak so far: ${bestStreak}. You have done it before — go again.`,
    );
  }

  if (achievementCount > 0) {
    candidates.push(
      `${achievementCount} of ${ACHIEVEMENTS.length} achievements unlocked — check Stats for the next target.`,
      `You have ${achievementCount} achievement${achievementCount === 1 ? "" : "s"}. Stats shows what to chase next.`,
    );
  }

  if (modesTried >= 4 && lastMode) {
    const lastModeRef = modeRef(lastMode.id);
    candidates.push(
      `${modesTried} modes tried — last up was ${lastModeRef}.`,
      `You've explored ${modesTried} different modes. ${lastModeRef} is queued up if you want more.`,
    );
  }

  candidates.push(
    `${modeRef("mixed")} shuffles flags, capitals, shapes, and more — great when you want variety.`,
    `${modeRef("speed-round")} gives you 60 seconds — how many can you get?`,
    `${modeRef("marathon")} keeps going until your first mistake. How far can you run?`,
    `${modeRef("neighbor-quiz")} is perfect for learning which countries share borders.`,
    `${modeRef("population-showdown")} asks a simple question: which place has more people?`,
    `${modeRef("fact-to-country")} draws on curated geographic details from the Library.`,
    `${modeRef("shape-to-country")} is a signature challenge — identify places from silhouettes alone.`,
    `Browse the ${scopeInfo.libraryTitle} for flags, capitals, shapes, neighbors, and geographic profiles.`,
    "Pan and zoom the World Map, then click any country to open its Library page.",
    "The USA Map covers all 50 states with the same click-to-explore flow.",
    `Switch to ${otherScopeInfo.shortLabel} anytime — separate streaks and daily runs for each scope.`,
    "Hard difficulty makes you type your answer — the real challenge tier.",
    "Tap Choose your Journey to pick your mode, difficulty, and region filters.",
    `${dailyChallenge} resets at midnight Eastern — one fresh set every day.`,
    "Review today's daily answers after you finish to see what you missed.",
    "Stats tracks streaks, mode breakdowns, and achievements in one place.",
    "Library pages include context maps so you can see where each place sits.",
    "Use Quick swap below Play to jump between your recently played modes.",
  );

  return candidates;
}

function buildGuestHomeHeroTaglineCandidates(scope: GameScope): string[] {
  const scopeInfo = SCOPE_INFO[scope];
  return [
    scopeInfo.tagline,
    "Create a profile to save streaks, stats, and daily progress on this device.",
    `${modeRef("weak-spots")} reviews the places you miss most once you start playing.`,
    "Pan and zoom the World Map or USA Map, then click any place to open the Library.",
    `${modeRef("mixed")} shuffles flags, capitals, shapes, and more.`,
    `${modeRef("daily-challenge")} is 10 mixed questions — a fresh set every day.`,
  ];
}

export function getGuestHomeHeroTagline(scope: GameScope): string {
  return pickRandom(buildGuestHomeHeroTaglineCandidates(scope));
}

export function getGuestHomeHeroTaglineExcluding(scope: GameScope, exclude?: string): string {
  return pickRandomExcluding(buildGuestHomeHeroTaglineCandidates(scope), exclude);
}
