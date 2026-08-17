"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type CoachMarkPlacement = "above" | "below";

type CoachMarkBubbleProps = {
  title: string;
  body: string;
  target: DOMRect;
  placement: CoachMarkPlacement;
  onDismiss: () => void;
};

const BUBBLE_GAP = 14;
const VIEWPORT_MARGIN = 12;
const CARET_SIZE = 10;

export function CoachMarkBubble({
  title,
  body,
  target,
  placement,
  onDismiss,
}: CoachMarkBubbleProps) {
  const titleId = useId();
  const bodyId = useId();
  const gotItRef = useRef<HTMLButtonElement>(null);
  const width = Math.min(320, Math.max(200, window.innerWidth - VIEWPORT_MARGIN * 2));
  const targetCenterX = target.left + target.width / 2;
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(targetCenterX - width / 2, window.innerWidth - width - VIEWPORT_MARGIN),
  );
  const caretLeft = Math.max(
    16,
    Math.min(targetCenterX - left - CARET_SIZE, width - 16 - CARET_SIZE * 2),
  );

  useEffect(() => {
    gotItRef.current?.focus();
  }, [title]);

  let top: number;
  let transform: string | undefined;
  switch (placement) {
    case "below":
      top = target.bottom + BUBBLE_GAP;
      transform = undefined;
      break;
    case "above":
      top = target.top - BUBBLE_GAP;
      transform = "translateY(-100%)";
      break;
    default: {
      const exhaustivePlacement: never = placement;
      return exhaustivePlacement;
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className="pointer-events-auto fixed z-[70] w-[min(20rem,calc(100vw-1.5rem))]"
      data-coach-bubble=""
      style={{
        left,
        top,
        width,
        transform,
      }}
    >
      <div className="relative rounded-2xl border-2 border-teal-200 bg-white px-4 pb-3.5 pt-3.5 shadow-[0_18px_40px_rgb(15_23_42_/_0.28)] dark:border-teal-800 dark:bg-slate-900">
        <span
          aria-hidden
          className={cn(
            "absolute h-3 w-3 rotate-45 border-teal-200 bg-white dark:border-teal-800 dark:bg-slate-900",
            placement === "below" && "top-[-7px] border-l-2 border-t-2",
            placement === "above" && "bottom-[-7px] border-b-2 border-r-2",
          )}
          style={{ left: caretLeft }}
        />
        <p
          id={titleId}
          className="font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-50"
        >
          {title}
        </p>
        <p
          id={bodyId}
          className="mt-1 text-sm leading-snug text-slate-600 dark:text-slate-300"
        >
          {body}
        </p>
        <Button
          ref={gotItRef}
          size="sm"
          className="mt-3 w-full"
          autoFocus
          data-coach-dismiss=""
          onPointerDown={(event) => {
            // Pointer-down dismisses even when iOS drops the following click
            // (button :active translate, or the overlay unmounting under the tap).
            event.preventDefault();
            event.stopPropagation();
            onDismiss();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDismiss();
          }}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
