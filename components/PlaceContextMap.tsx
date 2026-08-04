"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapMasteryFxDefs } from "@/components/MapMasteryFxDefs";
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
  getSubtleNeighborMapStyle,
  LAND_TEXTURE_BORDER_STROKE,
  parseMapViewBox,
  sortMapPathsForRender,
  type MapPathStyle,
} from "@/lib/map-colors";
import { attachMapPlaceTapHandlers } from "@/lib/map-interaction";
import {
  contextMapSupportsLandTexture,
  getMapLandTextureBrightness,
  getMapLandTextureWashOpacity,
  MAP_LAND_HIGHLIGHT_TINT_OPACITY,
  MAP_LAND_NEIGHBOR_TINT_OPACITY,
  MAP_LAND_TEXTURE_HEIGHT,
  MAP_LAND_TEXTURE_PATH,
  MAP_LAND_TEXTURE_WIDTH,
} from "@/lib/map-land-texture";
import {
  renderMapSurfaceTextureCrop,
  shouldUseRuntimeMapTexture,
} from "@/lib/map-land-texture-runtime";
import { getCountryByCode } from "@/lib/countries";
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
 * Zoom is relative to the featured place; surroundings stay subject-centered.
 */
const CROP_OPTIONS = {
  compact: {
    aspectRatio: 2.2,
    paddingRatio: 0.35,
    useFocusBounds: true,
    completeSurroundings: true,
    maxExpandRatio: 1.55,
  },
  learn: {
    aspectRatio: 2.2,
    paddingRatio: 0.45,
    useFocusBounds: true,
    completeSurroundings: true,
    maxExpandRatio: 1.6,
  },
  hero: {
    aspectRatio: 1.6,
    paddingRatio: 0.4,
    useFocusBounds: true,
    completeSurroundings: true,
    maxExpandRatio: 1.55,
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

const learnCardPreloadInFlight = new Map<string, Promise<void>>();

/**
 * Warm the learn-card context map (SVG template, bounds, and terrain crop)
 * so PlaceContextMap can render without a loading pulse.
 */
export function preloadLearnCardMap(countryCode: string, isDark: boolean): Promise<void> {
  const key = `${countryCode.toUpperCase()}:${isDark ? "d" : "l"}`;
  const existing = learnCardPreloadInFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    if (!shouldUseRuntimeMapTexture()) return;

    const country = getCountryByCode(countryCode);
    if (!country || !countryHasContextMap(country)) return;

    const templateKey = getContextMapTemplateKey(country);
    const [, bounds] = await Promise.all([
      loadContextMapTemplate(templateKey),
      loadMapBoundsManifest(),
      // Overview bake is the first-paint fallback before the sharp crop lands.
      preloadImageElement(MAP_LAND_TEXTURE_PATH),
    ]);
    boundsCache.data = bounds;

    if (!contextMapSupportsLandTexture(templateKey)) return;

    const template = bounds[templateKey];
    if (!template) return;

    const focusedViewBox = computeFocusedViewBox(template, getContextMapPathIds(country), {
      ...CROP_OPTIONS.learn,
      neighborPathIds: getNeighborContextMapPathIds(country),
    });
    if (!focusedViewBox) return;

    const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = parseMapViewBox(focusedViewBox);
    await renderMapSurfaceTextureCrop({
      templateKey,
      viewBoxX,
      viewBoxY,
      viewBoxWidth,
      viewBoxHeight,
      isDark,
    });
  })()
    .catch(() => {
      // Preload is best-effort; PlaceContextMap still loads on demand.
    })
    .finally(() => {
      learnCardPreloadInFlight.delete(key);
    });

  learnCardPreloadInFlight.set(key, promise);
  return promise;
}

