"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { HomePlayHero } from "@/components/HomePlayHero";
import type { GlobeHandle } from "@/components/home/GlobeBackground";
import { useProfiles } from "@/components/ProfileProvider";
import { getDailyChallengeRun, hasCompletedDailyToday } from "@/lib/game-engine";
import { useGameScope } from "@/lib/use-game-scope";
import { getGlobalStreakOrZero, getTodayBestStreakDisplay, getTodayBestStreakOrZero } from "@/lib/stats-helpers";

// 3D space backdrop is client-only and loaded lazily so the rest of the app
// never pays for three.js.
const GlobeBackground = dynamic(() => import("@/components/home/GlobeBackground"), {
  ssr: false,
});

export default function HomePage() {
  const { activeProfile, hydrated, refresh } = useProfiles();
  const profile = hydrated ? activeProfile : null;
  const heroRef = useRef<HTMLElement>(null);
  const globeHandleRef = useRef<GlobeHandle>(null);
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
    <div className="flex min-h-0 flex-1 flex-col">
      <GlobeBackground profile={profile} handleRef={globeHandleRef} />
      <HomePlayHero
        profile={profile}
        scope={scope}
        onRefresh={refresh}
        streak={globalStreak}
        todayBest={todayBest}
        storedTodayBest={storedTodayBest}
        dailyRun={dailyRun}
        dailyCompletedToday={dailyCompletedToday}
        globeHandleRef={globeHandleRef}
        heroRef={heroRef}
      />
    </div>
  );
}
