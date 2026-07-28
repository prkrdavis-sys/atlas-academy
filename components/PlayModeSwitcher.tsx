"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPrimaryNavHref } from "@/lib/navigation";
import { useLibraryNavHref } from "@/lib/use-library-nav-href";
import { LIBRARY_ICON } from "@/lib/library";
import { cn } from "@/lib/utils";

const PLAY_MODE_ITEMS = [
  { href: "/map" as const, label: "Map", icon: "🗺️" },
  { href: "/" as const, label: "Play", icon: "🌎" },
  { href: "library" as const, label: "Library", icon: LIBRARY_ICON },
] as const;

export function PlayModeSwitcher() {
  const pathname = usePathname();
  const libraryHref = useLibraryNavHref();
  const activeHref = getPrimaryNavHref(pathname);

  return (
    <div
      role="tablist"
      aria-label="Play mode"
      className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1 shadow-inner dark:border-slate-700 dark:bg-slate-800/80"
    >
      {PLAY_MODE_ITEMS.map((item) => {
        const href = item.href === "library" ? libraryHref : item.href;
        const active = item.href === "library"
          ? activeHref === "/library"
          : item.href === activeHref;
        return (
          <Link
            key={item.label}
            href={href}
            scroll={item.href === "library" ? false : undefined}
            role="tab"
            aria-selected={active}
            className={cn(
              "flex min-h-9 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-all",
              active
                ? "bg-white text-teal-800 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-700 dark:text-teal-300 dark:ring-slate-600/80"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            <span className="text-base leading-none" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
