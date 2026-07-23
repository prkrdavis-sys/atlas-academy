"use client";

import Link from "next/link";
import { getScopedModeInfo, scopeQuery, scopeText } from "@/lib/scope";
import type { GameMode, GameScope } from "@/lib/types";
import { cn } from "@/lib/utils";

type GameModeTileProps = {
  mode: GameMode;
  scope: GameScope;
  style?: { tile: string; iconBg: string; hover: string };
  compact?: boolean;
  className?: string;
};

export function GameModeTile({ mode, scope, style, compact = false, className }: GameModeTileProps) {
  const modeInfo = getScopedModeInfo(mode, scope);
  if (!modeInfo) return null;

  return (
    <Link
      href={`/play/setup/${mode}${scopeQuery(scope)}`}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border-2 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:gap-4",
        compact ? "min-h-[3.75rem] p-3 sm:p-4" : "min-h-[5.25rem] p-4 sm:p-5",
        style?.tile ?? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
        style?.hover,
        className,
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110",
          compact
            ? "h-10 w-10 text-xl sm:h-11 sm:w-11 sm:text-2xl"
            : "h-12 w-12 text-2xl sm:h-14 sm:w-14 sm:text-3xl",
          style?.iconBg ?? "bg-slate-100 dark:bg-slate-800",
        )}
      >
        {modeInfo.icon}
      </span>
      <div className="min-w-0 flex-1">
        <h3
          className={cn(
            "font-display font-extrabold text-slate-900 dark:text-slate-100",
            compact && "text-sm sm:text-base",
          )}
        >
          {scopeText(modeInfo.title, scope)}
        </h3>
        {!compact ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-600 dark:text-slate-400 sm:text-sm">
            {scopeText(modeInfo.description, scope)}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
