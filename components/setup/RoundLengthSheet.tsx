"use client";

import { SettingsSheet } from "@/components/ui/SettingsSheet";
import { SetupOptionCard } from "@/components/setup/SetupOptionCard";
import { SCOPE_INFO } from "@/lib/scope";
import {
  CHALLENGE_MODIFIER_OPTIONS,
  ROUND_ALL_QUESTIONS,
  getRoundQuestionOptions,
  isChallengeModifierActive,
  type ChallengeModifier,
  type GameScope,
  type RoundQuestionSetting,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type RoundLengthSheetProps = {
  open: boolean;
  onClose: () => void;
  scope: GameScope;
  roundQuestionCount: RoundQuestionSetting;
  challengeModifier: ChallengeModifier;
  poolSize: number;
  onChange: (next: {
    roundQuestionCount: RoundQuestionSetting;
    challengeModifier: ChallengeModifier;
  }) => void;
};

const SPECIAL_FORMATS = CHALLENGE_MODIFIER_OPTIONS.filter((option) =>
  isChallengeModifierActive(option.id),
);

/**
 * One sheet for "how does this round end?" — a fixed question count, or a
 * special format that ends on the clock or on your first mistake.
 */
export function RoundLengthSheet({
  open,
  onClose,
  scope,
  roundQuestionCount,
  challengeModifier,
  poolSize,
  onChange,
}: RoundLengthSheetProps) {
  const scopeInfo = SCOPE_INFO[scope];
  const countOptions = getRoundQuestionOptions(poolSize);
  const fixedActive = !isChallengeModifierActive(challengeModifier);

  const selectCount = (next: RoundQuestionSetting) => {
    onChange({ roundQuestionCount: next, challengeModifier: "none" });
    onClose();
  };

  return (
    <SettingsSheet
      open={open}
      onClose={onClose}
      title="Round length"
      description="How many questions you get, or what ends the round."
    >
      <div className="space-y-5">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Fixed length
          </h3>
          <div
            role="radiogroup"
            aria-label="Questions per round"
            className="mt-2 flex flex-wrap gap-2"
          >
            {countOptions.map((count) => {
              const active = fixedActive && roundQuestionCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => selectCount(count)}
                  className={cn(
                    "min-h-11 min-w-14 rounded-xl border-2 px-3 font-display text-sm font-extrabold tabular-nums transition-colors",
                    active
                      ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600",
                  )}
                >
                  {count}
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={fixedActive && roundQuestionCount === ROUND_ALL_QUESTIONS}
              onClick={() => selectCount(ROUND_ALL_QUESTIONS)}
              className={cn(
                "min-h-11 rounded-xl border-2 px-3.5 font-display text-sm font-extrabold transition-colors",
                fixedActive && roundQuestionCount === ROUND_ALL_QUESTIONS
                  ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600",
              )}
            >
              All {poolSize}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Drawn from the {poolSize} {poolSize === 1 ? scopeInfo.noun : scopeInfo.nounPlural} you
            picked under Places.
          </p>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Special formats
          </h3>
          <div
            role="radiogroup"
            aria-label="Special formats"
            className="mt-2 space-y-2"
          >
            {SPECIAL_FORMATS.map((option) => (
              <SetupOptionCard
                key={option.id}
                selected={challengeModifier === option.id}
                onSelect={() => {
                  onChange({ roundQuestionCount, challengeModifier: option.id });
                  onClose();
                }}
                title={option.title}
                description={option.description}
                icon={option.icon}
              />
            ))}
          </div>
        </section>
      </div>
    </SettingsSheet>
  );
}
