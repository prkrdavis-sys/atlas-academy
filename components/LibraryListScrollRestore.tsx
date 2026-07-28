"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import type { LibraryFilter, LibrarySort } from "@/lib/library";
import {
  consumeLibraryListScrollState,
  restoreLibraryListScrollState,
  shouldRestoreLibraryListScroll,
} from "@/lib/library-scroll";
import type { GameScope } from "@/lib/types";

type LibraryListScrollRestoreProps = {
  scope: GameScope;
  filter: LibraryFilter;
  sort: LibrarySort;
};

export function LibraryListScrollRestore({
  scope,
  filter,
  sort,
}: LibraryListScrollRestoreProps) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!shouldRestoreLibraryListScroll()) return;

    const state = consumeLibraryListScrollState();
    if (!state) return;
    if (state.scope !== scope || state.filter !== filter || state.sort !== sort) return;

    const apply = () => restoreLibraryListScrollState(state);

    apply();

    const raf = requestAnimationFrame(apply);
    const shortDelay = window.setTimeout(apply, 100);
    const longDelay = window.setTimeout(apply, 400);
    window.addEventListener("load", apply, { once: true });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(shortDelay);
      window.clearTimeout(longDelay);
      window.removeEventListener("load", apply);
    };
  }, [pathname, scope, filter, sort]);

  return null;
}
