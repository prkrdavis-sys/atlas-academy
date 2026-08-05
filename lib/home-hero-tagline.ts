import { getMainPlayMode } from "@/lib/game-setup";
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

/** Hidden UX features and navigation tips — the main pro-tip pool. */
function buildUxProTips(scope: GameScope): string[] {
  const scopeInfo = SCOPE_INFO[scope];
  const otherScope = scope === "world" ? "usa" : "world";
  const otherScopeInfo = SCOPE_INFO[otherScope];
  const practiceWeakSpots = modeRef("weak-spots");
  const dailyChallenge = modeRef("daily-challenge");
  const atlasle = modeRef("atlasle");

  return [
    "Tap this pro tip anytime to shuffle to another hidden feature.",

    "Open your profile menu (top right) to find Stats — streaks, accuracy, and achievements live there.",
    "Stats has an Achievements tab — see what's unlocked and what's left to earn.",
    "Advanced stats (from the Stats page) shows full mode tables and your commonly missed list.",
    "The Stats chart switches between accuracy, questions played, and best streak per mode.",
    "Your Explorer rank on Stats reflects how many places you've mastered on the map.",

    "The flame in the header tracks your login streak — tap it for this week's calendar.",
    "Login streak and answer streak are different — the flame is about showing up daily.",

    `In Library, change Sort to Commonly missed to browse ${scopeInfo.nounPlural} you've gotten wrong.`,
    "The search bar on Library finds any place by name — jump straight to a country or state.",
    "Region filters on Library are remembered — pick a continent and come back later.",
    "Going back from a Library page restores your scroll position in the list.",
    "Each Library page includes a context map showing where the place sits geographically.",
    "Library pages link to neighboring places — follow them to explore borders.",
    "Library pages show live local time for each place's primary timezone.",

    "The Map tab switches between Globe and USA views — your choice is remembered.",
    "On the flat map, colors show mastery progress — Normal climbs teal to gold, Hard goes violet to legendary rainbow.",
    "The map has Normal and Hard progress tiers — toggle them to see different mastery levels.",
    "Easy difficulty doesn't count toward map progress — great for learning without pressure.",
    "Pan and zoom the map, then click any place to see its progress and open the Library.",
    "Scroll down on the Map page for a progress summary and explorer rank.",
    "Drag the globe on the home screen to spin it — tap to open your progress map.",

    "Tap Change under Play to adjust mode, difficulty, round length, and region filters.",
    "Choose a mode from the setup page to focus on flags, capitals, shapes, or trivia.",
    "Filter by continent in game setup to drill a single region at a time.",
    "Toggle Include territories in setup when you want smaller places in the question pool.",
    "Hard difficulty makes you type answers — no multiple-choice safety net.",
    "Advanced options in mode setup add Speed Round (60 seconds) or Marathon (until you miss).",

    "After a wrong answer, the learn card shows facts, a flag, and a mini context map.",
    `${practiceWeakSpots} drills your commonly missed list — find it under More ways to play.`,
    `${atlasle} gives you up to six guesses with clues that unlock as you miss.`,
    `${dailyChallenge} resets at midnight Eastern — replaying after finishing won't change stats.`,
    "After finishing today's Daily Challenge, tap Review to walk through every answer again.",

    `World and ${otherScopeInfo.shortLabel} have separate streaks, stats, and daily runs.`,
    `Switch between World and ${otherScopeInfo.shortLabel} on a mode's settings page.`,

    "Your profile menu has sound, dark mode, and globe appearance toggles.",
    "Turn on Globe day/night in the profile menu for real-time sunlight on the 3D globe.",
    "Switch USA on the globe between 50 states or one country from the profile menu.",

    "Use Backup & restore on Profiles to keep a portable copy of your account's progress.",
    "Multiple player profiles can live in one account — switch between them in the profile menu.",

    "Use Map, Play, and Library in the bottom nav (mobile) or header tabs (desktop) to jump around.",
  ];
}

