"use client";

import Link from "next/link";
import Panzoom from "@panzoom/panzoom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ContextMapSvg,
  loadContextMapTemplate,
  type ParsedContextMap,
} from "@/components/PlaceContextMap";
import { filterCountries, getCountryName } from "@/lib/countries";
import {
  continentToTemplateKey,
  getCountryCodeByMapPathId,
  getStateCodeByUsaMapPathId,
  type ContextMapTemplateKey,
} from "@/lib/context-maps";
import { buildLibraryDetailHref } from "@/lib/library";
import { computeFocusedViewBox, loadMapBoundsManifest, type MapBoundsManifest } from "@/lib/map-bounds";
import { getMapPalette, getProgressPathStyle } from "@/lib/map-colors";
import {
  buildUsaProgressFillMap,
  buildWorldProgressFillMap,
  createProgressPathStyleResolver,
  getPlaceCategoryCompletion,
  getPlaceMasteryLevel,
  MAP_PROGRESS_CATEGORY_INFO,
} from "@/lib/map-progress";
import {
  DIFFICULTY_LABELS,
  MAP_PROGRESS_CATEGORIES,
  MAP_PROGRESS_FILL_LEVELS,
  type Continent,
  type GameScope,
  type MapProgressCategory,
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

function MapProgressFillLegend({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
      <span className="font-semibold text-slate-700 dark:text-slate-300">Fill levels:</span>
      {MAP_PROGRESS_FILL_LEVELS.map((level) => {
        const style = getProgressPathStyle(level, isDark);
        return (
          <span key={level} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm border"
              style={{ backgroundColor: style.fill, borderColor: style.stroke }}
              aria-hidden
            />
            {level}/4
          </span>
        );
      })}
    </div>
  );
}

function formatPlaceProgressLabel(
  code: string,
  profile: Profile,
  difficulty: MapProgressDifficulty,
): string {
  const level = getPlaceMasteryLevel(code, profile, difficulty);
  return `${getCountryName(code)} · ${level}/4 categories`;
}

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

function StatsMapPlacePanel({
  code,
  profile,
  difficulty,
  scope,
}: {
  code: string;
  profile: Profile;
  difficulty: MapProgressDifficulty;
  scope: GameScope;
}) {
  const completion = getPlaceCategoryCompletion(code, profile, difficulty);
  const level = getPlaceMasteryLevel(code, profile, difficulty);
  const libraryHref = buildLibraryDetailHref(code, scope, "All");

  return (
    <div
        className="absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)] rounded-xl border border-slate-200/80 bg-white/95 p-2.5 shadow-lg backdrop-blur sm:max-w-xs dark:border-slate-600 dark:bg-slate-900/95"
    >
      <p className="font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
        {getCountryName(code)}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
        {level}/4 categories · {DIFFICULTY_LABELS[difficulty]}
      </p>
      <ul className="mt-2 grid grid-cols-2 gap-1.5" aria-label="Completed categories">
        {MAP_PROGRESS_CATEGORIES.map((category) => (
          <StatsMapCategoryStatus key={category} category={category} completed={completion[category]} />
        ))}
      </ul>
      <Link
        href={libraryHref}
        className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800 transition-colors hover:border-teal-400 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:border-teal-500 dark:hover:bg-teal-950"
      >
        Open in Library →
      </Link>
    </div>
  );
}

function StatsMapCategoryStatus({
  category,
  completed,
}: {
  category: MapProgressCategory;
  completed: boolean;
}) {
  const info = MAP_PROGRESS_CATEGORY_INFO[category];

  return (
    <li
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold leading-tight",
        completed
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
      )}
    >
      <span aria-hidden>{completed ? "✓" : "○"}</span>
      <span aria-hidden>{info.icon}</span>
      {info.label}
    </li>
  );
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
              <StatsMapPlacePanel
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