function preloadImageElement(src: string): Promise<void> {
  if (typeof Image === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
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
  /** Include animated gold/legendary gradient defs for progress-map fills. */
  includeMasteryFxDefs?: boolean;
  /**
   * Fill land with Natural Earth–projected Blue Marble topography (Learn /
   * Library). Off for progress maps that need opaque mastery paints.
   */
  landTexture?: boolean;
  mapTemplateKey?: string;
  onPathClick?: (pathId: string) => void;
  onPathHover?: (pathId: string | null) => void;
  onBackgroundClick?: () => void;
};

function strokeWidthForViewBox(
  baseWidth: number,
  viewBoxWidth: number,
  viewBoxHeight: number,
  scaleWithMap: boolean,
  landTexture: boolean,
): number {
  if (!scaleWithMap) {
    // non-scaling-stroke is roughly CSS px — thicken on terrain so borders read.
    return landTexture ? Math.max(baseWidth * 2.4, 1.1) : baseWidth;
  }
  const diagonal = Math.hypot(viewBoxWidth, viewBoxHeight);
  // Flat fills can use hairlines; Blue Marble needs a heavier black outline.
  const scale = landTexture ? 0.0017 : 0.00045;
  const floor = landTexture ? 0.0011 : 0.00028;
  return Math.max(diagonal * scale * (baseWidth / 0.35), diagonal * floor);
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
  includeMasteryFxDefs = false,
  landTexture = false,
  mapTemplateKey = "world",
  onPathClick,
  onPathHover,
  onBackgroundClick,
}: ContextMapSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const onPathClickRef = useRef(onPathClick);
  const onBackgroundClickRef = useRef(onBackgroundClick);
  const reactId = useId().replace(/:/g, "");
  const landPatternId = `map-land-${reactId}`;
  const oceanPatternId = `map-ocean-${reactId}`;
  const palette = getMapPalette(isDark);
  const activeViewBox = viewBox ?? map.viewBox;
  const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = parseMapViewBox(activeViewBox);
  const orderedPaths = useMemo(
    () => sortMapPathsForRender(map.paths, highlightIds, neighborIds),
    [map.paths, highlightIds, neighborIds],
  );
  const landWashOpacity = getMapLandTextureWashOpacity(isDark);
  const landBrightness = getMapLandTextureBrightness(isDark);
  /** Sharp viewBox crop; null while generating — fall back to overview bake. */
  const [surfaceCrop, setSurfaceCrop] = useState<{
    landHref: string;
    oceanHref: string;
  } | null>(null);

  const [surfaceTextureAllowed, setSurfaceTextureAllowed] = useState(false);

  useEffect(() => {
    // Keep the server and first client render flat; touch devices never start
    // the high-memory projection sampler.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSurfaceTextureAllowed(shouldUseRuntimeMapTexture());
  }, []);

  const textureEnabled = landTexture && surfaceTextureAllowed;

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

  useEffect(() => {
    if (!textureEnabled) return;

    let cancelled = false;
    renderMapSurfaceTextureCrop({
      templateKey: mapTemplateKey,
      viewBoxX,
      viewBoxY,
      viewBoxWidth,
      viewBoxHeight,
      isDark,
    })
      .then((crop) => {
        if (!cancelled) setSurfaceCrop(crop);
      })
      .catch(() => {
        // Keep the overview bake if the sharp crop fails.
      });

    return () => {
      cancelled = true;
    };
  }, [textureEnabled, mapTemplateKey, viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight, isDark]);

  const vectorEffect = scaleStrokesWithMap ? undefined : "non-scaling-stroke";
  const styledPaths = orderedPaths.map((path) => {
    const resolvedStyle = pathStyleResolver?.(path.id);
    const role = getMapPathRole(path.id, highlightIds, neighborIds);
    const style: MapPathStyle = resolvedStyle ?? palette[role];
    const strokeWidth = strokeWidthForViewBox(
      style.strokeWidth,
      viewBoxWidth,
      viewBoxHeight,
      scaleStrokesWithMap,
      textureEnabled,
    );
    const tintOpacity =
      !textureEnabled
        ? 0
        : resolvedStyle
          ? 0.46
          : role === "highlight"
            ? MAP_LAND_HIGHLIGHT_TINT_OPACITY
            : role === "neighbor"
              ? MAP_LAND_NEIGHBOR_TINT_OPACITY
              : 0;

    return {
      path,
      style,
      strokeWidth,
      stroke: textureEnabled ? LAND_TEXTURE_BORDER_STROKE : style.stroke,
      fill: textureEnabled ? `url(#${landPatternId})` : style.fill,
      tintOpacity,
    };
  });

  return (
    <svg
      ref={svgRef}
      viewBox={activeViewBox}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={ariaLabel}
      shapeRendering="geometricPrecision"
    >
      {includeMasteryFxDefs ? <MapMasteryFxDefs /> : null}
      {textureEnabled ? (
        <defs>
          {surfaceCrop ? (
            <>
            <pattern
              id={landPatternId}
              patternUnits="userSpaceOnUse"
              x={viewBoxX}
              y={viewBoxY}
              width={viewBoxWidth}
              height={viewBoxHeight}
            >
              <image
                href={surfaceCrop.landHref}
                width={viewBoxWidth}
                height={viewBoxHeight}
                preserveAspectRatio="none"
              />
            </pattern>
            <pattern
              id={oceanPatternId}
              patternUnits="userSpaceOnUse"
              x={viewBoxX}
              y={viewBoxY}
              width={viewBoxWidth}
              height={viewBoxHeight}
            >
              <image
                href={surfaceCrop.oceanHref}
                width={viewBoxWidth}
                height={viewBoxHeight}
                preserveAspectRatio="none"
              />
            </pattern>
            </>
          ) : (
            <pattern
              id={landPatternId}
              patternUnits="userSpaceOnUse"
              width={MAP_LAND_TEXTURE_WIDTH}
              height={MAP_LAND_TEXTURE_HEIGHT}
            >
              <image
                href={MAP_LAND_TEXTURE_PATH}
                width={MAP_LAND_TEXTURE_WIDTH}
                height={MAP_LAND_TEXTURE_HEIGHT}
                preserveAspectRatio="none"
                style={
                  landBrightness < 1
                    ? { filter: `brightness(${landBrightness})` }
                    : undefined
                }
              />
              <rect
                width={MAP_LAND_TEXTURE_WIDTH}
                height={MAP_LAND_TEXTURE_HEIGHT}
                fill="#ffffff"
                opacity={landWashOpacity}
              />
            </pattern>
          )}
        </defs>
      ) : null}
      <rect
        x={viewBoxX}
        y={viewBoxY}
        width={viewBoxWidth}
        height={viewBoxHeight}
        fill={surfaceCrop && textureEnabled ? `url(#${oceanPatternId})` : palette.ocean}
      />
      {textureEnabled ? (
        <>
          {styledPaths.map(({ path, style, fill }) => (
            <path
              key={`fill-${path.id}`}
              id={path.id}
              d={path.d}
              data-map-place={interactive ? path.id : undefined}
              fill={fill}
              stroke="none"
              className={cn(
                interactive && "cursor-pointer transition-[fill,stroke] duration-150",
                style.className,
              )}
              onMouseEnter={interactive && onPathHover ? () => onPathHover(path.id) : undefined}
              onMouseLeave={interactive && onPathHover ? () => onPathHover(null) : undefined}
            />
          ))}
          {styledPaths.map(({ path, style, tintOpacity }) =>
            tintOpacity > 0 ? (
              <path
                key={`tint-${path.id}`}
                d={path.d}
                fill={style.fill}
                fillOpacity={tintOpacity}
                stroke="none"
                style={{ pointerEvents: "none" }}
                aria-hidden
              />
            ) : null,
          )}
          {styledPaths.map(({ path, stroke, strokeWidth }) => (
            <path
              key={`stroke-${path.id}`}
              d={path.d}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              vectorEffect={vectorEffect}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ pointerEvents: "none" }}
              aria-hidden
            />
          ))}
        </>
      ) : (
        styledPaths.map(({ path, style, fill, stroke, strokeWidth, tintOpacity }) => (
          <g key={path.id}>
            <path
              id={path.id}
              d={path.d}
              data-map-place={interactive ? path.id : undefined}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              vectorEffect={vectorEffect}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={cn(
                interactive && "cursor-pointer transition-[fill,stroke] duration-150",
                style.className,
              )}
              onMouseEnter={interactive && onPathHover ? () => onPathHover(path.id) : undefined}
              onMouseLeave={interactive && onPathHover ? () => onPathHover(null) : undefined}
            />
            {tintOpacity > 0 ? (
              <path
                d={path.d}
                fill={style.fill}
                fillOpacity={tintOpacity}
                stroke="none"
                style={{ pointerEvents: "none" }}
                aria-hidden
              />
            ) : null}
          </g>
        ))
      )}
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

  // Learn-card neighbors use a muted cool tone so they don't compete with the
  // teal highlight (the default neighbor palette is the same teal family).
  const pathStyleResolver = useMemo(() => {
    if (!highlightNeighbors) return undefined;
    const subtleNeighbor = getSubtleNeighborMapStyle(isDark);
    return (pathId: string): MapPathStyle | null => {
      if (neighborIds.has(pathId) && !highlightIds.has(pathId)) {
        return subtleNeighbor;
      }
      return null;
    };
  }, [highlightNeighbors, highlightIds, neighborIds, isDark]);

  const visiblePaths = useMemo(() => {
    if (!map) return [];
    if (!countryOnly) return map.paths;
    return map.paths.filter((path) => highlightIds.has(path.id));
  }, [map, countryOnly, highlightIds]);

  const focusedViewBox = useMemo(() => {
    if (!boundsManifest) return undefined;
    const template = boundsManifest[templateKey];
    if (!template) return undefined;

    return computeFocusedViewBox(template, getContextMapPathIds(country), {
      ...CROP_OPTIONS[variant],
      // Restrict surroundings completion to land-border neighbors so a wide
      // aspect crop cannot cascade to distant countries and shove the subject off-center.
      neighborPathIds: getNeighborContextMapPathIds(country),
    });
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
  const landTexture = contextMapSupportsLandTexture(templateKey);

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
          pathStyleResolver={pathStyleResolver}
          ariaLabel={ariaLabel}
          isDark={isDark}
          viewBox={focusedViewBox}
          scaleStrokesWithMap={variant === "learn" || variant === "hero"}
          landTexture={landTexture}
          mapTemplateKey={templateKey}
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
