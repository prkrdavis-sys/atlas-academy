"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ContinentFilter } from "@/components/ContinentFilter";
import { DailyChallengePreRound } from "@/components/DailyChallengePreRound";
import { GameActionButton } from "@/components/GameActionButton";
import { GameBoard } from "@/components/GameBoard";
import { useProfiles, useRequiredProfile } from "@/components/ProfileProvider";
import { Select } from "@/components/ui/Select";
import { getPlayablePoolSize } from "@/lib/countries";
import { DAILY_COUNTING_SESSION_KEY, formatDailyDate, getDailyChallengeRun, getDailyDateKey, getDailySeed, hasCompletedDailyToday, hasPlayedDailyToday } from "@/lib/game-engine";
import { getScopedModeInfo, normalizeScope, SCOPE_INFO, scopedDailyKey, scopeText } from "@/lib/scope";
import { getCommonlyMissedCountries } from "@/lib/stats-helpers";
import { updateProfileSettings } from "@/lib/storage";
import {
  CONTINENTS,
  CORE_QUESTION_TYPES,
  DAILY_CHALLENGE_QUESTION_COUNT,
  DIFFICULTY_LABELS,
  getDifficultyHint,
  ROUND_ALL_QUESTIONS,
  SPEED_ROUND_ALL_TYPES,
  US_REGIONS,
  clampRoundQuestionSetting,
  getRoundQuestionOptions,
  normalizeRoundQuestionSetting,
  type Continent,
  type Difficulty,
  type GameMode,
  type Region,
  type RoundQuestionSetting,
  type SpeedRoundQuestionType,
  type UsRegion,
} from "@/lib/types";

