"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getLastLibraryHref } from "@/lib/library-scroll";
import { isExploreRoute } from "@/lib/navigation";

/** Resolves the Explore tab href to the last visited library page. */
export function useLibraryNavHref(): string {
  const pathname = usePathname();
  const [href, setHref] = useState("/library");

  useEffect(() => {
    if (!isExploreRoute(pathname)) {
      setHref(getLastLibraryHref());
    }
  }, [pathname]);

  return href;
}
