"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Panzoom from "@panzoom/panzoom";
import { CapitalMapPin, capitalPinSizeForViewBox } from "@/components/CapitalMapPin";
import { MapMasteryFxDefs } from "@/components/MapMasteryFxDefs";
import { getCapitalLatLng } from "@/lib/capital-coordinates";
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
  computeInteractiveSurroundingsViewBox,
  formatSvgViewBox,
  getMapOverviewViewBox,
  loadMapBoundsManifest,
  parseSvgViewBox,
  type MapBoundsManifest,
} from "@/lib/map-bounds";
import { projectLonLatToMap } from "@/lib/map-projection";
import {
  getMapPalette,
  getMapPathRole,
  getSubtleNeighborMapStyle,
  parseMapViewBox,
  sortMapPathsForRender,
  type MapPathStyle,
} from "@/lib/map-colors";
import { attachMapPlaceTapHandlers } from "@/lib/map-interaction";
import {
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
import { getMapOceanTexture, preloadMapOceanTexture } from "@/lib/map-ocean-texture";
import { MAP_PANZOOM_OPTIONS } from "@/lib/map-panzoom";
import { getCountryByCode } from "@/lib/countries";
import { isStateCode } from "@/lib/scope";
import type { Country } from "@/lib/types";
import { useIsDark } from "@/lib/use-is-dark";
import { cn } from "@/lib/utils";
import { focusPanzoomOnViewBoxRegion } from "@/lib/world-map-focus";

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
 * Warm the learn-card context map (SVG template and bounds) so PlaceContextMap
 * can render without a loading pulse.
 */
export function preloadLearnCardMap(countryCode: string, isDark: boolean): Promise<void> {
  const key = `${countryCode.toUpperCase()}:${isDark ? "d" : "l"}`;
  const existing = learnCardPreloadInFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const country = getCountryByCode(countryCode);
    if (!country || !countryHasContextMap(country)) return;

    const templateKey = getContextMapTemplateKey(country);
    preloadMapOceanTexture(isStateCode(country.code) ? "usa" : "world", isDark);
    const [, bounds] = await Promise.all([
      loadContextMapTemplate(templateKey),
      loadMapBoundsManifest(),
    ]);
    boundsCache.data = bounds;
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

type PlaceContextMapProps = {
  country: Country;
  variant?: "compact" | "learn" | "hero";
  highlightNeighbors?: boolean;
  /** Neighbor country whose answer should be visually distinguished. */
  answerNeighborCode?: string;
  /** Crop and render only the featured country (no neighbors or other land). */
  countryOnly?: boolean;
  className?: string;
  /** Enable drag-to-pan and scroll/pinch zoom (no zoom toolbar). */
  interactive?: boolean;
  /** Draw a capital pin at the projected city (library maps and capital learn cards). */
  showCapitalMarker?: boolean;
};

type ContextMapSvgProps = {
  map: ParsedContextMap;
  highlightIds: Set<string>;
  neighborIds: Set<string>;
  answerNeighborIds: Set<string>;
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
   * Optional Blue Marble land fill. Off by default — terrain coasts and thick
   * black strokes ghost against country path borders. Flat palette fills keep
   * one clear vector outline in every view.
   */
  landTexture?: boolean;
  mapTemplateKey?: string;
  /** Projected capital marker for Learn/Library context maps. */
  capitalMarker?: { x: number; y: number; size: number; label: string } | null;
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
  if (baseWidth <= 0) return 0;
  if (!scaleWithMap) {
    // non-scaling-stroke is roughly CSS px.
    return baseWidth;
  }
  const diagonal = Math.hypot(viewBoxWidth, viewBoxHeight);
  const scale = 0.00045;
  const floor = 0.00028;
  return Math.max(diagonal * scale * (baseWidth / 0.35), diagonal * floor);
}

export function ContextMapSvg({
  map,
  highlightIds,
  neighborIds,
  answerNeighborIds,
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
  capitalMarker = null,
  onPathClick,
  onPathHover,
  onBackgroundClick,
}: ContextMapSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const onPathClickRef = useRef(onPathClick);
  const onBackgroundClickRef = useRef(onBackgroundClick);
  const reactId = useId().replace(/:/g, "");
  const landPatternId = `map-land-${reactId}`;
  const palette = getMapPalette(isDark);
  const activeViewBox = viewBox ?? map.viewBox;
  const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = parseMapViewBox(activeViewBox);
  const orderedPaths = useMemo(
    () => sortMapPathsForRender(map.paths, highlightIds, neighborIds, answerNeighborIds),
    [map.paths, highlightIds, neighborIds, answerNeighborIds],
  );
  const landWashOpacity = getMapLandTextureWashOpacity(isDark);
  const landBrightness = getMapLandTextureBrightness(isDark);
  /** Sharp viewBox crop; null while generating — fall back to overview bake. */
  const [surfaceCrop, setSurfaceCrop] = useState<{
    landHref: string;
  } | null>(null);
  const [surfaceCropFailed, setSurfaceCropFailed] = useState(false);

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
    if (!textureEnabled) {
      setSurfaceCrop(null);
      setSurfaceCropFailed(false);
      return;
    }

    let cancelled = false;
    setSurfaceCrop(null);
    setSurfaceCropFailed(false);
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
        if (!cancelled) setSurfaceCropFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [textureEnabled, mapTemplateKey, viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight, isDark]);

  const oceanTexture = getMapOceanTexture(mapTemplateKey, isDark);
  const vectorEffect = scaleStrokesWithMap ? undefined : "non-scaling-stroke";
  const styledPaths = orderedPaths.map((path) => {
    const resolvedStyle = pathStyleResolver?.(path.id);
    const role = getMapPathRole(path.id, highlightIds, neighborIds, answerNeighborIds);
    const style: MapPathStyle = resolvedStyle ?? palette[role];
    const strokeWidth = strokeWidthForViewBox(
      style.strokeWidth,
      viewBoxWidth,
      viewBoxHeight,
      scaleStrokesWithMap,
    );
    const tintOpacity =
      !textureEnabled
        ? 0
        : role === "answer"
          ? 0.62
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
      stroke: strokeWidth > 0 ? style.stroke : "none",
      fill: textureEnabled ? `url(#${landPatternId})` : style.fill,
      tintOpacity,
    };
  });

  if (textureEnabled && !surfaceCrop && !surfaceCropFailed) {
    return null;
  }

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
            // Pattern content uses SVG user-space coordinates, so keep the
            // cropped image aligned to the same origin as the active viewBox.
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
                x={viewBoxX}
                y={viewBoxY}
                width={viewBoxWidth}
                height={viewBoxHeight}
                preserveAspectRatio="none"
              />
            </pattern>
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
        fill={palette.ocean}
      />
      {/* Full-map bathymetry in SVG user space so viewBox crops cannot leave gaps. */}
      <image
        href={oceanTexture.href}
        x={0}
        y={0}
        width={oceanTexture.width}
        height={oceanTexture.height}
        preserveAspectRatio="none"
        style={{ pointerEvents: "none" }}
        aria-hidden
      />
      {/* Fills first, then one stroke pass — a single clear border per place. */}
      {textureEnabled ? (
        <>
          {/* Solid underlay so land never reads as hollow if the pattern misses. */}
          {styledPaths.map(({ path, style }) => (
            <path
              key={`underlay-${path.id}`}
              d={path.d}
              fill={style.fill}
              stroke="none"
              style={{ pointerEvents: "none" }}
              aria-hidden
            />
          ))}
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
        </>
      ) : (
        styledPaths.map(({ path, style, fill }) => (
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
        ))
      )}
      {styledPaths.map(({ path, stroke, strokeWidth }) =>
        strokeWidth > 0 && stroke !== "none" ? (
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
        ) : null,
      )}
      {capitalMarker ? (
        <CapitalMapPin
          x={capitalMarker.x}
          y={capitalMarker.y}
          size={capitalMarker.size}
          label={capitalMarker.label}
          isDark={isDark}
        />
      ) : null}
    </svg>
  );
}

