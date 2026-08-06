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
import { ModeBestFraction } from "@/components/ModeBestFraction";
import { ProfileRequiredDialog } from "@/components/ProfileRequiredDialog";
import { GLOBE_TAP_TRAVEL_THRESHOLD } from "@/components/globe/globe-scene";
import type { GlobeHandle } from "@/components/globe/InteractiveGlobe";
import { getActiveGameSummaryParts, getMainPlayMode, resolvePlayMode } from "@/lib/game-setup";
import { hasPlayedDailyToday } from "@/lib/game-engine";
import { GLOBE_MAP_HREF } from "@/lib/navigation";
import { getStoredScope, scopedHref, scopeQuery, SCOPE_INFO } from "@/lib/scope";
import { playSound } from "@/lib/sound";
import { recordModeSelection, updateProfileSettings } from "@/lib/storage";
import type { GameMode, GameScope, GlobalStreakSnapshot, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Time a tip stays fully visible so it can be read comfortably. */
const PRO_TIP_DWELL_MS = 11_000;
/** Fade-out / fade-in duration for tip swaps. */
const PRO_TIP_FADE_MS = 400;

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
  const [tipVisible, setTipVisible] = useState(true);
  const tipBusyRef = useRef(false);
  const tipTimersRef = useRef<number[]>([]);

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

  const clearTipTimers = useCallback(() => {
    for (const id of tipTimersRef.current) window.clearTimeout(id);
    tipTimersRef.current = [];
  }, []);

  useEffect(() => {
    // Tagline is randomized client-side after mount to avoid hydration mismatch.
    tipBusyRef.current = false;
    clearTipTimers();
    setTipVisible(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeroTagline(
      taglineContext
        ? pickHomeHeroTagline(taglineContext)
        : getGuestHomeHeroTagline(scope),
    );
  }, [taglineContext, scope, clearTipTimers]);

  useEffect(() => () => clearTipTimers(), [clearTipTimers]);

  const advanceTagline = useCallback(() => {
    if (tipBusyRef.current) return;
    tipBusyRef.current = true;
    clearTipTimers();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fadeMs = reduceMotion ? 0 : PRO_TIP_FADE_MS;

    setTipVisible(false);

    const swapId = window.setTimeout(() => {
      setHeroTagline((current) =>
        taglineContext
          ? pickHomeHeroTaglineExcluding(taglineContext, current ?? undefined)
          : getGuestHomeHeroTaglineExcluding(scope, current ?? undefined),
      );

      // Let the browser paint the new text at opacity 0 before fading in.
      const showId = window.setTimeout(() => {
        setTipVisible(true);
        tipBusyRef.current = false;
      }, reduceMotion ? 0 : 32);
      tipTimersRef.current.push(showId);
    }, fadeMs);
    tipTimersRef.current.push(swapId);
  }, [taglineContext, scope, clearTipTimers]);

  // Auto-cycle the pro tip while the signed-in home hero is showing.
  useEffect(() => {
    if (!profile || !heroTagline || !tipVisible) return;

    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      advanceTagline();
    }, PRO_TIP_DWELL_MS);

    return () => window.clearInterval(id);
  }, [profile, heroTagline, tipVisible, advanceTagline]);

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
        data-home-default
        className={cn("relative flex min-h-full flex-col", className)}
      >
        {profile ? (
          <>
            {/* Welcome sits over the globe so the upper ~60% stays open. */}
            <header className="pointer-events-none absolute inset-x-0 top-0 z-10 shrink-0 text-center">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white dark:drop-shadow-[0_2px_12px_rgb(0_0_0_/_0.6)] sm:text-3xl">
                Welcome back, {profile.name}!
              </h1>
            </header>

            <DailyChallengeBadge
              scope={scope}
              dailyRun={dailyRun}
              playedToday={dailyPlayedToday}
              completedToday={dailyCompletedToday}
            />

            <GlobeDragZone href={GLOBE_MAP_HREF} globeHandleRef={globeHandleRef} />

            {/* Hero actions stay in the lower 40% so more of the globe shows. */}
            <div className="mx-auto flex h-[40%] min-h-0 w-full max-w-xl shrink-0 flex-col justify-end gap-2 overflow-x-hidden overflow-y-auto overscroll-contain sm:gap-2.5">
              <button
                type="button"
                onClick={startPlay}
                className="play-glow-button relative flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-emerald-400 to-teal-600 px-8 py-3.5 font-display text-xl font-extrabold text-white transition-transform hover:scale-[1.02] active:scale-[0.97] sm:min-h-16 sm:text-2xl"
              >
                <span aria-hidden>▶</span>
                Play
              </button>

              <ModeLoadoutRow profile={profile} mode={activeMode} scope={scope} />

              <button
                type="button"
                onClick={advanceTagline}
                aria-label="Show another pro tip"
                className="group/protip w-full rounded-2xl border border-slate-900/10 bg-white/60 px-3.5 py-2.5 text-left text-sm leading-snug text-slate-600 backdrop-blur-md transition-colors hover:border-slate-900/25 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:border-white/25 dark:hover:bg-white/10"
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
                <span
                  aria-live="polite"
                  className={cn(
                    "inline transition-[opacity,transform] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                    tipVisible
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1 opacity-0",
                  )}
                >
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
            <header className="pointer-events-none absolute inset-x-0 top-0 z-10 shrink-0 text-center">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white dark:drop-shadow-[0_2px_12px_rgb(0_0_0_/_0.6)] sm:text-5xl">
                Learn world geography
              </h1>
              <p className="pointer-events-auto mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                {heroTagline ? (
                  <HomeHeroTaglineContent text={heroTagline} scope={scope} />
                ) : (
                  "\u00a0"
                )}
              </p>
            </header>

            <GlobeDragZone href={GLOBE_MAP_HREF} globeHandleRef={globeHandleRef} />

            <div className="mx-auto flex h-[40%] w-full max-w-xl shrink-0 flex-col justify-end">
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
      className="flex min-h-11 w-full items-center gap-3 rounded-[1.25rem] border border-slate-900/10 bg-white/60 px-3.5 py-2 backdrop-blur-md transition-colors hover:border-slate-900/25 hover:bg-white/80 active:bg-white/90 dark:border-white/15 dark:bg-white/[0.07] dark:hover:border-white/40 dark:hover:bg-white/15 dark:active:bg-white/20"
    >
      <span aria-hidden className="shrink-0 text-base">
        ⚙️
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
        {summary}
      </span>
      <ModeBestFraction profile={profile} mode={mode} scope={scope} />
      <span className="flex shrink-0 items-center gap-1 text-sm font-extrabold text-slate-900 dark:text-white">
        Change
        <span aria-hidden>›</span>
      </span>
    </Link>
  );
}

