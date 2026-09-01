"use client";

import { usePathname } from "next/navigation";
import { getPrimaryNavHref, isExploreRoute } from "@/lib/navigation";
import { useLibraryNavHref } from "@/lib/use-library-nav-href";
import { LIBRARY_ICON } from "@/lib/library";
import { CoachMarkLink } from "@/components/CoachMarkProvider";
import { cn } from "@/lib/utils";
import type { CoachMarkId } from "@/lib/coach-marks";

const PLAY_MODE_ITEMS = [
  { href: "/map" as const, label: "Map", icon: "🗺️", markId: "map-nav" as const },
  { href: "/" as const, label: "Play", icon: "🌎", markId: null },
  { href: "library" as const, label: "Library", icon: LIBRARY_ICON, markId: "library-nav" as const },
] as const satisfies readonly {
  href: "/map" | "/" | "library";
  label: string;
  icon: string;
  markId: CoachMarkId | null;
}[];

const TAB_TRACK = PLAY_MODE_ITEMS.reduce((widest, item) =>
  item.label.length >= widest.label.length ? item : widest,
);

export function PlayModeSwitcher() {
  const pathname = usePathname();
  const libraryHref = useLibraryNavHref();
  const activeHref = getPrimaryNavHref(pathname);
  const onLibraryTab = isExploreRoute(pathname);
  const activeIndex = PLAY_MODE_ITEMS.findIndex((item) =>
    item.href === "library" ? activeHref === "/library" : item.href === activeHref,
  );

  return (
    <div
      role="tablist"
      aria-label="Play mode"
      className="relative inline-flex w-max shrink-0 rounded-full border border-slate-200 bg-slate-100 p-1 shadow-inner dark:border-slate-700 dark:bg-slate-800/80"
    >
      {activeIndex >= 0 ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-white shadow-sm ring-1 ring-slate-200/80 transition-transform duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-slate-700 dark:ring-slate-600/80"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
      ) : null}
      {PLAY_MODE_ITEMS.map((item) => {
        const href = item.href === "library" ? libraryHref : item.href;
        const active = item.href === "library"
          ? activeHref === "/library"
          : item.href === activeHref;
        return (
          <CoachMarkLink
            key={item.label}
            markId={item.markId}
            href={href}
            scroll={item.href === "library" && !onLibraryTab ? false : undefined}
            role="tab"
            aria-selected={active}
            className={cn(
              "relative z-10 inline-grid min-h-9 items-center justify-items-center px-3.5 py-1.5 text-sm font-bold transition-colors duration-300 lg:px-4",
              active
                ? "text-teal-800 dark:text-teal-300"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            <span
              className="invisible col-start-1 row-start-1 inline-flex items-center gap-1.5 whitespace-nowrap"
              aria-hidden
            >
              <span className="text-base leading-none">{TAB_TRACK.icon}</span>
              {TAB_TRACK.label}
            </span>
            <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-base leading-none" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </span>
          </CoachMarkLink>
        );
      })}
    </div>
  );
}
