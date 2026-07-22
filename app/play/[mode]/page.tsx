"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { GameBoard } from "@/components/GameBoard";
import { QuickStartOverlay } from "@/components/QuickStartOverlay";
import { useProfiles, useRequiredProfile } from "@/components/ProfileProvider";
import { createSetupDraftFromProfile, resolvePlayMode } from "@/lib/game-setup";
import { getPlayablePoolSize } from "@/lib/countries";
import {
  DAILY_COUNTING_SESSION_KEY,
  formatDailyDate,
  getDailyChallengeRun,
  getDailyDateKey,
  getDailySeed,
  hasCompletedDailyToday,
  hasPlayedDailyToday,
} from "@/lib/game-engine";
import { getScopedModeInfo, normalizeScope, scopedDailyKey, scopeQuery } from "@/lib/scope";
import { getCommonlyMissedCountries } from "@/lib/stats-helpers";
import { recordModeSelection, updateProfileSettings } from "@/lib/storage";
import {
  CONTINENTS,
  DAILY_CHALLENGE_QUESTION_COUNT,
  US_REGIONS,
  clampRoundQuestionSetting,
  type Continent,
  type Difficulty,
  type GameMode,
  type Region,
  type UsRegion,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function PlayPageInner() {
  const params = useParams<{ mode: string }>();
  const router = useRouter();
  const { refresh } = useProfiles();
  const profile = useRequiredProfile();
  const requestedMode = params.mode as GameMode;
  const scope = normalizeScope(useSearchParams().get("scope"));
  const isUsa = scope === "usa";

  const resolved = resolvePlayMode(
    {
      ...profile,
      settings: { ...profile.settings, lastSelectedMode: requestedMode },
    },
    scope,
  );
  const mode = resolved.mode;
  const modeInfo = getScopedModeInfo(mode, scope);
  const draft = createSetupDraftFromProfile(profile, mode, scope);

  const isDailyChallenge = mode === "daily-challenge";
  const dailyDateLabel = isDailyChallenge ? formatDailyDate() : null;
  const dailyCompletedToday = isDailyChallenge
    ? hasCompletedDailyToday(profile.dailyChallengeCompletions, scope)
    : false;
  const dailyRun = isDailyChallenge
    ? getDailyChallengeRun(profile.dailyChallengeCompletions, scope)
    : 0;
  const dailyContinents: Region[] = isUsa ? [...US_REGIONS] : [...CONTINENTS];
  const dailyDifficulty: Difficulty = "medium";

  const weakSpotCodes =
    mode === "weak-spots" ? getCommonlyMissedCountries(profile, scope) : undefined;

  const availableCountryCount = modeInfo
    ? getPlayablePoolSize({
        continents: draft.continents,
        includeTerritories: draft.includeTerritories,
        mode,
        questionType:
          mode === "speed-round" || mode === "marathon" ? draft.questionType : undefined,
        weakSpotCodes,
        scope,
      })
    : 0;
  const effectiveRoundQuestionCount = clampRoundQuestionSetting(
    draft.roundQuestionCount,
    availableCountryCount,
  );

  const [started, setStarted] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [countStats, setCountStats] = useState(true);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (requestedMode !== mode && requestedMode === "weak-spots") {
      router.replace(`/play/${mode}${scopeQuery(scope)}?autostart=1`);
    }
  }, [requestedMode, mode, router, scope]);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time game bootstrap on mount */
  useLayoutEffect(() => {
    if (autoStartedRef.current || started) return;
    if (!modeInfo) return;
    if (mode === "weak-spots" && !weakSpotCodes?.length) return;
    if (!isDailyChallenge && availableCountryCount === 0) return;

    autoStartedRef.current = true;

    if (isDailyChallenge) {
      const today = scopedDailyKey(getDailyDateKey(), scope);
      const playedToday = hasPlayedDailyToday(profile.dailyChallengePlayedDates, scope);
      const activeSession =
        typeof window !== "undefined" &&
        sessionStorage.getItem(DAILY_COUNTING_SESSION_KEY) === today;
      const shouldCountStats = !playedToday || activeSession;
      if (shouldCountStats && typeof window !== "undefined") {
        sessionStorage.setItem(DAILY_COUNTING_SESSION_KEY, today);
      }
      recordModeSelection(profile.id, mode);
      setCountStats(shouldCountStats);
    } else {
      updateProfileSettings(profile.id, {
        lastSelectedMode: mode,
        ...(isUsa
          ? { lastRegionFilter: draft.continents as UsRegion[] }
          : {
              lastContinentFilter: draft.continents as Continent[],
              includeTerritories: draft.includeTerritories,
            }),
        difficulty: draft.difficulty,
        roundQuestionCount: effectiveRoundQuestionCount,
        ...(mode === "speed-round" ? { speedRoundQuestionType: draft.questionType } : {}),
        ...(mode === "marathon" ? { marathonQuestionType: draft.questionType } : {}),
      });
      recordModeSelection(profile.id, mode);
      refresh();
    }

    setSessionKey((key) => key + 1);
    setStarted(true);
    setShowOverlay(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap game once on mount
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handlePlayAgain() {
    setSessionKey((key) => key + 1);
    setShowOverlay(true);
  }

  if (!modeInfo) {
    return <p>Unknown game mode.</p>;
  }

  const gameProps = {
    mode,
    scope,
    continents: isDailyChallenge ? dailyContinents : draft.continents,
    includeTerritories: isDailyChallenge ? false : draft.includeTerritories,
    difficulty: isDailyChallenge ? dailyDifficulty : draft.difficulty,
    weakSpotCodes,
    seed: isDailyChallenge ? getDailySeed(scope) : undefined,
    timed: mode === "speed-round",
    stopOnWrong: mode === "marathon",
    maxQuestions: isDailyChallenge
      ? DAILY_CHALLENGE_QUESTION_COUNT
      : mode === "speed-round"
        ? undefined
        : effectiveRoundQuestionCount,
    questionType:
      mode === "speed-round" || mode === "marathon" ? draft.questionType : undefined,
    countStats: isDailyChallenge ? countStats : true,
    interactionLocked: showOverlay,
  };

  if (!started) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:pt-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">Starting game…</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:pt-5">
      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col",
          showOverlay && "pointer-events-none select-none blur-[2px]",
        )}
      >
        <GameBoard key={sessionKey} {...gameProps} onPlayAgain={handlePlayAgain} />
      </div>
      {showOverlay ? (
        <QuickStartOverlay
          mode={mode}
          scope={scope}
          difficulty={isDailyChallenge ? dailyDifficulty : draft.difficulty}
          roundQuestionCount={
            isDailyChallenge ? DAILY_CHALLENGE_QUESTION_COUNT : effectiveRoundQuestionCount
          }
          questionType={
            mode === "speed-round" || mode === "marathon" ? draft.questionType : undefined
          }
          profile={profile}
          dailyDateLabel={dailyDateLabel}
          dailyRun={dailyRun}
          dailyCompletedToday={dailyCompletedToday}
          onDismiss={() => setShowOverlay(false)}
        />
      ) : null}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense>
      <PlayPageInner />
    </Suspense>
  );
}
