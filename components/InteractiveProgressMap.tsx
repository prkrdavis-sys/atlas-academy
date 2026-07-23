"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Panzoom from "@panzoom/panzoom";
import { MapZoomControls } from "@/components/MapZoomControls";
import { ProgressMapContainer } from "@/components/ProgressMapOverlays";
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
  getCountryCodeByMapPathId,
  getStateCodeByUsaMapPathId,
  getUsaMapPathIds,
  getWorldMapPathIds,
  resolvePlaceCodeFromParam,
} from "@/lib/context-maps";
import { createInteractiveProgressPathStyleResolver, EMPTY_MAP_PATH_ID_SET } from "@/lib/map-interaction";
import { buildUsaProgressFillMap, buildWorldProgressFillMap } from "@/lib/map-progress";
import { MAP_PANZOOM_OPTIONS } from "@/lib/map-panzoom";
import type { Country, GameScope, MapProgressDifficulty, Profile } from "@/lib/types";
import { useIsDark } from "@/lib/use-is-dark";
import { focusWorldMapOnPaths } from "@/lib/world-map-focus";

type InteractiveProgressMapProps = {
  scope: GameScope;
  initialPlaceCode?: string | null;
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
};

const SCOPE_COPY: Record<
  GameScope,
  {
    templateKey: "world" | "usa";
    ariaLabel: string;
    emptyPrompt: string;
    footerHint: string;
    loadFailedMessage: string;
  }
> = {
  world: {
    templateKey: "world",
    ariaLabel: "Interactive world map showing every country",
    emptyPrompt: "Click a country to explore",
    footerHint: "Drag to pan · scroll or pinch to zoom · click a country for progress",
    loadFailedMessage: "World map unavailable",
  },
  usa: {
    templateKey: "usa",
    ariaLabel: "Interactive map showing all 50 U.S. states",
    emptyPrompt: "Click a state to explore",
    footerHint: "Drag to pan · scroll or pinch to zoom · click a state for progress",
    loadFailedMessage: "USA map unavailable",
  },
};

export function InteractiveProgressMap({
  scope,
  initialPlaceCode = null,
  profile,
  difficulty,
}: InteractiveProgressMapProps) {
  const copy = SCOPE_COPY[scope];
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<ReturnType<typeof Panzoom> | null>(null);
  const hasInitialFocusRef = useRef(false);
  const [map, setMap] = useState<ParsedContextMap | null>(null);
  const [panzoomReady, setPanzoomReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Country | null>(null);
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);
  const { isDark, ready } = useIsDark();

  const resolveCodeFromPath = useCallback(
    (pathId: string) =>
      scope === "usa" ? getStateCodeByUsaMapPathId(pathId) : getCountryCodeByMapPathId(pathId),
    [scope],
  );

  const fillMap = useMemo(() => {
    if (!map) return new Map<string, 0 | 1 | 2 | 3 | 4>();
    if (!profile) {
      return new Map(map.paths.map((path) => [path.id, 0 as const]));
    }
    const buildFillMap = scope === "usa" ? buildUsaProgressFillMap : buildWorldProgressFillMap;
    return buildFillMap(profile, difficulty, map.paths.map((path) => path.id));
  }, [map, profile, difficulty, scope]);

  const pathStyleResolver = useMemo(
    () =>
      createInteractiveProgressPathStyleResolver(
        fillMap,
        isDark,
        selectedPlace?.code,
        hoveredPathId,
      ),
    [fillMap, isDark, selectedPlace, hoveredPathId],
  );

  const hoveredPlace = useMemo(() => {
    if (!hoveredPathId) return null;
    const code = resolveCodeFromPath(hoveredPathId);
    return code ? getCountryByCode(code) ?? null : null;
  }, [hoveredPathId, resolveCodeFromPath]);

  const hoverLabel = useMemo(() => {
    if (selectedPlace || !hoveredPathId) return null;
    const code = resolveCodeFromPath(hoveredPathId);
    if (!code) return null;
    return formatPlaceProgressLabel(code, profile, difficulty);
  }, [selectedPlace, hoveredPathId, resolveCodeFromPath, profile, difficulty]);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    setSelectedPlace(null);
    setHoveredPathId(null);
    hasInitialFocusRef.current = false;

    loadContextMapTemplate(copy.templateKey)
      .then((loaded) => {
        if (!cancelled) setMap(loaded);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [copy.templateKey]);

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

    const place = getCountryByCode(resolvedCode);
    if (!place) return;

    const pathIds = scope === "usa" ? getUsaMapPathIds(place) : getWorldMapPathIds(place);
    const svg = mapRef.current?.querySelector("svg");
    if (!svg || pathIds.length === 0) return;

    setSelectedPlace(place);

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
  }, [initialPlaceCode, map, panzoomReady, scope]);

  const handlePathClick = useCallback(
    (pathId: string) => {
      const code = resolveCodeFromPath(pathId);
      if (!code) return;
      const place = getCountryByCode(code);
      if (!place) return;
      setSelectedPlace((current) => (current?.code === place.code ? null : place));
    },
    [resolveCodeFromPath],
  );

  const handleBackgroundClick = useCallback(() => {
    setSelectedPlace(null);
  }, []);

  const activePlace = selectedPlace ?? hoveredPlace;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/85 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-extrabold text-slate-900 dark:text-slate-100 sm:text-lg">
            {activePlace ? activePlace.name : copy.emptyPrompt}
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

      <ProgressMapContainer
        containerRef={containerRef}
        className="relative aspect-[16/9] w-full touch-none overflow-hidden bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950 sm:aspect-[2/1]"
        hoverLabel={hoverLabel}
        selectedCode={selectedPlace?.code ?? null}
        profile={profile}
        difficulty={difficulty}
        scope={scope}
        inlinePanelClassName="px-4"
      >
        {map && ready ? (
          <div ref={mapRef} className="h-full w-full origin-center">
            <ContextMapSvg
              map={map}
              highlightIds={EMPTY_MAP_PATH_ID_SET}
              neighborIds={EMPTY_MAP_PATH_ID_SET}
              ariaLabel={copy.ariaLabel}
              isDark={isDark}
              interactive
              pathStyleResolver={pathStyleResolver}
              onPathClick={handlePathClick}
              onPathHover={setHoveredPathId}
              onBackgroundClick={handleBackgroundClick}
            />
          </div>
        ) : loadFailed ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            {copy.loadFailedMessage}
          </div>
        ) : (
          <div className="h-full animate-pulse bg-slate-200/60 dark:bg-slate-700/60" aria-hidden />
        )}
      </ProgressMapContainer>

      <p className="border-t border-slate-200 px-4 py-2.5 text-center text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {copy.footerHint}
      </p>
    </div>
  );
}
