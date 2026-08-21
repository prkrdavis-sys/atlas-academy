"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import {
  clearLibraryScrollRestore,
  consumeLibraryScrollState,
  LIBRARY_SCROLL_STORAGE_KEY,
  restoreLibraryScrollState,
  scheduleRestoreAttempts,
  shouldRestoreLibraryScroll,
} from "@/lib/library-scroll";

export function LibraryScrollRestore() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!shouldRestoreLibraryScroll()) {
      sessionStorage.removeItem(LIBRARY_SCROLL_STORAGE_KEY);
      return;
    }

    const state = consumeLibraryScrollState();
    if (!state) {
      clearLibraryScrollRestore();
      return;
    }

    clearLibraryScrollRestore();
    return scheduleRestoreAttempts(() => restoreLibraryScrollState(state));
  }, [pathname]);

  return null;
}
