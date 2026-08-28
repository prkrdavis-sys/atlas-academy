"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AnswerFeedbackLayer,
  type FeedbackBurst,
} from "@/components/AnswerFeedback";
import { AnswerMultipleChoice } from "@/components/AnswerMultipleChoice";
import { LearnCard } from "@/components/LearnCard";
import { QuestionMedia } from "@/components/QuestionMedia";
import { VersusScoreBar } from "@/components/versus/VersusScoreBar";
import {
  VersusStatusBanner,
  type VersusPhase,
} from "@/components/versus/VersusStatusBanner";
import { VersusSummary } from "@/components/versus/VersusSummary";
import { useProfiles } from "@/components/ProfileProvider";
import { GameEngine } from "@/lib/game-engine";
import { triggerHaptic } from "@/lib/haptics";
import { isCapitalQuestion, isTextOnlyPrompt } from "@/lib/question-presentation";
import { playSound } from "@/lib/sound";
import { useVersusMatch } from "@/lib/social/use-versus-match";
import { cancelMatchInvite, VERSUS_DIFFICULTY } from "@/lib/social/versus";
import type { MatchRow, PlayerRow } from "@/lib/social/types";
import { normalizeRoundQuestionSetting, type Question } from "@/lib/types";

/**
 * Pre-generating the whole round makes questions addressable by index, which is
 * what keeps the two clients aligned: same seed plus same settings means both
 * arrays are identical.
 */
function buildQuestions(match: MatchRow): Question[] {
  const engine = new GameEngine({
    mode: match.settings.mode,
    continents: match.settings.continents,
    difficulty: VERSUS_DIFFICULTY,
    seed: match.seed,
    questionLimit: normalizeRoundQuestionSetting(match.question_count),
    includeTerritories: match.settings.includeTerritories,
    scope: match.settings.scope,
    challengeModifier: "none",
  });

  const questions: Question[] = [];
  for (let index = 0; index < match.question_count; index += 1) {
    const question = engine.nextQuestion();
    if (!question) break;
    questions.push(question);
  }
  return questions;
}

