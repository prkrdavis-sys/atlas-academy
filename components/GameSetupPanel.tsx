"use client";

import { ContinentFilter } from "@/components/ContinentFilter";
import { Select } from "@/components/ui/Select";
import { scopeText, SCOPE_INFO } from "@/lib/scope";
import {
  CHALLENGE_MODIFIER_OPTIONS,
  DIFFICULTY_LABELS,
  getDifficultyHint,
  ROUND_ALL_QUESTIONS,
  clampRoundQuestionSetting,
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

const optionButtonClass = (active: boolean) =>
  cn(
    "min-h-12 rounded-2xl border-2 px-4 py-2 text-left text-sm font-semibold transition-all duration-100 sm:text-center",
    active
      ? "border-emerald-600 bg-emerald-500 text-white shadow-[0_3px_0_var(--color-emerald-700)]"
      : "border-slate-200 bg-white text-slate-700 shadow-[0_3px_0_var(--color-slate-200)] hover:border-sky-300 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500",
  );

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

  return (
    <div
      className={cn(
        "space-y-5 rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:space-y-6 sm:p-6",
        className,
      )}
    >
      {weakSpotWarning ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {scopeText(
            "Play some games first — incorrect answers add places to your commonly missed pool.",
            scope,
          )}
        </p>
      ) : null}

      <div>
        <h2 className="mb-3 font-semibold">Challenge modifier</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {CHALLENGE_MODIFIER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChallengeModifierChange(option.id)}
              className={optionButtonClass(challengeModifier === option.id)}
            >
              <span className="mr-1.5">{option.icon}</span>
              {option.title}
              <span className="mt-0.5 block text-xs font-normal opacity-80">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {!challengeActive ? (
        <div>
          <h2 className="mb-3 font-semibold">Questions per round</h2>
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
      ) : null}

      <div>
        <h2 className="mb-3 font-semibold">Difficulty</h2>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onDifficultyChange(level)}
              className={optionButtonClass(difficulty === level)}
            >
              {DIFFICULTY_LABELS[level]}
              {getDifficultyHint(mode, level)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">{scopeInfo.regionLabel}</h2>
        <ContinentFilter
          selected={continents}
          includeTerritories={includeTerritories}
          onContinentsChange={onContinentsChange}
          onIncludeTerritoriesChange={onIncludeTerritoriesChange}
          scope={scope}
        />
      </div>
    </div>
  );
}