function buildGuestUxProTips(scope: GameScope): string[] {
  const scopeInfo = SCOPE_INFO[scope];
  const otherScope = scope === "world" ? "usa" : "world";
  const otherScopeInfo = SCOPE_INFO[otherScope];

  return [
    "Create a profile to unlock Stats, commonly missed sorting, and saved progress.",
    "Tap this pro tip anytime to shuffle to another hidden feature.",
    `In Library, sort by Commonly missed once you have a profile — it surfaces ${scopeInfo.nounPlural} you miss most.`,
    "The search bar on Library finds any place by name.",
    "Each Library page includes a context map and links to neighboring places.",
    "The Map tab switches between Globe and USA views.",
    "Pan and zoom the map, then click any place to open its Library page.",
    "Drag the globe on the home screen to spin it — tap to open the map.",
    "Tap Change under Play to pick mode, difficulty, and region filters.",
    "Hard difficulty makes you type answers — no multiple-choice safety net.",
    `World and ${otherScopeInfo.shortLabel} are separate scopes with their own content.`,
    "Your profile menu (once signed in) holds Stats, sound, theme, and globe toggles.",
    "Use Map, Play, and Library in the bottom nav (mobile) or header tabs (desktop) to jump around.",
  ];
}

function buildPersonalizedTaglines({
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
  const achievementCount = profile.achievements.length;
  const modesTried = modesWithMinPlayed(profile, 1, scope);
  const allTimeBest = maxGlobalBestStreak(profile, scope);
  const lastMode = getScopedModeInfo(getMainPlayMode(profile), scope);

  const candidates: string[] = [];
  const dailyChallenge = modeRef("daily-challenge");
  const practiceWeakSpots = modeRef("weak-spots");

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
      `${dailyRun}-day daily run on the line — finish today's ${dailyChallenge} to keep the chain alive.`,
      `Your ${dailyRun}-day daily run is waiting. Complete today's ${dailyChallenge} before midnight Eastern.`,
    );
  } else if (dailyRun > 0 && dailyCompletedToday) {
    candidates.push(
      `${dailyRun}-day daily run secured. Can you beat today's best of ${todayBest}?`,
      `Daily run intact at ${dailyRun} days — now chase a new best for today.`,
    );
  }

  if (weakSpotCount > 0) {
    candidates.push(
      `${practiceWeakSpots} is ready with ${weakSpotCount} commonly missed ${weakSpotCount === 1 ? scopeInfo.noun : scopeInfo.nounPlural}.`,
      `You have ${weakSpotCount} weak spots — sort Library by Commonly missed to study them.`,
    );
  }

  if (totalPlayed === 0) {
    candidates.push(
      `Your first ${scopeInfo.noun} is waiting — tap Play to start.`,
    );
  }

  if (bestStreak > 0 && bestStreak > currentStreak && allTimeBest > 0) {
    candidates.push(
      `Your all-time best is ${allTimeBest}. Today is a good day to chase it.`,
    );
  }

  if (achievementCount > 0) {
    candidates.push(
      `${achievementCount} of ${ACHIEVEMENTS.length} achievements unlocked — open Stats → Achievements for the next target.`,
    );
  }

  if (modesTried >= 4 && lastMode) {
    const lastModeRef = modeRef(lastMode.id);
    candidates.push(
      `${modesTried} modes tried — last up was ${lastModeRef}.`,
    );
  }

  return candidates;
}

export function buildHomeHeroTaglineCandidates(context: HomeHeroTaglineContext): string[] {
  return [...buildPersonalizedTaglines(context), ...buildUxProTips(context.scope)];
}

export function getGuestHomeHeroTagline(scope: GameScope): string {
  return pickRandom(buildGuestHomeHeroTaglineCandidates(scope));
}

export function getGuestHomeHeroTaglineExcluding(scope: GameScope, exclude?: string): string {
  return pickRandomExcluding(buildGuestHomeHeroTaglineCandidates(scope), exclude);
}

function buildGuestHomeHeroTaglineCandidates(scope: GameScope): string[] {
  const scopeInfo = SCOPE_INFO[scope];
  return [
    scopeInfo.tagline,
    ...buildGuestUxProTips(scope),
  ];
}
