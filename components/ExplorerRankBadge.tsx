"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  getExplorerRank,
  getMasteredProgress,
  getNextExplorerRank,
} from "@/lib/explorer-rank";
import { SCOPE_INFO } from "@/lib/scope";
import type { GameScope, Profile } from "@/lib/types";
import { useMapProgressDifficulty } from "@/lib/use-map-progress-difficulty";
import { cn } from "@/lib/utils";

type PopoverPlacement = "above" | "below";

const POPOVER_ESTIMATED_HEIGHT = 280;
const POPOVER_GAP = 8;

type ExplorerRankBadgeProps = {
  profile: Profile;
  scope: GameScope;
  className?: string;
};

export function ExplorerRankBadge({ profile, scope, className }: ExplorerRankBadgeProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<PopoverPlacement>("below");
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { mapDifficulty } = useMapProgressDifficulty();
  const progress = getMasteredProgress(scope, profile, mapDifficulty);
  const rank = getExplorerRank(progress);
  const next = getNextExplorerRank(progress);
  const scopeInfo = SCOPE_INFO[scope];
  const placeNoun = scopeInfo.nounPlural;

  function toggleOpen() {
    setOpen((value) => {
      if (!value) {
        setPanelStyle({ visibility: "hidden" });
        setPlacement("below");
      }
      return !value;
    });
  }

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      close();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function updatePanelPosition() {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      if (!trigger) return;

      const panelHeight = panel?.height ?? POPOVER_ESTIMATED_HEIGHT;
      const panelWidth = panel?.width ?? Math.min(304, window.innerWidth - 32);
      const spaceBelow = window.innerHeight - trigger.bottom - POPOVER_GAP;
      const spaceAbove = trigger.top - POPOVER_GAP;

      let nextPlacement: PopoverPlacement = "below";
      if (panelHeight <= spaceBelow) {
        nextPlacement = "below";
      } else if (panelHeight <= spaceAbove) {
        nextPlacement = "above";
      } else {
        nextPlacement = spaceAbove > spaceBelow ? "above" : "below";
      }

      const top =
        nextPlacement === "below"
          ? trigger.bottom + POPOVER_GAP
          : trigger.top - panelHeight - POPOVER_GAP;

      let left = trigger.left;
      const maxLeft = window.innerWidth - panelWidth - 16;
      left = Math.max(16, Math.min(left, maxLeft));

      setPlacement(nextPlacement);
      setPanelStyle({
        position: "fixed",
        top,
        left,
        width: panelWidth > 0 ? panelWidth : Math.min(304, window.innerWidth - 32),
        visibility: "visible",
      });
    }

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, progress.mastered, next?.at]);

  const towardNext = next ? Math.min(progress.mastered, next.at) : progress.mastered;
  const towardTotal = next?.at ?? progress.total;
  const percent = towardTotal > 0 ? Math.round((towardNext / towardTotal) * 100) : 100;

  const popover = open ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby="explorer-rank-title"
      aria-describedby="explorer-rank-description"
      style={panelStyle}
      data-placement={placement}
      className="z-[80] w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-teal-200 bg-white p-4 shadow-xl dark:border-teal-800 dark:bg-slate-900"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
        Explorer rank
      </p>
      <h2
        id="explorer-rank-title"
        className="mt-1 font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-50"
      >
        <span aria-hidden className="mr-1.5">
          {rank.icon}
        </span>
        {rank.title}
      </h2>
      <p
        id="explorer-rank-description"
        className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300"
      >
        Fully master {placeNoun} on the map to climb ranks. A place counts when you complete all
        four categories on the selected Normal or Hard track.
      </p>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Mastered
          </p>
          <p className="font-display text-base font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
            {progress.mastered}
            <span className="text-slate-400 dark:text-slate-500"> / </span>
            {progress.total}
          </p>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{placeNoun}</p>
      </div>

      {next ? (
        <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/70 px-3 py-2.5 dark:border-teal-800 dark:bg-teal-950/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            Next rank
          </p>
          <p className="mt-0.5 font-display text-base font-extrabold text-slate-900 dark:text-slate-100">
            <span aria-hidden className="mr-1">
              {next.icon}
            </span>
            {next.title}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
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
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-teal-200/70 dark:bg-teal-900"
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
          <p className="mt-1 text-[11px] font-semibold tabular-nums text-teal-800 dark:text-teal-200">
            {towardNext} / {towardTotal}
          </p>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="font-display text-sm font-extrabold text-amber-900 dark:text-amber-100">
            Top rank unlocked
          </p>
          <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-200/90">
            You&apos;ve reached Atlas Master — keep mastering the remaining {placeNoun} on the
            map.
          </p>
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${rank.title} rank. View next rank requirements.`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-teal-300/70 bg-teal-50 px-3.5 py-1.5 font-display text-sm font-extrabold text-teal-800 shadow-sm transition-colors hover:border-teal-400 hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:border-teal-500 dark:hover:bg-teal-950/80",
          open && "border-teal-400 bg-teal-100 dark:border-teal-500 dark:bg-teal-950/80",
          className,
        )}
      >
        <span aria-hidden>{rank.icon}</span>
        {rank.title}
      </button>

      {popover && createPortal(popover, document.body)}
    </>
  );
}
