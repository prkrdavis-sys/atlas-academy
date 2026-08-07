"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LibraryBrowser } from "@/components/LibraryBrowser";
import { LibraryPageFallback } from "@/components/LibraryPageFallback";
import { buildLibraryListHref, getStoredLibraryFilter, getStoredLibrarySort } from "@/lib/library";
import { getStoredLibraryScope, normalizeScope, setStoredLibraryScope } from "@/lib/scope";
import type { GameScope } from "@/lib/types";

function resolveStoredScope(): GameScope {
  return getStoredLibraryScope() === "usa" ? "usa" : "world";
}

export function LibraryPageContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [scope, setScope] = useState<GameScope | null>(null);
  const onLibraryList = pathname === "/library";

  useEffect(() => {
    const scopeParam = searchParams.get("scope");

    // Warm mounts on Map/Play must never change the URL.
    if (!onLibraryList) {
      const next = scopeParam !== null ? normalizeScope(scopeParam) : resolveStoredScope();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScope(next);
      return;
    }

    if (scopeParam !== null) {
      const next = normalizeScope(scopeParam);
      setScope(next);
      setStoredLibraryScope(next);
      return;
    }

    const stored = getStoredLibraryScope();
    if (stored === "usa") {
      router.replace(buildLibraryListHref("usa", getStoredLibraryFilter("usa"), getStoredLibrarySort("usa")));
      return;
    }

    setScope("world");
    setStoredLibraryScope("world");
  }, [onLibraryList, searchParams, router]);

  if (scope === null) return <LibraryPageFallback />;

  return <LibraryBrowser key={scope} scope={scope} />;
}
