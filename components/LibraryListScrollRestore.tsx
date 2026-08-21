"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import type { LibraryFilter, LibrarySort } from "@/lib/library";
import {
  consumeLibraryListScrollState,
  restoreLibraryListScrollState,
  scheduleRestoreAttempts,
  shouldRestoreLibraryScroll,
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
    if (!shouldRestoreLibraryScroll()) return;

    const state = consumeLibraryListScrollState();
    if (!state) return;
    if (state.scope !== scope || state.filter !== filter || state.sort !== sort) return;

    const apply = () => restoreLibraryListScrollState(state);
    return scheduleRestoreAttempts(apply);
  }, [pathname, scope, filter, sort]);

  return null;
}
