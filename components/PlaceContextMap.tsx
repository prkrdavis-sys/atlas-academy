"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  countryHasContextMap,
  getContextMapAriaLabel,
  getContextMapPathIds,
  getContextMapTemplateKey,
  getContextMapTemplatePath,
  getNeighborContextMapPathIds,
  type ContextMapTemplateKey,
} from "@/lib/context-maps";
import {
  computeFocusedViewBox,
  loadMapBoundsManifest,
  type MapBoundsManifest,
} from "@/lib/map-bounds";
import {
  getMapPalette,
  getMapPathRole,
  parseMapViewBox,
  sortMapPathsForRender,
  type MapPathStyle,
} from "@/lib/map-colors";
import { attachMapPlaceTapHandlers } from "@/lib/map-interaction";
import { isStateCode } from "@/lib/scope";
import type { Country } from "@/lib/types";
import { useIsDark } from "@/lib/use-is-dark";
import { cn } from "@/lib/utils";

export type ParsedContextMap = {
  viewBox: string;
  paths: { id: string; d: string }[];
};

const templateCache = new Map<string, ParsedContextMap>();
const boundsCache: { data: MapBoundsManifest | null } = { data: null };

/**
 * Close-up framing around the mainland/core landmass (focusPaths), so overseas
 * territories do not force a tiny speck-in-ocean crop on Learn/Library cards.
 */
const CROP_OPTIONS = {
  compact: {
    aspectRatio: 2.2,
    paddingRatio: 0.35,
    useFocusBounds: true,
    completeSurroundings: true,
  },
  learn: {
    aspectRatio: 2.2,
    paddingRatio: 0.45,
    useFocusBounds: true,
    completeSurroundings: true,
  },
  hero: {
    aspectRatio: 1.6,
    paddingRatio: 0.4,
    useFocusBounds: true,
    completeSurroundings: true,
  },
} as const;

