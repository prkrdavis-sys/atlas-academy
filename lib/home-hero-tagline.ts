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

export function pickHomeHeroTagline(context: HomeHeroTaglineContext): string {
  const candidates = buildHomeHeroTaglineCandidates(context);
  return pickRandom(candidates);
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

  if (dailyRun > 0 && !dailyCompletedToday) {
    candidates.push(
      `${dailyRun}-day daily run on the line — finish today's challenge to keep the chain alive.`,
      `Your ${dailyRun}-day daily run is waiting. Complete today's challenge before midnight Eastern.`,
    );
  } else if (dailyRun > 0 && dailyCompletedToday) {
    candidates.push(
      `${dailyRun}-day daily run secured. Can you beat today's best of ${todayBest}?`,
      `Daily run intact at ${dailyRun} days — now chase a new best for today.`,
    );
  } else if (!dailyCompletedToday) {
    candidates.push(
      "Finish today's daily challenge to start your daily run streak.",
      "The daily challenge is 10 mixed questions — a quick way to warm up every day.",
    );
  }

  if (weakSpotCount > 0) {
    candidates.push(
      `Practice Weak Spots is ready with ${weakSpotCount} commonly missed ${weakSpotCount === 1 ? scopeInfo.noun : scopeInfo.nounPlural}.`,
      `You have ${weakSpotCount} weak spots saved — Practice mode drills the places you miss most.`,
      `Try Practice mode to review ${weakSpotCount} ${weakSpotCount === 1 ? "place" : "places"} you commonly miss.`,
    );
  } else {
    candidates.push(
      "Practice Weak Spots builds a personalized review list from the places you miss.",
      "Miss a few answers and Practice mode will start collecting weak spots for you.",
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
    candidates.push(
      `${modesTried} modes tried — last up was ${lastMode.title}.`,
      `You've explored ${modesTried} different modes. ${lastMode.title} is queued up if you want more.`,
    );
  }

  candidates.push(
    "Mixed mode shuffles flags, capitals, shapes, and more — great when you want variety.",
    "Speed Round gives you 60 seconds — how many can you get?",
    "Marathon keeps going until your first mistake. How far can you run?",
    "Neighbor Quiz is perfect for learning which countries share borders.",
    "Population Showdown asks a simple question: which place has more people?",
    "Countries from facts pulls trivia straight from the Library.",
    "Country shapes are a signature mode — identify places from silhouettes alone.",
    `Browse the ${scopeInfo.libraryTitle} for flags, capitals, shapes, neighbors, and facts.`,
    "Pan and zoom the World Map, then click any country to open its Library page.",
    "The USA Map covers all 50 states with the same click-to-explore flow.",
    `Switch to ${otherScopeInfo.shortLabel} anytime — separate streaks and daily runs for each scope.`,
    "Hard mode makes you type your answer — the real challenge tier.",
    "Explore the globe from setup to pick your mode, difficulty, and region filters.",
    "The daily challenge resets at midnight Eastern — one fresh set every day.",
    "Review today's daily answers after you finish to see what you missed.",
    "Stats tracks streaks, mode breakdowns, and achievements in one place.",
    "Library pages include context maps so you can see where each place sits.",
    "Use recent mode shortcuts below Play to jump between your favorite challenges.",
  );

  return candidates;
}

export function getGuestHomeHeroTagline(scope: GameScope): string {
  const scopeInfo = SCOPE_INFO[scope];
  const tips = [
    scopeInfo.tagline,
    "Create a profile to save streaks, stats, and daily progress on this device.",
    "Practice Weak Spots reviews the places you miss most once you start playing.",
    "Pan and zoom the World Map or USA Map, then click any place to open the Library.",
    "Mixed mode shuffles flags, capitals, shapes, and more.",
    "The daily challenge is 10 mixed questions — a fresh set every day.",
  ];
  return pickRandom(tips);
}
