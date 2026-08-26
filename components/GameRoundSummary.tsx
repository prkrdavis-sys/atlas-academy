"use client";

import { AchievementToast } from "@/components/AchievementToast";
import {
  AnswerFeedbackLayer,
  type FeedbackBurst,
} from "@/components/AnswerFeedback";
import { GameActionButton } from "@/components/GameActionButton";
import { GameMapProgressSummary } from "@/components/GameMapProgressSummary";
import { Button } from "@/components/ui/Button";
import { formatDailyElapsedTime } from "@/lib/daily-challenge";
import type { MapProgressSummary } from "@/lib/map-progress";
import { SCOPE_INFO } from "@/lib/scope";
import type {
  Difficulty,
  GameMode,
  GameScope,
  MapProgressDifficulty,
  Region,
} from "@/lib/types";

type GameRoundSummaryProps = {
  title: string;
  description: string;
  celebrate: boolean;
  bursts: FeedbackBurst[];
  onBurstDone: (id: number) => void;
  achievementIds: string[];
  onDismissAchievements: () => void;
  correctAnswers: number;
  accuracy: number;
  difficulty: Difficulty;
  mode: GameMode;
  scope: GameScope;
  continents: Region[];
  isDailyChallenge: boolean;
  countStats: boolean;
  summaryDailyTime: number;
  hintsUsed: number;
  skippedAnswers: number;
  exitedEarly: boolean;
  tracksMapProgress: boolean;
  mapProgressDifficulty: MapProgressDifficulty | null;
  initialMapProgress: {
    area: MapProgressSummary;
    overall: MapProgressSummary;
  } | null;
  currentMapProgress: {
    area: MapProgressSummary;
    overall: MapProgressSummary;
  } | null;
  onHome: () => void;
  onPlayAgain?: () => void;
  onSecondary: () => void;
  secondaryLabel: string;
  secondaryIcon: string;
};

export function GameRoundSummary({
  title,
  description,
  celebrate,
  bursts,
  onBurstDone,
  achievementIds,
  onDismissAchievements,
  correctAnswers,
  accuracy,
  difficulty,
  mode,
  scope,
  continents,
  isDailyChallenge,
  countStats,
  summaryDailyTime,
  hintsUsed,
  skippedAnswers,
  exitedEarly,
  tracksMapProgress,
  mapProgressDifficulty,
  initialMapProgress,
  currentMapProgress,
  onHome,
  onPlayAgain,
  onSecondary,
  secondaryLabel,
  secondaryIcon,
}: GameRoundSummaryProps) {
  return (
    <>
      <AnswerFeedbackLayer bursts={bursts} onDone={onBurstDone} />
      <AchievementToast
        achievementIds={achievementIds}
        onDismiss={onDismissAchievements}
      />
      <div className="animate-card-pop-in my-auto rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-5 text-center shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:p-8">
        <p className="text-4xl">{celebrate ? "🎉" : "🏁"}</p>
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
            <GameActionButton icon="🏠" onClick={onHome}>
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
              onClick={onSecondary}
            >
              <span className="shrink-0 text-xl leading-none max-sm:text-lg sm:text-2xl" aria-hidden>
                {secondaryIcon}
              </span>
              <span className="truncate">{secondaryLabel}</span>
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
                onClick={onHome}
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
