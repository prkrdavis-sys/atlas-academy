"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type MouseEventHandler,
  type PointerEvent as ReactPointerEvent,
  type PointerEventHandler,
  type ReactNode,
} from "react";
import { HomeExploreSection } from "@/components/HomeExploreSection";
import { HomePlayHero } from "@/components/HomePlayHero";
import { ChallengeInviteBanner } from "@/components/social/ChallengeInviteBanner";
import { LibraryPageFallback } from "@/components/LibraryPageFallback";
import { MapStatsButton } from "@/components/MapStatsButton";
import { MapStatsSheet } from "@/components/MapStatsSheet";
import { MapZoomControls } from "@/components/MapZoomControls";
import {
  MapProgressDifficultySelector,
  MapProgressFillLegend,
} from "@/components/PlaceMapProgressPanel";
import { useProfiles } from "@/components/ProfileProvider";
import type { GlobeHandle } from "@/components/globe/InteractiveGlobe";
import { resolvePlaceCodeFromParam } from "@/lib/context-maps";
import { getDailyChallengeRun, hasCompletedDailyToday } from "@/lib/game-engine";
import { isExploreRoute, isMapRoute } from "@/lib/navigation";
import { isStateCode } from "@/lib/scope";
import {
  getGlobalStreakOrZero,
  getTodayBestStreakDisplay,
  getTodayBestStreakOrZero,
} from "@/lib/stats-helpers";
import type { GameScope } from "@/lib/types";
import { useGameScope } from "@/lib/use-game-scope";
import { useGlobeUsMode } from "@/lib/use-globe-us-mode";
import { useIsDark } from "@/lib/use-is-dark";
import { useLibraryBackground } from "@/lib/use-library-background";
import { useLibraryNavHref } from "@/lib/use-library-nav-href";
import { useMapProgressDifficulty } from "@/lib/use-map-progress-difficulty";
import { useShowMapProgress } from "@/lib/use-show-map-progress";
import { cn } from "@/lib/utils";
import { supportsWebGL } from "@/lib/webgl";

type MapView = "globe" | "usa";
type PaneMode = "map" | "home" | "library";
type SwipeAxis = "horizontal" | "vertical" | null;

const PANE_ORDER = ["map", "home", "library"] as const satisfies readonly PaneMode[];
const SWIPE_AXIS_LOCK_PX = 10;
const SWIPE_COMMIT_DISTANCE_PX = 56;
const SWIPE_COMMIT_FRACTION = 0.18;

const MAP_VIEW_STORAGE_KEY = "atlas-academy-map-view";

/** Keep in sync with the slide `duration-[480ms]` classes below. */
const SLIDE_DURATION_MS = 480;

const MAP_VIEW_INFO: Record<MapView, { icon: string; label: string }> = {
  globe: { icon: "🌐", label: "Globe" },
  usa: { icon: "🇺🇸", label: "USA" },
};

/** Frosted chip chrome shared by the map pane's floating controls. */
const FLOATING_PANEL_CLASS =
  "pointer-events-auto rounded-xl border border-slate-200/60 bg-white/85 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/75";

type SwipeGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  axis: SwipeAxis;
  captureTarget: HTMLElement | null;
};

/**
 * Taps on real controls must not start a pane-swipe. Capturing the pointer on
 * those targets (or suppressing the following click) breaks Next.js <Link>
 * navigation — including Daily Challenge and Leaderboard on the home pane.
 */
function isSwipeExcludedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-tab-swipe-ignore]")) return true;
  if (
    target.closest(
      'a[href], button, input, textarea, select, label, summary, [role="button"], [role="link"], [contenteditable="true"]',
    )
  ) {
    return true;
  }

  let current: Element | null = target;
  while (current) {
    const style = window.getComputedStyle(current);
    const isHorizontalScroller = style.overflowX === "auto" || style.overflowX === "scroll";
    if (isHorizontalScroller && current.scrollWidth > current.clientWidth + 1) return true;
    current = current.parentElement;
  }

  return false;
}

// The globe stays mounted in AppShell across Library / play routes, so this
// chunk loads once and the WebGL canvas parks (instead of remounting) while away.
const InteractiveGlobe = dynamic(() => import("@/components/globe/InteractiveGlobe"), {
  ssr: false,
});

