"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameBoard } from "@/components/GameBoard";
import { QuickStartOverlay } from "@/components/QuickStartOverlay";
import { useProfiles, useRequiredProfile } from "@/components/ProfileProvider";
import {
  buildSettingsPatch,
  createSetupDraftFromProfile,
  getPlayablePoolForDraft,
  resolvePlayConfig,
} from "@/lib/game-setup";
import {
  DAILY_COUNTING_SESSION_KEY,
  formatDailyDate,
  getDailyChallengeRun,
  getDailyDateKey,
  getDailySeed,
  hasCompletedDailyToday,
  hasPlayedDailyToday,
} from "@/lib/game-engine";
import { getScopedModeInfo, scopedDailyKey, scopedHref } from "@/lib/scope";
import { getCommonlyMissedCountries } from "@/lib/stats-helpers";
import { recordModeSelection, updateProfileSettings } from "@/lib/storage";
import { useResolvedGameScope } from "@/lib/use-game-scope";
import {
  CONTINENTS,
  DAILY_CHALLENGE_QUESTION_COUNT,
  US_REGIONS,
  clampRoundQuestionSetting,
  isChallengeModifierActive,
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
  const scope = useResolvedGameScope();
  const isUsa = scope === "usa";

  const resolved = resolvePlayConfig(
    {
      ...profile,
      settings: { ...profile.settings, lastSelectedMode: requestedMode },
    },
    requestedMode,
    scope ?? "world",
  );
  const mode = resolved.mode;
  const challengeModifier = resolved.challengeModifier;
  const modeInfo = scope ? getScopedModeInfo(mode, scope) : undefined;
  const draft = createSetupDraftFromProfile(profile, mode, scope ?? "world");
  const activeChallengeModifier = isChallengeModifierActive(challengeModifier)
    ? challengeModifier
    : draft.challengeModifier;

  const isDailyChallenge = requestedMode === "daily-challenge";
  const dailyDateLabel = isDailyChallenge ? formatDailyDate() : null;
  const dailyCompletedToday =
    isDailyChallenge && scope
      ? hasCompletedDailyToday(profile.dailyChallengeCompletions, scope)
      : false;
  const dailyRun =
    isDailyChallenge && scope
      ? getDailyChallengeRun(profile.dailyChallengeCompletions, scope)
      : 0;
  const dailyContinents: Region[] = isUsa ? [...US_REGIONS] : [...CONTINENTS];
  const dailyDifficulty: Difficulty = "medium";

  const weakSpotCodes =
    mode === "weak-spots" && scope
      ? getCommonlyMissedCountries(profile, scope)
      : undefined;

  const availableCountryCount =
    modeInfo && scope
      ? getPlayablePoolForDraft(profile, { ...draft, mode, challengeModifier: activeChallengeModifier }, scope)
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
    if (!scope) return;
    if (requestedMode !== mode && requestedMode === "weak-spots") {
      router.replace(scopedHref(`/play/${mode}`, scope, { autostart: "1" }));
    }
  }, [requestedMode, mode, router, scope]);

  /* eslint-disable react-hooks/set-state-in-effect -- game bootstrap after scope resolves */
  useLayoutEffect(() => {
    if (!scope) return;
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
      recordModeSelection(profile.id, "daily-challenge");
      setCountStats(shouldCountStats);
    } else {
      const settingsDraft = { ...draft, mode, challengeModifier: activeChallengeModifier };
      const poolSize = getPlayablePoolForDraft(profile, settingsDraft, scope);
      updateProfileSettings(profile.id, buildSettingsPatch(settingsDraft, scope, poolSize));
      recordModeSelection(profile.id, mode);
      refresh();
    }

    setSessionKey((key) => key + 1);
    setStarted(true);
    setShowOverlay(true);
  }, [scope]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handlePlayAgain() {
    setSessionKey((key) => key + 1);
    setShowOverlay(true);
  }

  if (!modeInfo && !isDailyChallenge) {
    return <p>Unknown game mode.</p>;
  }

  if (!started || !scope) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:pt-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">Starting game…</p>
      </div>
    );
  }

  const challengeActive = isChallengeModifierActive(activeChallengeModifier);

  const gameProps = {
    mode,
    scope,
    challengeModifier: activeChallengeModifier,
    continents: isDailyChallenge ? dailyContinents : draft.continents,
    includeTerritories: isDailyChallenge ? false : draft.includeTerritories,
    difficulty: isDailyChallenge ? dailyDifficulty : draft.difficulty,
    weakSpotCodes,
    seed: isDailyChallenge ? getDailySeed(scope) : undefined,
    timed: challengeActive && activeChallengeModifier === "speed-round",
    stopOnWrong: challengeActive && activeChallengeModifier === "marathon",
    maxQuestions: isDailyChallenge
      ? DAILY_CHALLENGE_QUESTION_COUNT
      : challengeActive
        ? undefined
        : effectiveRoundQuestionCount,
    countStats: isDailyChallenge ? countStats : true,
    interactionLocked: showOverlay,
  };

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
          mode={isDailyChallenge ? "daily-challenge" : mode}
          scope={scope}
          challengeModifier={isDailyChallenge ? "none" : activeChallengeModifier}
          difficulty={isDailyChallenge ? dailyDifficulty : draft.difficulty}
          roundQuestionCount={
            isDailyChallenge ? DAILY_CHALLENGE_QUESTION_COUNT : effectiveRoundQuestionCount
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
