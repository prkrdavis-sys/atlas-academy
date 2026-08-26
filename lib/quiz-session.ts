import type { DailyChallengeAnswer, GameMode, Question } from "@/lib/types";
import type { GameResumeSnapshot } from "@/lib/game-resume";

export type QuizSession = {
  question: Question | null;
  streak: number;
  endedStreak: number;
  showLearnCard: boolean;
  lastCorrect: boolean;
  lastSelectedAnswer: string | null;
  lastSelectedCode: string | null;
  globeRevealCode: string | null;
  disabled: boolean;
  hiddenOptions: string[];
  usedFiftyFifty: boolean;
  usedSkip: boolean;
  questionCount: number;
  correctAnswers: number;
  skippedAnswers: number;
  hintsUsed: number;
  gameOver: boolean;
  sessionComplete: boolean;
  dailyAnswers: DailyChallengeAnswer[];
  exitedEarly: boolean;
};

export type QuizSessionAction =
  | {
      type: "answer";
      correct: boolean;
      answer: string;
      code?: string;
      globeRevealCode: string | null;
      dailyAnswer: DailyChallengeAnswer;
      isDailyChallenge: boolean;
      stopOnWrong: boolean;
      sessionQuestionLimit?: number;
      hintCount?: number;
    }
  | {
      type: "skip";
      dailyAnswer: DailyChallengeAnswer;
      isDailyChallenge: boolean;
      sessionQuestionLimit?: number;
    }
  | { type: "fifty-fifty"; hiddenOptions: string[] }
  | { type: "add-hints"; count: number }
  | { type: "continue"; nextQuestion: Question | null; complete: boolean }
  | { type: "exit" }
  | { type: "time-up" };

export function createInitialSession({
  firstQuestion,
  resumeSnapshot,
  mode,
  countStats,
  activeStreak,
}: {
  firstQuestion: Question | null;
  resumeSnapshot: GameResumeSnapshot | null;
  mode: GameMode;
  countStats: boolean;
  activeStreak: number;
}): QuizSession {
  if (resumeSnapshot) {
    return {
      question: resumeSnapshot.question,
      streak: resumeSnapshot.streak,
      endedStreak: resumeSnapshot.endedStreak,
      showLearnCard: resumeSnapshot.showLearnCard,
      lastCorrect: resumeSnapshot.lastCorrect,
      lastSelectedAnswer: resumeSnapshot.lastSelectedAnswer,
      lastSelectedCode: resumeSnapshot.lastSelectedCode,
      globeRevealCode:
        resumeSnapshot.question.mode === "globe-hunt" && !resumeSnapshot.lastCorrect
          ? resumeSnapshot.question.correctCode ?? resumeSnapshot.question.countryCode
          : null,
      disabled: resumeSnapshot.disabled,
      hiddenOptions: resumeSnapshot.hiddenOptions,
      usedFiftyFifty: resumeSnapshot.usedFiftyFifty,
      usedSkip: resumeSnapshot.usedSkip,
      questionCount: resumeSnapshot.questionCount,
      correctAnswers: resumeSnapshot.correctAnswers,
      skippedAnswers: resumeSnapshot.skippedAnswers,
      hintsUsed: resumeSnapshot.hintsUsed,
      gameOver: resumeSnapshot.gameOver,
      sessionComplete: resumeSnapshot.sessionComplete,
      dailyAnswers: resumeSnapshot.dailyAnswers ?? [],
      exitedEarly: false,
    };
  }

  return {
    question: firstQuestion,
    streak: mode === "daily-challenge" && !countStats ? 0 : activeStreak,
    endedStreak: 0,
    showLearnCard: false,
    lastCorrect: true,
    lastSelectedAnswer: null,
    lastSelectedCode: null,
    globeRevealCode: null,
    disabled: false,
    hiddenOptions: [],
    usedFiftyFifty: false,
    usedSkip: false,
    questionCount: 0,
    correctAnswers: 0,
    skippedAnswers: 0,
    hintsUsed: 0,
    gameOver: false,
    sessionComplete: false,
    dailyAnswers: [],
    exitedEarly: false,
  };
}

export function quizSessionReducer(
  state: QuizSession,
  action: QuizSessionAction,
): QuizSession {
  switch (action.type) {
    case "answer": {
      const questionCount = state.questionCount + 1;
      const correctAnswers = state.correctAnswers + (action.correct ? 1 : 0);
      const reachedLimit = Boolean(
        action.sessionQuestionLimit && questionCount >= action.sessionQuestionLimit,
      );
      return {
        ...state,
        disabled: true,
        lastCorrect: action.correct,
        lastSelectedAnswer: action.answer,
        lastSelectedCode: action.code ?? null,
        globeRevealCode: action.globeRevealCode,
        dailyAnswers: action.isDailyChallenge
          ? [...state.dailyAnswers, action.dailyAnswer]
          : state.dailyAnswers,
        showLearnCard: true,
        questionCount,
        correctAnswers,
        hintsUsed: state.hintsUsed + (action.hintCount ?? 0),
        streak: action.correct ? state.streak + 1 : 0,
        endedStreak: action.correct ? state.endedStreak : state.streak,
        gameOver: !action.correct && action.stopOnWrong ? true : state.gameOver,
        sessionComplete: reachedLimit || state.sessionComplete,
      };
    }
    case "skip": {
      const questionCount = state.questionCount + 1;
      const reachedLimit = Boolean(
        action.sessionQuestionLimit && questionCount >= action.sessionQuestionLimit,
      );
      return {
        ...state,
        usedSkip: true,
        showLearnCard: true,
        lastCorrect: false,
        lastSelectedAnswer: null,
        lastSelectedCode: null,
        dailyAnswers: action.isDailyChallenge
          ? [...state.dailyAnswers, action.dailyAnswer]
          : state.dailyAnswers,
        questionCount,
        skippedAnswers: state.skippedAnswers + 1,
        sessionComplete: reachedLimit || state.sessionComplete,
      };
    }
    case "fifty-fifty":
      return {
        ...state,
        hiddenOptions: action.hiddenOptions,
        usedFiftyFifty: true,
      };
    case "add-hints":
      return {
        ...state,
        hintsUsed: state.hintsUsed + action.count,
      };
    case "continue":
      return {
        ...state,
        showLearnCard: false,
        disabled: false,
        hiddenOptions: [],
        usedFiftyFifty: false,
        usedSkip: false,
        lastSelectedAnswer: null,
        lastSelectedCode: null,
        globeRevealCode: null,
        sessionComplete: action.complete || state.sessionComplete,
        question: action.complete ? state.question : action.nextQuestion,
      };
    case "exit":
      return {
        ...state,
        showLearnCard: false,
        exitedEarly: true,
      };
    case "time-up":
      return {
        ...state,
        gameOver: true,
      };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
