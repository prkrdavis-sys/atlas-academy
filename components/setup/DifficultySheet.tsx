"use client";

import { SettingsSheet } from "@/components/ui/SettingsSheet";
import { SetupOptionCard } from "@/components/setup/SetupOptionCard";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  getDifficultyDescription,
  type Difficulty,
  type GameMode,
} from "@/lib/types";

type DifficultySheetProps = {
  open: boolean;
  onClose: () => void;
  mode: GameMode;
  difficulty: Difficulty;
  onSelect: (difficulty: Difficulty) => void;
};

export function DifficultySheet({
  open,
  onClose,
  mode,
  difficulty,
  onSelect,
}: DifficultySheetProps) {
  return (
    <SettingsSheet
      open={open}
      onClose={onClose}
      title="Difficulty"
      description="How much help you get with each question."
    >
      <div role="radiogroup" aria-label="Difficulty" className="space-y-2">
        {DIFFICULTIES.map((level) => (
          <SetupOptionCard
            key={level}
            selected={difficulty === level}
            onSelect={() => {
              onSelect(level);
              onClose();
            }}
            title={DIFFICULTY_LABELS[level]}
            description={getDifficultyDescription(mode, level)}
            note={level === "easy" ? "Map progress is not tracked on Easy" : undefined}
          />
        ))}
      </div>
    </SettingsSheet>
  );
}
