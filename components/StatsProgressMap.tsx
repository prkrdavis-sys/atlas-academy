"use client";

import Panzoom from "@panzoom/panzoom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ContextMapSvg,
  loadContextMapTemplate,
  type ParsedContextMap,
} from "@/components/PlaceContextMap";
import {
  formatPlaceProgressLabel,
  MapProgressFillLegend,
  PlaceMapProgressPanel,
} from "@/components/PlaceMapProgressPanel";
import { filterCountries } from "@/lib/countries";
import {
  continentToTemplateKey,
  getCountryCodeByMapPathId,
  getStateCodeByUsaMapPathId,
  type ContextMapTemplateKey,
} from "@/lib/context-maps";
import { computeFocusedViewBox, loadMapBoundsManifest, type MapBoundsManifest } from "@/lib/map-bounds";
import { getMapPalette } from "@/lib/map-colors";
import {
  buildUsaProgressFillMap,
  buildWorldProgressFillMap,
  createProgressPathStyleResolver,
} from "@/lib/map-progress";
import {
  type Continent,
  type GameScope,
  type MapProgressDifficulty,
  type Profile,
  type Region,
} from "@/lib/types";
import { useIsDark } from "@/lib/use-is-dark";
import { cn } from "@/lib/utils";

type StatsProgressMapProps = {
  profile: Profile;
  difficulty: MapProgressDifficulty;
  scope: GameScope;
  templateKey: ContextMapTemplateKey;
  region?: Region;
  compact?: boolean;
  showFillLegend?: boolean;
  className?: string;
  ariaLabel: string;
};

function isPlayableMapPath(
  pathId: string,
  resolveCode: (pathId: string) => string | undefined,
  regionCodes?: Set<string>,
): boolean {
  const code = resolveCode(pathId);
  if (!code) return false;
  if (regionCodes && !regionCodes.has(code)) return false;
  return true;
}

