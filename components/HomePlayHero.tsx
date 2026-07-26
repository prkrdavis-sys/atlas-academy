"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getGuestHomeHeroTagline,
  getGuestHomeHeroTaglineExcluding,
  pickHomeHeroTagline,
  pickHomeHeroTaglineExcluding,
  type HomeHeroTaglineContext,
} from "@/lib/home-hero-tagline";
import { DailyCalendarIcon } from "@/components/DailyCalendarIcon";
import { HomeHeroTaglineContent } from "@/components/HomeHeroTaglineContent";
import { ProfileRequiredDialog } from "@/components/ProfileRequiredDialog";
import { getActiveGameSummaryParts, resolvePlayMode } from "@/lib/game-setup";
import { hasPlayedDailyToday } from "@/lib/game-engine";
import { getStoredScope, scopedHref, scopeQuery, SCOPE_INFO } from "@/lib/scope";
import { recordModeSelection, updateProfileSettings } from "@/lib/storage";
import type { GameMode, GameScope, GlobalStreakSnapshot, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

type HomePlayHeroProps = {
  profile: Profile | null;
  scope: GameScope;
  onRefresh: () => void;
  streak: GlobalStreakSnapshot;
  todayBest: number;
  storedTodayBest: number;
  dailyRun: number;
  dailyCompletedToday: boolean;
  heroRef: React.RefObject<HTMLElement | null>;
  className?: string;
};

export function HomePlayHero({
  profile,
  scope,
  onRefresh,
  streak,
  todayBest,
  storedTodayBest,
  dailyRun,
  dailyCompletedToday,
  heroRef,
  className,
}: HomePlayHeroProps) {
  const router = useRouter();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const activeMode = profile?.settings.lastSelectedMode ?? "mixed";
  const dailyPlayedToday = profile
    ? hasPlayedDailyToday(profile.dailyChallengePlayedDates, scope)
    : false;

  const [heroTagline, setHeroTagline] = useState<string | null>(null);

  const taglineContext = useMemo<HomeHeroTaglineContext | null>(
    () =>
      profile
        ? {
            profile,
            scope,
            streak,
            todayBest,
            storedTodayBest,
            dailyRun,
            dailyCompletedToday,
          }
        : null,
    [profile, scope, streak, todayBest, storedTodayBest, dailyRun, dailyCompletedToday],
  );

  useEffect(() => {
    // Tagline is randomized client-side after mount to avoid hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeroTagline(
      taglineContext
        ? pickHomeHeroTagline(taglineContext)
        : getGuestHomeHeroTagline(scope),
    );
  }, [taglineContext, scope]);

  const rerollTagline = useCallback(() => {
    setHeroTagline((current) =>
      taglineContext
        ? pickHomeHeroTaglineExcluding(taglineContext, current ?? undefined)
        : getGuestHomeHeroTaglineExcluding(scope, current ?? undefined),
    );
  }, [taglineContext, scope]);

  const hideProfileDialog = useCallback(() => setShowProfileDialog(false), []);

  const startPlay = useCallback(() => {
    if (!profile) {
      setShowProfileDialog(true);
      return;
    }

    const resolved = resolvePlayMode(profile, scope);

    if (resolved.fallbackMessage) {
      setToast(resolved.fallbackMessage);
      window.setTimeout(() => setToast(null), 4000);
    }

    updateProfileSettings(profile.id, { lastSelectedMode: resolved.mode });
    recordModeSelection(profile.id, resolved.mode);
    onRefresh();

    const activeScope = getStoredScope();
    router.push(scopedHref(`/play/${resolved.mode}`, activeScope, { autostart: "1" }));
  }, [profile, scope, onRefresh, router]);

  const heroPanelClass =
    "relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-700 p-5 text-white shadow-[0_16px_40px_rgb(15_118_110_/_0.22)] sm:p-8";

  return (
    <>
      <ProfileRequiredDialog open={showProfileDialog} onClose={hideProfileDialog} />

      {toast ? (
        <div
          role="status"
          className="fixed inset-x-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-50 mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 shadow-lg dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-100"
        >
          {toast}
        </div>
      ) : null}

      <div className={cn("space-y-4 sm:space-y-5", className)}>
        <section ref={heroRef} className={heroPanelClass}>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-8 select-none overflow-hidden text-[8rem] opacity-15 sm:-right-10 sm:-top-14 sm:text-[11rem]"
          >
            🗺️
          </div>

          {profile ? (
            <div className="relative flex flex-col gap-3 sm:gap-4">
              <h1 className="hidden font-display text-3xl font-extrabold tracking-tight lg:block lg:text-4xl">
                Welcome back, <span className="whitespace-nowrap">Atlas Explorer</span>!
              </h1>

              <button
                type="button"
                onClick={startPlay}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-white px-8 py-4 font-display text-lg font-extrabold text-teal-800 shadow-[0_4px_0_rgb(255_255_255_/_0.45)] transition-transform hover:scale-[1.01] active:translate-y-1 active:shadow-none sm:min-h-16 sm:text-xl"
              >
                <span aria-hidden>▶</span>
                Play
              </button>

              <ModeLoadoutRow profile={profile} mode={activeMode} scope={scope} />
            </div>
          ) : (
            <div className="relative flex max-w-xl flex-col gap-5">
              <div>
                <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
                  Learn world geography
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-emerald-50 sm:text-base">
                  {heroTagline ? (
                    <HomeHeroTaglineContent text={heroTagline} scope={scope} />
                  ) : (
                    "\u00a0"
                  )}
                </p>
              </div>
              <Link
                href="/profiles"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-display text-sm font-extrabold text-teal-800 shadow-[0_3px_0_rgb(255_255_255_/_0.45)] transition-transform hover:scale-[1.03] active:translate-y-[3px] active:shadow-none sm:text-base"
              >
                Create your first profile
              </Link>
            </div>
          )}
        </section>

        {profile ? (
          <DailyChallengeCard
            scope={scope}
            dailyRun={dailyRun}
            playedToday={dailyPlayedToday}
          />
        ) : null}

        {profile ? (
          <button
            type="button"
            onClick={rerollTagline}
            aria-label="Show another pro tip"
            className="group/protip w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-left text-sm leading-relaxed text-slate-600 transition-colors hover:border-slate-300 hover:bg-white active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900"
          >
            <span className="font-bold text-slate-700 dark:text-slate-200">
              <span
                aria-hidden
                className="mr-1 inline-block transition-transform duration-150 group-hover/protip:-rotate-6"
              >
                💡
              </span>
              Pro tip:
            </span>{" "}
            <span key={heroTagline ?? "loading"} className="[animation:hero-tip-in_0.2s_ease-out]">
              {heroTagline ? (
                <HomeHeroTaglineContent text={heroTagline} scope={scope} />
              ) : (
                "\u00a0"
              )}
            </span>
          </button>
        ) : null}
      </div>
    </>
  );
}

