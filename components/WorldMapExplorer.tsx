"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Panzoom from "@panzoom/panzoom";
import { MapZoomControls } from "@/components/MapZoomControls";
import { ProgressMapOverlays } from "@/components/ProgressMapOverlays";
import {
  formatPlaceProgressLabel,
  MapProgressFillLegend,
} from "@/components/PlaceMapProgressPanel";
import {
  ContextMapSvg,
  loadContextMapTemplate,
  type ParsedContextMap,
} from "@/components/PlaceContextMap";
import { getCountryByCode } from "@/lib/countries";
import {
  getContextMapPathIds,
  getCountryCodeByMapPathId,
  getWorldMapPathIds,
  resolvePlaceCodeFromParam,
} from "@/lib/context-maps";
import { createInteractiveProgressPathStyleResolver, EMPTY_MAP_PATH_ID_SET } from "@/lib/map-interaction";
import { buildWorldProgressFillMap } from "@/lib/map-progress";
import type { Country, MapProgressDifficulty, Profile } from "@/lib/types";
import { useIsDark } from "@/lib/use-is-dark";
import { MAP_PANZOOM_OPTIONS } from "@/lib/map-panzoom";
import { focusWorldMapOnPaths } from "@/lib/world-map-focus";

type WorldMapExplorerProps = {
  initialPlaceCode?: string | null;
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
};

export function WorldMapExplorer({
  initialPlaceCode = null,
  profile,
  difficulty,
}: WorldMapExplorerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<ReturnType<typeof Panzoom> | null>(null);
  const hasInitialFocusRef = useRef(false);
  const [map, setMap] = useState<ParsedContextMap | null>(null);
  const [panzoomReady, setPanzoomReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);
  const { isDark, ready } = useIsDark();

  const fillMap = useMemo(() => {
    if (!map) return new Map<string, 0 | 1 | 2 | 3 | 4>();
    if (!profile) {
      return new Map(map.paths.map((path) => [path.id, 0 as const]));
    }
    return buildWorldProgressFillMap(
      profile,
      difficulty,
      map.paths.map((path) => path.id),
    );
  }, [map, profile, difficulty]);

  const pathStyleResolver = useMemo(
    () =>
      createInteractiveProgressPathStyleResolver(
        fillMap,
        isDark,
        selectedCountry?.code,
        hoveredPathId,
      ),
    [fillMap, isDark, selectedCountry, hoveredPathId],
  );

  const hoveredCountry = useMemo(() => {
    if (!hoveredPathId) return null;
    const code = getCountryCodeByMapPathId(hoveredPathId);
    return code ? getCountryByCode(code) ?? null : null;
  }, [hoveredPathId]);

  const hoverLabel = useMemo(() => {
    if (selectedCountry || !hoveredPathId) return null;
    const code = getCountryCodeByMapPathId(hoveredPathId);
    if (!code) return null;
    return formatPlaceProgressLabel(code, profile, difficulty);
  }, [selectedCountry, hoveredPathId, profile, difficulty]);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);

    loadContextMapTemplate("world")
      .then((loaded) => {
        if (!cancelled) setMap(loaded);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const element = mapRef.current;
    if (!element || !map) return;

    panzoomRef.current?.destroy();
    panzoomRef.current = Panzoom(element, MAP_PANZOOM_OPTIONS);
    setPanzoomReady(true);

    const container = containerRef.current;
    const onWheel = (event: WheelEvent) => {
      if (!panzoomRef.current) return;
      panzoomRef.current.zoomWithWheel(event);
    };
    container?.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      container?.removeEventListener("wheel", onWheel);
      panzoomRef.current?.destroy();
      panzoomRef.current = null;
      setPanzoomReady(false);
    };
  }, [map, ready]);

  useEffect(() => {
    if (!map || !panzoomReady || !panzoomRef.current || !containerRef.current || hasInitialFocusRef.current) {
      return;
    }

    const resolvedCode = resolvePlaceCodeFromParam(initialPlaceCode);
    if (!resolvedCode) return;

    const country = getCountryByCode(resolvedCode);
    if (!country) return;

    const pathIds = getWorldMapPathIds(country);
    const svg = mapRef.current?.querySelector("svg");
    if (!svg || pathIds.length === 0) return;

    setSelectedCountry(country);

    const panzoom = panzoomRef.current;
    const container = containerRef.current;

    const frame = requestAnimationFrame(() => {
      try {
        const focused = focusWorldMapOnPaths(svg, container, panzoom, pathIds);
        if (focused) {
          hasInitialFocusRef.current = true;
        }
      } catch {
        // Ignore focus failures; the map remains usable at the default view.
      }
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [initialPlaceCode, map, panzoomReady]);

  const handlePathClick = useCallback((pathId: string) => {
    const code = getCountryCodeByMapPathId(pathId);
    if (!code) return;
    const country = getCountryByCode(code);
    if (!country) return;
    setSelectedCountry((current) => (current?.code === country.code ? null : country));
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedCountry(null);
  }, []);

  const activeCountry = selectedCountry ?? hoveredCountry;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/85 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-extrabold text-slate-900 dark:text-slate-100 sm:text-lg">
            {activeCountry ? activeCountry.name : "Click a country to explore"}
          </p>
        </div>
        <MapZoomControls
          onZoomOut={() => panzoomRef.current?.zoomOut()}
          onZoomIn={() => panzoomRef.current?.zoomIn()}
          onReset={() => panzoomRef.current?.reset()}
        />
      </div>

      {ready ? (
        <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-700 sm:px-5">
          <MapProgressFillLegend isDark={isDark} />
        </div>
      ) : null}

      <div
        ref={containerRef}
        className="relative aspect-[16/9] w-full touch-none overflow-hidden bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950 sm:aspect-[2/1]"
      >
        {map && ready ? (
          <>
            <div ref={mapRef} className="h-full w-full origin-center">
              <ContextMapSvg
                map={map}
                highlightIds={EMPTY_MAP_PATH_ID_SET}
                neighborIds={EMPTY_MAP_PATH_ID_SET}
                ariaLabel="Interactive world map showing every country"
                isDark={isDark}
                interactive
                pathStyleResolver={pathStyleResolver}
                onPathClick={handlePathClick}
                onPathHover={setHoveredPathId}
                onBackgroundClick={handleBackgroundClick}
              />
            </div>
            <ProgressMapOverlays
              hoverLabel={hoverLabel}
              selectedCode={selectedCountry?.code ?? null}
              profile={profile}
              difficulty={difficulty}
              scope="world"
            />
          </>
        ) : loadFailed ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            World map unavailable
          </div>
        ) : (
          <div className="h-full animate-pulse bg-slate-200/60 dark:bg-slate-700/60" aria-hidden />
        )}
      </div>

      <p className="border-t border-slate-200 px-4 py-2.5 text-center text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Drag to pan · scroll or pinch to zoom · click a country for progress
      </p>
    </div>
  );
}
