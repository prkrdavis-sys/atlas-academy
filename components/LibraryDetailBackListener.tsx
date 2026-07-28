"use client";

import { useEffect } from "react";
import { isLibraryListPath, markLibraryListScrollRestore } from "@/lib/library-scroll";

/** Marks list scroll restore when the user browser-backs from a detail page to the list. */
export function LibraryDetailBackListener() {
  useEffect(() => {
    const onPopState = () => {
      if (isLibraryListPath(window.location.pathname)) {
        markLibraryListScrollRestore();
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return null;
}
