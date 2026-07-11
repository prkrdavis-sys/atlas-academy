"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnswerFeedbackLayer, type FeedbackBurst } from "@/components/AnswerFeedback";
import { AnswerMultipleChoice } from "@/components/AnswerMultipleChoice";
import { AnswerTypeIn } from "@/components/AnswerTypeIn";
import { FlagDisplay, FlagGrid } from "@/components/FlagDisplay";
import { LearnCard } from "@/components/LearnCard";
import { NeighborCountryDisplay } from "@/components/NeighborCountryDisplay";
import { PopulationMatchupDisplay } from "@/components/PopulationMatchupDisplay";
import { ShapeDisplay } from "@/components/ShapeDisplay";
import { StreakCounter } from "@/components/StreakCounter";
import { Button } from "@/components/ui/Button";
import { useProfiles } from "@/components/ProfileProvider";
import { getCountryName } from "@/lib/countries";
import { GameEngine } from "@/lib/game-engine";
import { checkAchievements, loadState, recordAnswer } from "@/lib/storage";
import type { Continent, Difficulty, GameMode, Question } from "@/lib/types";
import { ACHIEVEMENTS } from "@/lib/types";

const ROUND_TASK_LABELS: Record<GameMode, string> = {
  "flag-to-country": "Name the country",
  "capital-to-country": "Name the country",
  "country-to-capital": "Name the capital",
  "shape-to-country": "Name the country",
  "country-to-flag": "Pick the flag",
  "neighbor-quiz": "Find the neighbor",
  "population-showdown": "Pick the larger population",
  "daily-challenge": "Daily challenge",
  marathon: "Keep your streak alive",
  "speed-round": "Beat the clock",
  "weak-spots": "Practice missed countries",
};

type GameBoardProps = {
  mode: GameMode;
  continents: Continent[];
  difficulty: Difficulty;
  weakSpotCodes?: string[];
  seed?: number;
  timed?: boolean;
  stopOnWrong?: boolean;
  maxQuestions?: number;
};

