"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ContinentFilter } from "@/components/ContinentFilter";
import { GameBoard } from "@/components/GameBoard";
import { useProfiles } from "@/components/ProfileProvider";
import { Select } from "@/components/ui/Select";
import { filterCountries } from "@/lib/countries";
import { aggregateMissedCountries, DAILY_COUNTING_SESSION_KEY, formatDailyDate, getDailyDateKey, getDailySeed, hasPlayedDailyToday } from "@/lib/game-engine";
import { collectMissedCountries } from "@/lib/stats-helpers";
import { updateProfileSettings } from "@/lib/storage";
import {
  CONTINENTS,
  CORE_QUESTION_TYPES,
  DAILY_CHALLENGE_QUESTION_COUNT,
  GAME_MODES,
  ROUND_ALL_QUESTIONS,
  ROUND_QUESTION_OPTIONS,
  normalizeRoundQuestionSetting,
  type Continent,
  type CoreQuestionType,
  type Difficulty,
  type GameMode,
  type RoundQuestionSetting,
} from "@/lib/types";

export default function PlayPage() {
  const params = useParams<{ mode: string }>();
  const router = useRouter();
  const { activeProfile, refresh, hydrated } = useProfiles();
  const profile = hydrated ? activeProfile : null;
  const mode = params.mode as GameMode;
  const modeInfo = GAME_MODES.find((m) => m.id === mode);

  const [continents, setContinents] = useState<Continent[]>(
    () => profile?.settings.lastContinentFilter ?? [...CONTINENTS],
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    () => profile?.settings.difficulty ?? "easy",
  );
  const [questionType, setQuestionType] = useState<CoreQuestionType>(
    () => profile?.settings.speedRoundQuestionType ?? "flag-to-country",
  );
  const [roundQuestionCount, setRoundQuestionCount] = useState<RoundQuestionSetting>(() =>
    normalizeRoundQuestionSetting(profile?.settings.roundQuestionCount),
  );
  const [started, setStarted] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [countStats, setCountStats] = useState(true);

  const dailyDateLabel = mode === "daily-challenge" ? formatDailyDate() : null;
  const dailyAlreadyPlayed =
    mode === "daily-challenge" && profile
      ? hasPlayedDailyToday(profile.dailyChallengePlayedDates)
      : false;

  if (!modeInfo) {
    return <p>Unknown game mode.</p>;
  }

  function handleStart() {
    if (!activeProfile || continents.length === 0) return;
    updateProfileSettings(activeProfile.id, {
      lastContinentFilter: continents,
      difficulty,
      ...(mode !== "daily-challenge" ? { roundQuestionCount } : {}),
      ...(mode === "speed-round" ? { speedRoundQuestionType: questionType } : {}),
    });
    refresh();

    if (mode === "daily-challenge") {
      const today = getDailyDateKey();
      const playedToday = hasPlayedDailyToday(activeProfile.dailyChallengePlayedDates);
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
    setStarted(true);
  }

  const weakSpotCodes =
    mode === "weak-spots" && profile
      ? aggregateMissedCountries(collectMissedCountries(profile))
      : undefined;

  const filterMode = mode === "speed-round" ? questionType : mode;
  const availableCountryCount = filterCountries({
    continents,
    mode: filterMode,
    weakSpotCodes,
  }).length;

  const gameProps = {
    mode,
    continents,
    difficulty,
    weakSpotCodes,
    seed: mode === "daily-challenge" ? getDailySeed() : undefined,
    timed: mode === "speed-round",
    stopOnWrong: mode === "marathon",
    maxQuestions:
      mode === "daily-challenge" ? DAILY_CHALLENGE_QUESTION_COUNT : roundQuestionCount,
    questionType: mode === "speed-round" ? questionType : undefined,
    countStats: mode === "daily-challenge" ? countStats : true,
  };

  return (
    <div className={started ? "flex h-full flex-col overflow-hidden" : "space-y-5 sm:space-y-6"}>
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
          {dailyDateLabel && (
            <p className="mt-1 font-display text-base font-bold text-teal-700 dark:text-teal-400">
              {dailyDateLabel}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">{modeInfo.description}</p>
          {mode === "daily-challenge" && dailyAlreadyPlayed && (
            <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              You already played today&apos;s challenge. Play again to review — stats won&apos;t count.
            </p>
          )}
        </div>
      )}

      {!started ? (
        <>
          {mode === "weak-spots" && (!weakSpotCodes || weakSpotCodes.length === 0) && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              Play some games first to build a list of countries to practice.
            </p>
          )}

          <div className="px-1 pb-1">
            <button
              type="button"
              onClick={handleStart}
              disabled={continents.length === 0 || (mode === "weak-spots" && !weakSpotCodes?.length)}
              className="group relative w-full overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-700 p-4 text-left text-white shadow-[0_5px_14px_-8px_rgb(15_118_110_/_0.55)] transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-[0_7px_18px_-9px_rgb(15_118_110_/_0.6)] active:translate-y-px active:shadow-[0_2px_8px_-6px_rgb(15_118_110_/_0.45)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_5px_14px_-8px_rgb(15_118_110_/_0.55)] disabled:active:translate-y-0 sm:p-5"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-3 -top-3 select-none text-[4.5rem] opacity-15 transition-transform duration-150 group-hover:scale-110 group-active:scale-95 sm:-right-5 sm:-top-5 sm:text-[5.5rem]"
              >
                🌍
              </span>
              <span className="relative font-display text-xl font-extrabold tracking-tight transition-transform duration-150 group-active:translate-y-px sm:text-2xl">
                {mode === "daily-challenge" && dailyAlreadyPlayed ? "Review challenge" : "Start Game"}
              </span>
            </button>
          </div>

          <div className="space-y-5 rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:space-y-6 sm:p-6">
            {mode === "speed-round" && (
              <div>
                <h2 className="mb-3 font-semibold">Question type</h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CORE_QUESTION_TYPES.map((type) => {
                    const typeInfo = GAME_MODES.find((m) => m.id === type);
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
                </div>
              </div>
            )}

            {mode !== "daily-challenge" && (
              <div>
                <h2 className="mb-3 font-semibold">Questions per round</h2>
                <Select
                  value={roundQuestionCount}
                  onChange={(event) => {
                    const { value } = event.target;
                    setRoundQuestionCount(
                      value === ROUND_ALL_QUESTIONS
                        ? ROUND_ALL_QUESTIONS
                        : normalizeRoundQuestionSetting(Number(value)),
                    );
                  }}
                >
                  {ROUND_QUESTION_OPTIONS.map((count) => (
                    <option key={count} value={count}>
                      {count} questions
                    </option>
                  ))}
                  <option value={ROUND_ALL_QUESTIONS}>
                    All ({availableCountryCount} countries)
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
                    className={`min-h-12 rounded-2xl border-2 px-4 py-2 text-left text-sm font-semibold capitalize transition-all duration-100 sm:text-center ${
                      difficulty === level
                        ? "border-emerald-600 bg-emerald-500 text-white shadow-[0_3px_0_var(--color-emerald-700)]"
                        : "border-slate-200 bg-white text-slate-700 shadow-[0_3px_0_var(--color-slate-200)] hover:border-sky-300 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500"
                    }`}
                  >
                    {level}
                    {level === "easy" && " - multiple choice + lifelines"}
                    {level === "medium" && " - multiple choice"}
                    {level === "hard" && " - type your answer"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 font-semibold">Continents</h2>
              <ContinentFilter selected={continents} onChange={setContinents} />
            </div>
          </div>
        </>
      ) : (
        <GameBoard key={sessionKey} {...gameProps} />
      )}
    </div>
  );
}
