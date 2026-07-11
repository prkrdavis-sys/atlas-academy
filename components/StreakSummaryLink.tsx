"use client";

import Link from "next/link";
import type { GlobalStreakSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StreakSummaryLink({
  streak,
  href = "/stats",
  className,
}: {
  streak: GlobalStreakSnapshot;
  href?: string;
  className?: string;
}) {
  const { currentStreak, bestStreak } = streak;

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex flex-wrap items-center gap-2 transition-opacity hover:opacity-90 active:opacity-75",
        className,
      )}
      aria-label={`View stats. Current streak ${currentStreak}, best streak ${bestStreak}`}
    >
      <span
        title="Current streak"
        className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur sm:px-4 sm:py-2 sm:text-sm"
      >
        🔥 {currentStreak}
      </span>
      {bestStreak > 0 && (
        <span
          title="Best streak"
          className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur sm:px-4 sm:py-2 sm:text-sm"
        >
          🏆 {bestStreak}
        </span>
      )}
    </Link>
  );
}