export async function loadContextMapTemplate(templateKey: string): Promise<ParsedContextMap> {
  const cached = templateCache.get(templateKey);
  if (cached) return cached;

  const response = await fetch(getContextMapTemplatePath(templateKey as ContextMapTemplateKey));
  if (!response.ok) {
    throw new Error(`Failed to load context map template: ${templateKey}`);
  }

  const svgText = await response.text();
  const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch?.[1] ?? "0 0 100 100";
  const paths: ParsedContextMap["paths"] = [];
  const pathRegex = /<path\s+id="([^"]+)"\s+d="([^"]+)"\s*\/?>/g;

  for (const match of svgText.matchAll(pathRegex)) {
    paths.push({ id: match[1], d: match[2] });
  }

  const parsed = { viewBox, paths };
  templateCache.set(templateKey, parsed);
  return parsed;
}

type PlaceContextMapProps = {
  country: Country;
  variant?: "compact" | "learn" | "hero";
  highlightNeighbors?: boolean;
  /** Crop and render only the featured country (no neighbors or other land). */
  countryOnly?: boolean;
  className?: string;
  interactive?: boolean;
};

type ContextMapSvgProps = {
  map: ParsedContextMap;
  highlightIds: Set<string>;
  neighborIds: Set<string>;
  className?: string;
  ariaLabel: string;
  isDark?: boolean;
  interactive?: boolean;
  viewBox?: string;
  /** Scale borders with geography (better for static zoomed crops). */
  scaleStrokesWithMap?: boolean;
  pathStyleResolver?: (pathId: string) => MapPathStyle | null;
  onPathClick?: (pathId: string) => void;
  onPathHover?: (pathId: string | null) => void;
  onBackgroundClick?: () => void;
};

function strokeWidthForViewBox(
  baseWidth: number,
  viewBoxWidth: number,
  viewBoxHeight: number,
  scaleWithMap: boolean,
): number {
  if (!scaleWithMap) return baseWidth;
  const diagonal = Math.hypot(viewBoxWidth, viewBoxHeight);
  // Thin map-space strokes so Natural Earth coastlines stay sharp when zoomed.
  return Math.max(diagonal * 0.00045 * (baseWidth / 0.35), diagonal * 0.00028);
}

export function ContextMapSvg({
  map,
  highlightIds,
  neighborIds,
  className,
  ariaLabel,
  isDark = false,
  interactive = false,
  viewBox,
  scaleStrokesWithMap = false,
  pathStyleResolver,
  onPathClick,
  onPathHover,
  onBackgroundClick,
}: ContextMapSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const onPathClickRef = useRef(onPathClick);
  const onBackgroundClickRef = useRef(onBackgroundClick);
  const palette = getMapPalette(isDark);
  const activeViewBox = viewBox ?? map.viewBox;
  const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = parseMapViewBox(activeViewBox);
  const orderedPaths = useMemo(
    () => sortMapPathsForRender(map.paths, highlightIds, neighborIds),
    [map.paths, highlightIds, neighborIds],
  );

  useEffect(() => {
    onPathClickRef.current = onPathClick;
    onBackgroundClickRef.current = onBackgroundClick;
  }, [onPathClick, onBackgroundClick]);

  useEffect(() => {
    if (!interactive || !onPathClick) return;
    const svg = svgRef.current;
    if (!svg) return;

    return attachMapPlaceTapHandlers(svg, {
      onPathClick: (pathId) => onPathClickRef.current?.(pathId),
      onBackgroundClick: onBackgroundClickRef.current
        ? () => onBackgroundClickRef.current?.()
        : undefined,
    });
  }, [interactive, onPathClick, onBackgroundClick]);

  return (
    <svg
      ref={svgRef}
      viewBox={activeViewBox}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={ariaLabel}
      shapeRendering="geometricPrecision"
    >
      <rect
        x={viewBoxX}
        y={viewBoxY}
        width={viewBoxWidth}
        height={viewBoxHeight}
        fill={palette.ocean}
      />
      {orderedPaths.map((path) => {
        const resolvedStyle = pathStyleResolver?.(path.id);
        const role = getMapPathRole(path.id, highlightIds, neighborIds);
        const style: MapPathStyle = resolvedStyle ?? palette[role];
        const strokeWidth = strokeWidthForViewBox(
          style.strokeWidth,
          viewBoxWidth,
          viewBoxHeight,
          scaleStrokesWithMap,
        );

        return (
          <path
            key={path.id}
            id={path.id}
            d={path.d}
            data-map-place={interactive ? path.id : undefined}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={strokeWidth}
            vectorEffect={scaleStrokesWithMap ? undefined : "non-scaling-stroke"}
            strokeLinejoin="round"
            strokeLinecap="round"
            className={
              interactive
                ? "cursor-pointer transition-[fill,stroke] duration-150"
                : undefined
            }
            onMouseEnter={interactive && onPathHover ? () => onPathHover(path.id) : undefined}
            onMouseLeave={interactive && onPathHover ? () => onPathHover(null) : undefined}
          />
        );
      })}
    </svg>
  );
}

export function PlaceContextMap({
  country,
  variant = "hero",
  highlightNeighbors = false,
  countryOnly = false,
  className,
  interactive = false,
}: PlaceContextMapProps) {
  const { isDark, ready } = useIsDark();
  const [map, setMap] = useState<ParsedContextMap | null>(() =>
    templateCache.get(getContextMapTemplateKey(country)) ?? null,
  );
  const [boundsManifest, setBoundsManifest] = useState<MapBoundsManifest | null>(
    () => boundsCache.data,
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const isState = isStateCode(country.code);
  const templateKey = getContextMapTemplateKey(country);

  const highlightIds = useMemo(() => new Set(getContextMapPathIds(country)), [country]);
  const neighborIds = useMemo(() => {
    if (!highlightNeighbors) return new Set<string>();
    const neighbors = getNeighborContextMapPathIds(country);
    return new Set(neighbors.filter((id) => !highlightIds.has(id)));
  }, [country, highlightIds, highlightNeighbors]);

  const visiblePaths = useMemo(() => {
    if (!map) return [];
    if (!countryOnly) return map.paths;
    return map.paths.filter((path) => highlightIds.has(path.id));
  }, [map, countryOnly, highlightIds]);

  const focusedViewBox = useMemo(() => {
    if (!boundsManifest) return undefined;
    const template = boundsManifest[templateKey];
    if (!template) return undefined;

    return computeFocusedViewBox(template, getContextMapPathIds(country), CROP_OPTIONS[variant]);
  }, [boundsManifest, templateKey, country, variant]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadContextMapTemplate(templateKey), loadMapBoundsManifest()])
      .then(([loaded, bounds]) => {
        if (cancelled) return;
        setLoadFailed(false);
        setMap(loaded);
        boundsCache.data = bounds;
        setBoundsManifest(bounds);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [templateKey]);

  if (!countryHasContextMap(country)) {
    return null;
  }

  const ariaLabel = getContextMapAriaLabel(country, isState);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-teal-100 bg-sky-50 dark:border-teal-900/50 dark:bg-slate-950",
        variant === "compact"
          ? "h-20 sm:h-24"
          : variant === "learn"
            ? "aspect-[11/5] w-full min-h-[9rem] sm:min-h-[7rem]"
            : "aspect-[16/10] w-full",
        interactive && "touch-none",
        className,
      )}
    >
      {map && ready ? (
        <ContextMapSvg
          map={{ ...map, paths: visiblePaths }}
          highlightIds={highlightIds}
          neighborIds={neighborIds}
          ariaLabel={ariaLabel}
          isDark={isDark}
          viewBox={focusedViewBox}
          scaleStrokesWithMap={variant === "learn" || variant === "hero"}
        />
      ) : loadFailed ? (
        <div className="flex h-full items-center justify-center px-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
          Map unavailable
        </div>
      ) : (
        <div className="h-full animate-pulse bg-slate-200/60 dark:bg-slate-700/60" aria-hidden />
      )}
    </div>
  );
}
