"use client";

import { ContinentFilter } from "@/components/ContinentFilter";
import { GameModeGroup, type GameModeGroupHeaderStyle } from "@/components/GameModeGroup";
import { Select } from "@/components/ui/Select";
import { getChallengeModifierLabel, getRoundCountLabel } from "@/lib/game-setup";
import { getRegionFilterSummary } from "@/lib/region-filter-summary";
import { scopeText, SCOPE_INFO } from "@/lib/scope";
import {
  CHALLENGE_MODIFIER_OPTIONS,
  DIFFICULTY_LABELS,
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

const PLAY_STYLE_GROUP_STYLE: GameModeGroupHeaderStyle = {
  container: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/40",
  summary: "hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50",
  title: "text-emerald-950 dark:text-emerald-50",
  subtitle: "text-emerald-700/90 dark:text-emerald-300/90",
  badge: "bg-emerald-200/80 text-emerald-900 dark:bg-emerald-800/80 dark:text-emerald-100",
  chevron: "bg-emerald-200/70 text-emerald-800 dark:bg-emerald-800/70 dark:text-emerald-100",
};

const ROUND_LENGTH_GROUP_STYLE: GameModeGroupHeaderStyle = {
  container: "border-teal-200 bg-teal-50/60 dark:border-teal-800 dark:bg-teal-950/40",
  summary: "hover:bg-teal-100/80 dark:hover:bg-teal-900/50",
  title: "text-teal-950 dark:text-teal-50",
  subtitle: "text-teal-700/90 dark:text-teal-300/90",
  badge: "bg-teal-200/80 text-teal-900 dark:bg-teal-800/80 dark:text-teal-100",
  chevron: "bg-teal-200/70 text-teal-800 dark:bg-teal-800/70 dark:text-teal-100",
};

const REGION_GROUP_STYLE: GameModeGroupHeaderStyle = {
  container: "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/40",
  summary: "hover:bg-amber-100/80 dark:hover:bg-amber-900/50",
  title: "text-amber-950 dark:text-amber-50",
  subtitle: "text-amber-700/90 dark:text-amber-300/90",
  badge: "bg-amber-200/80 text-amber-900 dark:bg-amber-800/80 dark:text-amber-100",
  chevron: "bg-amber-200/70 text-amber-800 dark:bg-amber-800/70 dark:text-amber-100",
};

const optionButtonClass = (active: boolean, compact = false) =>
  cn(
    "rounded-2xl border-2 font-semibold transition-all duration-100",
    compact
      ? "min-h-10 px-3 py-2 text-sm sm:text-center"
      : "min-h-12 px-4 py-2 text-left text-sm sm:text-center",
    active
      ? "border-emerald-600 bg-emerald-500 text-white shadow-[0_3px_0_var(--color-emerald-700)]"
      : "border-slate-200 bg-white text-slate-700 shadow-[0_3px_0_var(--color-slate-200)] hover:border-sky-300 active:translate-y-[3px] active:shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_3px_0_var(--color-slate-700)] dark:hover:border-sky-500",
  );

function getPlayStyleBadge(challengeModifier: ChallengeModifier, difficulty: Difficulty): string {
  const modifierLabel = getChallengeModifierLabel(challengeModifier) ?? "Standard";
  return `${modifierLabel} · ${DIFFICULTY_LABELS[difficulty]}`;
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
  const playStyleBadge = getPlayStyleBadge(challengeModifier, difficulty);
  const roundLengthBadge = getRoundCountLabel(mode, effectiveRoundQuestionCount, challengeModifier);
  const regionBadge = getRegionFilterSummary(continents, includeTerritories, scope);

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

      <GameModeGroup
        title="Play Style"
        subtitle="Challenge modifier and difficulty"
        badge={playStyleBadge}
        headerStyle={PLAY_STYLE_GROUP_STYLE}
      >
        <div className="space-y-4 pt-1">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Challenge modifier
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CHALLENGE_MODIFIER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChallengeModifierChange(option.id)}
                  className={optionButtonClass(challengeModifier === option.id, true)}
                >
                  <span className="mr-1.5">{option.icon}</span>
                  {option.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Difficulty
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onDifficultyChange(level)}
                  className={optionButtonClass(difficulty === level, true)}
                >
                  {DIFFICULTY_LABELS[level]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GameModeGroup>

      {!challengeActive ? (
        <GameModeGroup
          title="Round Length"
          subtitle="How many questions per round"
          badge={roundLengthBadge}
          headerStyle={ROUND_LENGTH_GROUP_STYLE}
        >
          <div className="pt-1">
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
        </GameModeGroup>
      ) : null}

      <GameModeGroup
        title={scopeInfo.regionLabel}
        subtitle={scope === "usa" ? "Which states to include" : "Continents and territories"}
        badge={regionBadge}
        headerStyle={REGION_GROUP_STYLE}
      >
        <div className="pt-1">
          <ContinentFilter
            selected={continents}
            includeTerritories={includeTerritories}
            onContinentsChange={onContinentsChange}
            onIncludeTerritoriesChange={onIncludeTerritoriesChange}
            scope={scope}
          />
        </div>
      </GameModeGroup>
    </div>
  );
}
