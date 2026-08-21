export type RoundSummaryCopy = {
  title: string;
  description: string;
};

export function getRoundSummaryCopy({
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
}): RoundSummaryCopy {
  const questionLabel = `question${questionCount === 1 ? "" : "s"}`;

  if (exitedEarly) {
    return {
      title: isReview ? "Review ended" : "Round ended",
      description: isReview
        ? `You attempted ${questionCount} ${questionLabel}. Stats were not recorded.`
        : `You attempted ${questionCount} ${questionLabel}.`,
    };
  }

  if (challengeComplete) {
    return {
      title: isReview ? "Review complete!" : "Challenge complete!",
      description: isReview
        ? `You reviewed all ${questionCount} questions. Stats were not recorded.`
        : `You completed all ${questionCount} questions.`,
    };
  }

  return {
    title: "Game over",
    description: timed
      ? `Time's up after ${questionCount} questions.`
      : `Your streak ended at ${endedStreak}.`,
  };
}
