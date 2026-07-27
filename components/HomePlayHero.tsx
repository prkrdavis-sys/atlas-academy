"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { GLOBE_TAP_TRAVEL_THRESHOLD } from "@/components/globe/globe-scene";
import type { GlobeHandle } from "@/components/home/GlobeBackground";
import { getActiveGameSummaryParts, getMainPlayMode, resolvePlayMode } from "@/lib/game-setup";
import { hasPlayedDailyToday } from "@/lib/game-engine";
import { getStoredScope, scopedHref, scopeQuery, SCOPE_INFO } from "@/lib/scope";
import { playSound } from "@/lib/sound";
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
  globeHandleRef?: React.RefObject<GlobeHandle | null>;
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
  globeHandleRef,
  heroRef,
  className,
}: HomePlayHeroProps) {
  const router = useRouter();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const activeMode = profile ? getMainPlayMode(profile) : "mixed";
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

    playSound("play", profile);

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

  const mapHref = scope === "usa" ? "/map?view=usa" : "/map";

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

      <section ref={heroRef} className={cn("flex min-h-0 flex-1 flex-col", className)}>
        {profile ? (
          <>
            <header className="shrink-0 text-center">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white dark:drop-shadow-[0_2px_12px_rgb(0_0_0_/_0.6)] sm:text-3xl">
                Welcome back, {profile.name}!
              </h1>
            </header>

            {/* Grows to fill leftover viewport height so the stack below sits at the bottom. */}
            <GlobeDragZone href={mapHref} globeHandleRef={globeHandleRef} />

            <div className="mx-auto flex w-full max-w-xl shrink-0 flex-col gap-3 sm:gap-4">
              <button
                type="button"
                onClick={startPlay}
                className="play-glow-button relative flex min-h-16 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-emerald-400 to-teal-600 px-8 py-4 font-display text-xl font-extrabold text-white transition-transform hover:scale-[1.02] active:scale-[0.97] sm:min-h-[4.5rem] sm:text-2xl"
              >
                <span aria-hidden>▶</span>
                Play
              </button>

              <ModeLoadoutRow profile={profile} mode={activeMode} scope={scope} />

              <DailyChallengeCard
                scope={scope}
                dailyRun={dailyRun}
                playedToday={dailyPlayedToday}
              />

              <button
                type="button"
                onClick={rerollTagline}
                aria-label="Show another pro tip"
                className="group/protip w-full rounded-2xl border border-slate-900/10 bg-white/60 px-4 py-3 text-left text-sm leading-relaxed text-slate-600 backdrop-blur-md transition-colors hover:border-slate-900/25 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:border-white/25 dark:hover:bg-white/10"
              >
                <span className="font-bold text-slate-800 dark:text-slate-100">
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
            </div>
          </>
        ) : (
          <>
            <header className="shrink-0 text-center">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white dark:drop-shadow-[0_2px_12px_rgb(0_0_0_/_0.6)] sm:text-5xl">
                Learn world geography
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                {heroTagline ? (
                  <HomeHeroTaglineContent text={heroTagline} scope={scope} />
                ) : (
                  "\u00a0"
                )}
              </p>
            </header>

            <GlobeDragZone href="/map" globeHandleRef={globeHandleRef} />

            <div className="mx-auto w-full max-w-xl shrink-0">
              <Link
                href="/profiles"
                className="play-glow-button flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-400 to-teal-600 px-6 py-3.5 font-display text-base font-extrabold text-white transition-transform hover:scale-[1.02] active:scale-[0.97] sm:text-lg"
              >
                Create your first profile
              </Link>
            </div>
          </>
        )}
      </section>
    </>
  );
}

type GlobeDragZoneProps = {
  href: string;
  globeHandleRef?: React.RefObject<GlobeHandle | null>;
};

/**
 * The open space over the planet. Dragging it spins the globe in any direction
 * (via the imperative handle, since this overlay sits above the canvas), while
 * a plain tap, click, or keyboard activation opens the progress map. Touch
 * scrolling is disabled here so mobile gestures move the globe, not the page.
 */