type DailyChallengeBadgeProps = {
  scope: GameScope;
  dailyRun: number;
  playedToday: boolean;
  completedToday: boolean;
};

/** Floating daily-challenge entry point that keeps the globe unobstructed. */
function DailyChallengeBadge({
  scope,
  dailyRun,
  playedToday,
  completedToday,
}: DailyChallengeBadgeProps) {
  const statusLabel = completedToday
    ? "Completed today. Review your results."
    : playedToday
      ? "In progress. Continue today's challenge."
      : "Play today's challenge.";

  return (
    <Link
      href={scopedHref("/play/daily-challenge", scope, { autostart: "1" })}
      aria-label={`Daily challenge. ${statusLabel} Daily run: ${dailyRun} ${dailyRun === 1 ? "day" : "days"}.`}
      title={`Daily challenge. ${statusLabel}`}
      className={cn(
        "daily-challenge-badge absolute right-2 top-[5.5rem] z-20 flex size-[4.75rem] items-center justify-center rounded-full border-2 p-1.5 transition-transform duration-200 hover:scale-105 focus-visible:scale-105 active:scale-95 sm:right-4 sm:top-24 sm:size-24 sm:p-2",
        completedToday
          ? "daily-challenge-badge-completed"
          : "daily-challenge-badge-incomplete",
      )}
    >
      <span
        aria-hidden
        className="daily-challenge-badge-surface relative flex size-[4.1rem] items-center justify-center rounded-full sm:size-[5.25rem]"
      >
        <DailyCalendarIcon
          variant="solid"
          className="w-[3.15rem] drop-shadow-[0_2px_2px_rgb(120_53_15_/_0.3)] sm:w-[4.2rem]"
        />
      </span>

      {dailyRun > 0 ? (
        <span
          aria-hidden
          className="absolute -bottom-1 -right-1 inline-flex min-h-6 min-w-7 items-center justify-center gap-0.5 rounded-full border-2 border-white bg-orange-500 px-1.5 font-display text-[0.7rem] font-black tabular-nums text-white shadow-md dark:border-slate-900 sm:-bottom-1.5 sm:-right-1.5 sm:min-h-7 sm:min-w-8 sm:text-xs"
        >
          <span>🔥</span>
          {dailyRun}
        </span>
      ) : null}
    </Link>
  );
}
