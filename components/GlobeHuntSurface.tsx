"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InteractiveProgressMap } from "@/components/InteractiveProgressMap";
import InteractiveGlobe from "@/components/globe/InteractiveGlobe";
import { getCountryName } from "@/lib/countries";
import type { Difficulty, GameScope, MapProgressDifficulty, Question } from "@/lib/types";
import { cn } from "@/lib/utils";

type GlobeHuntSurfaceProps = {
  question: Question;
  scope: GameScope;
  difficulty: Difficulty;
  disabled: boolean;
  initialSelectedCode?: string | null;
  revealedCode: string | null;
  onConfirm: (code: string) => void;
};

export function GlobeHuntSurface({
  question,
  scope,
  difficulty,
  disabled,
  initialSelectedCode = null,
  revealedCode,
  onConfirm,
}: GlobeHuntSurfaceProps) {
  const [selectedCode, setSelectedCode] = useState<string | null>(initialSelectedCode);
  const mapDifficulty: MapProgressDifficulty = difficulty === "hard" ? "hard" : "medium";
  const visibleCode = revealedCode ?? selectedCode;
  const selectionLocked = disabled || revealedCode !== null;
  const selectedName = visibleCode ? getCountryName(visibleCode) : null;

  const handleSelect = useCallback((code: string | null) => {
    setSelectedCode((current) => (code && current === code ? null : code));
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="shrink-0 text-center">
        <p className="font-display text-xl font-extrabold leading-snug text-slate-800 dark:text-slate-100 sm:text-2xl">
          {question.prompt}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {revealedCode
            ? "The correct place is highlighted."
            : selectedName
              ? `${selectedName} selected`
              : "Pan and zoom, then select a place on the map."}
        </p>
      </div>

      <div
        className={cn(
          "relative min-h-[18rem] flex-1 overflow-hidden rounded-3xl border-2 border-slate-200 bg-slate-950/5 shadow-inner dark:border-slate-700",
          scope === "world" ? "sm:min-h-[25rem]" : "sm:min-h-[22rem]",
        )}
      >
        {scope === "world" ? (
          <InteractiveGlobe
            profile={null}
            difficulty={mapDifficulty}
            usMode="country"
            mode="map"
            selectedCode={visibleCode}
            focusPlaceCode={revealedCode}
            autoSpinEnabled={false}
            showSelectionPanel={false}
            clearGeography
            onSelectPlace={handleSelect}
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <InteractiveProgressMap
            scope="usa"
            profile={null}
            difficulty={mapDifficulty}
            gameplay
            selectedPlaceCode={visibleCode}
            focusPlaceCode={revealedCode}
            selectionLocked={selectionLocked}
            onSelectPlace={handleSelect}
          />
        )}
      </div>

      <div className="flex shrink-0 items-center justify-center gap-2">
        <Button
          size="lg"
          className="min-w-40"
          disabled={!selectedCode || selectionLocked}
          onClick={() => {
            if (selectedCode && !selectionLocked) onConfirm(selectedCode);
          }}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
