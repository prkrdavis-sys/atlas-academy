"use client";

import type { RefObject, ReactNode } from "react";
import { PlaceMapProgressPanel } from "@/components/PlaceMapProgressPanel";
import type { GameScope, MapProgressDifficulty, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

type ProgressMapOverlayProps = {
  hoverLabel: string | null;
  selectedCode: string | null;
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  scope: GameScope;
};

type ProgressMapContainerProps = ProgressMapOverlayProps & {
  containerRef: RefObject<HTMLDivElement | null>;
  className?: string;
  inlinePanelClassName?: string;
  children: ReactNode;
};

function ProgressMapHoverLabel({ hoverLabel }: { hoverLabel: string | null }) {
  if (!hoverLabel) return null;

  return (
    <div
      className="pointer-events-none absolute right-2 top-12 z-10 max-w-[calc(100%-5rem)] rounded-lg bg-slate-900/85 px-2.5 py-1 text-xs font-semibold text-white shadow-sm max-sm:hidden"
      role="status"
      aria-live="polite"
    >
      {hoverLabel}
    </div>
  );
}

/** Wraps the map viewport: overlay panel on sm+, inline panel below on mobile. */
export function ProgressMapContainer({
  containerRef,
  className,
  hoverLabel,
  selectedCode,
  profile,
  difficulty,
  scope,
  inlinePanelClassName,
  children,
}: ProgressMapContainerProps) {
  return (
    <div className="flex flex-col">
      <div ref={containerRef} className={className}>
        {children}
        <ProgressMapHoverLabel hoverLabel={hoverLabel} />
        {selectedCode ? (
          <PlaceMapProgressPanel
            code={selectedCode}
            profile={profile}
            difficulty={difficulty}
            scope={scope}
            variant="overlay"
            className="max-sm:hidden"
          />
        ) : null}
      </div>
      {selectedCode ? (
        <div className={cn("mt-2 sm:hidden", inlinePanelClassName)}>
          <PlaceMapProgressPanel
            code={selectedCode}
            profile={profile}
            difficulty={difficulty}
            scope={scope}
            variant="inline"
          />
        </div>
      ) : null}
    </div>
  );
}