const InteractiveProgressMap = dynamic(
  () => import("@/components/InteractiveProgressMap").then((module) => module.InteractiveProgressMap),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[2/1] animate-pulse rounded-[1.75rem] border-2 border-slate-200 bg-slate-200/60 dark:border-slate-700 dark:bg-slate-700/60" />
    ),
  },
);

const LibraryPageContent = dynamic(
  () => import("@/components/LibraryPageContent").then((module) => module.LibraryPageContent),
  {
    ssr: false,
    loading: () => <LibraryPageFallback />,
  },
);

function normalizeMapView(value: string | null): MapView | null {
  if (value === "globe" || value === "usa") return value;
  return null;
}

function getStoredMapView(): MapView {
  return normalizeMapView(localStorage.getItem(MAP_VIEW_STORAGE_KEY)) ?? "globe";
}

/** Explicit ?view= wins; ?place= opens the 3D globe focused on that place. */
function resolveMapViewFromParams(searchParams: URLSearchParams): MapView | null {
  const fromParam = normalizeMapView(searchParams.get("view"));
  if (fromParam) return fromParam;

  const place = resolvePlaceCodeFromParam(searchParams.get("place"));
  if (place) return "globe";

  return null;
}

function MapViewToggle({
  view,
  views,
  onSelect,
}: {
  view: MapView;
  views: readonly MapView[];
  onSelect: (view: MapView) => void;
}) {
  return (
    <div
      className={cn(FLOATING_PANEL_CLASS, "inline-flex shrink-0 rounded-2xl p-1")}
      role="group"
      aria-label="Choose map"
    >
      {views.map((option) => {
        const active = view === option;
        const info = MAP_VIEW_INFO[option];

        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => onSelect(option)}
            className={cn(
              "min-h-9 rounded-xl px-3 py-1.5 font-display text-sm font-extrabold transition-all",
              active
                ? "bg-teal-600 text-white shadow-sm dark:bg-teal-500 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100",
            )}
          >
            {info.icon} {info.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The single page behind `/`, `/map`, and `/library`: one persistent full-screen
 * globe, with the home hero, map view, and Library as panes of a horizontal
 * slider. The canvas is mounted from AppShell so it also survives Library and
 * play routes (hidden + frameloop parked). Navigating between home and map
 * slides the UI as if it were one page while the planet underneath never
 * remounts or moves.
 */
export function GlobeExperience({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeProfile, hydrated, refresh } = useProfiles();
  const profile = hydrated ? activeProfile : null;
  const isLibraryRoute = isExploreRoute(pathname);
  const isLibraryDetailRoute = isLibraryRoute && pathname !== "/library";
  const isGlobeExperienceRoute =
    pathname === "/" || isMapRoute(pathname) || isLibraryRoute;
  const mode: PaneMode = isMapRoute(pathname)
    ? "map"
    : isLibraryRoute
      ? "library"
      : "home";

  const initialPlaceCode = searchParams.get("place");
  const resolvedInitialPlace = useMemo(
    () => resolvePlaceCodeFromParam(initialPlaceCode) ?? null,
    [initialPlaceCode],
  );
  const paramView = useMemo(() => resolveMapViewFromParams(searchParams), [searchParams]);
  const [storedView, setStoredView] = useState<MapView | null>(null);
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [showGlobeFallbackNotice, setShowGlobeFallbackNotice] = useState(false);
  const [selectedGlobePlace, setSelectedGlobePlace] = useState<string | null>(null);
  /** Once the user clears a selection, don't revive the ?place= highlight. */
  const [initialPlaceDismissed, setInitialPlaceDismissed] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const { usMode } = useGlobeUsMode();
  const { mapDifficulty, setMapDifficulty } = useMapProgressDifficulty();
  const { enabled: showMapProgress } = useShowMapProgress();
  const { isDark, ready: themeReady } = useIsDark();
  const { opaque: libraryOpaque } = useLibraryBackground();
  const libraryHref = useLibraryNavHref();
  const globeHandleRef = useRef<GlobeHandle | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const swipeGestureRef = useRef<SwipeGesture | null>(null);
  const swipeNavigationTimerRef = useRef<number | null>(null);
  const swipeNavigationLockedRef = useRef(false);
  const suppressSwipeClickRef = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeDragging, setSwipeDragging] = useState(false);
  const [libraryWarmed, setLibraryWarmed] = useState(false);
  const [paneSliding, setPaneSliding] = useState(false);
  const wasGlobeRouteRef = useRef(isGlobeExperienceRoute);
  const heroRef = useRef<HTMLElement>(null);
  const { scope } = useGameScope({ layoutAnchorRef: heroRef });
  const paneIndex = PANE_ORDER.indexOf(mode);
  const prevPaneIndexRef = useRef(paneIndex);

  const getPaneHref = useCallback(
    (targetMode: PaneMode) => {
      switch (targetMode) {
        case "map":
          return "/map";
        case "home":
          return "/";
        case "library":
          return libraryHref;
        default: {
          const exhaustiveMode: never = targetMode;
          return exhaustiveMode;
        }
      }
    },
    [libraryHref],
  );

  const releaseSwipePointer = useCallback((pointerId: number, target: HTMLElement | null) => {
    if (!target) return;
    try {
      target.releasePointerCapture(pointerId);
    } catch {
      // The pointer may already have been released or cancelled.
    }
  }, []);

  const handleSwipePointerDown = useCallback<PointerEventHandler<HTMLElement>>(
    (event) => {
      if (!isGlobeExperienceRoute || swipeNavigationLockedRef.current) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (isSwipeExcludedTarget(event.target)) return;

      swipeGestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        axis: null,
        // Capture only after the gesture locks horizontal so plain taps on
        // links/buttons still receive their click / navigation.
        captureTarget: event.currentTarget,
      };
      suppressSwipeClickRef.current = false;
    },
    [isGlobeExperienceRoute],
  );

  const handleSwipePointerMove = useCallback<PointerEventHandler<HTMLElement>>(
    (event) => {
      const gesture = swipeGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;

      if (gesture.axis === null) {
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < SWIPE_AXIS_LOCK_PX) return;
        gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
        if (gesture.axis === "vertical") return;
        setSwipeDragging(true);
        try {
          gesture.captureTarget?.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture is an enhancement; the gesture still works without it.
        }
      }

      if (gesture.axis !== "horizontal") return;

      event.preventDefault();
      suppressSwipeClickRef.current = true;

      const paneWidth = sliderRef.current?.clientWidth || window.innerWidth;
      const movingToPrevious = deltaX > 0;
      const targetIndex = paneIndex + (movingToPrevious ? -1 : 1);
      const canMove = targetIndex >= 0 && targetIndex < PANE_ORDER.length;
      const clampedDelta = Math.max(-paneWidth, Math.min(paneWidth, deltaX));
      setSwipeOffset(canMove ? clampedDelta : clampedDelta * 0.2);
    },
    [paneIndex],
  );

  const finishSwipe = useCallback(
    (event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
      const gesture = swipeGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      swipeGestureRef.current = null;
      releaseSwipePointer(event.pointerId, gesture.captureTarget);

      const deltaX = event.clientX - gesture.startX;
      if (cancelled || gesture.axis !== "horizontal") {
        setSwipeDragging(false);
        setSwipeOffset(0);
        return;
      }

      suppressSwipeClickRef.current = true;
      setSwipeDragging(false);

      const paneWidth = sliderRef.current?.clientWidth || window.innerWidth;
      const movingToPrevious = deltaX > 0;
      const targetIndex = paneIndex + (movingToPrevious ? -1 : 1);
      const canMove = targetIndex >= 0 && targetIndex < PANE_ORDER.length;
      const commitDistance = Math.max(
        SWIPE_COMMIT_DISTANCE_PX,
        paneWidth * SWIPE_COMMIT_FRACTION,
      );

      if (!canMove || Math.abs(deltaX) < commitDistance) {
        setSwipeOffset(0);
        return;
      }

      const targetMode = PANE_ORDER[targetIndex];
      const targetHref = getPaneHref(targetMode);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      swipeNavigationLockedRef.current = true;

      if (reduceMotion) {
        setSwipeOffset(0);
        router.push(targetHref);
        return;
      }

      setSwipeOffset(movingToPrevious ? paneWidth : -paneWidth);
      swipeNavigationTimerRef.current = window.setTimeout(() => {
        swipeNavigationTimerRef.current = null;
        router.push(targetHref);
      }, SLIDE_DURATION_MS);
    },
    [getPaneHref, paneIndex, releaseSwipePointer, router],
  );

  const handleSwipePointerUp = useCallback<PointerEventHandler<HTMLElement>>(
    (event) => finishSwipe(event, false),
    [finishSwipe],
  );

  const handleSwipePointerCancel = useCallback<PointerEventHandler<HTMLElement>>(
    (event) => finishSwipe(event, true),
    [finishSwipe],
  );

  const handleSwipeClickCapture = useCallback<MouseEventHandler<HTMLElement>>(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (!suppressSwipeClickRef.current) return;
      suppressSwipeClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    [],
  );

  useEffect(() => {
    if (swipeNavigationTimerRef.current !== null) {
      window.clearTimeout(swipeNavigationTimerRef.current);
      swipeNavigationTimerRef.current = null;
    }
    swipeGestureRef.current = null;
    swipeNavigationLockedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSwipeDragging(false);
    setSwipeOffset(0);
  }, [isGlobeExperienceRoute, mode]);

  // Keep the library list mounted across Map / Play / Library once warmed so
  // tab slides do not remount ~250 place cards.
  useEffect(() => {
    if (!isGlobeExperienceRoute) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLibraryWarmed(false);
      return;
    }
    if (mode === "library" || isLibraryRoute) {
      setLibraryWarmed(true);
      return;
    }

    const warm = () => setLibraryWarmed(true);
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(warm, { timeout: 2200 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = window.setTimeout(warm, 900);
    return () => window.clearTimeout(timer);
  }, [isGlobeExperienceRoute, isLibraryRoute, mode]);

  useEffect(() => {
    if (prevPaneIndexRef.current === paneIndex) return;
    prevPaneIndexRef.current = paneIndex;
    setPaneSliding(true);
    const timer = window.setTimeout(() => setPaneSliding(false), SLIDE_DURATION_MS + 40);
    return () => window.clearTimeout(timer);
  }, [paneIndex]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStoredView(getStoredMapView());
    setWebglOk(supportsWebGL());
  }, []);

  useEffect(() => {
    // New deep-link → allow the incoming place to highlight again.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialPlaceDismissed(false);
    setSelectedGlobePlace(null);
  }, [resolvedInitialPlace]);

  useEffect(() => {
    if (paramView === "globe") {
      localStorage.setItem(MAP_VIEW_STORAGE_KEY, "globe");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStoredView("globe");
    }
  }, [paramView]);

  // Leaving Map puts the stats sheet away and clears any selection.
  // Do not reset the globe camera here — Map / Play / Library share one planet
  // and tab changes must leave its orientation and auto-spin alone.
  useEffect(() => {
    if (mode !== "map") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatsOpen(false);
      setSelectedGlobePlace(null);
    }
  }, [mode]);

  // Returning from a play route: clear map UI state only. The globe keeps
  // whatever framing / spin it had so navigation never fights the planet.
  useEffect(() => {
    const wasGlobeRoute = wasGlobeRouteRef.current;
    wasGlobeRouteRef.current = isGlobeExperienceRoute;
    if (wasGlobeRoute || !isGlobeExperienceRoute) return;

    setStatsOpen(false);
    setSelectedGlobePlace(null);
  }, [isGlobeExperienceRoute]);

  const requestedView = paramView ?? storedView;
  // Devices without WebGL fall back to the 2D USA map, with a small notice.
  const globeUnavailable = webglOk === false;
  const view: MapView | null =
    requestedView === "globe" && globeUnavailable ? "usa" : requestedView;

  useEffect(() => {
    if (mode === "map" && requestedView === "globe" && globeUnavailable) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowGlobeFallbackNotice(true);
    }
  }, [mode, requestedView, globeUnavailable]);

  const activeGlobeSelection =
    selectedGlobePlace ?? (initialPlaceDismissed ? null : resolvedInitialPlace);

  const clearPlaceQueryParam = useCallback(() => {
    if (!searchParams.has("place")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("place");
    const query = params.toString();
    router.replace(query ? `/map?${query}` : "/map", { scroll: false });
  }, [router, searchParams]);

  const handleGlobeSelectPlace = useCallback(
    (code: string | null) => {
      if (mode !== "map") return;
      setSelectedGlobePlace(code);
      if (code === null) {
        setInitialPlaceDismissed(true);
        clearPlaceQueryParam();
      }
    },
    [clearPlaceQueryParam, mode],
  );

  const setView = useCallback(
    (nextView: MapView) => {
      localStorage.setItem(MAP_VIEW_STORAGE_KEY, nextView);
      setStoredView(nextView);
      setSelectedGlobePlace(null);
      setInitialPlaceDismissed(true);
      const params = new URLSearchParams(searchParams.toString());
      if (nextView === "globe") {
        params.delete("view");
      } else {
        params.set("view", nextView);
      }
      params.delete("place");
      const query = params.toString();
      router.replace(query ? `/map?${query}` : "/map", { scroll: false });
    },
    [router, searchParams],
  );

  const availableViews = useMemo<readonly MapView[]>(
    () => (globeUnavailable ? ["usa"] : ["globe", "usa"]),
    [globeUnavailable],
  );

  // The globe canvas stays mounted at all times; it only hides (and parks its
  // frameloop) while away from Play/Map/Library or while a 2D map view covers the page.
  // Hiding for 2D is delayed so the planet stays visible under the pane while
  // it slides in.
  const is2dView = isGlobeExperienceRoute && mode === "map" && view === "usa";
  const [globeLayerActive, setGlobeLayerActive] = useState(true);
  useEffect(() => {
    if (!is2dView) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGlobeLayerActive(true);
      return;
    }
    const timer = setTimeout(() => setGlobeLayerActive(false), SLIDE_DURATION_MS + 80);
    return () => clearTimeout(timer);
  }, [is2dView]);

  const globeActive = isGlobeExperienceRoute && globeLayerActive;

  // Panels + stats follow the selection: world summary by default, USA
  // regions while a state is selected.
  const panelScope: GameScope = is2dView
    ? "usa"
    : activeGlobeSelection && isStateCode(activeGlobeSelection)
      ? "usa"
      : "world";

  const openStats = useCallback(() => setStatsOpen(true), []);
  const closeStats = useCallback(() => setStatsOpen(false), []);

  // Home hero data (lives here so the hero pane survives mode changes).
  const heroDifficulty = profile?.settings.difficulty ?? "medium";
  const globalStreak = getGlobalStreakOrZero(profile, heroDifficulty, scope);
  const todayBest = getTodayBestStreakDisplay(profile, heroDifficulty, scope);
  const storedTodayBest = getTodayBestStreakOrZero(profile, heroDifficulty, scope);
  const dailyRun = profile ? getDailyChallengeRun(profile.dailyChallengeCompletions, scope) : 0;
  const dailyCompletedToday = profile
    ? hasCompletedDailyToday(profile.dailyChallengeCompletions, scope)
    : false;

  return (
    <>
      <InteractiveGlobe
        profile={profile}
        difficulty={mapDifficulty}
        usMode={usMode}
        mode={mode}
        active={globeActive}
        selectedCode={isGlobeExperienceRoute && mode === "map" ? activeGlobeSelection : null}
        initialPlaceCode={isGlobeExperienceRoute && mode === "map" ? resolvedInitialPlace : null}
        onSelectPlace={handleGlobeSelectPlace}
        handleRef={globeHandleRef}
        className="fixed inset-0 z-0"
      />

      {isGlobeExperienceRoute ? (
        <>
          {/* Three panes of one page: [map | play | library]. The globe behind never moves. */}
          <div className="pointer-events-none relative z-10 min-h-0 w-full flex-1 overflow-hidden">
            <div
              ref={sliderRef}
              className={cn(
                "flex h-full w-full transform-gpu motion-reduce:transition-none",
                !swipeDragging &&
                  "transition-transform duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                (swipeDragging || paneSliding) && "will-change-transform",
              )}
              style={{
                transform: `translateX(calc(-${paneIndex * 100}% + ${swipeOffset}px))`,
              }}
            >
              {/* ---- Map pane ---- */}
              <section
                aria-label="Progress map"
                inert={mode !== "map" || undefined}
                className="pointer-events-none relative h-full w-full shrink-0"
              >
                {is2dView && view ? (
                  <div className="pointer-events-auto absolute inset-0 overflow-y-auto overscroll-contain bg-[var(--background)] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[4.5rem] sm:pb-8 sm:pt-16">
                    {showGlobeFallbackNotice ? (
                      <div
                        role="status"
                        className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
                      >
                        <span>
                          The 3D globe needs WebGL, which this device doesn&apos;t support — showing
                          the 2D USA map instead.
                        </span>
                        <button
                          type="button"
                          aria-label="Dismiss"
                          className="shrink-0 rounded-lg px-2 py-0.5 font-bold hover:bg-sky-100 dark:hover:bg-sky-900/60"
                          onClick={() => setShowGlobeFallbackNotice(false)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : null}
                    <InteractiveProgressMap
                      key={view}
                      scope={view as GameScope}
                      initialPlaceCode={initialPlaceCode}
                      profile={profile}
                      difficulty={mapDifficulty}
                      onOpenStats={openStats}
                    />
                  </div>
                ) : null}

                {/* Map surface nav + progress-track filter. One wrapping row so the
                    chips don't collide on narrow phones; corners stay clear on wider screens. */}
                <div
                  onPointerDown={handleSwipePointerDown}
                  onPointerMove={handleSwipePointerMove}
                  onPointerUp={handleSwipePointerUp}
                  onPointerCancel={handleSwipePointerCancel}
                  onClickCapture={handleSwipeClickCapture}
                  style={{ touchAction: "pan-y" }}
                  className="pointer-events-auto absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2"
                >
                  <MapViewToggle view={view ?? "globe"} views={availableViews} onSelect={setView} />
                  <div className="ml-auto flex flex-col items-end gap-2">
                    {showMapProgress ? (
                      <MapProgressDifficultySelector
                        value={mapDifficulty}
                        onChange={setMapDifficulty}
                        className={cn(FLOATING_PANEL_CLASS, "rounded-2xl")}
                      />
                    ) : null}
                    {!is2dView ? (
                      <MapZoomControls
                        variant="overlay"
                        className="flex-col"
                        onZoomIn={() => globeHandleRef.current?.zoomIn()}
                        onZoomOut={() => globeHandleRef.current?.zoomOut()}
                        onReset={() => globeHandleRef.current?.resetView()}
                      />
                    ) : null}
                  </div>
                </div>

                {!is2dView ? (
                  <>
                    <p className="pointer-events-none absolute bottom-4 left-4 z-10 hidden max-w-44 text-xs font-medium leading-relaxed text-slate-600 drop-shadow-sm dark:text-slate-400 lg:block">
                      {showMapProgress
                        ? "Drag to spin · scroll or pinch to zoom · tap a country or state for progress"
                        : "Drag to spin · scroll or pinch to zoom · tap a country or state"}
                    </p>

                    {themeReady ? (
                      <div
                        onPointerDown={handleSwipePointerDown}
                        onPointerMove={handleSwipePointerMove}
                        onPointerUp={handleSwipePointerUp}
                        onPointerCancel={handleSwipePointerCancel}
                        onClickCapture={handleSwipeClickCapture}
                        style={{ touchAction: "pan-y" }}
                        className="pointer-events-none absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 flex items-end justify-center gap-2 px-4 sm:bottom-4"
                      >
                        {showMapProgress ? (
                          <div
                            className={cn(
                              FLOATING_PANEL_CLASS,
                              "flex items-center px-2.5 py-1.5",
                            )}
                          >
                            <MapProgressFillLegend isDark={isDark} difficulty={mapDifficulty} />
                          </div>
                        ) : null}
                        <div className={cn(FLOATING_PANEL_CLASS, "flex items-center")}>
                          <MapStatsButton onClick={openStats} className="size-8 rounded-xl" />
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </section>

              {/* ---- Home pane ---- */}
              {/* Default hero fills the first viewport; explore scrolls in below. */}
              <section
                aria-label="Play"
                inert={mode !== "home" || undefined}
                onPointerDown={handleSwipePointerDown}
                onPointerMove={handleSwipePointerMove}
                onPointerUp={handleSwipePointerUp}
                onPointerCancel={handleSwipePointerCancel}
                onClickCapture={handleSwipeClickCapture}
                style={{ touchAction: "pan-y" }}
                className="pointer-events-auto relative h-full w-full shrink-0 overflow-y-auto overscroll-contain pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-8"
              >
                {/* Challenges pin under the app header; friend requests stay in inbox. */}
                <ChallengeInviteBanner />
                <div className="px-4 pt-5 sm:pt-8">
                  <HomePlayHero
                    profile={profile}
                    scope={scope}
                    onRefresh={refresh}
                    streak={globalStreak}
                    todayBest={todayBest}
                    storedTodayBest={storedTodayBest}
                    dailyRun={dailyRun}
                    dailyCompletedToday={dailyCompletedToday}
                    globeHandleRef={globeHandleRef}
                    heroRef={heroRef}
                  />
                  <HomeExploreSection
                    profile={profile}
                    scope={scope}
                    streak={globalStreak}
                    todayBest={todayBest}
                    dailyRun={dailyRun}
                    dailyCompletedToday={dailyCompletedToday}
                    active={mode === "home"}
                    onRefresh={refresh}
                    className="[content-visibility:auto] [contain-intrinsic-size:auto_48rem]"
                  />
                </div>
              </section>

              {/* ---- Library pane ---- */}
              <section
                aria-label="Library"
                inert={mode !== "library" || undefined}
                className={cn(
                  "pointer-events-auto relative h-full w-full shrink-0",
                  libraryOpaque ? "bg-[var(--background)]" : "bg-slate-950/[0.04]",
                )}
              >
                {/* Warm list keeps its own scrollport so Map/Play/detail swaps do not remount it. */}
                <div
                  data-library-list-scroll=""
                  className={cn(
                    "h-full overflow-y-auto overscroll-contain px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:pb-8 sm:pt-8",
                    isLibraryDetailRoute &&
                      "pointer-events-none invisible absolute inset-0",
                  )}
                  aria-hidden={isLibraryDetailRoute || undefined}
                  inert={isLibraryDetailRoute || undefined}
                  onPointerDown={isLibraryDetailRoute ? undefined : handleSwipePointerDown}
                  onPointerMove={isLibraryDetailRoute ? undefined : handleSwipePointerMove}
                  onPointerUp={isLibraryDetailRoute ? undefined : handleSwipePointerUp}
                  onPointerCancel={isLibraryDetailRoute ? undefined : handleSwipePointerCancel}
                  onClickCapture={isLibraryDetailRoute ? undefined : handleSwipeClickCapture}
                  style={{ touchAction: "pan-y" }}
                >
                  {libraryWarmed ? (
                    <Suspense fallback={<LibraryPageFallback />}>
                      <LibraryPageContent />
                    </Suspense>
                  ) : null}
                </div>

                {isLibraryDetailRoute ? (
                  <div
                    className="h-full overflow-y-auto overscroll-contain px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-0 sm:pb-8"
                    onPointerDown={handleSwipePointerDown}
                    onPointerMove={handleSwipePointerMove}
                    onPointerUp={handleSwipePointerUp}
                    onPointerCancel={handleSwipePointerCancel}
                    onClickCapture={handleSwipeClickCapture}
                    style={{ touchAction: "pan-y" }}
                  >
                    {children}
                  </div>
                ) : null}
              </section>
            </div>
          </div>

          <MapStatsSheet
            open={statsOpen && mode === "map"}
            onClose={closeStats}
            scope={panelScope}
            profile={profile}
            difficulty={mapDifficulty}
          />
        </>
      ) : null}
    </>
  );
}
