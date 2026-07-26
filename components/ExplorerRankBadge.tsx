"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import {
  getExplorerRank,
  getMasteredProgress,
  getNextExplorerRank,
} from "@/lib/explorer-rank";
import { SCOPE_INFO } from "@/lib/scope";
import type { GameScope, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

type ExplorerRankBadgeProps = {
  profile: Profile;
  scope: GameScope;
  className?: string;
};

export function ExplorerRankBadge({ profile, scope, className }: ExplorerRankBadgeProps) {
  const [open, setOpen] = useState(false);
  const progress = getMasteredProgress(scope, profile);
  const rank = getExplorerRank(progress);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${rank.title} rank. View next rank requirements.`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-teal-300/70 bg-teal-50 px-3.5 py-1.5 font-display text-sm font-extrabold text-teal-800 shadow-sm transition-colors hover:border-teal-400 hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:border-teal-500 dark:hover:bg-teal-950/80",
          className,
        )}
      >
        <span aria-hidden>{rank.icon}</span>
        {rank.title}
      </button>

      <ExplorerRankDialog
        open={open}
        onClose={() => setOpen(false)}
        profile={profile}
        scope={scope}
      />
    </>
  );
}

type ExplorerRankDialogProps = {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  scope: GameScope;
};

function ExplorerRankDialog({ open, onClose, profile, scope }: ExplorerRankDialogProps) {
  const [mounted, setMounted] = useState(false);
  const progress = getMasteredProgress(scope, profile);
  const rank = getExplorerRank(progress);
  const next = getNextExplorerRank(progress);
  const scopeInfo = SCOPE_INFO[scope];
  const placeNoun = scopeInfo.nounPlural;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const towardNext = next
    ? Math.min(progress.mastered, next.at)
    : progress.mastered;
  const towardTotal = next?.at ?? progress.total;
  const percent = towardTotal > 0 ? Math.round((towardNext / towardTotal) * 100) : 100;

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="explorer-rank-title"
        aria-describedby="explorer-rank-description"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[1.75rem] border-2 border-teal-200 bg-white p-6 shadow-[0_24px_60px_rgb(15_23_42_/_0.35)] dark:border-teal-800 dark:bg-slate-900 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 text-[6rem] opacity-15"
        >
          {rank.icon}
        </div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
          Explorer rank
        </p>
        <h2
          id="explorer-rank-title"
          className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50"
        >
          <span aria-hidden className="mr-2">
            {rank.icon}
          </span>
          {rank.title}
        </h2>
        <p
          id="explorer-rank-description"
          className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
        >
          Fully master {placeNoun} on the map to climb ranks. A place counts when you complete all
          four categories in Normal or Hard.
        </p>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Mastered
            </p>
            <p className="font-display text-lg font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
              {progress.mastered}
              <span className="text-slate-400 dark:text-slate-500"> / </span>
              {progress.total}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{placeNoun}</p>
        </div>

        {next ? (
          <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/70 px-4 py-4 dark:border-teal-800 dark:bg-teal-950/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
              Next rank
            </p>
            <p className="mt-1 font-display text-lg font-extrabold text-slate-900 dark:text-slate-100">
              <span aria-hidden className="mr-1.5">
                {next.icon}
              </span>
              {next.title}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Master{" "}
              <strong className="font-semibold text-slate-800 dark:text-slate-100">
                {next.at} {placeNoun}
              </strong>
              {next.remaining > 0 ? (
                <>
                  {" "}
                  —{" "}
                  <strong className="font-semibold text-teal-800 dark:text-teal-200">
                    {next.remaining} to go
                  </strong>
                </>
              ) : null}
            </p>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-teal-200/70 dark:bg-teal-900"
              role="progressbar"
              aria-valuenow={towardNext}
              aria-valuemin={0}
              aria-valuemax={towardTotal}
              aria-label={`Progress toward ${next.title}`}
            >
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-300 dark:bg-teal-400"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-semibold tabular-nums text-teal-800 dark:text-teal-200">
              {towardNext} / {towardTotal}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="font-display text-base font-extrabold text-amber-900 dark:text-amber-100">
              Top rank unlocked
            </p>
            <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/90">
              You&apos;ve reached Atlas Master — keep mastering the remaining {placeNoun} on the
              map.
            </p>
          </div>
        )}

        <Button size="lg" className="mt-6 w-full" onClick={onClose}>
          Got it
        </Button>
      </div>
    </div>,
    document.body,
  );
}
