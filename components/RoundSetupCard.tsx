"use client";

import { useState } from "react";
import { DifficultySheet } from "@/components/setup/DifficultySheet";
import { PlacesSheet } from "@/components/setup/PlacesSheet";
import { RoundLengthSheet } from "@/components/setup/RoundLengthSheet";
import {
  getDifficultySummary,
  getPlacesSummary,
  getRoundLengthSummary,
  type SettingSummary,
} from "@/lib/game-setup";
import { scopeText } from "@/lib/scope";
import type {
  ChallengeModifier,
  Difficulty,
  GameMode,
  GameScope,
  Region,
  RoundQuestionSetting,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type RoundSetupCardProps = {
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

type OpenSheet = "difficulty" | "length" | "places" | null;

/**
 * Shows the whole round as three readable rows instead of a form: what you get
 * asked, how long it runs, and where the places come from. Each row opens one
 * focused sheet, so the page stays a summary you can check at a glance.
 */
export function RoundSetupCard({
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
}: RoundSetupCardProps) {
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const closeSheet = () => setOpenSheet(null);

  const isUsa = scope === "usa";
  const difficultySummary = getDifficultySummary(mode, difficulty);
  const lengthSummary = getRoundLengthSummary(
    mode,
    roundQuestionCount,
    challengeModifier,
    availableCountryCount,
  );
  const placesSummary = getPlacesSummary(
    continents,
    includeTerritories,
    scope,
    availableCountryCount,
  );

  return (
    <div className={cn("space-y-3", className)}>
      {weakSpotWarning ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {scopeText(
            "Play some games first — incorrect answers add places to your commonly missed pool.",
            scope,
          )}
        </p>
      ) : null}

      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
        <SettingRow
          label="Difficulty"
          summary={difficultySummary}
          note={difficulty === "easy" ? "Map progress is not tracked on Easy" : undefined}
          onClick={() => setOpenSheet("difficulty")}
        />
        <SettingRow
          label="Round length"
          summary={lengthSummary}
          onClick={() => setOpenSheet("length")}
        />
        <SettingRow
          label={isUsa ? "Regions" : "Places"}
          summary={placesSummary}
          note={availableCountryCount === 0 ? "Pick at least one to play" : undefined}
          noteTone={availableCountryCount === 0 ? "warning" : "info"}
          onClick={() => setOpenSheet("places")}
        />
      </div>

      <DifficultySheet
        open={openSheet === "difficulty"}
        onClose={closeSheet}
        mode={mode}
        difficulty={difficulty}
        onSelect={onDifficultyChange}
      />

      <RoundLengthSheet
        open={openSheet === "length"}
        onClose={closeSheet}
        scope={scope}
        roundQuestionCount={roundQuestionCount}
        challengeModifier={challengeModifier}
        poolSize={availableCountryCount}
        onChange={(next) => {
          onRoundQuestionCountChange(next.roundQuestionCount);
          onChallengeModifierChange(next.challengeModifier);
        }}
      />

      <PlacesSheet
        open={openSheet === "places"}
        onClose={closeSheet}
        scope={scope}
        selected={continents}
        includeTerritories={includeTerritories}
        poolSize={availableCountryCount}
        onChange={(next) => {
          onContinentsChange(next.continents);
          onIncludeTerritoriesChange(next.includeTerritories);
        }}
      />
    </div>
  );
}

type SettingRowProps = {
  label: string;
  summary: SettingSummary;
  note?: string;
  noteTone?: "info" | "warning";
  onClick: () => void;
};

function SettingRow({ label, summary, note, noteTone = "info", onClick }: SettingRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/60 dark:active:bg-slate-800"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </span>
        <span className="mt-0.5 block font-display text-base font-extrabold text-slate-900 dark:text-slate-100">
          {summary.value}
        </span>
        <span className="block text-xs leading-snug text-slate-500 dark:text-slate-400">
          {summary.detail}
        </span>
        {note ? (
          <span
            className={cn(
              "mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[0.7rem] font-semibold",
              noteTone === "warning"
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
                : "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
            )}
          >
            {note}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className="shrink-0 font-display text-sm font-extrabold text-teal-700 dark:text-teal-400"
      >
        Change ›
      </span>
    </button>
  );
}
