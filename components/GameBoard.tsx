"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AnswerFeedbackLayer,
  type FeedbackBurst,
} from "@/components/AnswerFeedback";
import { AnswerAtlasle } from "@/components/AnswerAtlasle";
import { AnswerMultipleChoice } from "@/components/AnswerMultipleChoice";
import { AnswerTypeIn } from "@/components/AnswerTypeIn";
import { AchievementToast } from "@/components/AchievementToast";
import { FlagGrid } from "@/components/FlagDisplay";
import { GameMapProgressSummary } from "@/components/GameMapProgressSummary";
import { GlobeHuntSurface } from "@/components/GlobeHuntSurface";
import { LearnCard } from "@/components/LearnCard";
import { preloadLearnCardMap } from "@/components/PlaceContextMap";
import { QuestionMedia } from "@/components/QuestionMedia";
import { StreakCounter } from "@/components/StreakCounter";
import { GameActionButton } from "@/components/GameActionButton";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/AuthProvider";
import { useProfiles, useRequiredProfile } from "@/components/ProfileProvider";
import { getCountryName, getCountryByCode } from "@/lib/countries";
import {
  DAILY_COUNTING_SESSION_KEY,
  GameEngine,
  formatDailyDateKey,
  getDailyDateKey,
} from "@/lib/game-engine";
import {
  clearDailyTimerSession,
  ensureDailyChallengeResultSubmitted,
  formatDailyElapsedTime,
  loadDailyTimerSession,
  saveDailyTimerSession,
} from "@/lib/daily-challenge";
import {
  checkAchievements,
  loadState,
  markDailyChallengePlayed,
  recordBestGameScore,
  recordAnswer,
  recordDailyChallengeResult,
} from "@/lib/storage";
import { triggerHaptic } from "@/lib/haptics";
import { playSound } from "@/lib/sound";
import { getGlobalStreakOrZero } from "@/lib/stats-helpers";
import {
  isInvertedFlagRound as isInvertedFlagQuestion,
  isTextOnlyPrompt as isTextOnlyQuestion,
} from "@/lib/question-presentation";
import { STREAK_SNUFF_MIN } from "@/lib/streak-tier";
import {
  getMapProgressSummary,
  modeCountsTowardMapProgress,
  toMapProgressDifficulty,
} from "@/lib/map-progress";
import { buildLibraryDetailHref, LIBRARY_ICON } from "@/lib/library";
import {
  buildGameResumePlayHref,
  saveGameResumeSnapshot,
  type GameResumeSnapshot,
} from "@/lib/game-resume";
import { getQuestionTaskLabel, getTypeInPlacePlaceholder, isStateCode, scopeText, SCOPE_INFO } from "@/lib/scope";
import { getStatsMode } from "@/lib/game-setup";
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
import { cn } from "@/lib/utils";

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
    const gameEngine = new GameEngine(
      mode,
      continents,
      difficulty,
      weakSpotCodes,
      seed,
      maxQuestions,
      includeTerritories,
      scope,
      challengeModifier,
      dailyQuestions ?? resumeSnapshot?.dailyQuestions,
    );
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
  const [question, setQuestion] = useState<Question | null>(firstQuestion);
  const [streak, setStreak] = useState(() => {
    if (resumeSnapshot) return resumeSnapshot.streak;
    return mode === "daily-challenge" && !countStats
      ? 0
      : getGlobalStreakOrZero(activeProfile, difficulty, scope).currentStreak;
  });
  /** Streak length captured when a miss ends the round (marathon / stop-on-wrong). */
  const [endedStreak, setEndedStreak] = useState(() => resumeSnapshot?.endedStreak ?? 0);
  const [showLearnCard, setShowLearnCard] = useState(() => Boolean(resumeSnapshot));
  const [lastCorrect, setLastCorrect] = useState(() => resumeSnapshot?.lastCorrect ?? true);
  const [lastSelectedAnswer, setLastSelectedAnswer] = useState<string | null>(
    () => resumeSnapshot?.lastSelectedAnswer ?? null,
  );
  const [lastSelectedCode, setLastSelectedCode] = useState<string | null>(
    () => resumeSnapshot?.lastSelectedCode ?? null,
  );
  const [globeRevealCode, setGlobeRevealCode] = useState<string | null>(() => {
    if (!resumeSnapshot?.question || resumeSnapshot.question.mode !== "globe-hunt") return null;
    if (resumeSnapshot.lastCorrect) return null;
    return resumeSnapshot.question.correctCode ?? resumeSnapshot.question.countryCode;
  });
  const [disabled, setDisabled] = useState(() => resumeSnapshot?.disabled ?? false);
  const [hiddenOptions, setHiddenOptions] = useState<string[]>(
    () => resumeSnapshot?.hiddenOptions ?? [],
  );
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(
    () => resumeSnapshot?.usedFiftyFifty ?? false,
  );
  const [usedSkip, setUsedSkip] = useState(() => resumeSnapshot?.usedSkip ?? false);
  const [questionCount, setQuestionCount] = useState(() => resumeSnapshot?.questionCount ?? 0);
  const [correctAnswers, setCorrectAnswers] = useState(() => resumeSnapshot?.correctAnswers ?? 0);
  const [skippedAnswers, setSkippedAnswers] = useState(() => resumeSnapshot?.skippedAnswers ?? 0);
  const [hintsUsed, setHintsUsed] = useState(() => resumeSnapshot?.hintsUsed ?? 0);
  const [timeLeft, setTimeLeft] = useState(() => resumeSnapshot?.timeLeft ?? 60);
  const [gameOver, setGameOver] = useState(() => resumeSnapshot?.gameOver ?? false);
  const [sessionComplete, setSessionComplete] = useState(
    () => resumeSnapshot?.sessionComplete ?? false,
  );
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
  const [dailyAnswers, setDailyAnswers] = useState<DailyChallengeAnswer[]>(
    () => resumeSnapshot?.dailyAnswers ?? [],
  );
  const [exitedEarly, setExitedEarly] = useState(false);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [initialMapProgress] = useState(() => {
    if (!mapProgressDifficulty) return null;
    return {
      area: getMapProgressSummary(scope, activeProfile, mapProgressDifficulty, continents),
      overall: getMapProgressSummary(scope, activeProfile, mapProgressDifficulty),
    };
  });
  const speedSessionCheckedRef = useRef(false);
  const dailyCompletionRecordedRef = useRef(false);
  const summaryAchievementsCheckedRef = useRef(false);
  const bestGameScoreRecordedRef = useRef(false);

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

  function awardAchievements(session: {
    sessionCorrect: number;
    sessionTotal: number;
    sessionEnded: boolean;
  }) {
    const state = loadState();
    const updatedProfile = state.profiles.find((p) => p.id === activeProfile.id);
    if (!updatedProfile) return;
    const earned = checkAchievements(updatedProfile, statsMode, difficulty, session, scope);
    if (earned.length) setNewAchievements((prev) => [...prev, ...earned]);
  }

  // Feedback bursts live in their own list so advancing to the next question
  // never unmounts an in-flight animation.
  const [bursts, setBursts] = useState<FeedbackBurst[]>([]);
  const burstIdRef = useRef(0);

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
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const dismissAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  // Remember the last Normal/Hard session so the map and globe show that track.
  useEffect(() => {
    if (tracksMapProgress && mapProgressDifficulty) {
      setStoredMapProgressDifficulty(mapProgressDifficulty);
    }
  }, [tracksMapProgress, mapProgressDifficulty]);

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
    if (!timed || !gameOver || speedSessionCheckedRef.current || questionCount === 0) {
      return;
    }
    speedSessionCheckedRef.current = true;
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
    // Keep the counting session alive across navigation and resume.
    sessionStorage.setItem(DAILY_COUNTING_SESSION_KEY, dailyDateKey);
    saveDailyTimerSession({ dateKey: dailyDateKey, startedAt: dailyStartedAt });
  }, [mode, countStats, dailyDateKey, dailyStartedAt]);

  function persistLearnCardResume() {
    if (!question || !showLearnCard) return;
    saveGameResumeSnapshot({
      version: 1,
      playHref: buildGameResumePlayHref(
        mode,
        scope,
        isDailyChallenge ? dailyDateKey : undefined,
      ),
      createdAt: Date.now(),
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
      streak,
      endedStreak,
      lastCorrect,
      lastSelectedAnswer,
      lastSelectedCode,
      disabled: true,
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
    });
  }

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

  // Warm learn-card maps while the player answers / reads, so the terrain crop
  // is already cached when PlaceContextMap mounts.
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
      recordBestGameScore(activeProfile.id, mode, difficulty, correctAnswers, scope);
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

  function handleAnswer(answer: string, code?: string) {
    if (!question || disabled) return;
    setDisabled(true);

    const isCodeSelection = code !== undefined;
    const correct = engine.checkAnswer(question, code ?? answer, isCodeSelection);
    if (question.mode === "globe-hunt") {
      setGlobeRevealCode(correct ? null : question.correctCode ?? question.countryCode);
    }
    const lostStreak = !correct && streak >= STREAK_SNUFF_MIN ? streak : undefined;
    const dailyAnswer: DailyChallengeAnswer = {
      questionIndex: questionCount,
      answer,
      correct,
      skipped: false,
    };
    setLastCorrect(correct);
    setLastSelectedAnswer(answer);
    setLastSelectedCode(code ?? null);
    if (isDailyChallenge) {
      setDailyAnswers((answers) => [
        ...answers,
        dailyAnswer,
      ]);
    }
    spawnBurst(correct, lostStreak);
    playSound(correct ? "correct" : "incorrect", activeProfile, {
      streak: correct ? streak + 1 : undefined,
      lostStreak,
    });
    triggerHaptic(correct ? "correct" : "incorrect", activeProfile, { lostStreak });

    if (countStats) {
      recordAnswer(
        activeProfile.id,
        statsMode,
        difficulty,
        correct,
        question.countryCode,
        false,
        scope,
        mode === "weak-spots",
        question,
      );
      if (mode === "daily-challenge") {
        markDailyChallengePlayed(activeProfile.id, dailyDateKey);
      }

      const completedQuestions = questionCount + 1;
      const sessionCorrect = correctAnswers + (correct ? 1 : 0);
      const completedDailyAnswers = isDailyChallenge
        ? [...dailyAnswers, dailyAnswer]
        : dailyAnswers;
      const sessionEnded =
        Boolean(sessionQuestionLimit && completedQuestions >= sessionQuestionLimit) ||
        (stopOnWrong && !correct);

      if (sessionEnded) {
        maybeRecordDailyCompletion(
          completedQuestions,
          sessionCorrect,
          skippedAnswers,
          completedDailyAnswers,
        );
      }

      refresh();
      awardAchievements({
        sessionCorrect,
        sessionTotal: completedQuestions,
        sessionEnded,
      });
    }

    const completedQuestions = questionCount + 1;

    if (correct) {
      setStreak((s) => s + 1);
      setCorrectAnswers((count) => count + 1);
    } else {
      setEndedStreak(streak);
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
    setLastSelectedAnswer(null);
    setLastSelectedCode(null);
    const dailyAnswer: DailyChallengeAnswer = {
      questionIndex: questionCount,
      answer: null,
      correct: false,
      skipped: true,
    };
    if (isDailyChallenge) {
      setDailyAnswers((answers) => [
        ...answers,
        dailyAnswer,
      ]);
    }
    const completedQuestions = questionCount + 1;
    setQuestionCount(completedQuestions);
    setSkippedAnswers((count) => count + 1);
    if (sessionQuestionLimit && completedQuestions >= sessionQuestionLimit) {
      setSessionComplete(true);
    }
    if (countStats) {
      recordAnswer(activeProfile.id, statsMode, difficulty, false, question.countryCode, true, scope);
      if (mode === "daily-challenge") {
        markDailyChallengePlayed(activeProfile.id, dailyDateKey);
      }

      const sessionEnded = Boolean(
        sessionQuestionLimit && completedQuestions >= sessionQuestionLimit,
      );
      const completedDailyAnswers = isDailyChallenge
        ? [...dailyAnswers, dailyAnswer]
        : dailyAnswers;
      if (sessionEnded) {
        maybeRecordDailyCompletion(
          completedQuestions,
          correctAnswers,
          skippedAnswers + 1,
          completedDailyAnswers,
        );
      }

      refresh();
      awardAchievements({
        sessionCorrect: correctAnswers,
        sessionTotal: completedQuestions,
        sessionEnded,
      });
    }
  }

  function handleFiftyFifty() {
    if (!question?.options || usedFiftyFifty || difficulty !== "easy") return;
    const wrong = question.options.filter((o) => o !== question.correctAnswer);
    setHiddenOptions(wrong.slice(0, 2));
    setUsedFiftyFifty(true);
  }

  function handleExit() {
    if (questionCount === 0) {
      router.push("/");
      return;
    }
    setShowLearnCard(false);
    setExitedEarly(true);
    if (isDailyChallenge && countStats) {
      clearDailyTimerSession();
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(DAILY_COUNTING_SESSION_KEY);
      }
    }
    playSound("complete", activeProfile);
  }

  function handleContinue() {
    setShowLearnCard(false);
    setDisabled(false);
    setHiddenOptions([]);
    setUsedFiftyFifty(false);
    setUsedSkip(false);
    setLastSelectedAnswer(null);
    setLastSelectedCode(null);
    setGlobeRevealCode(null);

    if (
      gameOver ||
      sessionComplete ||
      (sessionQuestionLimit && questionCount >= sessionQuestionLimit)
    ) {
      setSessionComplete(true);
      if (!gameOver) {
        playSound("complete", activeProfile);
      }
      return;
    }

    const nextQuestion = engine.nextQuestion();
    if (!nextQuestion) {
      setSessionComplete(true);
      playSound("complete", activeProfile);
      return;
    }
    setQuestion(nextQuestion);
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
    const mapHref = scope === "usa" ? "/map?view=usa" : "/map";
    const dailyLeaderboardHref = `/daily-challenge?date=${dailyDateKey}`;
    const summaryDailyTime =
      dailyCompletionElapsedCentiseconds ??
      storedDailyResult?.elapsedCentiseconds ??
      dailyElapsedCentiseconds;
    const challengeComplete =
      !exitedEarly &&
      !gameOver &&
      (sessionComplete || hasFinishedQuestions || hasReachedQuestionLimit);
    const title = exitedEarly
      ? mode === "daily-challenge" && !countStats
        ? "Review ended"
        : "Round ended"
      : challengeComplete
        ? mode === "daily-challenge" && !countStats
          ? "Review complete!"
          : "Challenge complete!"
        : "Game over";
    const description = exitedEarly
      ? mode === "daily-challenge" && !countStats
        ? `You attempted ${questionCount} question${questionCount === 1 ? "" : "s"}. Stats were not recorded.`
        : `You attempted ${questionCount} question${questionCount === 1 ? "" : "s"}.`
      : challengeComplete
        ? mode === "daily-challenge" && !countStats
          ? `You reviewed all ${questionCount} questions. Stats were not recorded.`
          : `You completed all ${questionCount} questions.`
        : timed
          ? `Time's up after ${questionCount} questions.`
          : `Your streak ended at ${endedStreak}.`;

    return (
      <>
        <AnswerFeedbackLayer bursts={bursts} onDone={removeBurst} />
        <AchievementToast
          achievementIds={newAchievements}
          onDismiss={dismissAchievements}
        />
        <div className="animate-card-pop-in my-auto rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-5 text-center shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:p-8">
          <p className="text-4xl">{challengeComplete || exitedEarly ? "🎉" : "🏁"}</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold">{title}</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{description}</p>
          <div className={`mx-auto mt-6 grid max-w-sm gap-3 ${difficulty === "easy" ? "grid-cols-3" : "grid-cols-2"}`}>
            <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/50">
              <p className="font-display text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{correctAnswers}</p>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Correct</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-3 dark:bg-sky-950/50">
              <p className="font-display text-2xl font-extrabold text-sky-700 dark:text-sky-400">{accuracy}%</p>
              <p className="text-xs font-semibold text-sky-800 dark:text-sky-300">Accuracy</p>
            </div>
            {isDailyChallenge && (
              <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/50">
                <p className="font-display text-2xl font-extrabold text-amber-700 dark:text-amber-400">
                  {formatDailyElapsedTime(summaryDailyTime)}
                </p>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {countStats ? "Time" : "Original time"}
                </p>
              </div>
            )}
            {difficulty === "easy" && mode === "atlasle" && (
              <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/50">
                <p className="font-display text-2xl font-extrabold text-amber-700 dark:text-amber-400">{hintsUsed}</p>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Hints</p>
              </div>
            )}
            {difficulty === "easy" && mode !== "atlasle" && (
              <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                <p className="font-display text-2xl font-extrabold text-slate-700 dark:text-slate-200">{skippedAnswers}</p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Skipped</p>
              </div>
            )}
          </div>
          {tracksMapProgress &&
            mapProgressDifficulty &&
            initialMapProgress &&
            currentMapProgress && (
            <GameMapProgressSummary
              scope={scope}
              continents={continents}
              difficulty={mapProgressDifficulty}
              initialSummary={initialMapProgress.area}
              currentSummary={currentMapProgress.area}
              initialOverallSummary={initialMapProgress.overall}
              currentOverallSummary={currentMapProgress.overall}
            />
          )}
          <div className="mt-6 flex flex-col gap-3">
            {exitedEarly ? (
              <GameActionButton icon="🏠" onClick={() => router.push("/")}>
                Home
              </GameActionButton>
            ) : (
              onPlayAgain && (
                <GameActionButton icon={SCOPE_INFO[scope].icon} onClick={onPlayAgain}>
                  Play again
                </GameActionButton>
              )
            )}
            <div className="grid grid-cols-2 gap-2 max-[360px]:grid-cols-1 sm:gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="w-full min-w-0 gap-1.5 px-3 text-base max-sm:gap-1 max-sm:px-2.5 max-sm:text-sm sm:gap-2.5 sm:px-5 sm:text-lg"
                onClick={() => router.push(isDailyChallenge ? dailyLeaderboardHref : mapHref)}
              >
                <span className="shrink-0 text-xl leading-none max-sm:text-lg sm:text-2xl" aria-hidden>
                  {isDailyChallenge ? "🏆" : "🗺️"}
                </span>
                <span className="truncate">{isDailyChallenge ? "Leaderboard" : "Map"}</span>
              </Button>
              {exitedEarly && onPlayAgain ? (
                <Button
                  size="lg"
                  className="w-full min-w-0 gap-1.5 px-3 text-base max-sm:gap-1 max-sm:px-2.5 max-sm:text-sm sm:gap-2.5 sm:px-5 sm:text-lg"
                  onClick={onPlayAgain}
                >
                  <span className="shrink-0 text-xl leading-none max-sm:text-lg sm:text-2xl" aria-hidden>
                    {SCOPE_INFO[scope].icon}
                  </span>
                  <span className="truncate">Play again</span>
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full min-w-0 gap-1.5 px-3 text-base max-sm:gap-1 max-sm:px-2.5 max-sm:text-sm sm:gap-2.5 sm:px-5 sm:text-lg"
                  onClick={() => router.push("/")}
                >
                  <img
                    src="/icons/home.svg"
                    alt=""
                    aria-hidden
                    className="size-6 shrink-0 max-sm:size-5 sm:size-7"
                    draggable={false}
                  />
                  <span className="truncate sm:hidden">Home</span>
                  <span className="hidden truncate sm:inline">Take me home</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </>
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
  const roundTaskLabel = getQuestionTaskLabel(question, questionScope, answerPlace);
  const dailyDateLabel = isDailyChallenge ? formatDailyDateKey(dailyDateKey) : null;
  const headerDailyTime = countStats
    ? dailyCompletionElapsedCentiseconds ?? dailyElapsedCentiseconds
    : storedDailyResult?.elapsedCentiseconds ?? 0;
  const isTextOnlyPrompt = isTextOnlyQuestion(question);
  const isGlobeHuntRound = question.mode === "globe-hunt";
  const isAtlasleRound = question.displayType === "atlasle";
  const isInvertedFlagRound = isInvertedFlagQuestion(question);
  const isMultipleChoiceRound =
    !isAtlasleRound &&
    (question.displayType === "flags-grid" ||
      Boolean(question.options && difficulty !== "hard"));
  const showChoiceReveal = showLearnCard && isMultipleChoiceRound;
  const learnCardCountryCode = question.countryCode;
  const learnCardHeading =
    question.mode === "neighbor-quiz" ? (
      <>
        <span className="font-black">{getCountryName(question.countryCode)}</span>
        <span className="font-bold opacity-95">
          {answerPlace?.isTerritory ? "'s neighboring territory is " : "'s neighbor is "}
        </span>
        <span className="font-black">{question.correctAnswer}</span>
      </>
    ) : undefined;
  const learnCardLibraryScope = isStateCode(learnCardCountryCode) ? "usa" : scope;
  const learnCardLibraryHref = buildLibraryDetailHref(
    learnCardCountryCode,
    learnCardLibraryScope,
    "All",
  );
  const learnCardProps = {
    countryCode: learnCardCountryCode,
    answerNeighborCode:
      question.mode === "neighbor-quiz" ? question.correctCode : undefined,
    heading: learnCardHeading,
    wasCorrect: lastCorrect,
    compareCountryCode:
      question.mode === "population-showdown" ? question.secondaryCountryCode : undefined,
  };
  const inlineLearnCard = (
    <LearnCard {...learnCardProps} variant="inline" />
  );
  const overlayLearnCard = (
    <LearnCard {...learnCardProps} variant="default" />
  );
  const roundTitlePanel = (
    <>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-teal-700/70 sm:text-[10px]">
        {dailyDateLabel ?? "Your task"}
      </p>
      <p className="font-display text-sm font-extrabold leading-snug text-slate-700 dark:text-slate-200 sm:truncate sm:text-base">
        {roundTaskLabel}
      </p>
      {mode === "daily-challenge" && !countStats && (
        <p className="mt-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
          Review — stats won&apos;t count
        </p>
      )}
    </>
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-3",
        interactionLocked && "pointer-events-none",
      )}
      aria-hidden={interactionLocked}
    >
      {!showLearnCard && (
        <AchievementToast
          achievementIds={newAchievements}
          onDismiss={dismissAchievements}
        />
      )}

      <div className="relative z-50 shrink-0 px-0.5 py-1.5 sm:px-1 sm:py-2">
        <div className="flex items-center justify-between gap-1 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleExit();
              }}
              aria-label="Exit this round and return home"
              className="min-h-10 gap-1.5 font-extrabold sm:px-4"
            >
              <span aria-hidden>←</span>
              <span>Exit</span>
            </Button>
            {/* Release the gameplay/WebGL tree before loading the library detail route.
                Hidden on daily challenge — the header already has extra time/score chips. */}
            {showLearnCard && !isDailyChallenge && (
              <a
                href={learnCardLibraryHref}
                onClick={(e) => {
                  e.stopPropagation();
                  persistLearnCardResume();
                }}
                aria-label={`Open ${getCountryName(learnCardCountryCode)} in library`}
                className={cn(
                  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 shadow-[0_3px_0_var(--color-slate-200)] transition-all duration-100 hover:border-sky-300 hover:text-sky-700 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500 dark:hover:text-sky-300 sm:px-4",
                )}
              >
                <span aria-hidden>{LIBRARY_ICON}</span>
                <span className="hidden sm:inline">Library</span>
              </a>
            )}
          </div>
          <div className="hidden min-w-0 px-1 text-center leading-tight sm:block">
            {roundTitlePanel}
          </div>
          <div className="flex min-w-0 flex-1 items-stretch justify-end gap-1 max-[380px]:gap-0.5 sm:flex-none sm:gap-1.5">
            <StreakCounter streak={streak} compact />
            <div className="shrink-0 rounded-xl border-2 border-emerald-200 bg-emerald-50/90 px-1.5 py-1 text-center max-[430px]:rounded-lg max-[430px]:px-1 max-[430px]:py-0.5 dark:border-emerald-800 dark:bg-emerald-950/40 sm:rounded-2xl sm:px-3 sm:py-1.5">
              <p className="game-stat-label text-[9px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Correct</p>
              <p className="font-display text-base font-extrabold leading-none text-emerald-700 dark:text-emerald-300 sm:text-lg">{correctAnswers}</p>
            </div>
            {isDailyChallenge && (
              <div className="shrink-0 rounded-xl border-2 border-amber-200 bg-amber-50/90 px-1.5 py-1 text-center max-[430px]:rounded-lg max-[430px]:px-1 max-[430px]:py-0.5 dark:border-amber-800 dark:bg-amber-950/40 sm:rounded-2xl sm:px-3 sm:py-1.5">
                <p className="game-stat-label text-[9px] font-semibold uppercase text-amber-600 dark:text-amber-400">
                  {countStats ? "Time" : "Score"}
                </p>
                <p className="font-display text-base font-extrabold leading-none text-amber-700 dark:text-amber-300 sm:text-lg">
                  {formatDailyElapsedTime(headerDailyTime)}
                </p>
              </div>
            )}
            {isDailyChallenge && !countStats && (
              <div className="shrink-0 rounded-xl border-2 border-violet-200 bg-violet-50/90 px-1.5 py-1 text-center max-[430px]:rounded-lg max-[430px]:px-1 max-[430px]:py-0.5 dark:border-violet-800 dark:bg-violet-950/40 sm:rounded-2xl sm:px-3 sm:py-1.5">
                <p className="game-stat-label text-[9px] font-semibold uppercase text-violet-600 dark:text-violet-400">Review</p>
                <p className="font-display text-base font-extrabold leading-none text-violet-700 dark:text-violet-300 sm:text-lg">
                  {formatDailyElapsedTime(reviewElapsedCentiseconds)}
                </p>
              </div>
            )}
            {timed && (
              <div className={`shrink-0 rounded-xl border-2 px-1.5 py-1 text-center max-[430px]:rounded-lg max-[430px]:px-1 max-[430px]:py-0.5 sm:rounded-2xl sm:px-3 sm:py-1.5 ${timeLeft <= 10 ? "border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/50" : "border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/90"}`}>
                <p className={`game-stat-label text-[9px] font-semibold uppercase ${timeLeft <= 10 ? "text-rose-500 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>Time</p>
                <p className={`font-display text-base font-extrabold leading-none sm:text-lg ${timeLeft <= 10 ? "text-rose-600" : ""}`}>{timeLeft}s</p>
              </div>
            )}
            {(timed || sessionQuestionLimit) && (
              <div className="shrink-0 rounded-xl border-2 border-slate-200 bg-white/90 px-1.5 py-1 text-center max-[430px]:rounded-lg max-[430px]:px-1 max-[430px]:py-0.5 dark:border-slate-700 dark:bg-slate-900/90 sm:rounded-2xl sm:px-3 sm:py-1.5">
                <p className="game-stat-label text-[9px] font-semibold uppercase text-slate-500 dark:text-slate-400">Question</p>
                <p className="font-display text-base font-extrabold leading-none sm:text-lg">
                  {timed ? questionCount + 1 : `${questionCount + 1}/${sessionQuestionLimit}`}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-1.5 px-1 text-center leading-tight sm:hidden">
          {roundTitlePanel}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white/90 p-3 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:rounded-3xl sm:p-4">
        {!showChoiceReveal && !isTextOnlyPrompt && !isGlobeHuntRound && (
          <h2 className="mb-2 hidden shrink-0 text-center font-display text-base font-extrabold leading-tight sm:mb-3 sm:block sm:text-xl">
            {question.prompt}
          </h2>
        )}

        <div
          className={`@container/size flex min-h-0 flex-1 flex-col ${
            showChoiceReveal ? "justify-start overflow-hidden" : "overflow-hidden"
          } ${showChoiceReveal || question.displayType === "flags-grid" ? "sm:justify-start" : "sm:justify-center"}`}
        >
          {!showChoiceReveal &&
            !isGlobeHuntRound &&
            !(showLearnCard && !isMultipleChoiceRound) &&
            !isAtlasleRound && (
            <>
              <div
                className={`min-h-0 sm:hidden ${difficulty === "hard" ? "flex-[0.06]" : "flex-[0.24]"}`}
                aria-hidden
              />

              <div className="shrink-0 px-3 pb-2 text-center sm:hidden">
                <p
                  className={`font-display font-extrabold leading-snug text-slate-800 dark:text-slate-100 ${
                    isTextOnlyPrompt ? "text-2xl" : "text-base"
                  }`}
                >
                  {question.prompt}
                </p>
              </div>
            </>
          )}

          {!showLearnCard && isAtlasleRound && (
            <div className="shrink-0 px-3 pb-2 text-center sm:hidden">
              <p className="font-display text-base font-extrabold leading-snug text-slate-800 dark:text-slate-100">
                {question.prompt}
              </p>
            </div>
          )}

          {showChoiceReveal && isTextOnlyPrompt && (
            <div className="shrink-0 px-2 pb-1 text-center sm:px-3 sm:pb-3">
              <p className="font-display text-sm font-extrabold leading-snug text-slate-800 dark:text-slate-100 sm:text-xl">
                {question.prompt}
              </p>
            </div>
          )}

          {!showLearnCard && isTextOnlyPrompt && (
            <div
              className={`hidden px-4 text-center sm:flex ${
                difficulty === "hard"
                  ? "shrink-0 justify-center pb-2 pt-1"
                  : "min-h-0 flex-1 items-center justify-center py-6"
              }`}
            >
              <p className="max-w-2xl font-display text-2xl font-extrabold leading-snug text-slate-800 dark:text-slate-100 sm:text-3xl md:text-4xl">
                {question.prompt}
              </p>
            </div>
          )}

          {!showLearnCard && isTextOnlyPrompt && difficulty !== "hard" && (
            <div className="min-h-0 flex-[0.76] sm:hidden" aria-hidden />
          )}

          {isGlobeHuntRound ? (
            <GlobeHuntSurface
              key={question.id}
              question={question}
              scope={questionScope}
              difficulty={difficulty}
              disabled={disabled}
              initialSelectedCode={resumeSnapshot?.lastSelectedCode ?? null}
              revealedCode={globeRevealCode}
              onConfirm={(code) => handleAnswer(code, code)}
            />
          ) : showChoiceReveal ? (
            <div
              className={`flex min-h-0 w-full flex-col items-stretch ${
                question.displayType === "flags-grid"
                  ? "min-h-0 flex-1 gap-2 overflow-hidden sm:gap-3"
                  : "min-h-0 flex-1 overflow-hidden py-1 sm:shrink-0 sm:py-2"
              }`}
            >
              <div
                className={
                  question.displayType === "flags-grid"
                    ? "mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col"
                    : "mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col sm:shrink-0"
                }
              >
                {inlineLearnCard}
              </div>
              {question.displayType === "flags-grid" && question.optionCodes && (
                <div className="flex h-[min(44cqh,22rem)] min-h-0 w-full min-w-0 shrink-0 items-center justify-center overflow-hidden pb-2">
                  <FlagGrid
                    codes={question.optionCodes.filter((c) => !hiddenOptions.includes(c))}
                    onSelect={(code) => handleAnswer(code, code)}
                    compact
                    revealed
                    selectedCode={lastSelectedCode}
                    correctCode={question.correctCode ?? question.countryCode}
                    inverted={isInvertedFlagRound}
                  />
                </div>
              )}
            </div>
          ) : showLearnCard && !isMultipleChoiceRound ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:hidden">
              <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">{inlineLearnCard}</div>
            </div>
          ) : !showLearnCard && isAtlasleRound ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-start overflow-y-auto py-1 sm:justify-center">
              <AnswerAtlasle
                countryCode={question.countryCode}
                correctAnswer={question.correctAnswer}
                target={question.atlasleTarget ?? "name"}
                maxGuesses={question.atlasleMaxGuesses ?? 6}
                difficulty={difficulty}
                scope={questionScope}
                disabled={disabled || interactionLocked}
                onComplete={(_correct, finalGuess, puzzleHints) => {
                  setHintsUsed((count) => count + puzzleHints);
                  handleAnswer(finalGuess);
                }}
              />
            </div>
          ) : !showLearnCard && !isTextOnlyPrompt ? (
            <div
              className={`flex min-h-0 flex-col items-center justify-center overflow-hidden ${
                difficulty === "hard" ? "max-h-[38%] shrink-0 sm:max-h-none sm:flex-1" : "flex-[0.76] sm:flex-1"
              }`}
            >
              <QuestionMedia
                question={question}
                hiddenOptions={hiddenOptions}
                onSelectFlag={(code) => handleAnswer(code, code)}
              />
            </div>
          ) : null}

          {/* Hard mode: keep the type-in field high so it stays visible above the keyboard. */}
          {!showLearnCard &&
            difficulty === "hard" &&
            !isGlobeHuntRound &&
            !isAtlasleRound &&
            question.displayType !== "flags-grid" && (
            <>
              <div className="mx-auto w-full max-w-2xl shrink-0 px-1 pt-2 sm:pt-3">
                <AnswerTypeIn
                  onSubmit={handleAnswer}
                  disabled={disabled}
                placeholder={
                  question.mode === "country-to-capital"
                    ? "Type the capital..."
                    : question.mode === "country-to-language"
                      ? "Type the language..."
                    : getTypeInPlacePlaceholder(questionScope, answerPlace?.isTerritory ?? false)
                }
                />
              </div>
              <div className="min-h-0 flex-1" aria-hidden />
            </>
          )}
        </div>

        {(showChoiceReveal || !showLearnCard) &&
          !isGlobeHuntRound &&
          question.displayType !== "flags-grid" &&
          !isAtlasleRound &&
          difficulty !== "hard" && (
          <div className="mt-2 shrink-0 space-y-2 sm:mt-3 sm:space-y-3">
            {!showLearnCard && difficulty === "easy" && (
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

            {question.options ? (
              <AnswerMultipleChoice
                options={question.options}
                optionCodes={question.optionCodes}
                onSelect={handleAnswer}
                disabled={disabled}
                hiddenOptions={hiddenOptions}
                revealed={showChoiceReveal}
                selectedAnswer={lastSelectedAnswer}
                selectedCode={lastSelectedCode}
                correctAnswer={question.correctAnswer}
                correctCode={question.correctCode}
              />
            ) : null}
          </div>
        )}
      </div>

      <AnswerFeedbackLayer bursts={bursts} onDone={removeBurst} />

      {showLearnCard && (
        <>
          <div
            className={`fixed inset-0 z-40 cursor-pointer ${
              isMultipleChoiceRound ? "" : "sm:bg-slate-900/50 sm:backdrop-blur-[2px]"
            }`}
            onClick={handleContinue}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleContinue();
            }}
            role="button"
            tabIndex={-1}
            aria-label="Continue to next question"
          />
          {!isMultipleChoiceRound && (
            <div
              className="pointer-events-none fixed inset-0 z-[45] hidden items-center justify-center p-4 sm:flex"
              aria-hidden
            >
              <div className="max-h-[88dvh] w-full max-w-lg overflow-y-auto">{overlayLearnCard}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