export function StatsProgressMap({
  profile,
  difficulty,
  scope,
  templateKey,
  region,
  compact = false,
  showFillLegend = false,
  className,
  ariaLabel,
}: StatsProgressMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<ReturnType<typeof Panzoom> | null>(null);
  const { isDark, ready } = useIsDark();
  const [map, setMap] = useState<ParsedContextMap | null>(null);
  const [boundsManifest, setBoundsManifest] = useState<MapBoundsManifest | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

  const resolveCode = scope === "usa" ? getStateCodeByUsaMapPathId : getCountryCodeByMapPathId;

  const regionCodes = useMemo(() => {
    if (!region) return undefined;
    return new Set(
      filterCountries({ scope, continents: [region] }).map((place) => place.code),
    );
  }, [region, scope]);

  const visiblePaths = useMemo(() => {
    if (!map) return [];
    if (!regionCodes) return map.paths;
    return map.paths.filter((path) => isPlayableMapPath(path.id, resolveCode, regionCodes));
  }, [map, regionCodes, resolveCode]);

  const fillMap = useMemo(() => {
    if (visiblePaths.length === 0) return new Map<string, 0 | 1 | 2 | 3 | 4>();
    const pathIds = visiblePaths.map((path) => path.id);
    return scope === "usa"
      ? buildUsaProgressFillMap(profile, difficulty, pathIds)
      : buildWorldProgressFillMap(profile, difficulty, pathIds);
  }, [visiblePaths, profile, difficulty, scope]);

  const activePathId = selectedPathId ?? hoveredPathId;
  const selectedCode = useMemo(() => {
    if (!selectedPathId) return null;
    const code = resolveCode(selectedPathId);
    if (!code) return null;
    if (regionCodes && !regionCodes.has(code)) return null;
    return code;
  }, [selectedPathId, resolveCode, regionCodes]);

  const pathStyleResolver = useMemo(() => {
    const baseResolver = createProgressPathStyleResolver(fillMap, isDark);
    const palette = getMapPalette(isDark);
    return (pathId: string) => {
      const base = baseResolver(pathId);
      if (!base) {
        return activePathId === pathId ? palette.neighbor : null;
      }
      if (activePathId === pathId) {
        return {
          ...base,
          stroke: palette.highlight.stroke,
          strokeWidth: Math.max(base.strokeWidth, palette.highlight.strokeWidth),
        };
      }
      return base;
    };
  }, [fillMap, isDark, activePathId]);

  const focusedViewBox = useMemo(() => {
    if (!boundsManifest || visiblePaths.length === 0) return undefined;

    const shouldFocus = templateKey === "usa" || Boolean(compact && region);
    if (!shouldFocus) return undefined;

    const template = boundsManifest[templateKey];
    if (!template) return undefined;

    return computeFocusedViewBox(
      template,
      visiblePaths.map((path) => path.id),
      [],
      {
        aspectRatio: compact ? 2.5 : 1.6,
        paddingRatio: region ? 0.1 : 0.08,
        minSizeRatio: 0.03,
      },
    );
  }, [templateKey, boundsManifest, visiblePaths, compact, region]);

  const hoverLabel = useMemo(() => {
    if (selectedPathId || !hoveredPathId) return null;
    const code = resolveCode(hoveredPathId);
    if (!code) return null;
    if (regionCodes && !regionCodes.has(code)) return null;
    return formatPlaceProgressLabel(code, profile, difficulty);
  }, [selectedPathId, hoveredPathId, resolveCode, regionCodes, profile, difficulty]);

  const handlePathClick = useCallback(
    (pathId: string) => {
      if (!isPlayableMapPath(pathId, resolveCode, regionCodes)) return;
      setSelectedPathId((current) => (current === pathId ? null : pathId));
    },
    [resolveCode, regionCodes],
  );

  const handleBackgroundClick = useCallback(() => {
    setSelectedPathId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    setHoveredPathId(null);
    setSelectedPathId(null);

    Promise.all([loadContextMapTemplate(templateKey), loadMapBoundsManifest()])
      .then(([loaded, bounds]) => {
        if (!cancelled) {
          setMap(loaded);
          setBoundsManifest(bounds);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [templateKey]);

  useEffect(() => {
    const element = mapRef.current;
    if (!element || !map || !ready) return;

    panzoomRef.current?.destroy();
    panzoomRef.current = Panzoom(element, {
      maxScale: 16,
      minScale: 1,
      contain: "outside",
      cursor: "grab",
    });

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
    };
  }, [map, ready, templateKey]);

  return (
    <>
      {showFillLegend && !compact && ready ? <MapProgressFillLegend isDark={isDark} /> : null}
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-teal-100 bg-sky-50 touch-none dark:border-teal-900/50 dark:bg-slate-950",
          compact ? "aspect-[5/2] w-full min-h-[5.5rem]" : "aspect-[16/10] w-full",
          className,
        )}
      >
        {map && ready ? (
          <>
            <div ref={mapRef} className="h-full w-full origin-center">
              <ContextMapSvg
                map={{ ...map, paths: visiblePaths }}
                highlightIds={new Set()}
                neighborIds={new Set()}
                ariaLabel={ariaLabel}
                isDark={isDark}
                interactive
                viewBox={focusedViewBox}
                pathStyleResolver={pathStyleResolver}
                onPathClick={handlePathClick}
                onPathHover={setHoveredPathId}
                onBackgroundClick={handleBackgroundClick}
              />
            </div>
            {!compact ? (
              <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
                <button
                  type="button"
                  className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/95 px-2 text-sm font-black text-slate-700 shadow-sm backdrop-blur transition-colors hover:border-teal-400 hover:text-teal-700 dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:text-teal-300"
                  aria-label="Zoom out"
                  onClick={() => panzoomRef.current?.zoomOut()}
                >
                  −
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/95 px-2 text-sm font-black text-slate-700 shadow-sm backdrop-blur transition-colors hover:border-teal-400 hover:text-teal-700 dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:text-teal-300"
                  aria-label="Zoom in"
                  onClick={() => panzoomRef.current?.zoomIn()}
                >
                  +
                </button>
                <button
                  type="button"
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur transition-colors hover:border-teal-400 hover:text-teal-700 dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:text-teal-300"
                  onClick={() => panzoomRef.current?.reset()}
                >
                  Reset
                </button>
              </div>
            ) : null}
            {hoverLabel ? (
              <div
                className="pointer-events-none absolute bottom-2 left-2 rounded-lg bg-slate-900/85 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                role="status"
                aria-live="polite"
              >
                {hoverLabel}
              </div>
            ) : null}
            {selectedCode ? (
              <PlaceMapProgressPanel
                code={selectedCode}
                profile={profile}
                difficulty={difficulty}
                scope={scope}
              />
            ) : null}
          </>
        ) : loadFailed ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            Map unavailable
          </div>
        ) : (
          <div className="h-full animate-pulse bg-slate-200/60 dark:bg-slate-700/60" aria-hidden />
        )}
      </div>
    </>
  );
}

export function getStatsMapTemplateKey(scope: GameScope, region?: Region): ContextMapTemplateKey {
  if (region && scope === "world") {
    return continentToTemplateKey(region as Continent);
  }
  return scope === "usa" ? "usa" : "world";
}
