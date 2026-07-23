"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useProfiles } from "@/components/ProfileProvider";
import { MapProgressDifficultySelector } from "@/components/PlaceMapProgressPanel";
import { resolvePlaceCodeFromParam } from "@/lib/context-maps";
import { isStateCode } from "@/lib/scope";
import type { GameScope, MapProgressDifficulty } from "@/lib/types";
import { cn } from "@/lib/utils";

type MapView = GameScope;

const MAP_VIEWS: MapView[] = ["world", "usa"];

const MAP_VIEW_INFO: Record<MapView, { icon: string; label: string }> = {
  world: { icon: "🌍", label: "World" },
  usa: { icon: "🇺🇸", label: "USA" },
};

const InteractiveProgressMap = dynamic(
  () => import("@/components/InteractiveProgressMap").then((module) => module.InteractiveProgressMap),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[16/9] animate-pulse rounded-[1.75rem] border-2 border-slate-200 bg-slate-200/60 dark:border-slate-700 dark:bg-slate-700/60 sm:aspect-[2/1]" />
    ),
  },
);

function resolveMapView(searchParams: URLSearchParams): MapView {
  const viewParam = searchParams.get("view");
  if (viewParam === "usa") return "usa";
  if (viewParam === "world") return "world";

  const place = resolvePlaceCodeFromParam(searchParams.get("place"));
  if (place && isStateCode(place)) return "usa";

  return "world";
}

function MapViewToggle({ view, onSelect }: { view: MapView; onSelect: (view: MapView) => void }) {
  return (
    <div
      className="inline-flex shrink-0 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800"
      role="group"
      aria-label="Choose map"
    >
      {MAP_VIEWS.map((option) => {
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
  const view = useMemo(() => resolveMapView(searchParams), [searchParams]);
  const [mapDifficulty, setMapDifficulty] = useState<MapProgressDifficulty>("medium");

  useEffect(() => {
    if (profile) {
      setMapDifficulty(profile.settings.difficulty === "hard" ? "hard" : "medium");
    }
  }, [profile?.id, profile?.settings.difficulty]);

  const setView = useCallback(
    (nextView: MapView) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextView === "world") {
        params.delete("view");
      } else {
        params.set("view", "usa");
      }
      const query = params.toString();
      router.replace(query ? `/map?${query}` : "/map", { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            🗺️ Map
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Explore every country and all 50 U.S. states. Pan and zoom to find a place, then click to
            see your map progress and jump to its Library entry.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <MapViewToggle view={view} onSelect={setView} />
          <MapProgressDifficultySelector value={mapDifficulty} onChange={setMapDifficulty} />
        </div>
      </header>

      {!profile ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Create a profile to track map progress. You can still explore the map without one.
        </p>
      ) : null}

      <InteractiveProgressMap
        key={view}
        scope={view}
        initialPlaceCode={initialPlaceCode}
        profile={profile}
        difficulty={mapDifficulty}
      />
    </div>
  );
}
