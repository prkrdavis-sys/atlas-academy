"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LibrarySearch } from "@/components/LibrarySearch";
import { useProfiles } from "@/components/ProfileProvider";
import {
  buildLibraryDetailHref,
  buildLibraryListHref,
  getLibraryNeighbors,
  normalizeLibrarySort,
  type LibraryFilter,
} from "@/lib/library";
import { getCommonlyMissedCountries } from "@/lib/stats-helpers";
import type { GameScope } from "@/lib/types";
import { cn } from "@/lib/utils";

type LibraryDetailNavProps = {
  scope: GameScope;
  filter: LibraryFilter;
  isState: boolean;
  currentCode: string;
};

const navButtonClass =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-teal-400 hover:text-teal-700 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-300";

const disabledNavClass = `${navButtonClass} pointer-events-none opacity-40`;

export function LibraryDetailNav({
  scope,
  filter,
  isState,
  currentCode,
}: LibraryDetailNavProps) {
  const searchParams = useSearchParams();
  const { activeProfile } = useProfiles();
  const sort = normalizeLibrarySort(searchParams.get("sort"));
  const commonlyMissedCodes = useMemo(
    () => (activeProfile ? getCommonlyMissedCountries(activeProfile, scope) : []),
    [activeProfile, scope],
  );
  const { prev, next, index, total, filter: resolvedFilter } = useMemo(
    () => getLibraryNeighbors(currentCode, scope, filter, sort, commonlyMissedCodes),
    [currentCode, scope, filter, sort, commonlyMissedCodes],
  );
  const positionLabel = index >= 0 && total > 0 ? `${index + 1} of ${total}` : null;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const mobileQuery = window.matchMedia("(max-width: 639px)");
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPinned(mobileQuery.matches && !entry.isIntersecting);
      },
      { threshold: 0 },
    );

    const handleViewportChange = () => {
      if (!mobileQuery.matches) setIsPinned(false);
    };

    observer.observe(sentinel);
    mobileQuery.addEventListener("change", handleViewportChange);
    return () => {
      observer.disconnect();
      mobileQuery.removeEventListener("change", handleViewportChange);
    };
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="pointer-events-none -mb-2 h-px sm:hidden" aria-hidden />
      <div
        className={cn(
          "relative z-30 -mx-4 px-4 py-2 transition-[background-color,border-color,box-shadow] duration-200 max-sm:sticky max-sm:top-[var(--app-header-offset)] sm:static sm:mx-0 sm:px-0 sm:py-0",
          isPinned &&
            "max-sm:border-b max-sm:border-teal-900/10 max-sm:bg-white/85 max-sm:backdrop-blur-xl max-sm:dark:border-slate-700/50 max-sm:dark:bg-slate-900/85",
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href={buildLibraryListHref(scope, resolvedFilter, sort)} className={`${navButtonClass} shrink-0`}>
            {isState ? "← All states" : "← All countries"}
          </Link>

          <LibrarySearch
            scope={scope}
            filter={resolvedFilter}
            sort={sort}
            isState={isState}
            className="min-w-0 flex-1"
          />

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {positionLabel ? (
              <p className="hidden text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400 sm:block">
                {positionLabel}
              </p>
            ) : null}
            {prev ? (
              <Link
                href={buildLibraryDetailHref(prev.code, scope, resolvedFilter, sort)}
                aria-label={`Previous: ${prev.name}`}
                className={navButtonClass}
              >
                <span aria-hidden>←</span>
                <span className="hidden sm:inline">Previous</span>
              </Link>
            ) : (
              <span aria-disabled="true" className={disabledNavClass}>
                <span aria-hidden>←</span>
                <span className="hidden sm:inline">Previous</span>
              </span>
            )}
            {next ? (
              <Link
                href={buildLibraryDetailHref(next.code, scope, resolvedFilter, sort)}
                aria-label={`Next: ${next.name}`}
                className={navButtonClass}
              >
                <span className="hidden sm:inline">Next</span>
                <span aria-hidden>→</span>
              </Link>
            ) : (
              <span aria-disabled="true" className={disabledNavClass}>
                <span className="hidden sm:inline">Next</span>
                <span aria-hidden>→</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
