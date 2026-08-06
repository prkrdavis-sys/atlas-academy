"use client";

import Link from "next/link";
import { ModeBestFraction } from "@/components/ModeBestFraction";
import { useProfiles } from "@/components/ProfileProvider";
import { modeCountsTowardMapProgress } from "@/lib/map-progress";
import { getScopedModeInfo, scopeQuery, scopeText } from "@/lib/scope";
import type { GameMode, GameScope } from "@/lib/types";
import { cn } from "@/lib/utils";

type GameModeTileVariant = "featured" | "card" | "row";

function TileBadge({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {children}
    </span>
  );
}

function MasteryChip({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      title="Counts toward map mastery on Normal or Hard"
      className={cn(
        "shrink-0 rounded-full bg-amber-100 font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-950/70 dark:text-amber-300",
        size === "md"
          ? "px-2 py-0.5 text-[0.65rem]"
          : "px-1.5 py-0.5 text-[0.6rem]",
      )}
    >
      Mastery
    </span>
  );
}

type GameModeTileProps = {
  mode: GameMode;
  scope: GameScope;
  variant?: GameModeTileVariant;
  /** Short qualifier shown beside the title, e.g. "Twist" for flag variants. */
  badge?: string;
  className?: string;
};

export function GameModeTile({
  mode,
  scope,
  variant = "card",
  badge,
  className,
}: GameModeTileProps) {
  const { activeProfile: profile } = useProfiles();
  const modeInfo = getScopedModeInfo(mode, scope);
  if (!modeInfo) return null;

  const href = `/play/setup/${mode}${scopeQuery(scope)}`;
  const title = scopeText(modeInfo.title, scope);
  const description = scopeText(modeInfo.description, scope);
  const showsMastery = modeCountsTowardMapProgress(mode);

  switch (variant) {
    case "featured":
      return (
        <Link
          href={href}
          className={cn(
            "group flex w-full items-center gap-4 rounded-2xl border-2 border-teal-300 bg-gradient-to-br from-teal-50 to-emerald-50 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md dark:border-teal-700 dark:from-teal-950/60 dark:to-emerald-950/40 dark:hover:border-teal-500 sm:p-5",
            className,
          )}
        >
          <span
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-3xl transition-transform group-hover:scale-110 dark:bg-teal-900/60 sm:h-16 sm:w-16 sm:text-4xl"
          >
            {modeInfo.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-slate-100 sm:text-xl">
                {title}
              </h3>
              <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white dark:bg-teal-500">
                Recommended
              </span>
              {showsMastery ? <MasteryChip size="md" /> : null}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-600 dark:text-slate-400 sm:text-sm">
              {description}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ModeBestFraction
              profile={profile}
              mode={mode}
              scope={scope}
              className="text-[0.7rem] text-teal-700 dark:text-teal-300"
            />
            <span
              aria-hidden
              className="text-lg font-bold text-teal-600 transition-transform group-hover:translate-x-0.5 dark:text-teal-400"
            >
              →
            </span>
          </div>
        </Link>
      );

    case "card":
      return (
        <Link
          href={href}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl border border-white/80 bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-900/5 transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md hover:ring-teal-500/20 dark:border-slate-700/80 dark:bg-slate-800 dark:ring-white/5 dark:hover:border-teal-600/60 dark:hover:ring-teal-400/20 sm:px-4 sm:py-3.5",
            className,
          )}
        >
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl transition-transform group-hover:scale-110 dark:bg-slate-900/70 sm:h-12 sm:w-12"
          >
            {modeInfo.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="font-display text-sm font-extrabold text-slate-900 dark:text-slate-100 sm:text-base">
                {title}
              </h3>
              {badge ? <TileBadge>{badge}</TileBadge> : null}
              {showsMastery ? <MasteryChip /> : null}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ModeBestFraction profile={profile} mode={mode} scope={scope} />
            <span
              aria-hidden
              className="text-base font-bold text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-500 dark:text-slate-500 dark:group-hover:text-teal-400"
            >
              ›
            </span>
          </div>
        </Link>
      );

    case "row":
      return (
        <Link
          href={href}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800",
            className,
          )}
        >
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg dark:bg-slate-800"
          >
            {modeInfo.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate font-display text-sm font-bold text-slate-800 dark:text-slate-200">
                {title}
              </h3>
              {badge ? <TileBadge>{badge}</TileBadge> : null}
              {showsMastery ? <MasteryChip /> : null}
            </div>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ModeBestFraction profile={profile} mode={mode} scope={scope} />
            <span aria-hidden className="text-sm text-slate-400 dark:text-slate-500">
              ›
            </span>
          </div>
        </Link>
      );

    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}