function GlobeDragZone({ href, globeHandleRef }: GlobeDragZoneProps) {
  const dragRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);
  const traveledRef = useRef(0);
  const zoneRef = useRef<HTMLAnchorElement>(null);

  // iOS Safari can still scroll a parent even with touch-action: none unless
  // touchmove is cancelled with a non-passive listener while dragging.
  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;

    const onTouchMove = (event: TouchEvent) => {
      if (!dragRef.current) return;
      event.preventDefault();
    };

    zone.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => zone.removeEventListener("touchmove", onTouchMove);
  }, []);

  function endDrag(event: React.PointerEvent<HTMLAnchorElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    globeHandleRef?.current?.setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Already released.
    }
  }

  return (
    <Link
      ref={zoneRef}
      href={href}
      aria-label="Open your progress map"
      draggable={false}
      // Inline touchAction beats the global `a { touch-action: manipulation }`
      // rule so vertical drags stay on the globe, not the page.
      style={{ touchAction: "none" }}
      className="block min-h-[5rem] w-full flex-1 basis-0 cursor-grab touch-none select-none active:cursor-grabbing"
      onPointerDown={(event) => {
        dragRef.current = {
          pointerId: event.pointerId,
          lastX: event.clientX,
          lastY: event.clientY,
        };
        traveledRef.current = 0;
        globeHandleRef?.current?.setDragging(true);
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Dragging still works without capture; moves just stop at the edge.
        }
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const deltaX = event.clientX - drag.lastX;
        const deltaY = event.clientY - drag.lastY;
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
        traveledRef.current += Math.hypot(deltaX, deltaY);
        globeHandleRef?.current?.spinByPixels(deltaX, deltaY);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={(event) => {
        // A drag should spin the globe, not open the map.
        if (traveledRef.current >= GLOBE_TAP_TRAVEL_THRESHOLD) event.preventDefault();
      }}
    />
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
      className="flex min-h-12 w-full items-center gap-3 rounded-[1.25rem] border border-slate-900/10 bg-white/60 px-4 py-2.5 backdrop-blur-md transition-colors hover:border-slate-900/25 hover:bg-white/80 active:bg-white/90 dark:border-white/15 dark:bg-white/[0.07] dark:hover:border-white/40 dark:hover:bg-white/15 dark:active:bg-white/20"
    >
      <span aria-hidden className="shrink-0 text-base">
        ⚙️
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
        {summary}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-sm font-extrabold text-slate-900 dark:text-white">
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
      className="group flex items-center gap-3.5 rounded-2xl border border-amber-500/30 bg-white/60 p-4 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-white/80 dark:border-amber-300/25 dark:bg-white/[0.07] dark:hover:border-amber-300/60 dark:hover:bg-white/10 sm:p-5"
    >
      <DailyCalendarIcon
        variant="solid"
        className="w-12 shrink-0 drop-shadow-sm transition-transform group-hover:scale-105 sm:w-14"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
            Daily Challenge
          </h2>
          {dailyRun > 0 ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-400/20 px-2 py-0.5 text-xs font-extrabold tabular-nums text-orange-600 dark:text-orange-300">
              <span aria-hidden>🔥</span> {dailyRun}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
          {playedToday
            ? "Done for today — see how you stacked up"
            : "A fresh round of questions every day"}
        </p>
      </div>
      <span
        className={cn(
          "flex min-h-10 shrink-0 items-center justify-center rounded-xl px-4 font-display text-sm font-extrabold transition-transform group-hover:scale-105",
          playedToday
            ? "border-2 border-amber-500/40 bg-white/70 text-amber-700 dark:border-amber-300/40 dark:bg-white/10 dark:text-amber-200"
            : "bg-amber-500 text-white shadow-[0_3px_0_var(--color-amber-600)]",
        )}
      >
        {playedToday ? "Review" : "Play"}
      </span>
    </Link>
  );
}
