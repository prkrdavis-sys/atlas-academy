"use client";

import { getScopedModeInfo, scopeText, SCOPE_INFO } from "@/lib/scope";
import { getActiveGameSummaryParts } from "@/lib/game-setup";
import type { GameMode, GameScope, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

type ActiveGameSummaryProps = {
  profile: Profile;
  mode: GameMode;
  scope: GameScope;
  className?: string;
  onClick?: () => void;
};

export function ActiveGameSummary({ profile, mode, scope, className, onClick }: ActiveGameSummaryProps) {
  const parts = getActiveGameSummaryParts(profile, mode, scope);
  const scopeInfo = SCOPE_INFO[scope];

  const chipClass =
    "inline-flex items-center rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-xs font-semibold text-emerald-50";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Current game settings. Tap to change."
      className={cn(
        "flex w-full flex-wrap items-center justify-center gap-2 text-left transition-opacity hover:opacity-90 active:opacity-80",
        className,
      )}
    >
      {parts.map((part) => (
        <span key={part} className={chipClass}>
          {part}
        </span>
      ))}
      <span className={chipClass}>
        {scopeInfo.icon} {scopeInfo.shortLabel}
      </span>
    </button>
  );
}

type ActiveGameSummaryStaticProps = {
  mode: GameMode;
  scope: GameScope;
  difficultyLabel: string;
  roundLabel: string;
  questionTypeLabel?: string;
};

export function ActiveGameSummaryStatic({
  mode,
  scope,
  difficultyLabel,
  roundLabel,
  questionTypeLabel,
}: ActiveGameSummaryStaticProps) {
  const modeInfo = getScopedModeInfo(mode, scope);
  const scopeInfo = SCOPE_INFO[scope];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {modeInfo ? (
        <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-emerald-50">
          {modeInfo.icon} {scopeText(modeInfo.title, scope)}
        </span>
      ) : null}
      {mode !== "daily-challenge" ? (
        <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-emerald-50">
          {difficultyLabel}
        </span>
      ) : null}
      <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-emerald-50">
        {roundLabel}
      </span>
      {questionTypeLabel ? (
        <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-emerald-50">
          {questionTypeLabel}
        </span>
      ) : null}
      <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-emerald-50">
        {scopeInfo.icon} {scopeInfo.shortLabel}
      </span>
    </div>
  );
}
