"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supportsWebGL } from "@/components/globe/globe-scene";
import { MapPageProgressPanel } from "@/components/MapPageProgressPanel";
import { MapProgressDifficultySelector } from "@/components/PlaceMapProgressPanel";
import { useProfiles } from "@/components/ProfileProvider";
import { resolvePlaceCodeFromParam } from "@/lib/context-maps";
import { isStateCode } from "@/lib/scope";
import type { GameScope, MapProgressDifficulty } from "@/lib/types";
import { useGlobeUsMode } from "@/lib/use-globe-us-mode";
import { cn } from "@/lib/utils";

type MapView = "globe" | GameScope;

const MAP_VIEW_STORAGE_KEY = "atlas-academy-map-view";
const MAP_STATS_PANEL_ID = "map-page-stats";

const MAP_VIEW_INFO: Record<MapView, { icon: string; label: string }> = {
  globe: { icon: "🌐", label: "Globe" },
  world: { icon: "🌍", label: "World" },
  usa: { icon: "🇺🇸", label: "USA" },
};

const InteractiveProgressMap = dynamic(
  () => import("@/components/InteractiveProgressMap").then((module) => module.InteractiveProgressMap),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[2/1] animate-pulse rounded-[1.75rem] border-2 border-slate-200 bg-slate-200/60 dark:border-slate-700 dark:bg-slate-700/60" />
    ),
  },
);

const InteractiveGlobe = dynamic(() => import("@/components/globe/InteractiveGlobe"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-200/60 dark:bg-slate-800/60" />,
});

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
      className="inline-flex shrink-0 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800"
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
                ? "bg-white text-teal-800 shadow-sm dark:bg-slate-900 dark:text-teal-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            )}
          >
            {info.icon} {info.label}
          </button>
        );
      })}
    </div>
  );
}

export function MapPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeProfile, hydrated } = useProfiles();
  const profile = hydrated ? activeProfile : null;
  const initialPlaceCode = searchParams.get("place");
  const resolvedInitialPlace = useMemo(
    () => resolvePlaceCodeFromParam(initialPlaceCode) ?? null,
    [initialPlaceCode],
  );
  const paramView = useMemo(() => resolveMapViewFromParams(searchParams), [searchParams]);
  const [storedView, setStoredView] = useState<MapView | null>(null);
  const [mapDifficulty, setMapDifficulty] = useState<MapProgressDifficulty>("medium");
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [showGlobeFallbackNotice, setShowGlobeFallbackNotice] = useState(false);
  const [selectedGlobePlace, setSelectedGlobePlace] = useState<string | null>(null);
  const { usMode } = useGlobeUsMode();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStoredView(getStoredMapView());
    setWebglOk(supportsWebGL());
  }, []);

  useEffect(() => {
    if (paramView === "globe") {
      localStorage.setItem(MAP_VIEW_STORAGE_KEY, "globe");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStoredView("globe");
    }
  }, [paramView]);

  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMapDifficulty(profile.settings.difficulty === "hard" ? "hard" : "medium");
    }
  }, [profile?.id, profile?.settings.difficulty]);

  const requestedView = paramView ?? storedView;
  // Devices without WebGL fall back to the 2D world map, with a small notice.
  const globeUnavailable = webglOk === false;
  const view: MapView | null =
    requestedView === "globe" && globeUnavailable ? "world" : requestedView;

  useEffect(() => {
    if (requestedView === "globe" && globeUnavailable) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowGlobeFallbackNotice(true);
    }
  }, [requestedView, globeUnavailable]);

  const activeGlobeSelection = selectedGlobePlace ?? resolvedInitialPlace;

  const setView = useCallback(
    (nextView: MapView) => {
      localStorage.setItem(MAP_VIEW_STORAGE_KEY, nextView);
      setStoredView(nextView);
      setSelectedGlobePlace(null);
      const params = new URLSearchParams(searchParams.toString());
      if (nextView === "globe") {
        params.delete("view");
      } else {
        params.set("view", nextView);
      }
      const query = params.toString();
      router.replace(query ? `/map?${query}` : "/map", { scroll: false });
    },
    [router, searchParams],
  );

  const availableViews = useMemo<readonly MapView[]>(
    () => (globeUnavailable ? ["world", "usa"] : ["globe", "world", "usa"]),
    [globeUnavailable],
  );

  // The panels below the globe follow the selection: world summary by
  // default, USA regions while a state is selected.
  const panelScope: GameScope =
    view === "globe"
      ? activeGlobeSelection && isStateCode(activeGlobeSelection)
        ? "usa"
        : "world"
      : view ?? "world";

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            🗺️ Map
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Click a country or U.S. state to see your progress and open its Library page.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <MapViewToggle view={view ?? "globe"} views={availableViews} onSelect={setView} />
          <MapProgressDifficultySelector value={mapDifficulty} onChange={setMapDifficulty} />
        </div>
      </header>

      {!profile ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Create a profile to track map progress. You can still explore the map without one.
        </p>
      ) : null}

      {showGlobeFallbackNotice ? (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
        >
          <span>
            The 3D globe needs WebGL, which this device doesn&apos;t support — showing the 2D world
            map instead.
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

      {view === "globe" ? (
        // Full-bleed: the globe breaks out of the page column and runs
        // edge-to-edge with no border, as a foreground subject.
        <section
          aria-label="Interactive 3D globe showing your map progress"
          className="relative left-1/2 w-screen -translate-x-1/2"
        >
          {/* Shorter than before: default camera is fully zoomed out, so a
              tall strip left empty bands above/below the planet. Still tall
              enough for the globe + atmosphere halo without clipping. */}
          <div className="h-[max(20rem,calc(100dvh-22rem))]">
            <InteractiveGlobe
              profile={profile}
              difficulty={mapDifficulty}
              usMode={usMode}
              selectedCode={selectedGlobePlace}
              initialPlaceCode={resolvedInitialPlace}
              onSelectPlace={setSelectedGlobePlace}
              statsScrollTargetId={MAP_STATS_PANEL_ID}
              className="h-full w-full"
            />
          </div>
          <p className="px-4 py-2.5 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
            Drag to spin · scroll or pinch to zoom · tap a country or state for progress
          </p>
        </section>
      ) : view ? (
        <InteractiveProgressMap
          key={view}
          scope={view}
          initialPlaceCode={initialPlaceCode}
          profile={profile}
          difficulty={mapDifficulty}
        />
      ) : (
        <div className="aspect-[2/1] animate-pulse rounded-[1.75rem] border-2 border-slate-200 bg-slate-200/60 dark:border-slate-700 dark:bg-slate-700/60" />
      )}

      <div id={MAP_STATS_PANEL_ID} className="scroll-mt-4">
        {profile ? (
          <MapPageProgressPanel
            scope={panelScope}
            profile={profile}
            difficulty={mapDifficulty}
          />
        ) : null}
      </div>
    </div>
  );
}