export function GameBoard({
  mode,
  continents,
  difficulty,
  weakSpotCodes,
  seed,
  timed = false,
  stopOnWrong = false,
  maxQuestions,
}: GameBoardProps) {
  const router = useRouter();
  const { activeProfile, refresh } = useProfiles();
  const [{ engine, initialQuestion }] = useState(() => {
    const gameEngine = new GameEngine(mode, continents, difficulty, weakSpotCodes, seed);
    return {
      engine: gameEngine,
      initialQuestion: gameEngine.nextQuestion(),
    };
  });

  const [question, setQuestion] = useState<Question | null>(initialQuestion);
  const [streak, setStreak] = useState(
    () => activeProfile?.stats[mode]?.currentStreak ?? 0,
  );
  const [showLearnCard, setShowLearnCard] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [usedSkip, setUsedSkip] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [skippedAnswers, setSkippedAnswers] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const speedSessionCheckedRef = useRef(false);

  // Feedback bursts live in their own list so advancing to the next question
  // never unmounts an in-flight animation.
  const [bursts, setBursts] = useState<FeedbackBurst[]>([]);
  const burstIdRef = useRef(0);

  const spawnBurst = useCallback((correct: boolean) => {
    burstIdRef.current += 1;
    setBursts((prev) => [...prev, { id: burstIdRef.current, correct }]);
  }, []);

  const removeBurst = useCallback((id: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const sessionQuestionLimit = maxQuestions
    ? Math.min(maxQuestions, engine.getPoolSize())
    : undefined;

  useEffect(() => {
    if (!timed || gameOver) return;
    const timer = setTimeout(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [timed, timeLeft, gameOver]);

  useEffect(() => {
    if (!timed || !gameOver || !activeProfile || speedSessionCheckedRef.current || questionCount === 0) {
      return;
    }
    speedSessionCheckedRef.current = true;
    const state = loadState();
    const updatedProfile = state.profiles.find((p) => p.id === activeProfile.id);
    if (!updatedProfile) return;
    const earned = checkAchievements(updatedProfile, mode, {
      sessionCorrect: correctAnswers,
      sessionTotal: questionCount,
      sessionEnded: true,
    });
    if (earned.length) setNewAchievements((prev) => [...prev, ...earned]);
  }, [timed, gameOver, activeProfile, mode, correctAnswers, questionCount]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!activeProfile) {
    return (
      <div className="rounded-3xl border-2 border-slate-200 bg-white/90 p-8 text-center shadow-md backdrop-blur">
        <p className="mb-4 text-slate-600">Create a profile to start playing.</p>
        <Button onClick={() => router.push("/profiles")}>Create profile</Button>
      </div>
    );
  }

  if (engine.getPoolSize() === 0) {
    return (
      <div className="rounded-3xl border-2 border-slate-200 bg-white/90 p-8 text-center shadow-md backdrop-blur">
        <p className="text-slate-600">No countries match your filters for this mode.</p>
        <Button className="mt-4" onClick={() => router.push("/")}>Back home</Button>
      </div>
    );
  }

  function handleAnswer(answer: string, code?: string) {
    if (!question || !activeProfile || disabled) return;
    setDisabled(true);

    const resolvedAnswer = code ?? answer;
    const correct = engine.checkAnswer(question, resolvedAnswer);
    setLastCorrect(correct);
    spawnBurst(correct);
    recordAnswer(activeProfile.id, mode, correct, question.countryCode);
    refresh();

    const completedQuestions = questionCount + 1;
    const sessionCorrect = correctAnswers + (correct ? 1 : 0);
    const sessionEnded =
      Boolean(sessionQuestionLimit && completedQuestions >= sessionQuestionLimit) ||
      (stopOnWrong && !correct);

    const state = loadState();
    const updatedProfile = state.profiles.find((p) => p.id === activeProfile.id);
    if (updatedProfile) {
      const earned = checkAchievements(updatedProfile, mode, {
        sessionCorrect,
        sessionTotal: completedQuestions,
        sessionEnded,
      });
      if (earned.length) setNewAchievements((prev) => [...prev, ...earned]);
    }

    if (correct) {
      setStreak((s) => s + 1);
      setCorrectAnswers((count) => count + 1);
    } else {
      setStreak(0);
      if (stopOnWrong) setGameOver(true);
    }

    setQuestionCount(completedQuestions);
    if (sessionQuestionLimit && completedQuestions >= sessionQuestionLimit) {
      setSessionComplete(true);
    }
    setShowLearnCard(true);
  }

  function handleSkip() {
    if (!question || usedSkip || difficulty !== "easy") return;
    setUsedSkip(true);
    setShowLearnCard(true);
    setLastCorrect(false);
    const completedQuestions = questionCount + 1;
    setQuestionCount(completedQuestions);
    setSkippedAnswers((count) => count + 1);
    if (sessionQuestionLimit && completedQuestions >= sessionQuestionLimit) {
      setSessionComplete(true);
    }
    recordAnswer(activeProfile!.id, mode, false, question.countryCode, true);
    refresh();
  }

  function handleFiftyFifty() {
    if (!question?.options || usedFiftyFifty || difficulty !== "easy") return;
    const wrong = question.options.filter((o) => o !== question.correctAnswer);
    setHiddenOptions(wrong.slice(0, 2));
    setUsedFiftyFifty(true);
  }

  function handleContinue() {
    setShowLearnCard(false);
    setDisabled(false);
    setHiddenOptions([]);
    setUsedFiftyFifty(false);
    setUsedSkip(false);

    if (sessionComplete || (sessionQuestionLimit && questionCount >= sessionQuestionLimit)) {
      setSessionComplete(true);
      return;
    }

    const nextQuestion = engine.nextQuestion();
    if (!nextQuestion) {
      setSessionComplete(true);
      return;
    }
    setQuestion(nextQuestion);
  }

  const hasFinishedQuestions = !question && questionCount > 0;
  const hasReachedQuestionLimit = Boolean(
    sessionQuestionLimit && questionCount >= sessionQuestionLimit,
  );
  const showSummary = gameOver || sessionComplete || hasFinishedQuestions || hasReachedQuestionLimit;

  if (showSummary) {
    const accuracy = questionCount > 0
      ? Math.round((correctAnswers / questionCount) * 100)
      : 0;
    const challengeComplete = !gameOver && (sessionComplete || hasFinishedQuestions || hasReachedQuestionLimit);
    const title = challengeComplete ? "Challenge complete!" : "Game over";
    const description = challengeComplete
      ? `You completed all ${questionCount} questions.`
      : timed
        ? `Time's up after ${questionCount} questions.`
        : `Your streak ended at ${streak}.`;

    return (
      <>
        <AnswerFeedbackLayer bursts={bursts} onDone={removeBurst} />
        <div className="animate-card-pop-in my-auto rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-5 text-center shadow-md backdrop-blur sm:p-8">
          <p className="text-4xl">{challengeComplete ? "🎉" : "🧭"}</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold">{title}</h2>
          <p className="mt-2 text-slate-600">{description}</p>
          <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="font-display text-2xl font-extrabold text-emerald-700">{correctAnswers}</p>
              <p className="text-xs font-semibold text-emerald-800">Correct</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-3">
              <p className="font-display text-2xl font-extrabold text-sky-700">{accuracy}%</p>
              <p className="text-xs font-semibold text-sky-800">Accuracy</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3">
              <p className="font-display text-2xl font-extrabold text-slate-700">{skippedAnswers}</p>
              <p className="text-xs font-semibold text-slate-600">Skipped</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center">
            <Button variant="secondary" className="w-full" onClick={() => router.push("/stats")}>View stats</Button>
            <Button className="w-full" onClick={() => router.push("/")}>Back home</Button>
          </div>
        </div>
      </>
    );
  }

  if (!question) return null;

  const roundTaskLabel = ROUND_TASK_LABELS[mode];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-3">
      <div className="grid min-h-12 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Exit this round and return home"
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-2xl border-2 border-slate-800 bg-slate-800 px-3 py-1.5 text-sm font-extrabold text-white shadow-[0_3px_0_var(--color-slate-950)] transition-all duration-100 hover:border-slate-700 hover:bg-slate-700 active:translate-y-[3px] active:shadow-none sm:px-4"
        >
          <span aria-hidden>←</span>
          <span>Exit</span>
        </button>
        <div className="min-w-0 px-1 text-center leading-tight">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-teal-700/70 sm:text-[10px]">
            Your task
          </p>
          <p className="truncate font-display text-sm font-extrabold text-slate-700 sm:text-base">
            {roundTaskLabel}
          </p>
        </div>
        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <StreakCounter streak={streak} compact />
          {timed && (
            <div className={`rounded-xl border-2 px-2 py-1 text-center sm:rounded-2xl sm:px-3 sm:py-1.5 ${timeLeft <= 10 ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white/90"}`}>
              <p className={`game-stat-label text-[9px] font-semibold uppercase ${timeLeft <= 10 ? "text-rose-500" : "text-slate-500"}`}>Time</p>
              <p className={`font-display text-base font-extrabold leading-none sm:text-lg ${timeLeft <= 10 ? "text-rose-600" : ""}`}>{timeLeft}s</p>
            </div>
          )}
          {sessionQuestionLimit && (
            <div className="rounded-xl border-2 border-slate-200 bg-white/90 px-2 py-1 text-center sm:rounded-2xl sm:px-3 sm:py-1.5">
              <p className="game-stat-label text-[9px] font-semibold uppercase text-slate-500">Question</p>
              <p className="font-display text-base font-extrabold leading-none sm:text-lg">{questionCount + 1}/{sessionQuestionLimit}</p>
            </div>
          )}
        </div>
      </div>

      {newAchievements.length > 0 && (
        <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          🏆 Achievement unlocked:{" "}
          {newAchievements.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.title).join(", ")}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white/90 p-3 shadow-md backdrop-blur sm:rounded-3xl sm:p-4">
        <h2 className="mb-2 shrink-0 text-center font-display text-base font-extrabold leading-tight sm:mb-3 sm:text-xl">{question.prompt}</h2>

        <div
          className={`@container/size flex min-h-0 flex-1 flex-col overflow-hidden ${question.displayType === "flags-grid" ? "" : "justify-center"}`}
        >
          {question.displayType === "flag" && <FlagDisplay code={question.countryCode} size="md" />}
          {question.displayType === "shape" && <ShapeDisplay code={question.countryCode} compact />}
          {question.mode === "neighbor-quiz" && (
            <NeighborCountryDisplay code={question.countryCode} />
          )}
          {question.displayType === "population" && question.optionCodes && (
            <PopulationMatchupDisplay codes={question.optionCodes} />
          )}
          {!showLearnCard && question.displayType === "flags-grid" && question.optionCodes && (
            <FlagGrid codes={question.optionCodes} onSelect={(code) => handleAnswer(code, code)} compact />
          )}
        </div>

        {!showLearnCard && (
          <div className="mt-2 shrink-0 space-y-2 sm:mt-3 sm:space-y-3">
            {difficulty === "easy" && (
              <div className="flex justify-end gap-2">
                {(question.options?.length ?? 0) > 2 && (
                  <Button variant="secondary" size="sm" onClick={handleFiftyFifty} disabled={usedFiftyFifty}>
                    50/50
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={handleSkip} disabled={usedSkip}>
                  Skip
                </Button>
              </div>
            )}

            {question.displayType === "flags-grid" ? null : difficulty === "hard" ? (
              <AnswerTypeIn
                onSubmit={handleAnswer}
                disabled={disabled}
                placeholder={
                  question.mode === "country-to-capital" ? "Type the capital..." : "Type the country..."
                }
              />
            ) : question.options ? (
              <AnswerMultipleChoice
                options={question.options}
                optionCodes={question.optionCodes}
                onSelect={handleAnswer}
                disabled={disabled}
                hiddenOptions={hiddenOptions}
              />
            ) : null}
          </div>
        )}
      </div>

      <AnswerFeedbackLayer bursts={bursts} onDone={removeBurst} />

      {showLearnCard && (
        <div
          className="fixed inset-0 z-50 cursor-pointer bg-slate-900/50 backdrop-blur-[2px]"
          onClick={handleContinue}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleContinue();
          }}
          role="button"
          tabIndex={0}
          aria-label="Continue to next question"
        >
          <div className="flex h-full items-end justify-center sm:items-center sm:p-4">
            <div className="pointer-events-none max-h-[88dvh] w-full max-w-lg overflow-y-auto">
              <LearnCard
                countryCode={
                  question.mode === "neighbor-quiz"
                    ? question.correctCode ?? question.countryCode
                    : question.countryCode
                }
                heading={
                  question.mode === "neighbor-quiz" ? (
                    <>
                      <span className="font-black">{getCountryName(question.countryCode)}</span>
                      <span className="font-bold opacity-95">&apos;s neighbor is </span>
                      <span className="font-black">{question.correctAnswer}</span>
                    </>
                  ) : undefined
                }
                wasCorrect={lastCorrect}
                compareCountryCode={
                  question.mode === "population-showdown" ? question.secondaryCountryCode : undefined
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
