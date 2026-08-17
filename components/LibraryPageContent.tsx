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
    const stored = getStoredLibraryScope();
    // #region agent log
    fetch("http://127.0.0.1:7905/ingest/53dc1e10-6e0b-4fef-9ca0-63e913b775c1", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "124d3d" },
      body: JSON.stringify({
        sessionId: "124d3d",
        runId: "pre-fix",
        hypothesisId: "E",
        location: "LibraryPageContent.tsx:scope-effect",
        message: "LibraryPageContent scope effect",
        data: {
          pathname,
          onLibraryList,
          scopeParam,
          stored,
          willReplaceUsa: onLibraryList && scopeParam === null && stored === "usa",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

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

    if (stored === "usa") {
      router.replace(buildLibraryListHref("usa", getStoredLibraryFilter("usa"), getStoredLibrarySort("usa")));
      return;
    }

    setScope("world");
    setStoredLibraryScope("world");
  }, [onLibraryList, pathname, searchParams, router]);

  if (scope === null) return <LibraryPageFallback />;

  return <LibraryBrowser key={scope} scope={scope} />;
}
