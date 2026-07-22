"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Panzoom from "@panzoom/panzoom";
import {
  ContextMapSvg,
  loadContextMapTemplate,
  type ParsedContextMap,
} from "@/components/PlaceContextMap";
import { getCountryByCode } from "@/lib/countries";
import {
  getContextMapPathIds,
  getStateCodeByUsaMapPathId,
  getUsaMapPathIds,
  resolvePlaceCodeFromParam,
} from "@/lib/context-maps";
import type { Country } from "@/lib/types";
import { useIsDark } from "@/lib/use-is-dark";
import { focusWorldMapOnPaths } from "@/lib/world-map-focus";

type UsaMapExplorerProps = {
  initialPlaceCode?: string | null;
};

export function UsaMapExplorer({ initialPlaceCode = null }: UsaMapExplorerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<ReturnType<typeof Panzoom> | null>(null);
  const hasInitialFocusRef = useRef(false);
  const [map, setMap] = useState<ParsedContextMap | null>(null);
  const [panzoomReady, setPanzoomReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedState, setSelectedState] = useState<Country | null>(null);
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);
  const { isDark, ready } = useIsDark();

  const highlightIds = useMemo(() => {
    if (!selectedState) return new Set<string>();
    return new Set(getContextMapPathIds(selectedState));
  }, [selectedState]);

  const neighborIds = useMemo(() => {
    if (!hoveredPathId || highlightIds.has(hoveredPathId)) return new Set<string>();
    return new Set([hoveredPathId]);
  }, [hoveredPathId, highlightIds]);

  const hoveredState = useMemo(() => {
    if (!hoveredPathId) return null;
    const code = getStateCodeByUsaMapPathId(hoveredPathId);
    return code ? getCountryByCode(code) ?? null : null;
  }, [hoveredPathId]);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);

    loadContextMapTemplate("usa")
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
    panzoomRef.current = Panzoom(element, {
      maxScale: 16,
      minScale: 1,
      contain: "outside",
      cursor: "grab",
    });
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

    const state = getCountryByCode(resolvedCode);
    if (!state) return;

    const pathIds = getUsaMapPathIds(state);
    const svg = mapRef.current?.querySelector("svg");
    if (!svg || pathIds.length === 0) return;

    setSelectedState(state);

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

  const handlePathClick = (pathId: string) => {
    const code = getStateCodeByUsaMapPathId(pathId);
    if (!code) return;
    const state = getCountryByCode(code);
    if (!state) return;
    setSelectedState((current) => (current?.code === state.code ? null : state));
  };

  const activeState = selectedState ?? hoveredState;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/85 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            USA map
          </p>
          <p className="mt-0.5 truncate font-display text-base font-extrabold text-slate-900 dark:text-slate-100 sm:text-lg">
            {activeState ? activeState.name : "Click a state to explore"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedState ? (
            <Link
              href={`/library/${selectedState.code.toLowerCase()}?scope=usa`}
              className="inline-flex items-center rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 transition-colors hover:border-teal-400 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:border-teal-500 dark:hover:bg-teal-950"
            >
              Open in Library →
            </Link>
          ) : null}
          <button
            type="button"
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-sm font-black text-slate-700 transition-colors hover:border-teal-400 hover:text-teal-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:text-teal-300"
            aria-label="Zoom out"
            onClick={() => panzoomRef.current?.zoomOut()}
          >
            −
          </button>
          <button
            type="button"
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-sm font-black text-slate-700 transition-colors hover:border-teal-400 hover:text-teal-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:text-teal-300"
            aria-label="Zoom in"
            onClick={() => panzoomRef.current?.zoomIn()}
          >
            +
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-teal-400 hover:text-teal-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-500 dark:hover:text-teal-300"
            onClick={() => panzoomRef.current?.reset()}
          >
            Reset
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="aspect-[16/9] w-full touch-none overflow-hidden bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950 sm:aspect-[2/1]"
      >
        {map && ready ? (
          <div ref={mapRef} className="h-full w-full origin-center">
            <ContextMapSvg
              map={map}
              highlightIds={highlightIds}
              neighborIds={neighborIds}
              ariaLabel="Interactive map showing all 50 U.S. states"
              isDark={isDark}
              interactive
              onPathClick={handlePathClick}
              onPathHover={setHoveredPathId}
            />
          </div>
        ) : loadFailed ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            USA map unavailable
          </div>
        ) : (
          <div className="h-full animate-pulse bg-slate-200/60 dark:bg-slate-700/60" aria-hidden />
        )}
      </div>

      <p className="border-t border-slate-200 px-4 py-2.5 text-center text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Drag to pan · scroll or pinch to zoom · click a state to select it
      </p>
    </div>
  );
}
