export type RoundEnd =
  | { kind: "exited-early"; isReview: boolean; questionCount: number }
  | { kind: "complete"; isReview: boolean; questionCount: number }
  | { kind: "timed-out"; questionCount: number }
  | { kind: "streak-ended"; endedStreak: number };

export type RoundSummaryCopy = {
  title: string;
  description: string;
};

function questionWord(count: number): string {
  return count === 1 ? "question" : "questions";
}

export function getRoundSummaryCopy(end: RoundEnd): RoundSummaryCopy {
  switch (end.kind) {
    case "exited-early":
      return {
        title: end.isReview ? "Review ended" : "Round ended",
        description: end.isReview
          ? `You attempted ${end.questionCount} ${questionWord(end.questionCount)}. Stats were not recorded.`
          : `You attempted ${end.questionCount} ${questionWord(end.questionCount)}.`,
      };
    case "complete":
      return {
        title: end.isReview ? "Review complete!" : "Challenge complete!",
        description: end.isReview
          ? `You reviewed all ${end.questionCount} questions. Stats were not recorded.`
          : `You completed all ${end.questionCount} questions.`,
      };
    case "timed-out":
      return {
        title: "Game over",
        description: `Time's up after ${end.questionCount} questions.`,
      };
    case "streak-ended":
      return {
        title: "Game over",
        description: `Your streak ended at ${end.endedStreak}.`,
      };
    default: {
      const _exhaustive: never = end;
      return _exhaustive;
    }
  }
}

export function resolveRoundEnd({
  exitedEarly,
  challengeComplete,
  timed,
  isReview,
  questionCount,
  endedStreak,
}: {
  exitedEarly: boolean;
  challengeComplete: boolean;
  timed: boolean;
  isReview: boolean;
  questionCount: number;
  endedStreak: number;
}): RoundEnd {
  if (exitedEarly) {
    return { kind: "exited-early", isReview, questionCount };
  }
  if (challengeComplete) {
    return { kind: "complete", isReview, questionCount };
  }
  if (timed) {
    return { kind: "timed-out", questionCount };
  }
  return { kind: "streak-ended", endedStreak };
}
