"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HomePlayHero } from "@/components/HomePlayHero";
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
import { isMapRoute } from "@/lib/navigation";
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
import { useMapProgressDifficulty } from "@/lib/use-map-progress-difficulty";
import { cn } from "@/lib/utils";
import { supportsWebGL } from "@/lib/webgl";

type MapView = "globe" | GameScope;

const MAP_VIEW_STORAGE_KEY = "atlas-academy-map-view";

/** Keep in sync with the slide `duration-[420ms]` classes below. */
const SLIDE_DURATION_MS = 420;

const MAP_VIEW_INFO: Record<MapView, { icon: string; label: string }> = {
  globe: { icon: "🌐", label: "Globe" },
  world: { icon: "🌍", label: "World" },
  usa: { icon: "🇺🇸", label: "USA" },
};

/** Frosted chip chrome shared by the map pane's floating controls. */
const FLOATING_PANEL_CLASS =
  "pointer-events-auto rounded-xl border border-slate-200/60 bg-white/85 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/75";

// The globe stays mounted in the persistent (globe) layout, so this chunk
// loads exactly once for both the home hero and the map view.
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

function normalizeMapView(value: string | null): MapView | null {
  if (value === "globe" || value === "world" || value === "usa") return value;
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
 * The single page behind both `/` and `/map`: one persistent full-screen
 * globe, with the home hero and the map view as two panes of a horizontal
 * slider. Navigating between the routes slides the UI as if it were one page
 * while the planet underneath never remounts or moves.
 */
export function GlobeExperience() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeProfile, hydrated, refresh } = useProfiles();
  const profile = hydrated ? activeProfile : null;
  const mode: "home" | "map" = isMapRoute(pathname) ? "map" : "home";

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
  const { isDark, ready: themeReady } = useIsDark();
  const globeHandleRef = useRef<GlobeHandle | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const { scope } = useGameScope({ layoutAnchorRef: heroRef });

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

  // Returning home puts the stats sheet away and clears any selection.
  useEffect(() => {
    if (mode === "home") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatsOpen(false);
      setSelectedGlobePlace(null);
    }
  }, [mode]);

  const requestedView = paramView ?? storedView;
  // Devices without WebGL fall back to the 2D world map, with a small notice.
  const globeUnavailable = webglOk === false;
  const view: MapView | null =
    requestedView === "globe" && globeUnavailable ? "world" : requestedView;

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
      setSelectedGlobePlace(code);
      if (code === null) {
        setInitialPlaceDismissed(true);
        clearPlaceQueryParam();
      }
    },
    [clearPlaceQueryParam],
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
    () => (globeUnavailable ? ["world", "usa"] : ["globe", "world", "usa"]),
    [globeUnavailable],
  );

  // The globe canvas stays mounted at all times; it only hides (and parks its
  // frameloop) while a 2D map view covers the page. Hiding is delayed so the
  // planet stays visible under the pane while it slides in.
  const is2dView = mode === "map" && (view === "world" || view === "usa");
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

  // Panels + stats follow the selection: world summary by default, USA
  // regions while a state is selected.
  const panelScope: GameScope = is2dView
    ? (view as GameScope)
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
        active={globeLayerActive}
        selectedCode={mode === "map" ? activeGlobeSelection : null}
        initialPlaceCode={mode === "map" ? resolvedInitialPlace : null}
        onSelectPlace={handleGlobeSelectPlace}
        handleRef={globeHandleRef}
        className="fixed inset-0 z-0"
      />

      {/* Two panes of one page: [map | home]. The globe behind never moves. */}
      <div className="pointer-events-none relative z-10 min-h-0 w-full flex-1 overflow-hidden">
        <div
          className={cn(
            "flex h-full w-full transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
            mode === "home" ? "-translate-x-full" : "translate-x-0",
          )}
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
                      the 2D world map instead.
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

            {/* Map surface nav (left) + progress-track filter (right) — corners keep the globe clear. */}
            <div className="pointer-events-auto absolute left-3 top-3 z-10">
              <MapViewToggle view={view ?? "globe"} views={availableViews} onSelect={setView} />
            </div>
            <div className="pointer-events-auto absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
              <MapProgressDifficultySelector
                value={mapDifficulty}
                onChange={setMapDifficulty}
                className={cn(FLOATING_PANEL_CLASS, "rounded-2xl")}
              />
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

            {!is2dView ? (
              <>
                <p className="pointer-events-none absolute bottom-4 left-4 z-10 hidden max-w-44 text-xs font-medium leading-relaxed text-slate-600 drop-shadow-sm dark:text-slate-400 lg:block">
                  Drag to spin · scroll or pinch to zoom · tap a country or state for progress
                </p>

                {themeReady ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 flex items-end justify-center gap-2 px-4 sm:bottom-4">
                    <div
                      className={cn(
                        FLOATING_PANEL_CLASS,
                        "flex items-center px-2.5 py-1.5",
                      )}
                    >
                      <MapProgressFillLegend isDark={isDark} difficulty={mapDifficulty} />
                    </div>
                    <div className={cn(FLOATING_PANEL_CLASS, "flex items-center")}>
                      <MapStatsButton onClick={openStats} className="size-8 rounded-xl" />
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>

          {/* ---- Home pane ---- */}
          <section
            aria-label="Play"
            inert={mode !== "home" || undefined}
            className="pointer-events-auto relative flex h-full w-full shrink-0 flex-col overflow-hidden px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:pb-8 sm:pt-8"
          >
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
  );
}
