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
import { ActiveGameSummary } from "@/components/ActiveGameSummary";
import { HomeHeroTaglineContent } from "@/components/HomeHeroTaglineContent";
import { HomeStreakHighlights } from "@/components/HomeStreakHighlights";
import { ProfileRequiredDialog } from "@/components/ProfileRequiredDialog";
import { RecentModeShortcuts } from "@/components/RecentModeShortcuts";
import { resolvePlayMode } from "@/lib/game-setup";
import { hasPlayedDailyToday } from "@/lib/game-engine";
import { scopeQuery, getStoredScope } from "@/lib/scope";
import { recordModeSelection, updateProfileSettings } from "@/lib/storage";
import type { GameMode, GameScope, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

type HomePlayHeroProps = {
  profile: Profile | null;
  scope: GameScope;
  onRefresh: () => void;
  streak: Parameters<typeof HomeStreakHighlights>[0]["streak"];
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
  const recentModes = profile?.settings.recentModes ?? [activeMode];
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

  const startPlay = useCallback(
    (modeOverride?: GameMode) => {
      if (!profile) {
        setShowProfileDialog(true);
        return;
      }

      const resolved = modeOverride
        ? { mode: modeOverride }
        : resolvePlayMode(profile, scope);

      if (resolved.fallbackMessage) {
        setToast(resolved.fallbackMessage);
        window.setTimeout(() => setToast(null), 4000);
      }

      updateProfileSettings(profile.id, { lastSelectedMode: resolved.mode });
      recordModeSelection(profile.id, resolved.mode);
      onRefresh();

      const activeScope = getStoredScope();
      router.push(`/play/${resolved.mode}${scopeQuery(activeScope)}?autostart=1`);
    },
    [profile, onRefresh, router],
  );

  const selectRecentMode = useCallback(
    (mode: GameMode) => {
      if (!profile) {
        setShowProfileDialog(true);
        return;
      }
      updateProfileSettings(profile.id, { lastSelectedMode: mode });
      recordModeSelection(profile.id, mode);
      onRefresh();
    },
    [profile, onRefresh],
  );

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

      <section
        ref={heroRef}
        className={cn(
          "relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-700 p-5 text-white shadow-[0_16px_40px_rgb(15_118_110_/_0.22)] sm:p-10",
          className,
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 select-none overflow-hidden text-[8rem] opacity-15 sm:-right-10 sm:-top-14 sm:text-[11rem]"
        >
          🗺️
        </div>

        <div
          className={cn(
            "relative grid gap-5 sm:gap-6",
            profile && "lg:grid-cols-[minmax(0,1fr)_16rem] lg:grid-rows-[auto_auto_auto] lg:items-start lg:gap-x-8 lg:gap-y-5",
          )}
        >
          <div
            className={cn(
              profile ? "min-w-0 lg:col-start-1 lg:row-start-1" : "max-w-xl",
            )}
          >
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
              {profile ? (
                <>
                  Welcome back,{" "}
                  <span className="whitespace-nowrap">Atlas Explorer</span>!
                </>
              ) : (
                "Learn world geography"
              )}
            </h1>
            <button
              type="button"
              onClick={rerollTagline}
              aria-label="Show another pro tip"
              className="group/protip mt-3 flex w-full max-w-2xl cursor-pointer gap-1.5 rounded-xl border border-transparent px-2 py-1.5 text-left text-sm leading-relaxed text-emerald-50 transition-[background-color,border-color,transform] duration-150 hover:border-white/25 hover:bg-white/10 active:scale-[0.99] active:bg-white/15 sm:max-w-3xl sm:text-base lg:max-w-none"
            >
              <span className="shrink-0 font-semibold transition-transform duration-150 group-hover/protip:scale-105 group-active/protip:scale-95">
                Pro tip{" "}
                <span aria-hidden className="inline-block transition-transform duration-150 group-hover/protip:-rotate-6 group-active/protip:rotate-12">
                  💡
                </span>{" "}
                -
              </span>
              <span
                key={heroTagline ?? "loading"}
                className="[animation:hero-tip-in_0.2s_ease-out]"
              >
                {heroTagline ? (
                  <HomeHeroTaglineContent text={heroTagline} scope={scope} />
                ) : (
                  "\u00a0"
                )}
              </span>
            </button>
          </div>

          {profile ? (
            <HomeStreakHighlights
              streak={streak}
              todayBest={todayBest}
              storedTodayBest={storedTodayBest}
              dailyRun={dailyRun}
              dailyCompletedToday={dailyCompletedToday}
              className="lg:col-start-2 lg:row-start-1 lg:max-w-[16rem] lg:justify-self-end lg:self-start"
            />
          ) : null}

          <div
            className={cn(
              "flex w-full flex-col items-stretch gap-4",
              profile && "lg:col-span-2 lg:row-start-2",
            )}
          >
            {profile ? (
              <>
                <div className="flex w-full flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => startPlay()}
                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-white px-8 py-4 font-display text-lg font-extrabold text-teal-800 shadow-[0_4px_0_rgb(255_255_255_/_0.45)] transition-transform hover:scale-[1.01] active:translate-y-1 active:shadow-none sm:min-h-16 sm:text-xl"
                  >
                    <span aria-hidden>▶</span>
                    Play
                  </button>

                  <ActiveGameSummary
                    profile={profile}
                    mode={activeMode}
                    scope={scope}
                    onClick={() => router.push(`/play/setup${scopeQuery(getStoredScope())}`)}
                  />
                </div>

                <div className="flex w-full gap-3">
                  <Link
                    href={`/play/setup${scopeQuery(getStoredScope())}`}
                    className="flex min-h-12 flex-1 min-w-0 items-center justify-center gap-2 rounded-[1.25rem] border-2 border-white/70 bg-white/15 px-3 py-3 text-center font-display text-sm font-extrabold text-white shadow-[0_3px_0_rgb(255_255_255_/_0.2)] backdrop-blur-sm transition-transform hover:scale-[1.01] hover:border-white hover:bg-white/25 active:translate-y-0.5 active:shadow-none sm:min-h-[3.25rem] sm:gap-2.5 sm:px-4 sm:text-base"
                  >
                    <span aria-hidden className="shrink-0 text-lg">
                      ⚙️
                    </span>
                    <span className="flex min-w-0 flex-col items-start text-left leading-tight">
                      <span>Choose your Journey</span>
                      <span className="text-[0.6875rem] font-semibold text-emerald-100/85 sm:text-xs">
                        Game mode selection
                      </span>
                    </span>
                  </Link>

                  <Link
                    href={`/play/daily-challenge${scopeQuery(scope)}?autostart=1`}
                    className="flex min-h-12 flex-1 min-w-0 items-center justify-center gap-2 rounded-[1.25rem] border-2 border-white/70 bg-white/15 px-3 py-3 text-center font-display text-sm font-extrabold text-white shadow-[0_3px_0_rgb(255_255_255_/_0.2)] backdrop-blur-sm transition-transform hover:scale-[1.01] hover:border-white hover:bg-white/25 active:translate-y-0.5 active:shadow-none sm:min-h-[3.25rem] sm:gap-2.5 sm:px-4 sm:text-base"
                    aria-label={`${dailyPlayedToday ? "Review today" : "Daily challenge"}. Daily challenge streak: ${dailyRun} ${dailyRun === 1 ? "day" : "days"}`}
                  >
                    <span aria-hidden className="shrink-0 text-lg">📅</span>
                    <span className="flex min-w-0 flex-col items-start text-left leading-tight">
                      <span>{dailyPlayedToday ? "Review today" : "Daily challenge"}</span>
                      <span className="text-[0.6875rem] font-semibold tabular-nums text-emerald-100/85 sm:text-xs">
                        <span aria-hidden>🔥</span> {dailyRun}
                      </span>
                    </span>
                  </Link>
                </div>
              </>
            ) : (
              <Link
                href="/profiles"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-display text-sm font-extrabold text-teal-800 shadow-[0_3px_0_rgb(255_255_255_/_0.45)] transition-transform hover:scale-[1.03] active:translate-y-[3px] active:shadow-none sm:text-base"
              >
                Create your first profile
              </Link>
            )}
          </div>

          {profile ? (
            <RecentModeShortcuts
              modes={recentModes}
              activeMode={activeMode}
              scope={scope}
              onSelect={selectRecentMode}
              className="lg:col-span-2"
            />
          ) : null}
        </div>
      </section>
    </>
  );
}
