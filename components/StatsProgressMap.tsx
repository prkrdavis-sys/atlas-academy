"use client";

import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
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
import {
  buildUsaProgressFillMap,
  buildWorldProgressFillMap,
  createProgressPathStyleResolver,
  getPlaceMasteryLevel,
} from "@/lib/map-progress";
import type { Continent, GameScope, MapProgressDifficulty, Profile, Region } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatsProgressMapProps = {
  profile: Profile;
  difficulty: MapProgressDifficulty;
  scope: GameScope;
  templateKey: ContextMapTemplateKey;
  region?: Region;
  compact?: boolean;
  className?: string;
  ariaLabel: string;
};

export function StatsProgressMap({
  profile,
  difficulty,
  scope,
  templateKey,
  region,
  compact = false,
  className,
  ariaLabel,
}: StatsProgressMapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [map, setMap] = useState<ParsedContextMap | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);

  const resolveCode = scope === "usa" ? getStateCodeByUsaMapPathId : getCountryCodeByMapPathId;

  const regionCodes = useMemo(() => {
    if (!region) return undefined;
    return new Set(
      filterCountries({ scope, continents: [region] }).map((place) => place.code),
    );
  }, [region, scope]);

  const fillMap = useMemo(() => {
    if (!map) return new Map<string, 0 | 1 | 2 | 3 | 4>();
    const pathIds = map.paths.map((path) => path.id);
    return scope === "usa"
      ? buildUsaProgressFillMap(profile, difficulty, pathIds)
      : buildWorldProgressFillMap(profile, difficulty, pathIds);
  }, [map, profile, difficulty, scope]);

  const pathStyleResolver = useMemo(
    () => createProgressPathStyleResolver(fillMap, isDark, regionCodes, resolveCode),
    [fillMap, isDark, regionCodes, resolveCode],
  );

  const hoveredLabel = useMemo(() => {
    if (!hoveredPathId) return null;
    const code = resolveCode(hoveredPathId);
    if (!code) return null;
    if (regionCodes && !regionCodes.has(code)) return null;
    const level = getPlaceMasteryLevel(code, profile, difficulty);
    return `${getCountryName(code)} · ${level}/4 categories`;
  }, [hoveredPathId, resolveCode, regionCodes, profile, difficulty]);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);

    loadContextMapTemplate(templateKey)
      .then((loaded) => {
        if (!cancelled) setMap(loaded);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [templateKey]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-teal-100 bg-sky-50 dark:border-teal-900/50 dark:bg-slate-950",
        compact ? "aspect-[5/2] w-full min-h-[5.5rem]" : "aspect-[16/10] w-full",
        className,
      )}
    >
      {map ? (
        <>
          <ContextMapSvg
            map={map}
            highlightIds={new Set()}
            neighborIds={new Set()}
            ariaLabel={ariaLabel}
            isDark={isDark}
            interactive
            pathStyleResolver={pathStyleResolver}
            onPathHover={setHoveredPathId}
          />
          {hoveredLabel ? (
            <div className="pointer-events-none absolute bottom-2 left-2 rounded-lg bg-slate-900/85 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              {hoveredLabel}
            </div>
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
  );
}

export function getStatsMapTemplateKey(scope: GameScope, region?: Region): ContextMapTemplateKey {
  if (region && scope === "world") {
    return continentToTemplateKey(region as Continent);
  }
  return scope === "usa" ? "usa" : "world";
}