function PlayPageInner() {
  const params = useParams<{ mode: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refresh } = useProfiles();
  const profile = useRequiredProfile();
  const mode = params.mode as GameMode;
  const scope = normalizeScope(searchParams.get("scope"));
  const isUsa = scope === "usa";
  const scopeInfo = SCOPE_INFO[scope];
  const modeInfo = getScopedModeInfo(mode, scope);

  const [continents, setContinents] = useState<Region[]>(() =>
    isUsa
      ? profile?.settings.lastRegionFilter ?? [...US_REGIONS]
      : profile?.settings.lastContinentFilter ?? [...CONTINENTS],
  );
  const [includeTerritories, setIncludeTerritories] = useState(
    () => profile?.settings.includeTerritories ?? false,
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    () => profile?.settings.difficulty ?? "easy",
  );
  const [questionType, setQuestionType] = useState<SpeedRoundQuestionType>(() => {
    if (mode === "marathon") {
      return profile?.settings.marathonQuestionType ?? "flag-to-country";
    }
    if (mode === "speed-round") {
      return profile?.settings.speedRoundQuestionType ?? "flag-to-country";
    }
    return "flag-to-country";
  });
  const [roundQuestionCount, setRoundQuestionCount] = useState<RoundQuestionSetting>(() =>
    normalizeRoundQuestionSetting(profile?.settings.roundQuestionCount),
  );
  const [started, setStarted] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [countStats, setCountStats] = useState(true);
  const [startBarPinned, setStartBarPinned] = useState(false);
  const [startBarHeight, setStartBarHeight] = useState(0);
  const startBarRef = useRef<HTMLDivElement>(null);
  const preRoundHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const main = document.getElementById("main-content");
    const header = preRoundHeaderRef.current;
    if (!main || !header || started) return;

    const updatePinned = () => {
      setStartBarPinned(header.getBoundingClientRect().bottom <= 0);
    };

    updatePinned();
    main.addEventListener("scroll", updatePinned, { passive: true });
    window.addEventListener("resize", updatePinned);
    return () => {
      main.removeEventListener("scroll", updatePinned);
      window.removeEventListener("resize", updatePinned);
    };
  }, [started, mode]);

  useEffect(() => {
    const bar = startBarRef.current;
    if (!bar || started) return;

    const updateHeight = () => setStartBarHeight(bar.offsetHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [started, mode, startBarPinned]);

  useEffect(() => {
    setContinents(
      isUsa
        ? profile.settings.lastRegionFilter ?? [...US_REGIONS]
        : profile.settings.lastContinentFilter,
    );
    setIncludeTerritories(profile.settings.includeTerritories ?? false);
    setDifficulty(profile.settings.difficulty);
    setRoundQuestionCount(normalizeRoundQuestionSetting(profile.settings.roundQuestionCount));
    if (mode === "speed-round") {
      setQuestionType(profile.settings.speedRoundQuestionType);
    } else if (mode === "marathon") {
      setQuestionType(profile.settings.marathonQuestionType);
    }
  }, [profile, mode, isUsa]);

  const isDailyChallenge = mode === "daily-challenge";
  const dailyDateLabel = isDailyChallenge ? formatDailyDate() : null;
  const dailyAlreadyPlayed =
    isDailyChallenge
      ? hasPlayedDailyToday(profile.dailyChallengePlayedDates, scope)
      : false;
  const dailyCompletedToday =
    isDailyChallenge
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
        continents,
        includeTerritories,
        mode,
        questionType: mode === "speed-round" || mode === "marathon" ? questionType : undefined,
        weakSpotCodes,
        scope,
      })
    : 0;
  const roundQuestionOptions = getRoundQuestionOptions(availableCountryCount);
  const effectiveRoundQuestionCount = clampRoundQuestionSetting(
    roundQuestionCount,
    availableCountryCount,
  );

  useEffect(() => {
    if (!modeInfo || mode === "daily-challenge") return;
    setRoundQuestionCount((current) =>
      clampRoundQuestionSetting(current, availableCountryCount),
    );
  }, [availableCountryCount, mode, modeInfo]);

  if (!modeInfo) {
    return <p>Unknown game mode.</p>;
  }

  function beginSession() {
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
      setCountStats(shouldCountStats);
    } else {
      setCountStats(true);
    }

    setSessionKey((k) => k + 1);
  }

  function handleStart() {
    if (!isDailyChallenge && availableCountryCount === 0) return;

    if (!isDailyChallenge) {
      updateProfileSettings(profile.id, {
        ...(isUsa
          ? { lastRegionFilter: continents as UsRegion[] }
          : { lastContinentFilter: continents as Continent[], includeTerritories }),
        difficulty,
        roundQuestionCount: effectiveRoundQuestionCount,
        ...(mode === "speed-round" ? { speedRoundQuestionType: questionType } : {}),
        ...(mode === "marathon" ? { marathonQuestionType: questionType } : {}),
      });
      refresh();
    }

    beginSession();
    setStarted(true);
  }

  function handlePlayAgain() {
    beginSession();
  }

  const gameProps = {
    mode,
    scope,
    continents: isDailyChallenge ? dailyContinents : continents,
    includeTerritories: isDailyChallenge ? false : includeTerritories,
    difficulty: isDailyChallenge ? dailyDifficulty : difficulty,
    weakSpotCodes,
    seed: isDailyChallenge ? getDailySeed(scope) : undefined,
    timed: mode === "speed-round",
    stopOnWrong: mode === "marathon",
    maxQuestions: isDailyChallenge
      ? DAILY_CHALLENGE_QUESTION_COUNT
      : mode === "speed-round"
        ? undefined
        : effectiveRoundQuestionCount,
    questionType: mode === "speed-round" || mode === "marathon" ? questionType : undefined,
    countStats: isDailyChallenge ? countStats : true,
  };

  const startDisabled =
    (!isDailyChallenge && availableCountryCount === 0) ||
    (mode === "weak-spots" && !weakSpotCodes?.length);

  const hasExtendedSettings = true;

  const startGameButton = (
    <div className="relative z-40">
      {startBarPinned && <div style={{ height: startBarHeight }} aria-hidden />}
      <div
        ref={startBarRef}
        className={startBarPinned ? "fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top,0px)]" : undefined}
      >
        <div
          className={
            startBarPinned
              ? "mx-auto w-full max-w-5xl px-[max(0.75rem,env(safe-area-inset-left,0px))] sm:px-4"
              : undefined
          }
        >
          <div
            className={
              startBarPinned && hasExtendedSettings
                ? "border-x-2 border-b-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                : undefined
            }
          >
            <div className="px-1 pb-1">
              <GameActionButton
                onClick={handleStart}
                disabled={startDisabled}
                icon={scopeInfo.icon}
              >
                {isDailyChallenge
                  ? dailyAlreadyPlayed
                    ? "Review today's challenge"
                    : "Start today's challenge"
                  : "Start Game"}
              </GameActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={
        started
          ? "flex h-full min-h-0 flex-col pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:pt-5"
          : "space-y-5 sm:space-y-6"
      }
    >
      {!started && (
        <div ref={preRoundHeaderRef} className="pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:pt-5">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50/50 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100/70 hover:text-slate-700 active:bg-slate-200/50 dark:border-slate-700/60 dark:bg-slate-800/30 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 dark:active:bg-slate-700/50"
          >
            ← Back
          </button>
          {isDailyChallenge && dailyDateLabel ? (
            <>
              <h1 className="font-display text-2xl font-extrabold sm:mt-2 sm:text-3xl">
                {modeInfo.icon} {modeInfo.title}
              </h1>
              <p className="mt-1 font-display text-base font-bold text-teal-700 dark:text-teal-400">
                {dailyDateLabel}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                {modeInfo.description}
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-extrabold sm:mt-2 sm:text-3xl">{modeInfo.icon} {modeInfo.title}</h1>
              {isUsa && (
                <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                  🇺🇸 Across America — all 50 states
                </p>
              )}
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">{modeInfo.description}</p>
            </>
          )}
        </div>
      )}

      {!started ? (
        <>
          {mode === "weak-spots" && (!weakSpotCodes || weakSpotCodes.length === 0) && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              {scopeText("Play some games first — incorrect answers add places to your commonly missed pool.", scope)}
            </p>
          )}

          {startGameButton}

          {isDailyChallenge && dailyDateLabel ? (
            <DailyChallengePreRound
              scope={scope}
              dailyDateLabel={dailyDateLabel}
              dailyRun={dailyRun}
              dailyCompletedToday={dailyCompletedToday}
              dailyAlreadyPlayed={dailyAlreadyPlayed}
              completions={profile.dailyChallengeCompletions}
              isUsa={isUsa}
            />
          ) : null}

          {!isDailyChallenge && (
          <div className="space-y-5 rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:space-y-6 sm:p-6">
            {(mode === "speed-round" || mode === "marathon") && (
              <div>
                <h2 className="mb-3 font-semibold">Question type</h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CORE_QUESTION_TYPES.map((type) => {
                    const typeInfo = getScopedModeInfo(type, scope);
                    if (!typeInfo) return null;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setQuestionType(type)}
                        className={`min-h-12 rounded-2xl border-2 px-4 py-2 text-left text-sm font-semibold transition-all duration-100 ${
                          questionType === type
                            ? "border-emerald-600 bg-emerald-500 text-white shadow-[0_3px_0_var(--color-emerald-700)]"
                            : "border-slate-200 bg-white text-slate-700 shadow-[0_3px_0_var(--color-slate-200)] hover:border-sky-300 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500"
                        }`}
                      >
                        <span className="mr-1.5">{typeInfo.icon}</span>
                        {typeInfo.title}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setQuestionType(SPEED_ROUND_ALL_TYPES)}
                    className={`min-h-12 rounded-2xl border-2 px-4 py-2 text-left text-sm font-semibold transition-all duration-100 sm:col-span-2 ${
                      questionType === SPEED_ROUND_ALL_TYPES
                        ? "border-emerald-600 bg-emerald-500 text-white shadow-[0_3px_0_var(--color-emerald-700)]"
                        : "border-slate-200 bg-white text-slate-700 shadow-[0_3px_0_var(--color-slate-200)] hover:border-sky-300 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500"
                    }`}
                  >
                    <span className="mr-1.5">🎲</span>
                    Mixed
                    <span className="mt-0.5 block text-xs font-normal opacity-80">
                      {mode === "marathon"
                        ? "All four types, shuffled until your first miss"
                        : "All four types, shuffled"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {mode !== "marathon" && mode !== "speed-round" && (
            <div>
              <h2 className="mb-3 font-semibold">Questions per round</h2>
              <Select
                value={effectiveRoundQuestionCount}
                onChange={(event) => {
                  const { value } = event.target;
                  setRoundQuestionCount(
                    value === ROUND_ALL_QUESTIONS
                      ? ROUND_ALL_QUESTIONS
                      : normalizeRoundQuestionSetting(Number(value)),
                  );
                }}
              >
                {roundQuestionOptions.map((count) => (
                  <option key={count} value={count}>
                    {count} questions
                  </option>
                ))}
                <option value={ROUND_ALL_QUESTIONS}>
                  All ({availableCountryCount} {availableCountryCount === 1 ? scopeInfo.noun : scopeInfo.nounPlural})
                </option>
              </Select>
            </div>
            )}

            <div>
              <h2 className="mb-3 font-semibold">Difficulty</h2>
              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`min-h-12 rounded-2xl border-2 px-4 py-2 text-left text-sm font-semibold transition-all duration-100 sm:text-center ${
                      difficulty === level
                        ? "border-emerald-600 bg-emerald-500 text-white shadow-[0_3px_0_var(--color-emerald-700)]"
                        : "border-slate-200 bg-white text-slate-700 shadow-[0_3px_0_var(--color-slate-200)] hover:border-sky-300 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500"
                    }`}
                  >
                    {DIFFICULTY_LABELS[level]}
                    {getDifficultyHint(mode, level)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 font-semibold">{scopeInfo.regionLabel}</h2>
              <ContinentFilter
                selected={continents}
                includeTerritories={includeTerritories}
                onContinentsChange={setContinents}
                onIncludeTerritoriesChange={setIncludeTerritories}
                scope={scope}
              />
            </div>
          </div>
          )}
        </>
      ) : (
        <GameBoard key={sessionKey} {...gameProps} onPlayAgain={handlePlayAgain} />
      )}
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
