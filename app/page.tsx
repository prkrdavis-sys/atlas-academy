"use client";

import { useRef } from "react";
import { HomePlayHero } from "@/components/HomePlayHero";
import { useProfiles } from "@/components/ProfileProvider";
import { getDailyChallengeRun, hasCompletedDailyToday } from "@/lib/game-engine";
import { useGameScope } from "@/lib/use-game-scope";
import { getGlobalStreakOrZero, getTodayBestStreakDisplay, getTodayBestStreakOrZero } from "@/lib/stats-helpers";

export default function HomePage() {
  const { activeProfile, hydrated, refresh } = useProfiles();
  const profile = hydrated ? activeProfile : null;
  const heroRef = useRef<HTMLElement>(null);
  const { scope } = useGameScope({ layoutAnchorRef: heroRef });

  const difficulty = profile?.settings.difficulty ?? "easy";
  const globalStreak = getGlobalStreakOrZero(profile, difficulty, scope);
  const todayBest = getTodayBestStreakDisplay(profile, difficulty, scope);
  const storedTodayBest = getTodayBestStreakOrZero(profile, difficulty, scope);
  const dailyRun = profile ? getDailyChallengeRun(profile.dailyChallengeCompletions, scope) : 0;
  const dailyCompletedToday = profile
    ? hasCompletedDailyToday(profile.dailyChallengeCompletions, scope)
    : false;

  return (
    <HomePlayHero
      profile={profile}
      scope={scope}
      onRefresh={refresh}
      streak={globalStreak}
      todayBest={todayBest}
      storedTodayBest={storedTodayBest}
      dailyRun={dailyRun}
      dailyCompletedToday={dailyCompletedToday}
      heroRef={heroRef}
    />
  );
}