type ModeLoadoutRowProps = {
  profile: Profile;
  mode: GameMode;
  scope: GameScope;
};

/**
 * Shows what pressing Play will start (mode, difficulty, round length) as a
 * single settings row, styled like an editable loadout beneath the Play button.
 */
function ModeLoadoutRow({ profile, mode, scope }: ModeLoadoutRowProps) {
  const parts = getActiveGameSummaryParts(profile, mode, scope);
  const scopeInfo = SCOPE_INFO[scope];
  const summary = [...parts, `${scopeInfo.icon} ${scopeInfo.shortLabel}`].join("  ·  ");

  return (
    <Link
      href={`/play/setup${scopeQuery(getStoredScope())}`}
      aria-label={`Current game: ${summary}. Change game mode and settings.`}
      className="flex min-h-12 w-full items-center gap-3 rounded-[1.25rem] border border-white/30 bg-white/15 px-4 py-2.5 backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-white/25 active:bg-white/30"
    >
      <span aria-hidden className="shrink-0 text-base">
        ⚙️
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-emerald-50">
        {summary}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-sm font-extrabold text-white">
        Change
        <span aria-hidden>›</span>
      </span>
    </Link>
  );
}

type DailyChallengeCardProps = {
  scope: GameScope;
  dailyRun: number;
  playedToday: boolean;
};

/** Daily challenge as a distinct quest card with its own streak and clear CTA. */
function DailyChallengeCard({ scope, dailyRun, playedToday }: DailyChallengeCardProps) {
  return (
    <Link
      href={scopedHref("/play/daily-challenge", scope, { autostart: "1" })}
      aria-label={`Daily challenge. ${playedToday ? "Completed today — review your results." : "Play today's challenge."} Daily run: ${dailyRun} ${dailyRun === 1 ? "day" : "days"}.`}
      className="group flex items-center gap-3.5 rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-amber-800 dark:from-amber-950/50 dark:via-orange-950/40 dark:to-amber-950/50 dark:hover:border-amber-600 sm:p-5"
    >
      <DailyCalendarIcon
        variant="solid"
        className="w-12 shrink-0 drop-shadow-sm transition-transform group-hover:scale-105 sm:w-14"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-slate-100 sm:text-lg">
            Daily Challenge
          </h2>
          {dailyRun > 0 ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-extrabold tabular-nums text-orange-700 dark:bg-orange-900/60 dark:text-orange-300">
              <span aria-hidden>🔥</span> {dailyRun}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
          {playedToday
            ? "Done for today — see how you stacked up"
            : "A fresh round of questions every day"}
        </p>
      </div>
      <span
        className={cn(
          "flex min-h-10 shrink-0 items-center justify-center rounded-xl px-4 font-display text-sm font-extrabold transition-transform group-hover:scale-105",
          playedToday
            ? "border-2 border-amber-300 bg-white/70 text-amber-800 dark:border-amber-700 dark:bg-slate-900/50 dark:text-amber-300"
            : "bg-amber-500 text-white shadow-[0_3px_0_var(--color-amber-600)]",
        )}
      >
        {playedToday ? "Review" : "Play"}
      </span>
    </Link>
  );
}
