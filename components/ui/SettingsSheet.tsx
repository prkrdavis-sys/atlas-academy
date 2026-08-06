"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SettingsSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional one-line explanation under the title. */
  description?: string;
  /** Pinned above the safe area, for a live total or an apply action. */
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/** Dragging past this fraction of the sheet height dismisses it. */
const DISMISS_DRAG_FRACTION = 0.3;
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
 * Focused single-setting surface: a drag-dismissable bottom sheet on phones and
 * a centered modal from `sm` up. Content is sized to fit and scrolls internally
 * so the page behind never moves.
 */
export function SettingsSheet({
  open,
  onClose,
  title,
  description,
  footer,
  children,
}: SettingsSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Keep the page behind the sheet from scrolling under the user's finger.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
  }, [open]);

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
      const height = panelRef.current?.offsetHeight ?? 0;
      const isTap = Math.abs(traveled) < HANDLE_TAP_TRAVEL_PX;
      const draggedFarEnough = height > 0 && traveled > height * DISMISS_DRAG_FRACTION;
      const flickedDown = drag.velocity > DISMISS_VELOCITY && traveled > HANDLE_TAP_TRAVEL_PX;
      if (isTap || draggedFarEnough || flickedDown) onClose();
    },
    [onClose],
  );

  return (
    <div
      className={cn("fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6", !open && "pointer-events-none")}
      aria-hidden={!open}
    >
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        inert={!open || undefined}
        // Only honored mid-drag, so a stale offset can never affect a reopen.
        style={{ "--sheet-drag": `${dragging ? dragOffset : 0}px` } as React.CSSProperties}
        className={cn(
          "relative flex max-h-[88dvh] w-full flex-col border-slate-200 bg-white outline-none dark:border-slate-700 dark:bg-slate-950",
          "rounded-t-[1.75rem] border-t-2 shadow-[0_-12px_40px_rgb(15_23_42_/_0.3)]",
          "sm:max-w-lg sm:rounded-[1.75rem] sm:border-2 sm:shadow-[0_24px_60px_rgb(15_23_42_/_0.35)]",
          !dragging && "transition-[transform,opacity] duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          open
            ? "translate-y-[var(--sheet-drag,0px)] opacity-100 sm:translate-y-0"
            : "translate-y-full opacity-0 sm:translate-y-3",
          "motion-reduce:transition-none",
        )}
      >
        <button
          type="button"
          aria-label={`Drag or tap to dismiss ${title}`}
          className="flex w-full shrink-0 cursor-grab touch-none items-center justify-center pb-1 pt-3 active:cursor-grabbing sm:hidden"
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
          <span aria-hidden className="block h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
        </button>

        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-2 sm:px-6 sm:pt-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          >
            <span aria-hidden className="text-sm font-bold">
              ✕
            </span>
          </button>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6",
            footer ? "pb-3" : "pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6",
          )}
        >
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-slate-200 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 dark:border-slate-700 sm:px-6 sm:pb-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
