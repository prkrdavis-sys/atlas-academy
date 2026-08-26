"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { GameBoard } from "@/components/GameBoard";
import { GameCrashBoundary } from "@/components/GameCrashBoundary";
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
  dailyDateKeyToDate,
  formatDailyDateKey,
  getDailyChallengeRun,
  getDailyDateKey,
  getDailySeedForDateKey,
  hasCompletedDailyToday,
  hasPlayedDailyToday,
  isValidDailyDateKey,
} from "@/lib/daily-calendar";
import { buildDailyChallengeSnapshot } from "@/lib/game-engine";
import {
  clearGameResumeSnapshot,
  consumeFreshPlay,
  loadMatchingGameResumeSnapshot,
  type GameResumeSnapshot,
} from "@/lib/game-resume";
import { getScopedModeInfo, scopedHref } from "@/lib/scope";
import { getCommonlyMissedCountries } from "@/lib/stats-helpers";
import { recordModeSelection, updateProfileSettings } from "@/lib/storage";
import { useResolvedGameScope } from "@/lib/use-game-scope";
import {
  CONTINENTS,
  DAILY_CHALLENGE_QUESTION_COUNT,
  clampRoundQuestionSetting,
  isChallengeModifierActive,
  type Difficulty,
  type GameMode,
  type Region,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function PlayPageInner() {
  const params = useParams<{ mode: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useProfiles();
  const profile = useRequiredProfile();
  const requestedMode = params.mode as GameMode;
  const scope = useResolvedGameScope();

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
  const currentDailyDateKey = getDailyDateKey();
  const requestedDailyDateKey = searchParams.get("date");
  const dailyDateKey =
    isDailyChallenge &&
    requestedDailyDateKey &&
    isValidDailyDateKey(requestedDailyDateKey) &&
    requestedDailyDateKey <= currentDailyDateKey
      ? requestedDailyDateKey
      : currentDailyDateKey;
  const dailyDate = dailyDateKeyToDate(dailyDateKey);
  const dailyDateLabel = isDailyChallenge ? formatDailyDateKey(dailyDateKey) : null;
  const dailySnapshot = isDailyChallenge ? buildDailyChallengeSnapshot(dailyDateKey) : null;
  const dailyCompletedToday =
    isDailyChallenge && scope
      ? hasCompletedDailyToday(profile.dailyChallengeCompletions, scope, dailyDate)
      : false;
  const dailyRun =
    isDailyChallenge && scope
      ? getDailyChallengeRun(profile.dailyChallengeCompletions, scope, dailyDate)
      : 0;
  const dailyContinents: Region[] = [...CONTINENTS];
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
  const [resumeSnapshot, setResumeSnapshot] = useState<GameResumeSnapshot | null>(null);
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

    const snapshot = consumeFreshPlay(requestedMode, scope)
      ? null
      : loadMatchingGameResumeSnapshot({
          mode: requestedMode,
          scope,
          profileId: profile.id,
          dailyDateKey: isDailyChallenge ? dailyDateKey : undefined,
        });
    if (snapshot) {
      autoStartedRef.current = true;
      setResumeSnapshot(snapshot);
      setCountStats(snapshot.countStats);
      if (snapshot.mode === "daily-challenge" && snapshot.countStats) {
        sessionStorage.setItem(DAILY_COUNTING_SESSION_KEY, snapshot.dailyDateKey ?? dailyDateKey);
      }
      setSessionKey((key) => key + 1);
      setStarted(true);
      setShowOverlay(false);
      return;
    }

    if (!modeInfo) return;
    if (mode === "weak-spots" && !weakSpotCodes?.length) return;
    if (!isDailyChallenge && availableCountryCount === 0) return;

    autoStartedRef.current = true;

    if (isDailyChallenge) {
      const today = dailyDateKey;
      const playedToday = hasPlayedDailyToday(profile.dailyChallengePlayedDates, scope, dailyDate);
      const activeSession =
        typeof window !== "undefined" &&
        sessionStorage.getItem(DAILY_COUNTING_SESSION_KEY) === today;
      const shouldCountStats = !playedToday || activeSession;
      if (shouldCountStats && typeof window !== "undefined") {
        sessionStorage.setItem(DAILY_COUNTING_SESSION_KEY, today);
      }
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
  }, [
    scope,
    dailyDate,
    dailyDateKey,
    isDailyChallenge,
    profile.id,
    requestedMode,
    mode,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleCrashRetry() {
    if (!scope) return;
    const snapshot = loadMatchingGameResumeSnapshot({
      mode: requestedMode,
      scope,
      profileId: profile.id,
      dailyDateKey: isDailyChallenge ? dailyDateKey : undefined,
    });
    if (snapshot) {
      setResumeSnapshot(snapshot);
      setCountStats(snapshot.countStats);
      setShowOverlay(false);
    }
    setSessionKey((key) => key + 1);
  }

  function handlePlayAgain() {
    clearGameResumeSnapshot();
    setResumeSnapshot(null);
    if (isDailyChallenge && profile.dailyChallengeResults?.[dailyDateKey]) {
      setCountStats(false);
    }
    setSessionKey((key) => key + 1);
    setShowOverlay(true);
  }

  if (!modeInfo && !isDailyChallenge && !resumeSnapshot) {
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

  const gameProps = resumeSnapshot
    ? {
        mode: resumeSnapshot.mode,
        scope: resumeSnapshot.scope,
        challengeModifier: resumeSnapshot.challengeModifier,
        continents: resumeSnapshot.continents,
        includeTerritories: resumeSnapshot.includeTerritories,
        difficulty: resumeSnapshot.difficulty,
        weakSpotCodes: resumeSnapshot.weakSpotCodes,
        seed: resumeSnapshot.seed,
        timed: resumeSnapshot.timed,
        stopOnWrong: resumeSnapshot.stopOnWrong,
        maxQuestions: resumeSnapshot.maxQuestions,
        countStats: resumeSnapshot.countStats,
        interactionLocked: false,
        resumeSnapshot,
        dailyDateKey: resumeSnapshot.dailyDateKey ?? dailyDateKey,
        dailyQuestions: resumeSnapshot.dailyQuestions ?? dailySnapshot?.questions,
      }
    : {
        mode,
        scope,
        challengeModifier: activeChallengeModifier,
        continents: isDailyChallenge ? dailyContinents : draft.continents,
        includeTerritories: isDailyChallenge ? false : draft.includeTerritories,
        difficulty: isDailyChallenge ? dailyDifficulty : draft.difficulty,
        weakSpotCodes,
        seed: isDailyChallenge ? getDailySeedForDateKey(dailyDateKey) : undefined,
        timed: isDailyChallenge ? false : challengeActive && activeChallengeModifier === "speed-round",
        stopOnWrong: challengeActive && activeChallengeModifier === "marathon",
        maxQuestions: isDailyChallenge
          ? DAILY_CHALLENGE_QUESTION_COUNT
          : challengeActive
            ? undefined
            : effectiveRoundQuestionCount,
        countStats: isDailyChallenge ? countStats : true,
        interactionLocked: showOverlay,
        resumeSnapshot: null,
        dailyDateKey: isDailyChallenge ? dailyDateKey : undefined,
        dailyQuestions: isDailyChallenge ? dailySnapshot?.questions : undefined,
      };

  return (
    <div className="relative flex h-full min-h-0 flex-col pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:pt-5">
      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col",
          showOverlay && "pointer-events-none select-none blur-[2px]",
        )}
      >
        <GameCrashBoundary onRetry={handleCrashRetry}>
          <GameBoard key={sessionKey} {...gameProps} onPlayAgain={handlePlayAgain} />
        </GameCrashBoundary>
      </div>
      {showOverlay ? (
        <QuickStartOverlay
          mode={isDailyChallenge ? "daily-challenge" : mode}
          scope={scope}
          continents={gameProps.continents}
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
