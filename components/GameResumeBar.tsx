"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MobileBottomDock } from "@/components/MobileBottomDock";
import {
  clearGameResumeSnapshot,
  loadGameResumeSnapshot,
} from "@/lib/game-resume";
import { isExploreRoute } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function isResumePlayPath(pathname: string, playHref: string): boolean {
  const pathOnly = playHref.split("?")[0] ?? playHref;
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

/**
 * Green resume CTA while browsing the library after leaving a learn-card mid-round.
 * Clears when the user leaves the library tab (except to resume) or taps resume.
 */
export function GameResumeBar() {
  const pathname = usePathname();
  const [playHref, setPlayHref] = useState<string | null>(null);
  const prevPathRef = useRef(pathname);
  const onLibrary = isExploreRoute(pathname);

  useEffect(() => {
    const previousPath = prevPathRef.current;
    prevPathRef.current = pathname;

    if (isExploreRoute(pathname)) {
      setPlayHref(loadGameResumeSnapshot()?.playHref ?? null);
      return;
    }

    if (!isExploreRoute(previousPath)) return;

    const snapshot = loadGameResumeSnapshot();
    if (snapshot && isResumePlayPath(pathname, snapshot.playHref)) {
      // Heading back into the game — keep snapshot for GameBoard hydrate.
      setPlayHref(null);
      return;
    }

    clearGameResumeSnapshot();
    setPlayHref(null);
  }, [pathname]);

  if (!onLibrary || !playHref) return null;

  return (
    <>
      {/* Mobile: pinned above the tab bar */}
      <MobileBottomDock
        className="z-50"
        barClassName="px-3 pb-[calc(4.25rem+env(safe-area-inset-bottom))]"
      >
        <Link
          href={playHref}
          onClick={() => setPlayHref(null)}
          className={cn(
            "play-glow-button flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl",
            "bg-gradient-to-b from-emerald-400 to-teal-600 px-5 py-3",
            "font-display text-base font-extrabold text-white",
            "shadow-[0_8px_24px_-8px_rgb(15_118_110_/_0.55)]",
            "transition-transform active:scale-[0.98]",
          )}
        >
          <span aria-hidden>▶</span>
          Resume game
        </Link>
      </MobileBottomDock>

      {/* Desktop: floating bottom CTA (tab bar is in the header) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 hidden px-4 sm:block">
        <div className="pointer-events-auto mx-auto max-w-md">
          <Link
            href={playHref}
            onClick={() => setPlayHref(null)}
            className={cn(
              "play-glow-button flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl",
              "bg-gradient-to-b from-emerald-400 to-teal-600 px-5 py-3",
              "font-display text-lg font-extrabold text-white",
              "shadow-[0_10px_28px_-8px_rgb(15_118_110_/_0.55)]",
              "transition-transform hover:scale-[1.02] active:scale-[0.98]",
            )}
          >
            <span aria-hidden>▶</span>
            Resume game
          </Link>
        </div>
      </div>
    </>
  );
}
