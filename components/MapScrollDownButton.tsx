"use client";

import { PANZOOM_EXCLUDE_CLASS } from "@/lib/map-colors";
import { cn } from "@/lib/utils";

function DoubleChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M7 8l5 5 5-5" />
      <path d="M7 13l5 5 5-5" />
    </svg>
  );
}

type MapScrollDownButtonProps = {
  targetId: string;
  reducedMotion?: boolean;
  className?: string;
};

/** Breathing room below the sticky app header when pinning the stats panel. */
const SCROLL_GAP_PX = 16;

function getStickyAppHeaderHeight(): number {
  const header = document.querySelector<HTMLElement>("header.sticky");
  return header?.getBoundingClientRect().height ?? 0;
}

export function MapScrollDownButton({
  targetId,
  reducedMotion = false,
  className,
}: MapScrollDownButtonProps) {
  const scrollToTarget = () => {
    const target = document.getElementById(targetId);
    if (!target) return;

    // Pin the Map Progress panel just under the sticky header — scrollIntoView
    // alone lands it under the chrome because the header is sticky, not in flow.
    const top =
      target.getBoundingClientRect().top +
      window.scrollY -
      getStickyAppHeaderHeight() -
      SCROLL_GAP_PX;
    const maxScrollY = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );

    window.scrollTo({
      top: Math.min(Math.max(0, top), maxScrollY),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <button
      type="button"
      onClick={scrollToTarget}
      aria-label="Scroll to map stats"
      className={cn(
        PANZOOM_EXCLUDE_CLASS,
        "inline-flex shrink-0 items-center justify-center text-slate-700 transition-colors",
        "hover:bg-teal-50 hover:text-teal-800",
        "dark:text-slate-200 dark:hover:bg-teal-950/50 dark:hover:text-teal-100",
        className,
      )}
    >
      <DoubleChevronDownIcon className="h-5 w-5" />
    </button>
  );
}
