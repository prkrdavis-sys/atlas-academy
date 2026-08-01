"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPageProgressPanel } from "@/components/MapPageProgressPanel";
import type { GameScope, MapProgressDifficulty, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

type MapStatsSheetProps = {
  open: boolean;
  onClose: () => void;
  scope: GameScope;
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
};

/** Dragging past this fraction of the sheet height dismisses it. */
const DISMISS_DRAG_FRACTION = 0.25;
/** Flick velocity (px/ms downward) that dismisses regardless of distance. */
const DISMISS_VELOCITY = 0.55;
/** Pointer travel below this counts as a tap on the grab handle (closes). */
const HANDLE_TAP_TRAVEL_PX = 6;

type DragState = {
  pointerId: number;
  startY: number;
  lastY: number;
  lastTime: number;
  velocity: number;
};

/**
 * Full-height stats page that pulls up over the map when the double-chevron
 * button is pressed. The globe never scrolls — this sheet slides above it.
 * The grab handle closes on tap, or can be dragged all the way down.
 */
export function MapStatsSheet({
  open,
  onClose,
  scope,
  profile,
  difficulty,
}: MapStatsSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  /** Content mounts lazily on first open, then stays for instant re-opens. */
  const [everOpened, setEverOpened] = useState(false);
  if (open && !everOpened) setEverOpened(true);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDragging(false);
      setDragOffset(0);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Already released.
      }
      if (cancelled) return;

      const traveled = event.clientY - drag.startY;
      const height = sheetRef.current?.offsetHeight ?? 0;
      const isTap = Math.abs(traveled) < HANDLE_TAP_TRAVEL_PX;
      const draggedFarEnough = height > 0 && traveled > height * DISMISS_DRAG_FRACTION;
      const flickedDown = drag.velocity > DISMISS_VELOCITY && traveled > HANDLE_TAP_TRAVEL_PX;
      if (isTap || draggedFarEnough || flickedDown) onClose();
    },
    [onClose],
  );

  return (
    <div
      className={cn("fixed inset-0 z-50", !open && "pointer-events-none")}
      aria-hidden={!open}
    >
      {/* Dim + catch taps outside the sheet while it is up. */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-slate-950/40 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Map stats"
        inert={!open || undefined}
        className={cn(
          "absolute inset-x-0 bottom-0 top-[calc(var(--app-header-offset)+0.5rem)] flex flex-col",
          "rounded-t-[1.75rem] border-t-2 border-slate-200 bg-white shadow-[0_-12px_40px_rgb(15_23_42_/_0.25)]",
          "dark:border-slate-700 dark:bg-slate-950",
          !dragging && "transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          "motion-reduce:transition-none",
        )}
        style={{
          transform: open ? `translateY(${dragOffset}px)` : "translateY(110%)",
        }}
      >
        <button
          type="button"
          aria-label="Close map stats"
          className="flex w-full shrink-0 cursor-grab touch-none items-center justify-center pb-2 pt-3 active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={(event) => {
            dragRef.current = {
              pointerId: event.pointerId,
              startY: event.clientY,
              lastY: event.clientY,
              lastTime: event.timeStamp,
              velocity: 0,
            };
            setDragging(true);
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              // Drag still works without capture.
            }
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const dt = Math.max(1, event.timeStamp - drag.lastTime);
            drag.velocity = (event.clientY - drag.lastY) / dt;
            drag.lastY = event.clientY;
            drag.lastTime = event.timeStamp;
            setDragOffset(Math.max(0, event.clientY - drag.startY));
          }}
          onPointerUp={(event) => endDrag(event, false)}
          onPointerCancel={(event) => endDrag(event, true)}
        >
          <span
            aria-hidden
            className="block h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600"
          />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-1 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {everOpened ? (
              profile ? (
                <MapPageProgressPanel
                  scope={scope}
                  profile={profile}
                  difficulty={difficulty}
                />
              ) : (
                <div className="rounded-[1.75rem] border-2 border-slate-200 bg-white/90 px-5 py-8 text-center dark:border-slate-700 dark:bg-slate-900/90">
                  <p className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    No profile yet
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
                    Create a profile to start tracking your map progress. You can
                    still explore the map without one.
                  </p>
                  <Link
                    href="/profiles"
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-b from-emerald-400 to-teal-600 px-6 font-display text-sm font-extrabold text-white transition-transform hover:scale-[1.02] active:scale-[0.97]"
                  >
                    Create a profile
                  </Link>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
