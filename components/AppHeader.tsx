"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { HeaderStreakChip } from "@/components/HeaderStreakChip";
import { LibraryScrollKeeper } from "@/components/LibraryScrollKeeper";
import { MobileBottomDock } from "@/components/MobileBottomDock";
import { PlayModeSwitcher } from "@/components/PlayModeSwitcher";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { getPrimaryNavHref, isExploreRoute } from "@/lib/navigation";
import { useLibraryNavHref } from "@/lib/use-library-nav-href";
import { LIBRARY_ICON } from "@/lib/library";
import { cn } from "@/lib/utils";

const MOBILE_NAV_ITEMS = [
  { href: "/map" as const, label: "Map", icon: "🗺️" },
  { href: "/" as const, label: "Play", icon: "🌎" },
  { href: "library" as const, label: "Library", icon: LIBRARY_ICON },
] as const;

function isMobileNavItemActive(
  pathname: string,
  item: (typeof MOBILE_NAV_ITEMS)[number],
): boolean {
  if (item.href === "library") return getPrimaryNavHref(pathname) === "/library";
  return getPrimaryNavHref(pathname) === item.href;
}

export function AppHeader() {
  const pathname = usePathname();
  const libraryHref = useLibraryNavHref();
  const onLibraryTab = isExploreRoute(pathname);
  const hideHeader = pathname.startsWith("/play/") && !pathname.startsWith("/play/setup");

  if (hideHeader) return null;

  return (
    <>
      <Suspense fallback={null}>
        <LibraryScrollKeeper />
      </Suspense>
      <header className="sticky top-0 z-40 border-b border-teal-900/10 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/85">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:h-16">
          <Link
            href="/"
            className="font-display text-lg font-extrabold tracking-tight text-teal-800 transition-opacity active:opacity-60 dark:text-teal-300 sm:text-xl"
          >
            <span aria-hidden>🌍</span> Atlas Academy
          </Link>
          <div className="hidden flex-1 justify-center sm:flex">
            <PlayModeSwitcher />
          </div>
          <div className="ml-auto flex items-center gap-1 sm:hidden">
            <HeaderStreakChip />
            <ProfileSwitcher compact />
          </div>
          <div className="hidden items-center gap-1.5 sm:flex">
            <HeaderStreakChip />
            <ProfileSwitcher />
          </div>
        </div>
      </header>

      <MobileBottomDock>
        <nav
          aria-label="Primary navigation"
          className="relative pb-[env(safe-area-inset-bottom)]"
        >
          {/* Glass on an absolute child so Safari 26 Liquid Glass doesn't sample
              background/backdrop-filter from the fixed shell itself. */}
          <div
            aria-hidden
            className="absolute inset-0 border-t border-slate-200/90 bg-white/92 shadow-[0_-8px_30px_rgb(15_23_42_/_0.08)] backdrop-blur-xl dark:border-slate-700/90 dark:bg-slate-900/92 dark:shadow-[0_-8px_30px_rgb(0_0_0_/_0.3)]"
          />
          <div className="relative mx-auto grid h-16 max-w-md grid-cols-3 px-2">
            {MOBILE_NAV_ITEMS.map((item) => {
              const href = item.href === "library" ? libraryHref : item.href;
              const active = isMobileNavItemActive(pathname, item);
              return (
                <Link
                  key={item.label}
                  href={href}
                  scroll={item.href === "library" && !onLibraryTab ? false : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold transition-colors active:bg-slate-100 dark:active:bg-slate-800",
                    active ? "text-teal-700 dark:text-teal-300" : "text-slate-500 dark:text-slate-400",
                  )}
                >
                  <span className="text-xl leading-none" aria-hidden>{item.icon}</span>
                  <span>{item.label}</span>
                  {active && <span className="absolute bottom-1 h-1 w-5 rounded-full bg-teal-600 dark:bg-teal-400" />}
                </Link>
              );
            })}
          </div>
        </nav>
      </MobileBottomDock>
    </>
  );
}
