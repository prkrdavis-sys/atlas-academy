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

export function MapScrollDownButton({
  targetId,
  reducedMotion = false,
  className,
}: MapScrollDownButtonProps) {
  const scrollToTarget = () => {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
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
