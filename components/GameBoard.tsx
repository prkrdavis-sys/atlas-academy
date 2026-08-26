"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type FeedbackBurst } from "@/components/AnswerFeedback";
import { GameQuestionStage } from "@/components/GameQuestionStage";
import { GameRoundSummary } from "@/components/GameRoundSummary";
import { preloadLearnCardMap } from "@/components/PlaceContextMap";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/AuthProvider";
import { useProfiles, useRequiredProfile } from "@/components/ProfileProvider";
import { useCoachMarkAnchor } from "@/components/CoachMarkProvider";
import { getCountryByCode, getCountryName } from "@/lib/countries";
import { DAILY_COUNTING_SESSION_KEY, formatDailyDateKey, getDailyDateKey } from "@/lib/daily-calendar";
import {
  clearDailyTimerSession,
  ensureDailyChallengeResultSubmitted,
  loadDailyTimerSession,
  saveDailyTimerSession,
} from "@/lib/daily-challenge";
import { GameEngine } from "@/lib/game-engine";
import { getStatsMode } from "@/lib/game-setup";
import { getRoundSummaryCopy, resolveRoundEnd } from "@/lib/game-summary";
import {
  buildGameResumePlayHref,
  clearGameResumeSnapshot,
  saveGameResumeSnapshot,
  type GameResumeSnapshot,
} from "@/lib/game-resume";
import { triggerHaptic } from "@/lib/haptics";
import { buildLibraryDetailHref } from "@/lib/library";
import {
  getMapProgressSummary,
  modeCountsTowardMapProgress,
  toMapProgressDifficulty,
} from "@/lib/map-progress";
import {
  isCapitalQuestion,
  isInvertedFlagRound as isInvertedFlagQuestion,
  isTextOnlyPrompt as isTextOnlyQuestion,
} from "@/lib/question-presentation";
import {
  createInitialSession,
  quizSessionReducer,
  type QuizSession,
  type QuizSessionAction,
} from "@/lib/quiz-session";
import { getQuestionTaskLabel, isStateCode, scopeText } from "@/lib/scope";
import { playSound } from "@/lib/sound";
import { getGlobalStreakOrZero } from "@/lib/stats-helpers";
import {
  checkAchievements,
  loadState,
  markDailyChallengePlayed,
  recordAnswer,
  recordBestGameScore,
  recordDailyChallengeResult,
} from "@/lib/storage";
import { STREAK_SNUFF_MIN } from "@/lib/streak-tier";
import { useIsDark } from "@/lib/use-is-dark";
import { setStoredMapProgressDifficulty } from "@/lib/use-map-progress-difficulty";
import type {
  ChallengeModifier,
  DailyChallengeAnswer,
  Difficulty,
  GameMode,
  GameScope,
  Question,
  Region,
  RoundQuestionSetting,
} from "@/lib/types";

type GameBoardProps = {
  mode: GameMode;
  challengeModifier?: ChallengeModifier;
  continents: Region[];
  scope?: GameScope;
  includeTerritories?: boolean;
  difficulty: Difficulty;
  weakSpotCodes?: string[];
  seed?: number;
  timed?: boolean;
  stopOnWrong?: boolean;
  maxQuestions?: RoundQuestionSetting;
  countStats?: boolean;
  onPlayAgain?: () => void;
  interactionLocked?: boolean;
  resumeSnapshot?: GameResumeSnapshot | null;
  dailyDateKey?: string;
  dailyQuestions?: Question[];
};

