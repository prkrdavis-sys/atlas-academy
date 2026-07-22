"use client";

import { ContinentFilter } from "@/components/ContinentFilter";
import { Select } from "@/components/ui/Select";
import { getScopedModeInfo, scopeText, SCOPE_INFO } from "@/lib/scope";
import {
  CORE_QUESTION_TYPES,
  DIFFICULTY_LABELS,
  getDifficultyHint,
  ROUND_ALL_QUESTIONS,
  SPEED_ROUND_ALL_TYPES,
  clampRoundQuestionSetting,
  getRoundQuestionOptions,
  normalizeRoundQuestionSetting,
  type Difficulty,
  type GameMode,
  type GameScope,
  type Region,
  type RoundQuestionSetting,
  type SpeedRoundQuestionType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type GameSetupPanelProps = {
  mode: GameMode;
  scope: GameScope;
  continents: Region[];
  includeTerritories: boolean;
  difficulty: Difficulty;
  questionType: SpeedRoundQuestionType;
  roundQuestionCount: RoundQuestionSetting;
  availableCountryCount: number;
  weakSpotWarning?: boolean;
  onContinentsChange: (continents: Region[]) => void;
  onIncludeTerritoriesChange: (includeTerritories: boolean) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onQuestionTypeChange: (questionType: SpeedRoundQuestionType) => void;
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
  continents,
  includeTerritories,
  difficulty,
  questionType,
  roundQuestionCount,
  availableCountryCount,
  weakSpotWarning = false,
  onContinentsChange,
  onIncludeTerritoriesChange,
  onDifficultyChange,
  onQuestionTypeChange,
  onRoundQuestionCountChange,
  className,
}: GameSetupPanelProps) {
  const scopeInfo = SCOPE_INFO[scope];
  const isDailyChallenge = mode === "daily-challenge";
  const roundQuestionOptions = getRoundQuestionOptions(availableCountryCount);
  const effectiveRoundQuestionCount = clampRoundQuestionSetting(
    roundQuestionCount,
    availableCountryCount,
  );

  if (isDailyChallenge) {
    return (
      <div
        className={cn(
          "rounded-[1.75rem] border-2 border-slate-200 bg-white/90 p-4 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:p-6",
          className,
        )}
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Fixed format — 10 mixed questions at Normal difficulty with the full {scopeInfo.nounPlural} pool.
        </p>
      </div>
    );
  }

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

      {(mode === "speed-round" || mode === "marathon") && (
        <div>
          <h2 className="mb-3 font-semibold">Question type</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CORE_QUESTION_TYPES.map((type) => {
              const typeInfo = getScopedModeInfo(type, scope);
              if (!typeInfo) return null;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onQuestionTypeChange(type)}
                  className={optionButtonClass(questionType === type)}
                >
                  <span className="mr-1.5">{typeInfo.icon}</span>
                  {typeInfo.title}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onQuestionTypeChange(SPEED_ROUND_ALL_TYPES)}
              className={cn(optionButtonClass(questionType === SPEED_ROUND_ALL_TYPES), "sm:col-span-2")}
            >
              <span className="mr-1.5">🎲</span>
              Mixed
              <span className="mt-0.5 block text-xs font-normal opacity-80">
                {mode === "marathon"
                  ? "All four types, shuffled until your first miss"
                  : "All four types, shuffled"}
              </span>
            </button>
          </div>
        </div>
      )}

      {mode !== "marathon" && mode !== "speed-round" && (
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
      )}

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