export function PlaceContextMap({
  country,
  variant = "hero",
  highlightNeighbors = false,
  answerNeighborCode,
  countryOnly = false,
  className,
  interactive = false,
  showCapitalMarker = false,
}: PlaceContextMapProps) {
  const { isDark, ready } = useIsDark();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<ReturnType<typeof Panzoom> | null>(null);
  const isState = isStateCode(country.code);
  // Learn-card crops can include countries outside the featured continent
  // because their wide aspect ratio exposes a broad regional context. Use the
  // complete world template for those snapshots so every visible country has
  // geometry; interactive maps use it for the same reason when zooming out.
  const templateKey =
    !isState && (interactive || variant === "learn")
      ? "world"
      : getContextMapTemplateKey(country);
  const [map, setMap] = useState<ParsedContextMap | null>(() =>
    templateCache.get(templateKey) ?? null,
  );
  const [boundsManifest, setBoundsManifest] = useState<MapBoundsManifest | null>(
    () => boundsCache.data,
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [panzoomReady, setPanzoomReady] = useState(false);
  /** Current Panzoom scale; pin size is divided by this so close-ups stay small. */
  const [mapZoomScale, setMapZoomScale] = useState(1);
  const cropOptions = CROP_OPTIONS[variant];

  const highlightIds = useMemo(() => new Set(getContextMapPathIds(country)), [country]);
  const neighborIds = useMemo(() => {
    if (!highlightNeighbors) return new Set<string>();
    const neighbors = getNeighborContextMapPathIds(country);
    return new Set(neighbors.filter((id) => !highlightIds.has(id)));
  }, [country, highlightIds, highlightNeighbors]);

  const answerNeighborIds = useMemo(() => {
    if (!answerNeighborCode) return new Set<string>();
    const answerCountry = getCountryByCode(answerNeighborCode);
    if (!answerCountry) return new Set<string>();
    return new Set(getContextMapPathIds(answerCountry));
  }, [answerNeighborCode]);

  // Featured place is fill-only (a selection stroke fattens thin geographies).
  // Answer callouts keep a vector stroke. Surrounding land is fill-only so
  // mismatched shared-border geometry cannot ghost a second outline.
  const pathStyleResolver = useMemo(() => {
    const mapPalette = getMapPalette(isDark);
    const subtleNeighbor = getSubtleNeighborMapStyle(isDark);
    const surroundLand: MapPathStyle = {
      fill: mapPalette.default.fill,
      stroke: "none",
      strokeWidth: 0,
    };
    return (pathId: string): MapPathStyle | null => {
      if (highlightIds.has(pathId)) {
        return mapPalette.highlight;
      }
      if (answerNeighborIds.has(pathId)) {
        return mapPalette.answer;
      }
      if (neighborIds.has(pathId)) {
        return highlightNeighbors ? subtleNeighbor : surroundLand;
      }
      return surroundLand;
    };
  }, [answerNeighborIds, highlightNeighbors, highlightIds, neighborIds, isDark]);

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
      ...cropOptions,
      // Restrict surroundings completion to land-border neighbors so a wide
      // aspect crop cannot cascade to distant countries and shove the subject off-center.
      neighborPathIds: getNeighborContextMapPathIds(country),
    });
  }, [boundsManifest, templateKey, country, cropOptions]);

  const interactiveViewBoxes = useMemo(() => {
    if (!interactive || !boundsManifest || !focusedViewBox) return null;
    const template = boundsManifest[templateKey];
    if (!template) return null;

    const focused = parseSvgViewBox(focusedViewBox);
    const overview = getMapOverviewViewBox(template, {
      aspectRatio: cropOptions.aspectRatio,
    });
    const surroundings = computeInteractiveSurroundingsViewBox(focused, overview);
    const rawScale = Math.min(
      surroundings[2] / focused[2],
      surroundings[3] / focused[3],
    );
    return {
      focused,
      surroundings,
      surroundingsViewBox: formatSvgViewBox(surroundings),
      // Scale 1 is the surroundings crop; >=1 zooms to the library close-up.
      initialScale: Number.isFinite(rawScale) ? Math.max(1, rawScale) : 1,
    };
  }, [interactive, boundsManifest, focusedViewBox, templateKey, cropOptions]);

  const activeViewBox = interactive
    ? interactiveViewBoxes?.surroundingsViewBox
    : focusedViewBox;

  const capitalMarker = useMemo(() => {
    if (!showCapitalMarker) return null;
    const latLng = getCapitalLatLng(country.code);
    if (!latLng || !country.capital) return null;
    const [lat, lng] = latLng;
    const point = projectLonLatToMap(lng, lat, templateKey);
    if (!point) return null;

    const focusedCrop = interactiveViewBoxes?.focused
      ?? (focusedViewBox ? parseSvgViewBox(focusedViewBox) : null);
    if (!focusedCrop) return null;

    // Interactive maps draw in the wide surroundings viewBox, then Panzoom
    // zooms to the country. Size from the close-up crop and undo the current
    // zoom so the pin stays a small, stable fraction of what is on screen.
    const relativeZoom =
      interactive && interactiveViewBoxes
        ? mapZoomScale / interactiveViewBoxes.initialScale
        : 1;

    return {
      x: point[0],
      y: point[1],
      size: capitalPinSizeForViewBox(focusedCrop[2], focusedCrop[3], relativeZoom),
      label: `Capital: ${country.capital}`,
    };
  }, [
    showCapitalMarker,
    country.code,
    country.capital,
    templateKey,
    focusedViewBox,
    interactive,
    interactiveViewBoxes,
    mapZoomScale,
  ]);

  useEffect(() => {
    preloadMapOceanTexture(templateKey === "usa" ? "usa" : "world", isDark);
  }, [templateKey, isDark]);

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

  useEffect(() => {
    if (!interactive) return;
    const element = mapRef.current;
    if (!element || !map || !interactiveViewBoxes || !ready) return;

    const maxScale = Math.max(
      MAP_PANZOOM_OPTIONS.maxScale,
      interactiveViewBoxes.initialScale * 4,
    );

    panzoomRef.current?.destroy();
    // Surroundings may be wider than the subject (world overview). startScale
    // alone zooms toward the element center — which is wrong when the subject
    // sits off-center — so immediately re-focus on the library close-up before
    // revealing the map.
    panzoomRef.current = Panzoom(element, {
      ...MAP_PANZOOM_OPTIONS,
      maxScale,
      startScale: interactiveViewBoxes.initialScale,
    });

    const onZoom = (event: Event) => {
      const scale = (event as CustomEvent<{ scale?: number }>).detail?.scale;
      if (typeof scale === "number" && Number.isFinite(scale)) {
        setMapZoomScale(scale);
      }
    };
    element.addEventListener("panzoomzoom", onZoom);

    if (
      containerRef.current &&
      interactiveViewBoxes.initialScale > MAP_PANZOOM_OPTIONS.minScale + 0.01
    ) {
      focusPanzoomOnViewBoxRegion(
        containerRef.current,
        panzoomRef.current,
        interactiveViewBoxes.surroundings,
        interactiveViewBoxes.focused,
        { animate: false, maxScale },
      );
    }
    setMapZoomScale(panzoomRef.current.getScale());
    // Reveal after the focus transform has a frame to commit.
    const revealFrame = requestAnimationFrame(() => {
      setPanzoomReady(true);
    });

    const container = containerRef.current;
    const finePointer = window.matchMedia("(pointer: fine)");
    const onWheel = (event: WheelEvent) => {
      if (!panzoomRef.current) return;

      // Desktop: at min/max scale, let the wheel scroll the page instead of
      // trapping the cursor over a map that can't zoom further.
      if (finePointer.matches && event.deltaY !== 0) {
        const scale = panzoomRef.current.getScale();
        const eps = 1e-3;
        const atMin = scale <= MAP_PANZOOM_OPTIONS.minScale + eps;
        const atMax = scale >= maxScale - eps;
        const wantsOut = event.deltaY > 0;
        const wantsIn = event.deltaY < 0;
        if ((wantsOut && atMin) || (wantsIn && atMax)) return;
      }

      panzoomRef.current.zoomWithWheel(event);
    };
    container?.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(revealFrame);
      element.removeEventListener("panzoomzoom", onZoom);
      container?.removeEventListener("wheel", onWheel);
      panzoomRef.current?.destroy();
      panzoomRef.current = null;
      setPanzoomReady(false);
    };
  }, [interactive, map, interactiveViewBoxes, ready]);

  // Refine focal point after layout when zoomed in past the surroundings base.
  useEffect(() => {
    if (!interactive || !interactiveViewBoxes || !panzoomReady || !panzoomRef.current) {
      return;
    }
    if (!containerRef.current) return;
    if (interactiveViewBoxes.initialScale <= MAP_PANZOOM_OPTIONS.minScale + 0.01) {
      return;
    }

    const panzoom = panzoomRef.current;
    const container = containerRef.current;
    const { focused, surroundings, initialScale } = interactiveViewBoxes;
    const maxScale = Math.max(MAP_PANZOOM_OPTIONS.maxScale, initialScale * 4);

    const frame = requestAnimationFrame(() => {
      focusPanzoomOnViewBoxRegion(container, panzoom, surroundings, focused, {
        animate: false,
        maxScale,
      });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [interactive, interactiveViewBoxes, panzoomReady]);

  if (!countryHasContextMap(country)) {
    return null;
  }

  const ariaLabel = getContextMapAriaLabel(country, isState);
  const mapAriaLabel = [
    answerNeighborIds.size > 0
      ? `${ariaLabel}; the correct neighboring country is highlighted in amber`
      : ariaLabel,
    capitalMarker ? `Capital city marked: ${country.capital}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden rounded-2xl border border-teal-100 dark:border-teal-900/50",
        variant === "compact"
          ? "h-20 sm:h-24"
          : variant === "learn"
            ? "aspect-[11/5] w-full min-h-[9rem] sm:min-h-[7rem]"
            : "aspect-[16/10] w-full",
        interactive && "relative touch-none",
        className,
      )}
      style={{ backgroundColor: getMapPalette(isDark).ocean }}
    >
      {map && ready && (!interactive || (interactiveViewBoxes && activeViewBox)) ? (
        <div
          ref={interactive ? mapRef : undefined}
          className={cn(
            "h-full w-full",
            interactive && "origin-center",
            // Hide the wider surroundings crop until panzoom applies startScale.
            interactive &&
              !panzoomReady &&
              interactiveViewBoxes !== null &&
              interactiveViewBoxes.initialScale > 1.01 &&
              "opacity-0",
          )}
        >
          <ContextMapSvg
            map={{ ...map, paths: visiblePaths }}
            highlightIds={highlightIds}
            neighborIds={neighborIds}
            answerNeighborIds={answerNeighborIds}
            pathStyleResolver={pathStyleResolver}
            ariaLabel={mapAriaLabel}
            isDark={isDark}
            viewBox={activeViewBox}
            scaleStrokesWithMap={variant === "learn" || variant === "hero"}
            mapTemplateKey={templateKey}
            capitalMarker={capitalMarker}
          />
        </div>
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
