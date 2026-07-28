"use client";

import { useEffect } from "react";
import { markLibraryScrollRestore } from "@/lib/library-scroll";
import { isExploreRoute } from "@/lib/navigation";

/** Marks scroll restore when the user browser-backs into the library. */
export function LibraryDetailBackListener() {
  useEffect(() => {
    const onPopState = () => {
      if (isExploreRoute(window.location.pathname)) {
        markLibraryScrollRestore();
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return null;
}
