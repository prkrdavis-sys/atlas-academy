"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getLastLibraryHref } from "@/lib/library-scroll";
import { isExploreRoute } from "@/lib/navigation";

/**
 * Resolves the Library tab href:
 * - Outside Library → last visited library page
 * - Already in Library → main list (`/library`), so tapping again resets
 */
export function useLibraryNavHref(): string {
  const pathname = usePathname();
  const [href, setHref] = useState("/library");

  useEffect(() => {
    if (isExploreRoute(pathname)) {
      setHref("/library");
      return;
    }
    setHref(getLastLibraryHref());
  }, [pathname]);

  return href;
}
