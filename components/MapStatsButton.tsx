"use client";

import { PANZOOM_EXCLUDE_CLASS } from "@/lib/map-colors";
import { cn } from "@/lib/utils";

function DoubleChevronUpIcon({ className }: { className?: string }) {
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
      <path d="M7 16l5-5 5 5" />
      <path d="M7 11l5-5 5 5" />
    </svg>
  );
}

type MapStatsButtonProps = {
  onClick: () => void;
  className?: string;
};

/** Double-chevron control beside the mastery legend that pulls up the map stats sheet. */
export function MapStatsButton({ onClick, className }: MapStatsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Show map stats"
      aria-haspopup="dialog"
      className={cn(
        PANZOOM_EXCLUDE_CLASS,
        "inline-flex shrink-0 items-center justify-center text-slate-700 transition-colors",
        "hover:bg-teal-50 hover:text-teal-800",
        "dark:text-slate-200 dark:hover:bg-teal-950/50 dark:hover:text-teal-100",
        className,
      )}
    >
      <DoubleChevronUpIcon className="h-5 w-5" />
    </button>
  );
}
