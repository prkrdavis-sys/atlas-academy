"use client";

import { ContinentFilter } from "@/components/ContinentFilter";
import { Select } from "@/components/ui/Select";
import { getChallengeModifierLabel } from "@/lib/game-setup";
import { scopeText, SCOPE_INFO } from "@/lib/scope";
import {
  CHALLENGE_MODIFIER_OPTIONS,
  DIFFICULTY_LABELS,
  ROUND_ALL_QUESTIONS,
  clampRoundQuestionSetting,
  getDifficultyHint,
  getRoundQuestionOptions,
  isChallengeModifierActive,
  normalizeRoundQuestionSetting,
  type ChallengeModifier,
  type Difficulty,
  type GameMode,
  type GameScope,
  type Region,
  type RoundQuestionSetting,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type GameSetupPanelProps = {
  mode: GameMode;
  scope: GameScope;
  challengeModifier: ChallengeModifier;
  continents: Region[];
  includeTerritories: boolean;
  difficulty: Difficulty;
  roundQuestionCount: RoundQuestionSetting;
  availableCountryCount: number;
  weakSpotWarning?: boolean;
  onChallengeModifierChange: (challengeModifier: ChallengeModifier) => void;
  onContinentsChange: (continents: Region[]) => void;
  onIncludeTerritoriesChange: (includeTerritories: boolean) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onRoundQuestionCountChange: (roundQuestionCount: RoundQuestionSetting) => void;
  className?: string;
};

function fieldLabelClass() {
  return "text-sm font-bold text-slate-800 dark:text-slate-200";
}

export function GameSetupPanel({
  mode,
  scope,
  challengeModifier,
  continents,
  includeTerritories,
  difficulty,
  roundQuestionCount,
  availableCountryCount,
  weakSpotWarning = false,
  onChallengeModifierChange,
  onContinentsChange,
  onIncludeTerritoriesChange,
  onDifficultyChange,
  onRoundQuestionCountChange,
  className,
}: GameSetupPanelProps) {
  const scopeInfo = SCOPE_INFO[scope];
  const roundQuestionOptions = getRoundQuestionOptions(availableCountryCount);
  const effectiveRoundQuestionCount = clampRoundQuestionSetting(
    roundQuestionCount,
    availableCountryCount,
  );
  const challengeActive = isChallengeModifierActive(challengeModifier);
  const difficultyHint = getDifficultyHint(mode, difficulty).replace(/^ - /, "");
  const activeModifierLabel = getChallengeModifierLabel(challengeModifier);
  const activeModifierOption = CHALLENGE_MODIFIER_OPTIONS.find(
    (option) => option.id === challengeModifier,
  );

  return (
    <div className={cn("space-y-4", className)}>
      {weakSpotWarning ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {scopeText(
            "Play some games first — incorrect answers add places to your commonly missed pool.",
            scope,
          )}
        </p>
      ) : null}

      <div className="space-y-5 rounded-2xl border-2 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className={fieldLabelClass()}>Difficulty</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{difficultyHint}</p>
          </div>
          <div
            role="radiogroup"
            aria-label="Difficulty"
            className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800"
          >
            {(["easy", "medium", "hard"] as Difficulty[]).map((level) => {
              const active = difficulty === level;
              return (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onDifficultyChange(level)}
                  className={cn(
                    "min-h-10 rounded-xl px-2 text-sm font-semibold transition-all",
                    active
                      ? "bg-white font-bold text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  {DIFFICULTY_LABELS[level]}
                </button>
              );
            })}
          </div>
          {difficulty === "easy" ? (
            <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              Map progress is not tracked on Easy
            </p>
          ) : null}
        </div>

        <div>
          <h2 className={fieldLabelClass()}>Questions per round</h2>
          {challengeActive && activeModifierOption ? (
            <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              <span aria-hidden>{activeModifierOption.icon}</span>{" "}
              <span className="font-semibold">{activeModifierOption.title}</span>:{" "}
              {activeModifierOption.description} Change this under Advanced options.
            </p>
          ) : (
            <div className="mt-2">
              <Select
                value={effectiveRoundQuestionCount}
                onChange={(event) => {
                  const { value } = event.target;
                  onRoundQuestionCountChange(
                    value === ROUND_ALL_QUESTIONS
                      ? ROUND_ALL_QUESTIONS
                      : normalizeRoundQuestionSetting(Number(value)),
                  );
                }}
              >
                {roundQuestionOptions.map((count) => (
                  <option key={count} value={count}>
                    {count} questions
                  </option>
                ))}
                <option value={ROUND_ALL_QUESTIONS}>
                  All ({availableCountryCount}{" "}
                  {availableCountryCount === 1 ? scopeInfo.noun : scopeInfo.nounPlural})
                </option>
              </Select>
            </div>
          )}
        </div>
      </div>

      <details className="group rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 dark:border-slate-600 dark:bg-slate-900/40 sm:px-5">
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Advanced options
          </span>
          <span className="flex items-center gap-2">
            {activeModifierLabel ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                {activeModifierLabel}
              </span>
            ) : null}
            <span
              aria-hidden
              className="text-xs text-slate-400 transition-transform duration-200 group-open:rotate-180 dark:text-slate-500"
            >
              ▾
            </span>
          </span>
        </summary>

        <div className="mt-4 space-y-6 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div>
            <h3 className={fieldLabelClass()}>Challenge modifier</h3>
            <div role="radiogroup" aria-label="Challenge modifier" className="mt-2 space-y-2">
              {CHALLENGE_MODIFIER_OPTIONS.map((option) => {
                const active = challengeModifier === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChallengeModifierChange(option.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/50"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                        active
                          ? "border-emerald-600 dark:border-emerald-400"
                          : "border-slate-300 dark:border-slate-500",
                      )}
                    >
                      {active ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                        <span aria-hidden>{option.icon}</span> {option.title}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className={fieldLabelClass()}>{scopeInfo.regionLabel}</h3>
            <div className="mt-2">
              <ContinentFilter
                selected={continents}
                includeTerritories={includeTerritories}
                onContinentsChange={onContinentsChange}
                onIncludeTerritoriesChange={onIncludeTerritoriesChange}
                scope={scope}
              />
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
