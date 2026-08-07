"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LibrarySearch } from "@/components/LibrarySearch";
import { useProfiles } from "@/components/ProfileProvider";
import { GLASS_CONTROL_CLASS, GLASS_PANEL_CLASS } from "@/lib/glass";
import {
  buildLibraryDetailHref,
  buildLibraryListHref,
  getLibraryNeighbors,
  normalizeLibrarySort,
  type LibraryFilter,
} from "@/lib/library";
import {
  captureLibraryScrollState,
  LIBRARY_DETAIL_NAV_ID,
  LIBRARY_PLACE_TITLE_ID,
  markLibraryScrollRestore,
} from "@/lib/library-scroll";
import { getCommonlyMissedCountries } from "@/lib/stats-helpers";
import type { GameScope } from "@/lib/types";
import { cn } from "@/lib/utils";

type LibraryDetailNavProps = {
  scope: GameScope;
  filter: LibraryFilter;
  isState: boolean;
  currentCode: string;
  placeName: string;
};

const navButtonClass =
  `${GLASS_CONTROL_CLASS} inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-teal-400 hover:text-teal-700 active:scale-[0.98] dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-300`;

const disabledNavClass = `${navButtonClass} pointer-events-none opacity-40`;

export function LibraryDetailNav({
  scope,
  filter,
  isState,
  currentCode,
  placeName,
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
  const [showStickyTitle, setShowStickyTitle] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPinned(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const title = document.getElementById(LIBRARY_PLACE_TITLE_ID);
    if (!title) return;

    let observer: IntersectionObserver | null = null;

    const observe = () => {
      observer?.disconnect();

      const headerOffset = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--app-header-offset"),
      );
      const chromeTop = Number.isFinite(headerOffset) ? headerOffset : 0;
      // Match the sticky controls row so the centered title appears once the
      // hero name scrolls under the library nav, not only under the app header.
      const navControlsApproxPx = 56;
      const topInset = chromeTop + navControlsApproxPx;

      observer = new IntersectionObserver(
        ([entry]) => {
          setShowStickyTitle(!entry.isIntersecting);
        },
        {
          rootMargin: `-${topInset}px 0px 0px 0px`,
          threshold: 0,
        },
      );
      observer.observe(title);
    };

    observe();
    window.addEventListener("resize", observe);

    return () => {
      window.removeEventListener("resize", observe);
      observer?.disconnect();
    };
  }, [placeName]);

  const chromeActive = isPinned || showStickyTitle;

  return (
    <>
      <div ref={sentinelRef} className="pointer-events-none -mb-2 h-px" aria-hidden />
      <div
        id={LIBRARY_DETAIL_NAV_ID}
        className={cn(
          "relative z-30 -mx-4 sticky top-[var(--app-header-offset)] px-4 py-2 transition-[background-color,border-color,box-shadow] duration-200 sm:mx-0 sm:px-0",
          chromeActive &&
            `${GLASS_PANEL_CLASS} rounded-none border-x-0 border-t-0`,
        )}
      >
        <div className="relative flex items-center gap-2 sm:gap-3">
          <Link
            href={buildLibraryListHref(scope, resolvedFilter, sort)}
            onClick={markLibraryScrollRestore}
            scroll={false}
            className={`${navButtonClass} shrink-0`}
          >
            {isState ? "← All states" : "← All countries"}
          </Link>

          <LibrarySearch
            scope={scope}
            filter={resolvedFilter}
            sort={sort}
            isState={isState}
            mobileDropdownFullWidth
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
                scroll={false}
                onClick={() => {
                  captureLibraryScrollState();
                  markLibraryScrollRestore();
                }}
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
                scroll={false}
                onClick={() => {
                  captureLibraryScrollState();
                  markLibraryScrollRestore();
                }}
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

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
            showStickyTitle ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
          aria-hidden={!showStickyTitle}
        >
          <div className="overflow-hidden">
            <p className="truncate pt-2 text-center font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">
              {placeName}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
