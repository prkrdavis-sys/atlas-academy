"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useProfiles } from "@/components/ProfileProvider";
import {
  getLoginStreak,
  getLoginWeekView,
  hasLoggedInToday,
  isLoginStreakMilestone,
} from "@/lib/login-streak";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { useCoachMarkAnchor } from "@/components/CoachMarkProvider";

const PANEL_GAP = 8;
const PANEL_EDGE_MARGIN = 16;
const PANEL_MAX_WIDTH = 304; // 19rem

/**
 * Daily login streak flame for the app header, following the Duolingo-style
 * streak pattern: the flame is lit once today is secured, and tapping it opens
 * a small panel with the current week's kept/missed days.
 */
export function HeaderStreakChip() {
  const { activeProfile, hydrated } = useProfiles();
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const coachRef = useCoachMarkAnchor("streak-chip");
  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      coachRef(node);
    },
    [coachRef],
  );

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function updatePanelPosition() {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;

      const panelWidth = Math.min(PANEL_MAX_WIDTH, window.innerWidth - PANEL_EDGE_MARGIN * 2);
      // Prefer right-aligning to the chip (matches desktop), then clamp into the viewport.
      let left = trigger.right - panelWidth;
      const maxLeft = window.innerWidth - panelWidth - PANEL_EDGE_MARGIN;
      left = Math.max(PANEL_EDGE_MARGIN, Math.min(left, maxLeft));

      setPanelStyle({
        position: "fixed",
        top: trigger.bottom + PANEL_GAP,
        left,
        width: panelWidth,
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
  }, [open]);

  if (!hydrated || !activeProfile) return null;

  const streak = getLoginStreak(activeProfile.loginStreak);
  const lit = hasLoggedInToday(activeProfile.loginStreak);
  const milestone = isLoginStreakMilestone(streak);
  const week = getLoginWeekView(activeProfile.loginDates);

  const panel = open ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Daily streak details"
      style={panelStyle}
      className="z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="text-3xl leading-none">
          🔥
        </span>
        <div>
          <p className="font-display text-xl font-extrabold text-slate-900 dark:text-slate-100">
            {streak} day{streak === 1 ? "" : "s"}
            {milestone ? (
              <span aria-hidden className="ml-1.5">
                🎉
              </span>
            ) : null}
          </p>
          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
            Daily streak
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/70">
        {week.map((day) => (
          <div key={day.dateKey} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
              {day.label}
            </span>
            <span
              aria-hidden
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[11px]",
                day.state === "kept" &&
                  "bg-orange-500 font-extrabold text-white shadow-[0_0_8px_rgb(249_115_22_/_0.5)]",
                day.state === "missed" && "bg-slate-200 dark:bg-slate-700",
                day.state === "future" &&
                  "border-2 border-dashed border-slate-300 dark:border-slate-600",
                day.isToday && "ring-2 ring-orange-400 ring-offset-1 dark:ring-offset-slate-900",
              )}
            >
              {day.state === "kept" ? "✓" : ""}
            </span>
            <span className="sr-only">
              {day.dateKey}:{" "}
              {day.state === "kept"
                ? "streak kept"
                : day.state === "missed"
                  ? "missed"
                  : "upcoming"}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {lit
          ? "Today is secured! Come back tomorrow to keep the flame burning."
          : "Open Atlas Academy every day to keep your streak alive."}
      </p>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={setTriggerRef}
        type="button"
        onClick={() => {
          if (!open) {
            setPanelStyle({ visibility: "hidden" });
            playSound(milestone ? "streak" : "tap", activeProfile);
          }
          setOpen(!open);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Daily streak: ${streak} ${streak === 1 ? "day" : "days"}. Show streak details.`}
        className={cn(
          "flex min-h-9 items-center gap-1 rounded-full px-2.5 py-1 font-display text-sm font-extrabold tabular-nums transition-colors",
          lit
            ? "text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/40"
            : "text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800",
          open && (lit ? "bg-orange-50 dark:bg-orange-950/40" : "bg-slate-100 dark:bg-slate-800"),
        )}
      >
        <span
          aria-hidden
          className={cn(
            "text-base leading-none",
            !lit && "grayscale opacity-70",
            lit && milestone && "[animation:streak-flame-flicker_1.2s_ease-in-out_infinite]",
          )}
        >
          🔥
        </span>
        {streak}
      </button>

      {panel && createPortal(panel, document.body)}
    </>
  );
}