export function GameBoard({
  mode,
  challengeModifier = "none",
  continents,
  scope = "world",
  includeTerritories = false,
  difficulty,
  weakSpotCodes,
  seed,
  timed = false,
  stopOnWrong = false,
  maxQuestions,
  countStats = true,
  onPlayAgain,
  interactionLocked = false,
  resumeSnapshot = null,
  dailyDateKey = getDailyDateKey(),
  dailyQuestions,
}: GameBoardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { refresh } = useProfiles();
  const activeProfile = useRequiredProfile();
  const { isDark, ready: themeReady } = useIsDark();
  const statsMode = getStatsMode(mode, challengeModifier);
  const mapProgressDifficulty = toMapProgressDifficulty(difficulty);
  const tracksMapProgress =
    countStats &&
    mapProgressDifficulty !== null &&
    mode !== "weak-spots" &&
    modeCountsTowardMapProgress(mode);
  const isDailyChallenge = mode === "daily-challenge";
  const storedDailyResult = isDailyChallenge
    ? activeProfile.dailyChallengeResults?.[dailyDateKey]
    : undefined;
  const dailyQuestionsForResult = dailyQuestions ?? resumeSnapshot?.dailyQuestions ?? [];

  const [{ engine, firstQuestion, sessionQuestionLimit }] = useState(() => {
    const gameEngine = new GameEngine({
      mode,
      continents,
      difficulty,
      weakSpotCodes,
      seed,
      questionLimit: maxQuestions,
      includeTerritories,
      scope,
      challengeModifier,
      dailyQuestionSnapshot: dailyQuestions ?? resumeSnapshot?.dailyQuestions,
    });
    if (resumeSnapshot) {
      gameEngine.restoreResumeProgress(
        resumeSnapshot.questionIndex,
        resumeSnapshot.roundCountryCodes,
      );
      return {
        engine: gameEngine,
        firstQuestion: resumeSnapshot.question,
        sessionQuestionLimit: gameEngine.getRoundQuestionLimit(),
      };
    }
    return {
      engine: gameEngine,
      firstQuestion: gameEngine.nextQuestion(),
      sessionQuestionLimit: gameEngine.getRoundQuestionLimit(),
    };
  });

  const [session, setSession] = useState<QuizSession>(() =>
    createInitialSession({
      firstQuestion,
      resumeSnapshot,
      mode,
      countStats,
      activeStreak: getGlobalStreakOrZero(activeProfile, difficulty, scope).currentStreak,
    }),
  );

  const {
    question,
    streak,
    endedStreak,
    showLearnCard,
    lastCorrect,
    lastSelectedAnswer,
    lastSelectedCode,
    globeRevealCode,
    disabled,
    hiddenOptions,
    usedFiftyFifty,
    usedSkip,
    questionCount,
    correctAnswers,
    skippedAnswers,
    hintsUsed,
    gameOver,
    sessionComplete,
    dailyAnswers,
    exitedEarly,
  } = session;

  const learnCardLibraryRef = useCoachMarkAnchor(
    showLearnCard && !isDailyChallenge ? "learn-card-library" : null,
  );
  const [timeLeft, setTimeLeft] = useState(() => resumeSnapshot?.timeLeft ?? 60);
  const [dailyStartedAt] = useState<number | null>(() => {
    if (!isDailyChallenge || !countStats) return null;
    return (
      resumeSnapshot?.dailyStartedAt ??
      loadDailyTimerSession(dailyDateKey)?.startedAt ??
      Date.now()
    );
  });
  const [dailyElapsedCentiseconds, setDailyElapsedCentiseconds] = useState(() => {
    if (!isDailyChallenge || !countStats || dailyStartedAt === null) return 0;
    return Math.max(0, Math.round((Date.now() - dailyStartedAt) / 10));
  });
  const [dailyCompletionElapsedCentiseconds, setDailyCompletionElapsedCentiseconds] = useState<number | null>(
    null,
  );
  const [reviewStartedAt] = useState<number | null>(() => {
    if (!isDailyChallenge || countStats) return null;
    return Date.now();
  });
  const [reviewElapsedCentiseconds, setReviewElapsedCentiseconds] = useState(0);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [initialMapProgress] = useState(() => {
    if (!mapProgressDifficulty) return null;
    return {
      area: getMapProgressSummary(scope, activeProfile, mapProgressDifficulty, continents),
      overall: getMapProgressSummary(scope, activeProfile, mapProgressDifficulty),
    };
  });
  const [bursts, setBursts] = useState<FeedbackBurst[]>([]);
  const burstIdRef = useRef(0);
  const speedSessionCheckedRef = useRef(false);
  const dailyCompletionRecordedRef = useRef(false);
  const summaryAchievementsCheckedRef = useRef(false);
  const bestGameScoreRecordedRef = useRef(false);
  const correctAnswersRef = useRef(correctAnswers);
  const bestScoreContextRef = useRef({
    profileId: activeProfile.id,
    mode,
    difficulty,
    scope,
    countStats,
  });
  useEffect(() => {
    correctAnswersRef.current = correctAnswers;
    bestScoreContextRef.current = {
      profileId: activeProfile.id,
      mode,
      difficulty,
      scope,
      countStats,
    };
  }, [correctAnswers, activeProfile.id, mode, difficulty, scope, countStats]);

  function commit(action: QuizSessionAction): QuizSession {
    const next = quizSessionReducer(session, action);
    setSession(next);
    return next;
  }

  function persistBestGameScore(
    sessionCorrect: number,
    options: { notify?: boolean } = {},
  ) {
    const ctx = bestScoreContextRef.current;
    if (!ctx.countStats || ctx.mode === "weak-spots") return;
    if (!Number.isFinite(sessionCorrect) || sessionCorrect <= 0) return;
    recordBestGameScore(
      ctx.profileId,
      ctx.mode,
      ctx.difficulty,
      sessionCorrect,
      ctx.scope,
      options,
    );
  }

  useEffect(() => {
    return () => {
      persistBestGameScore(correctAnswersRef.current);
    };
  }, []);

  function maybeRecordDailyCompletion(
    completedQuestions: number,
    completedCorrectAnswers = correctAnswers,
    completedSkippedAnswers = skippedAnswers,
    completedDailyAnswers = dailyAnswers,
  ) {
    if (
      !isDailyChallenge ||
      !countStats ||
      !sessionQuestionLimit ||
      completedQuestions < sessionQuestionLimit ||
      dailyCompletionRecordedRef.current
    ) {
      return;
    }
    dailyCompletionRecordedRef.current = true;
    const elapsedCentiseconds =
      dailyCompletionElapsedCentiseconds ??
      (dailyStartedAt === null
        ? 0
        : Math.max(0, Math.round((Date.now() - dailyStartedAt) / 10)));
    const result = {
      dateKey: dailyDateKey,
      questionCount: completedQuestions,
      correctAnswers: completedCorrectAnswers,
      skippedAnswers: completedSkippedAnswers,
      elapsedCentiseconds,
      completedAt: new Date().toISOString(),
      ...(dailyQuestionsForResult.length ? { questions: dailyQuestionsForResult } : {}),
      ...(completedDailyAnswers.length ? { answers: completedDailyAnswers } : {}),
    };
    setDailyCompletionElapsedCentiseconds(elapsedCentiseconds);
    recordDailyChallengeResult(activeProfile.id, result);
    clearDailyTimerSession();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(DAILY_COUNTING_SESSION_KEY);
    }
    refresh();
    if (user) {
      void ensureDailyChallengeResultSubmitted(
        activeProfile,
        result,
        dailyQuestionsForResult,
      ).catch(() => undefined);
    }
  }

  function awardAchievements(
    context: {
      sessionCorrect: number;
      sessionTotal: number;
      sessionEnded: boolean;
    },
    profile = loadState().profiles.find((entry) => entry.id === activeProfile.id),
  ) {
    if (!profile) return;
    const earned = checkAchievements(profile, statsMode, difficulty, context, scope);
    if (earned.length) setNewAchievements((prev) => [...prev, ...earned]);
  }

  function persistQuestionOutcome(
    currentQuestion: Question,
    next: QuizSession,
    skipped: boolean,
    correct: boolean,
  ) {
    if (!countStats) return;
    const { profile } = recordAnswer({
      profileId: activeProfile.id,
      mode: statsMode,
      difficulty,
      correct: skipped ? false : correct,
      countryCode: currentQuestion.countryCode,
      skipped,
      scope,
      isPracticeMode: mode === "weak-spots",
      question: skipped ? undefined : currentQuestion,
    });
    if (mode === "daily-challenge") {
      markDailyChallengePlayed(activeProfile.id, dailyDateKey);
    }
    if (next.sessionComplete || next.gameOver) {
      maybeRecordDailyCompletion(
        next.questionCount,
        next.correctAnswers,
        next.skippedAnswers,
        next.dailyAnswers,
      );
    }
    if (!skipped) {
      persistBestGameScore(next.correctAnswers, { notify: false });
    }
    refresh();
    if (profile) {
      awardAchievements(
        {
          sessionCorrect: next.correctAnswers,
          sessionTotal: next.questionCount,
          sessionEnded: next.sessionComplete || next.gameOver,
        },
        profile,
      );
    }
  }

  const spawnBurst = useCallback((correct: boolean, lostStreak?: number) => {
    burstIdRef.current += 1;
    setBursts((prev) => [
      ...prev,
      {
        id: burstIdRef.current,
        correct,
        ...(lostStreak !== undefined ? { lostStreak } : {}),
      },
    ]);
  }, []);

  const removeBurst = useCallback((id: number) => {
    setBursts((prev) => prev.filter((burst) => burst.id !== id));
  }, []);

  const dismissAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  useEffect(() => {
    if (tracksMapProgress && mapProgressDifficulty) {
      setStoredMapProgressDifficulty(mapProgressDifficulty);
    }
  }, [tracksMapProgress, mapProgressDifficulty]);

  useEffect(() => {
    if (!timed || gameOver) return;
    const timer = setTimeout(() => {
      setTimeLeft((remaining) => {
        if (remaining <= 1) {
          setSession((current) => quizSessionReducer(current, { type: "time-up" }));
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [timed, timeLeft, gameOver]);

  useEffect(() => {
    if (!timed || !gameOver || speedSessionCheckedRef.current || questionCount === 0) {
      return;
    }
    speedSessionCheckedRef.current = true;
    persistBestGameScore(correctAnswers);
    awardAchievements({
      sessionCorrect: correctAnswers,
      sessionTotal: questionCount,
      sessionEnded: true,
    });
  }, [timed, gameOver, activeProfile, mode, correctAnswers, questionCount]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mode, countStats]);

  useEffect(() => {
    if (mode !== "daily-challenge" || !countStats || dailyStartedAt === null) return;
    if (typeof window === "undefined") return;
    sessionStorage.setItem(DAILY_COUNTING_SESSION_KEY, dailyDateKey);
    saveDailyTimerSession({ dateKey: dailyDateKey, startedAt: dailyStartedAt });
  }, [mode, countStats, dailyDateKey, dailyStartedAt]);

  const hasFinishedQuestions = !question && questionCount > 0;
  const hasReachedQuestionLimit = Boolean(
    sessionQuestionLimit && questionCount >= sessionQuestionLimit,
  );
  const roundEnded =
    exitedEarly ||
    gameOver ||
    sessionComplete ||
    hasFinishedQuestions ||
    hasReachedQuestionLimit;
  const showSummary = roundEnded && !showLearnCard;

  function buildResumeSnapshot(): GameResumeSnapshot | null {
    if (!question || showSummary) return null;
    if (questionCount === 0 && !showLearnCard) return null;
    return {
      version: 1,
      playHref: buildGameResumePlayHref(
        mode,
        scope,
        isDailyChallenge ? dailyDateKey : undefined,
      ),
      createdAt: Date.now(),
      profileId: activeProfile.id,
      mode,
      challengeModifier,
      continents,
      scope,
      includeTerritories,
      difficulty,
      ...(weakSpotCodes ? { weakSpotCodes } : {}),
      ...(seed !== undefined ? { seed } : {}),
      timed,
      stopOnWrong,
      ...(maxQuestions !== undefined ? { maxQuestions } : {}),
      countStats,
      ...(isDailyChallenge ? { dailyDateKey, dailyStartedAt: dailyStartedAt ?? undefined } : {}),
      ...(isDailyChallenge && dailyQuestionsForResult.length
        ? { dailyQuestions: dailyQuestionsForResult }
        : {}),
      ...(isDailyChallenge && dailyAnswers.length ? { dailyAnswers } : {}),
      questionIndex: engine.getQuestionIndex(),
      roundCountryCodes: engine.getRoundCountryCodes(),
      question,
      showLearnCard,
      streak,
      endedStreak,
      lastCorrect,
      lastSelectedAnswer,
      lastSelectedCode,
      disabled,
      hiddenOptions,
      usedFiftyFifty,
      usedSkip,
      questionCount,
      correctAnswers,
      skippedAnswers,
      hintsUsed,
      timeLeft,
      gameOver,
      sessionComplete,
    };
  }

  const resumeSnapshotRef = useRef<GameResumeSnapshot | null>(null);

  useLayoutEffect(() => {
    const snapshot = buildResumeSnapshot();
    resumeSnapshotRef.current = snapshot;
    if (snapshot) {
      saveGameResumeSnapshot(snapshot);
    } else if (showSummary) {
      clearGameResumeSnapshot();
    }

    function flushResume() {
      const next = buildResumeSnapshot();
      resumeSnapshotRef.current = next;
      if (next) saveGameResumeSnapshot(next);
    }

    function handleVisibility() {
      if (document.visibilityState === "hidden") flushResume();
    }

    window.addEventListener("pagehide", flushResume);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      flushResume();
      window.removeEventListener("pagehide", flushResume);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [
    showSummary,
    question,
    showLearnCard,
    questionCount,
    streak,
    endedStreak,
    lastCorrect,
    lastSelectedAnswer,
    lastSelectedCode,
    disabled,
    hiddenOptions,
    usedFiftyFifty,
    usedSkip,
    correctAnswers,
    skippedAnswers,
    hintsUsed,
    timeLeft,
    gameOver,
    sessionComplete,
    dailyAnswers,
  ]);

  useEffect(() => {
    if (
      !isDailyChallenge ||
      dailyStartedAt === null ||
      showSummary ||
      sessionComplete ||
      gameOver ||
      exitedEarly
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setDailyElapsedCentiseconds(
        Math.max(0, Math.round((Date.now() - dailyStartedAt) / 10)),
      );
    }, 50);
    return () => window.clearInterval(timer);
  }, [isDailyChallenge, dailyStartedAt, showSummary, sessionComplete, gameOver, exitedEarly]);

  useEffect(() => {
    if (!isDailyChallenge || reviewStartedAt === null || showSummary) return;
    const timer = window.setInterval(() => {
      setReviewElapsedCentiseconds(
        Math.max(0, Math.round((Date.now() - reviewStartedAt) / 10)),
      );
    }, 50);
    return () => window.clearInterval(timer);
  }, [isDailyChallenge, reviewStartedAt, showSummary]);

  useEffect(() => {
    if (!question || !themeReady || showSummary) return;

    let cancelled = false;

    void (async () => {
      await preloadLearnCardMap(question.countryCode, isDark);
      if (cancelled || showLearnCard) return;

      const nextCountry = engine.peekNextCountry();
      if (!cancelled && nextCountry) {
        await preloadLearnCardMap(nextCountry.code, isDark);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [question, themeReady, isDark, engine, showSummary, showLearnCard]);

  useEffect(() => {
    if (!showLearnCard || !themeReady || showSummary) return;

    const nextCountry = engine.peekNextCountry();
    if (!nextCountry) return;

    void preloadLearnCardMap(nextCountry.code, isDark);
  }, [showLearnCard, themeReady, isDark, engine, showSummary]);

  useEffect(() => {
    if (!showSummary || !countStats || summaryAchievementsCheckedRef.current || questionCount === 0) {
      return;
    }
    summaryAchievementsCheckedRef.current = true;

    if (!bestGameScoreRecordedRef.current) {
      bestGameScoreRecordedRef.current = true;
      persistBestGameScore(correctAnswers);
      refresh();
    }

    if (
      mode === "daily-challenge" &&
      sessionQuestionLimit &&
      questionCount >= sessionQuestionLimit
    ) {
      maybeRecordDailyCompletion(questionCount);
      refresh();
    }

    awardAchievements({
      sessionCorrect: correctAnswers,
      sessionTotal: questionCount,
      sessionEnded: true,
    });
  }, [
    showSummary,
    countStats,
    questionCount,
    correctAnswers,
    mode,
    difficulty,
    activeProfile.id,
    sessionQuestionLimit,
    scope,
  ]);

  if (engine.getPoolSize() === 0) {
    return (
      <div className="rounded-3xl border-2 border-slate-200 bg-white/90 p-8 text-center shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <p className="text-slate-600 dark:text-slate-400">{scopeText("No countries match your filters for this mode.", scope)}</p>
        <Button className="mt-4" onClick={() => router.push("/")}>Back home</Button>
      </div>
    );
  }

  function handleAnswer(answer: string, code?: string, hintCount = 0) {
    if (!question || disabled) return;

    const isCodeSelection = code !== undefined;
    const correct = engine.checkAnswer(question, code ?? answer, isCodeSelection);
    const lostStreak = !correct && streak >= STREAK_SNUFF_MIN ? streak : undefined;
    const dailyAnswer: DailyChallengeAnswer = {
      questionIndex: questionCount,
      answer,
      correct,
      skipped: false,
    };
    spawnBurst(correct, lostStreak);
    playSound(correct ? "correct" : "incorrect", activeProfile, {
      streak: correct ? streak + 1 : undefined,
      lostStreak,
    });
    triggerHaptic(correct ? "correct" : "incorrect", activeProfile, { lostStreak });

    const next = commit({
      type: "answer",
      correct,
      answer,
      code,
      globeRevealCode:
        question.mode === "globe-hunt"
          ? correct
            ? null
            : question.correctCode ?? question.countryCode
          : globeRevealCode,
      dailyAnswer,
      isDailyChallenge,
      stopOnWrong,
      sessionQuestionLimit,
      hintCount,
    });
    persistQuestionOutcome(question, next, false, correct);
  }

  function handleSkip() {
    if (!question || usedSkip || difficulty !== "easy") return;
    const dailyAnswer: DailyChallengeAnswer = {
      questionIndex: questionCount,
      answer: null,
      correct: false,
      skipped: true,
    };
    const next = commit({
      type: "skip",
      dailyAnswer,
      isDailyChallenge,
      sessionQuestionLimit,
    });
    persistQuestionOutcome(question, next, true, false);
  }

  function handleFiftyFifty() {
    if (!question?.options || usedFiftyFifty || difficulty !== "easy") return;
    const wrong = question.options.filter((option) => option !== question.correctAnswer);
    commit({ type: "fifty-fifty", hiddenOptions: wrong.slice(0, 2) });
  }

  function handleExit() {
    if (questionCount === 0) {
      router.push("/");
      return;
    }
    persistBestGameScore(correctAnswers);
    commit({ type: "exit" });
    if (isDailyChallenge && countStats) {
      clearDailyTimerSession();
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(DAILY_COUNTING_SESSION_KEY);
      }
    }
    playSound("complete", activeProfile);
  }

  function handleContinue() {
    const shouldComplete =
      gameOver ||
      sessionComplete ||
      Boolean(sessionQuestionLimit && questionCount >= sessionQuestionLimit);
    if (shouldComplete) {
      commit({ type: "continue", nextQuestion: null, complete: true });
      if (!gameOver) playSound("complete", activeProfile);
      return;
    }

    const nextQuestion = engine.nextQuestion();
    if (!nextQuestion) {
      commit({ type: "continue", nextQuestion: null, complete: true });
      playSound("complete", activeProfile);
      return;
    }
    commit({ type: "continue", nextQuestion, complete: false });
  }

  if (showSummary) {
    const accuracy = questionCount > 0
      ? Math.round((correctAnswers / questionCount) * 100)
      : 0;
    const currentMapProgress =
      tracksMapProgress && mapProgressDifficulty
        ? {
            area: getMapProgressSummary(
              scope,
              activeProfile,
              mapProgressDifficulty,
              continents,
            ),
            overall: getMapProgressSummary(scope, activeProfile, mapProgressDifficulty),
          }
        : null;
    const challengeComplete =
      !exitedEarly &&
      !gameOver &&
      (sessionComplete || hasFinishedQuestions || hasReachedQuestionLimit);
    const { title, description } = getRoundSummaryCopy(
      resolveRoundEnd({
        exitedEarly,
        challengeComplete,
        timed,
        isReview: mode === "daily-challenge" && !countStats,
        questionCount,
        endedStreak,
      }),
    );

    return (
      <GameRoundSummary
        title={title}
        description={description}
        celebrate={challengeComplete || exitedEarly}
        bursts={bursts}
        onBurstDone={removeBurst}
        achievementIds={newAchievements}
        onDismissAchievements={dismissAchievements}
        correctAnswers={correctAnswers}
        accuracy={accuracy}
        difficulty={difficulty}
        mode={mode}
        scope={scope}
        continents={continents}
        isDailyChallenge={isDailyChallenge}
        countStats={countStats}
        summaryDailyTime={
          dailyCompletionElapsedCentiseconds ??
          storedDailyResult?.elapsedCentiseconds ??
          dailyElapsedCentiseconds
        }
        hintsUsed={hintsUsed}
        skippedAnswers={skippedAnswers}
        exitedEarly={exitedEarly}
        tracksMapProgress={tracksMapProgress}
        mapProgressDifficulty={mapProgressDifficulty}
        initialMapProgress={initialMapProgress}
        currentMapProgress={currentMapProgress}
        onHome={() => router.push("/")}
        onPlayAgain={onPlayAgain}
        onSecondary={() =>
          router.push(isDailyChallenge ? `/daily-challenge?date=${dailyDateKey}` : scope === "usa" ? "/map?view=usa" : "/map")
        }
        secondaryLabel={isDailyChallenge ? "Leaderboard" : "Map"}
        secondaryIcon={isDailyChallenge ? "🏆" : "🗺️"}
      />
    );
  }

  if (!question && questionCount === 0) {
    return (
      <div className="rounded-3xl border-2 border-slate-200 bg-white/90 p-8 text-center shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <p className="text-slate-600 dark:text-slate-400">Could not load the first question for this round.</p>
        <Button className="mt-4" onClick={() => router.push("/")}>Back home</Button>
      </div>
    );
  }

  if (!question) return null;

  const answerCode =
    question.mode === "neighbor-quiz" || question.mode === "population-showdown"
      ? question.correctCode ?? question.countryCode
      : question.countryCode;
  const answerPlace = getCountryByCode(answerCode);
  const questionScope = isDailyChallenge
    ? isStateCode(answerCode)
      ? "usa"
      : "world"
    : scope;
  const isMultipleChoiceRound =
    question.displayType !== "atlasle" &&
    (question.displayType === "flags-grid" ||
      Boolean(question.options && difficulty !== "hard"));

  return (
    <GameQuestionStage
      question={question}
      questionScope={questionScope}
      difficulty={difficulty}
      interactionLocked={interactionLocked}
      isDailyChallenge={isDailyChallenge}
      countStats={countStats}
      timed={timed}
      sessionQuestionLimit={sessionQuestionLimit}
      timeLeft={timeLeft}
      headerDailyTime={dailyCompletionElapsedCentiseconds ?? dailyElapsedCentiseconds}
      reviewElapsedCentiseconds={reviewElapsedCentiseconds}
      dailyDateLabel={isDailyChallenge ? formatDailyDateKey(dailyDateKey) : null}
      roundTaskLabel={getQuestionTaskLabel(question, questionScope, answerPlace)}
      answerPlace={answerPlace}
      isTextOnlyPrompt={isTextOnlyQuestion(question)}
      isGlobeHuntRound={question.mode === "globe-hunt"}
      isAtlasleRound={question.displayType === "atlasle"}
      isInvertedFlagRound={isInvertedFlagQuestion(question)}
      isMultipleChoiceRound={isMultipleChoiceRound}
      showChoiceReveal={showLearnCard && isMultipleChoiceRound}
      showLearnCard={showLearnCard}
      lastSelectedAnswer={lastSelectedAnswer}
      lastSelectedCode={lastSelectedCode}
      globeRevealCode={globeRevealCode}
      disabled={disabled}
      hiddenOptions={hiddenOptions}
      usedFiftyFifty={usedFiftyFifty}
      usedSkip={usedSkip}
      streak={streak}
      correctAnswers={correctAnswers}
      questionCount={questionCount}
      learnCardLibraryHref={buildLibraryDetailHref(
        question.countryCode,
        isStateCode(question.countryCode) ? "usa" : scope,
        "All",
      )}
      learnCardLibraryRef={learnCardLibraryRef}
      learnCard={{
        countryCode: question.countryCode,
        answerNeighborCode:
          question.mode === "neighbor-quiz" ? question.correctCode : undefined,
        heading:
          question.mode === "neighbor-quiz" ? (
            <>
              <span className="font-black">{getCountryName(question.countryCode)}</span>
              <span className="font-bold opacity-95">
                {answerPlace?.isTerritory ? "'s neighboring territory is " : "'s neighbor is "}
              </span>
              <span className="font-black">{question.correctAnswer}</span>
            </>
          ) : undefined,
        wasCorrect: lastCorrect,
        compareCountryCode:
          question.mode === "population-showdown" ? question.secondaryCountryCode : undefined,
        showCapitalMarker: isCapitalQuestion(question),
      }}
      resumeSnapshot={resumeSnapshot}
      bursts={bursts}
      onBurstDone={removeBurst}
      achievementIds={newAchievements}
      onDismissAchievements={dismissAchievements}
      onExit={handleExit}
      onLibraryClick={() => {
        const snapshot = buildResumeSnapshot();
        if (snapshot) saveGameResumeSnapshot(snapshot);
      }}
      onAnswer={handleAnswer}
      onSkip={handleSkip}
      onFiftyFifty={handleFiftyFifty}
      onContinue={handleContinue}
      onAtlasleComplete={(finalGuess, puzzleHints) => {
        handleAnswer(finalGuess, undefined, puzzleHints);
      }}
    />
  );
}
