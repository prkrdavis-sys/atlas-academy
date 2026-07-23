"use client";

import { PlaceMapProgressPanel } from "@/components/PlaceMapProgressPanel";
import type { GameScope, MapProgressDifficulty, Profile } from "@/lib/types";

type ProgressMapOverlaysProps = {
  hoverLabel: string | null;
  selectedCode: string | null;
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  scope: GameScope;
};

export function ProgressMapOverlays({
  hoverLabel,
  selectedCode,
  profile,
  difficulty,
  scope,
}: ProgressMapOverlaysProps) {
  return (
    <>
      {hoverLabel ? (
        <div
          className="pointer-events-none absolute right-2 top-12 z-10 max-w-[calc(100%-5rem)] rounded-lg bg-slate-900/85 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
          role="status"
          aria-live="polite"
        >
          {hoverLabel}
        </div>
      ) : null}
      {selectedCode ? (
        <PlaceMapProgressPanel
          code={selectedCode}
          profile={profile}
          difficulty={difficulty}
          scope={scope}
        />
      ) : null}
    </>
  );
}
