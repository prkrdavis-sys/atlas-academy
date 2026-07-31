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
import {
  formatSvgViewBox,
  getMapOverviewViewBox,
  loadMapBoundsManifest,
} from "@/lib/map-bounds";
import { createInteractiveProgressPathStyleResolver, EMPTY_MAP_PATH_ID_SET } from "@/lib/map-interaction";
import { buildUsaProgressFillMap, buildWorldProgressFillMap } from "@/lib/map-progress";
import { MAP_PANZOOM_OPTIONS, MAP_ZOOM_BUTTON_STEP } from "@/lib/map-panzoom";
import type { Country, GameScope, MapProgressDifficulty, Profile } from "@/lib/types";
import { useIsDark } from "@/lib/use-is-dark";
import { cn } from "@/lib/utils";
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
  const [overviewViewBox, setOverviewViewBox] = useState<string | null>(null);
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
        difficulty,
        selectedPlace?.code,
        hoveredPathId,
      ),
    [fillMap, isDark, difficulty, selectedPlace, hoveredPathId],
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
    setOverviewViewBox(null);
    hasInitialFocusRef.current = false;

    Promise.all([loadContextMapTemplate(copy.templateKey), loadMapBoundsManifest()])
      .then(([loaded, manifest]) => {
        if (cancelled) return;
        const template = manifest[copy.templateKey];
        // USA artboard already frames AK/HI insets — keep it. World crops empty ocean.
        const overview =
          scope === "usa"
            ? ([template.viewBox[0], template.viewBox[1], template.viewBox[2], template.viewBox[3]] as const)
            : getMapOverviewViewBox(template, { aspectRatio: 2, paddingRatio: 0.02 });
        setOverviewViewBox(formatSvgViewBox(overview));
        setMap(loaded);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [copy.templateKey, scope]);

  useEffect(() => {
    const element = mapRef.current;
    if (!element || !map || !overviewViewBox) return;

    panzoomRef.current?.destroy();
    panzoomRef.current = Panzoom(element, MAP_PANZOOM_OPTIONS);
    setPanzoomReady(true);
    hasInitialFocusRef.current = false;

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
  }, [map, overviewViewBox, ready]);

  useEffect(() => {
    if (!map || !overviewViewBox || !panzoomReady || !panzoomRef.current || !containerRef.current) {
      return;
    }
    if (hasInitialFocusRef.current) return;

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
        // Ignore focus failures; the map remains usable at the overview.
      }
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [initialPlaceCode, map, overviewViewBox, panzoomReady, scope]);

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
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-700 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-extrabold text-slate-900 dark:text-slate-100 sm:text-lg">
            {activePlace ? activePlace.name : copy.emptyPrompt}
          </p>
          {ready ? (
            <MapProgressFillLegend
              isDark={isDark}
              difficulty={difficulty}
              className="mt-1.5"
            />
          ) : null}
        </div>
        <MapZoomControls
          onZoomOut={() => panzoomRef.current?.zoomOut({ step: MAP_ZOOM_BUTTON_STEP })}
          onZoomIn={() => panzoomRef.current?.zoomIn({ step: MAP_ZOOM_BUTTON_STEP })}
          onReset={() => {
            setSelectedPlace(null);
            panzoomRef.current?.reset();
          }}
        />
      </div>

      <ProgressMapContainer
        containerRef={containerRef}
        className={cn(
          "relative w-full touch-none overflow-hidden bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950",
          // Aspects match the overview viewBox so scale-1 fills edge-to-edge.
          scope === "usa" ? "aspect-[10/7]" : "aspect-[2/1]",
        )}
        hoverLabel={hoverLabel}
        selectedCode={selectedPlace?.code ?? null}
        profile={profile}
        difficulty={difficulty}
        scope={scope}
        inlinePanelClassName="px-4"
      >
        {map && overviewViewBox && ready ? (
          <div ref={mapRef} className="absolute inset-0 h-full w-full origin-center">
            <ContextMapSvg
              map={map}
              viewBox={overviewViewBox}
              highlightIds={EMPTY_MAP_PATH_ID_SET}
              neighborIds={EMPTY_MAP_PATH_ID_SET}
              ariaLabel={copy.ariaLabel}
              isDark={isDark}
              interactive
              includeMasteryFxDefs
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
