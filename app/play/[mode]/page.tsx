"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ContinentFilter } from "@/components/ContinentFilter";
import { GameBoard } from "@/components/GameBoard";
import { useProfiles, useRequiredProfile } from "@/components/ProfileProvider";
import { Select } from "@/components/ui/Select";
import { getPlayablePoolSize } from "@/lib/countries";
import { aggregateMissedCountries, DAILY_COUNTING_SESSION_KEY, formatDailyDate, getDailyDateKey, getDailySeed, hasPlayedDailyToday } from "@/lib/game-engine";
import { getScopedModeInfo, normalizeScope, SCOPE_INFO, scopedDailyKey, scopeText, isStateCode } from "@/lib/scope";
import { collectMissedCountries } from "@/lib/stats-helpers";
import { updateProfileSettings } from "@/lib/storage";
import {
  CONTINENTS,
  CORE_QUESTION_TYPES,
  DAILY_CHALLENGE_QUESTION_COUNT,
  DIFFICULTY_LABELS,
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
  const dailyContinents: Region[] = isUsa ? [...US_REGIONS] : [...CONTINENTS];
  const dailyDifficulty: Difficulty = "medium";

  const weakSpotCodes =
    mode === "weak-spots"
      ? aggregateMissedCountries(collectMissedCountries(profile)).filter(
          (code) => isStateCode(code) === isUsa,
        )
      : undefined;

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
    maxQuestions: isDailyChallenge ? DAILY_CHALLENGE_QUESTION_COUNT : effectiveRoundQuestionCount,
    questionType: mode === "speed-round" || mode === "marathon" ? questionType : undefined,
    countStats: isDailyChallenge ? countStats : true,
  };

  return (
    <div className={started ? "flex h-full min-h-0 flex-col" : "space-y-5 sm:space-y-6"}>
      {!started && (
        <div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="-ml-2 inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-slate-500 hover:text-slate-800 active:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:active:bg-slate-700/60"
          >
            ← Back
          </button>
          <h1 className="font-display text-2xl font-extrabold sm:mt-2 sm:text-3xl">{modeInfo.icon} {modeInfo.title}</h1>
          {isUsa && (
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
              🇺🇸 Across America — all 50 states
            </p>
          )}
          {dailyDateLabel && (
            <p className="mt-1 font-display text-base font-bold text-teal-700 dark:text-teal-400">
              {dailyDateLabel}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">{modeInfo.description}</p>
          {isDailyChallenge && dailyAlreadyPlayed && (
            <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              You already played today&apos;s challenge. Play again to review — stats won&apos;t count.
            </p>
          )}
          {isDailyChallenge && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              {DAILY_CHALLENGE_QUESTION_COUNT} questions · {DIFFICULTY_LABELS.medium} difficulty · {isUsa ? "All 50 states" : "All continents"}
            </p>
          )}
        </div>
      )}

      {!started ? (
        <>
          {mode === "weak-spots" && (!weakSpotCodes || weakSpotCodes.length === 0) && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              {scopeText("Play some games first to build a list of countries to practice.", scope)}
            </p>
          )}

          <div className="px-1 pb-1">
            <button
              type="button"
              onClick={handleStart}
              disabled={
                (!isDailyChallenge && availableCountryCount === 0) ||
                (mode === "weak-spots" && !weakSpotCodes?.length)
              }
              className="group relative w-full overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-700 p-4 text-left text-white shadow-[0_5px_14px_-8px_rgb(15_118_110_/_0.55)] transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-[0_7px_18px_-9px_rgb(15_118_110_/_0.6)] active:translate-y-px active:shadow-[0_2px_8px_-6px_rgb(15_118_110_/_0.45)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_5px_14px_-8px_rgb(15_118_110_/_0.55)] disabled:active:translate-y-0 sm:p-5"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-3 -top-3 select-none text-[4.5rem] opacity-15 transition-transform duration-150 group-hover:scale-110 group-active:scale-95 sm:-right-5 sm:-top-5 sm:text-[5.5rem]"
              >
                {scopeInfo.icon}
              </span>
              <span className="relative font-display text-xl font-extrabold tracking-tight transition-transform duration-150 group-active:translate-y-px sm:text-2xl">
                {isDailyChallenge && dailyAlreadyPlayed ? "Review challenge" : "Start Game"}
              </span>
            </button>
          </div>

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

            {mode !== "marathon" && (
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
                    {level === "easy" && " - multiple choice + boosts"}
                    {level === "medium" && " - multiple choice"}
                    {level === "hard" && " - type your answer"}
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
