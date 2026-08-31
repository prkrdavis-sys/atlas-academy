"use client";

import type { ReactNode, Ref } from "react";
import Link from "next/link";
import { AchievementToast } from "@/components/AchievementToast";
import { AnswerAtlasle } from "@/components/AnswerAtlasle";
import { AnswerMultipleChoice } from "@/components/AnswerMultipleChoice";
import { AnswerTypeIn } from "@/components/AnswerTypeIn";
import {
  AnswerFeedbackLayer,
  type FeedbackBurst,
} from "@/components/AnswerFeedback";
import { FlagGrid } from "@/components/FlagDisplay";
import { GlobeHuntSurface } from "@/components/GlobeHuntSurface";
import { LearnCard } from "@/components/LearnCard";
import { QuestionMedia } from "@/components/QuestionMedia";
import { StreakCounter } from "@/components/StreakCounter";
import { Button } from "@/components/ui/Button";
import { formatDailyElapsedTime } from "@/lib/daily-challenge";
import { LIBRARY_ICON } from "@/lib/library";
import { getCountryName } from "@/lib/countries";
import { getTypeInPlacePlaceholder } from "@/lib/scope";
import type { GameResumeSnapshot } from "@/lib/game-resume";
import type { Country, Difficulty, GameScope, Question } from "@/lib/types";
import { cn } from "@/lib/utils";

type LearnCardModel = {
  countryCode: string;
  answerNeighborCode?: string;
  heading?: ReactNode;
  wasCorrect: boolean;
  compareCountryCode?: string;
  showCapitalMarker: boolean;
};

type GameQuestionStageProps = {
  question: Question;
  questionScope: GameScope;
  difficulty: Difficulty;
  interactionLocked: boolean;
  isDailyChallenge: boolean;
  countStats: boolean;
  timed: boolean;
  sessionQuestionLimit?: number;
  timeLeft: number;
  headerDailyTime: number;
  reviewElapsedCentiseconds: number;
  dailyDateLabel: string | null;
  roundTaskLabel: string;
  answerPlace?: Country;
  isTextOnlyPrompt: boolean;
  isGlobeHuntRound: boolean;
  isAtlasleRound: boolean;
  isInvertedFlagRound: boolean;
  isMultipleChoiceRound: boolean;
  showChoiceReveal: boolean;
  showLearnCard: boolean;
  lastSelectedAnswer: string | null;
  lastSelectedCode: string | null;
  globeRevealCode: string | null;
  disabled: boolean;
  hiddenOptions: string[];
  usedFiftyFifty: boolean;
  usedSkip: boolean;
  streak: number;
  correctAnswers: number;
  questionCount: number;
  learnCardLibraryHref: string;
  learnCardLibraryRef: Ref<HTMLAnchorElement | null>;
  learnCard: LearnCardModel;
  resumeSnapshot: GameResumeSnapshot | null;
  bursts: FeedbackBurst[];
  onBurstDone: (id: number) => void;
  achievementIds: string[];
  onDismissAchievements: () => void;
  onExit: () => void;
  onLibraryClick: () => void;
  onAnswer: (answer: string, code?: string) => void;
  onSkip: () => void;
  onFiftyFifty: () => void;
  onContinue: () => void;
  onAtlasleComplete: (finalGuess: string, puzzleHints: number) => void;
};

