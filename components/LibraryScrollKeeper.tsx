"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  LIBRARY_LAST_PATH_KEY,
  markLibraryScrollRestore,
  persistLibrarySession,
  type LibraryLocation,
} from "@/lib/library-scroll";
import { isExploreRoute } from "@/lib/navigation";

function toLibraryPath(location: LibraryLocation): string {
  return location.search
    ? `${location.pathname}?${location.search}`
    : location.pathname;
}

/** Persists library scroll + last path when leaving the Explore tab. */
export function LibraryScrollKeeper() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const libraryLocationRef = useRef<LibraryLocation | null>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (!isExploreRoute(pathname)) return;

    const location = {
      pathname,
      search: searchParams.toString(),
    };
    libraryLocationRef.current = location;
    sessionStorage.setItem(LIBRARY_LAST_PATH_KEY, toLibraryPath(location));
  }, [pathname, searchParams]);

  useEffect(() => {
    const previousPath = prevPathRef.current;
    prevPathRef.current = pathname;

    if (isExploreRoute(previousPath) && !isExploreRoute(pathname) && libraryLocationRef.current) {
      persistLibrarySession(libraryLocationRef.current);
    }
  }, [pathname]);

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