export function VersusBoard({
  matchId,
  userId,
  opponent,
}: {
  matchId: string;
  userId: string;
  opponent: PlayerRow;
}) {
  const router = useRouter();
  const { activeProfile } = useProfiles();
  const versus = useVersusMatch(matchId, userId);
  const [bursts, setBursts] = useState<FeedbackBurst[]>([]);
  const [cancelling, setCancelling] = useState(false);
  const revealedIndexRef = useRef<number | null>(null);

  const { match, phase, questionIndex, yourAnswer, opponentAnswer } = versus;

  const questions = useMemo(() => (match ? buildQuestions(match) : []), [match]);
  const question = questions[questionIndex] ?? null;

  const revealing = phase.kind === "revealing";

  // Fire feedback once per question, at the moment both answers land. Sound and
  // haptics are external systems; the burst is the matching on-screen flash, so
  // it has to be queued from the same place.
  useEffect(() => {
    if (!revealing || !question || revealedIndexRef.current === questionIndex) return;

    revealedIndexRef.current = questionIndex;
    const correct = yourAnswer?.is_correct ?? false;
    playSound(correct ? "correct" : "incorrect", activeProfile);
    triggerHaptic(correct ? "correct" : "incorrect", activeProfile);
    setBursts((current) => [...current, { id: Date.now(), correct }]);
  }, [revealing, question, questionIndex, yourAnswer, activeProfile]);

  if (versus.loading) {
    return <CenteredNotice title="Loading match…" />;
  }

  if (versus.error || !match) {
    return (
      <CenteredNotice
        title={versus.error ?? "Match unavailable"}
        action={{ label: "Back home", onClick: () => router.push("/") }}
      />
    );
  }

  if (match.status === "complete" || match.status === "abandoned") {
    return (
      <VersusSummary
        match={match}
        userId={userId}
        opponent={opponent}
        yourScore={versus.yourScore}
        opponentScore={versus.opponentScore}
      />
    );
  }

  if (match.status === "invited") {
    return (
      <CenteredNotice
        title={`Waiting for ${opponent.display_name} to accept…`}
        description="The round starts the moment they join."
        action={{
          label: cancelling ? "Cancelling…" : "Cancel invite",
          variant: "secondary",
          disabled: cancelling,
          onClick: () => {
            if (cancelling) return;
            setCancelling(true);
            void cancelMatchInvite(matchId)
              .then(() => {
                router.push("/");
              })
              .catch(() => {
                setCancelling(false);
              });
          },
        }}
      />
    );
  }

  if (match.status === "declined") {
    return (
      <CenteredNotice
        title={`${opponent.display_name} declined this challenge`}
        action={{ label: "Back home", onClick: () => router.push("/") }}
      />
    );
  }

  if (!question) {
    return <CenteredNotice title="Preparing questions…" />;
  }

  const bannerPhase = toBannerPhase(phase, versus.secondsLeft, opponent.display_name);
  const textOnly = isTextOnlyPrompt(question);
  // Country-to-flag answers are the flag tiles themselves, not text buttons.
  const isFlagsGrid = question.displayType === "flags-grid";

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-2 p-3 sm:gap-3 sm:p-4">
      <VersusScoreBar
        you={{
          displayName: activeProfile?.name ?? "You",
          avatarId: activeProfile?.avatarId ?? null,
          avatarColor: activeProfile?.avatarColor ?? "",
          score: versus.yourScore,
        }}
        opponent={{
          displayName: opponent.display_name,
          avatarId: opponent.avatar_id,
          avatarColor: opponent.avatar_color,
          score: versus.opponentScore,
        }}
        questionNumber={questionIndex + 1}
        questionCount={match.question_count}
        opponentConnected={versus.opponentConnected}
      />

      <VersusStatusBanner phase={bannerPhase} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white/90 p-3 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:rounded-3xl sm:p-4">
        <h2 className="mb-2 shrink-0 text-center font-display text-base font-extrabold leading-tight sm:mb-3 sm:text-xl">
          {question.prompt}
        </h2>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {revealing ? (
            <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-y-auto">
              <LearnCard
                countryCode={question.countryCode}
                wasCorrect={yourAnswer?.is_correct ?? false}
                variant="inline"
                showCapitalMarker={isCapitalQuestion(question)}
              />
            </div>
          ) : textOnly ? (
            <div className="flex min-h-0 flex-1 items-center justify-center px-4" aria-hidden />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden">
              <QuestionMedia
                question={question}
                difficulty={VERSUS_DIFFICULTY}
                onSelectFlag={(code) =>
                  versus.selectAnswer(code, code === question.correctAnswer)
                }
              />
            </div>
          )}
        </div>

        {question.options && !isFlagsGrid ? (
          <div className="mt-2 shrink-0 sm:mt-3">
            <AnswerMultipleChoice
              options={question.options}
              optionCodes={question.optionCodes}
              onSelect={(answer) =>
                versus.selectAnswer(answer, answer === question.correctAnswer)
              }
              // Pending: first player may still change; racing player must still
              // be able to click. Lock only after reveal or a recorded timeout.
              disabled={
                revealing ||
                Boolean(yourAnswer?.timed_out) ||
                (Boolean(yourAnswer) && Boolean(opponentAnswer))
              }
              revealed={revealing}
              pending={
                !revealing && yourAnswer !== null && !yourAnswer.timed_out
              }
              selectedAnswer={yourAnswer?.answer ?? null}
              correctAnswer={question.correctAnswer}
              correctCode={question.correctCode}
            />
          </div>
        ) : null}
      </div>

      <AnswerFeedbackLayer
        bursts={bursts}
        onDone={(id) => setBursts((current) => current.filter((burst) => burst.id !== id))}
      />
    </div>
  );
}

function toBannerPhase(
  phase: ReturnType<typeof useVersusMatch>["phase"],
  secondsLeft: (deadlineMs: number) => number,
  opponentName: string,
): VersusPhase {
  switch (phase.kind) {
    case "answering":
      return { kind: "answering" };
    case "waiting-for-opponent":
      return {
        kind: "pending",
        mode: "waiting",
        opponentName,
        secondsLeft: secondsLeft(phase.deadlineMs),
      };
    case "racing":
      return {
        kind: "pending",
        mode: "racing",
        secondsLeft: secondsLeft(phase.deadlineMs),
      };
    case "revealing":
      return { kind: "revealing", secondsLeft: secondsLeft(phase.revealUntilMs) };
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function CenteredNotice({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: "primary" | "secondary";
  };
}) {
  const variant = action?.variant ?? "primary";

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <p className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
          {title}
        </p>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {description}
          </p>
        ) : null}
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={
              variant === "secondary"
                ? "mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl border-2 border-slate-300 bg-white px-6 py-3 text-base font-bold text-slate-700 shadow-[0_3px_0_rgb(148_163_184)] transition-all duration-100 hover:bg-slate-50 active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:shadow-[0_3px_0_rgb(51_65_85)] dark:hover:bg-slate-700"
                : "mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3 text-base font-bold text-white shadow-[0_3px_0_var(--color-emerald-700)] transition-all duration-100 hover:bg-emerald-400 active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-60"
            }
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