export function GameQuestionStage({
  question,
  questionScope,
  difficulty,
  interactionLocked,
  isDailyChallenge,
  countStats,
  timed,
  sessionQuestionLimit,
  timeLeft,
  headerDailyTime,
  reviewElapsedCentiseconds,
  dailyDateLabel,
  roundTaskLabel,
  answerPlace,
  isTextOnlyPrompt,
  isGlobeHuntRound,
  isAtlasleRound,
  isInvertedFlagRound,
  isMultipleChoiceRound,
  showChoiceReveal,
  showLearnCard,
  lastSelectedAnswer,
  lastSelectedCode,
  globeRevealCode,
  disabled,
  hiddenOptions,
  usedFiftyFifty,
  usedSkip,
  streak,
  correctAnswers,
  questionCount,
  learnCardLibraryHref,
  learnCardLibraryRef,
  learnCard,
  resumeSnapshot,
  bursts,
  onBurstDone,
  achievementIds,
  onDismissAchievements,
  onExit,
  onLibraryClick,
  onAnswer,
  onSkip,
  onFiftyFifty,
  onContinue,
  onAtlasleComplete,
}: GameQuestionStageProps) {
  const inlineLearnCard = <LearnCard {...learnCard} variant="inline" />;
  const overlayLearnCard = <LearnCard {...learnCard} variant="default" />;
  const roundTitlePanel = (
    <>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-teal-700/70 sm:text-[10px]">
        {dailyDateLabel ?? "Your task"}
      </p>
      <p className="font-display text-sm font-extrabold leading-snug text-slate-700 dark:text-slate-200 sm:truncate sm:text-base">
        {roundTaskLabel}
      </p>
      {isDailyChallenge && !countStats && (
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
          achievementIds={achievementIds}
          onDismiss={onDismissAchievements}
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
                onExit();
              }}
              aria-label="Exit this round and return home"
              className="min-h-10 gap-1.5 font-extrabold sm:px-4"
            >
              <span aria-hidden>←</span>
              <span>Exit</span>
            </Button>
            {showLearnCard && !isDailyChallenge && (
              <Link
                ref={learnCardLibraryRef}
                href={learnCardLibraryHref}
                onClick={(e) => {
                  e.stopPropagation();
                  onLibraryClick();
                }}
                aria-label={`Open ${getCountryName(learnCard.countryCode)} in library`}
                className={cn(
                  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 shadow-[0_3px_0_var(--color-slate-200)] transition-all duration-100 hover:border-sky-300 hover:text-sky-700 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500 dark:hover:text-sky-300 sm:px-4",
                )}
              >
                <span aria-hidden>{LIBRARY_ICON}</span>
                <span className="hidden sm:inline">Library</span>
              </Link>
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
            {isDailyChallenge && countStats && (
              <div className="shrink-0 rounded-xl border-2 border-amber-200 bg-amber-50/90 px-1.5 py-1 text-center max-[430px]:rounded-lg max-[430px]:px-1 max-[430px]:py-0.5 dark:border-amber-800 dark:bg-amber-950/40 sm:rounded-2xl sm:px-3 sm:py-1.5">
                <p className="game-stat-label text-[9px] font-semibold uppercase text-amber-600 dark:text-amber-400">
                  Time
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
              onConfirm={(code) => onAnswer(code, code)}
            />
          ) : showChoiceReveal ? (
            <div
              className={`flex min-h-0 w-full flex-col items-stretch ${
                question.displayType === "flags-grid"
                  ? "min-h-0 flex-1 gap-2 overflow-hidden sm:gap-3"
                  : "min-h-0 flex-1 overflow-hidden py-1 sm:py-2"
              }`}
            >
              <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
                {inlineLearnCard}
              </div>
              {question.displayType === "flags-grid" && question.optionCodes && (
                <div className="flex h-[min(44cqh,22rem)] min-h-0 w-full min-w-0 shrink-0 items-center justify-center overflow-hidden pb-2 sm:h-[min(28cqh,13rem)]">
                  <FlagGrid
                    codes={question.optionCodes.filter((c) => !hiddenOptions.includes(c))}
                    onSelect={(code) => onAnswer(code, code)}
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
                  onAtlasleComplete(finalGuess, puzzleHints);
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
                onSelectFlag={(code) => onAnswer(code, code)}
              />
            </div>
          ) : null}

          {!showLearnCard &&
            difficulty === "hard" &&
            !isGlobeHuntRound &&
            !isAtlasleRound &&
            question.displayType !== "flags-grid" && (
            <>
              <div className="mx-auto w-full max-w-2xl shrink-0 px-1 pt-2 sm:pt-3">
                <AnswerTypeIn
                  onSubmit={onAnswer}
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
                  <Button variant="secondary" size="sm" onClick={onFiftyFifty} disabled={usedFiftyFifty}>
                    50/50
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={onSkip} disabled={usedSkip}>
                  Skip
                </Button>
              </div>
            )}

            {question.options ? (
              <AnswerMultipleChoice
                options={question.options}
                optionCodes={question.optionCodes}
                onSelect={onAnswer}
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

      <AnswerFeedbackLayer bursts={bursts} onDone={onBurstDone} />

      {showLearnCard && (
        <>
          <div
            className={`fixed inset-0 z-40 cursor-pointer ${
              isMultipleChoiceRound ? "" : "sm:bg-slate-900/50 sm:backdrop-blur-[2px]"
            }`}
            onClick={onContinue}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onContinue();
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
