"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LibraryBrowser } from "@/components/LibraryBrowser";
import { getStoredLibraryScope, normalizeScope, setStoredLibraryScope } from "@/lib/scope";
import type { GameScope } from "@/lib/types";

function LibraryPageFallback() {
  return (
    <div className="space-y-5 sm:space-y-7">
      <div className="h-44 animate-pulse rounded-[1.75rem] bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="h-10 w-64 animate-pulse rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70 sm:h-56"
          />
        ))}
      </div>
    </div>
  );
}

export function LibraryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [scope, setScope] = useState<GameScope | null>(null);

  useEffect(() => {
    const scopeParam = searchParams.get("scope");
    if (scopeParam !== null) {
      const next = normalizeScope(scopeParam);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScope(next);
      setStoredLibraryScope(next);
      return;
    }

    const stored = getStoredLibraryScope();
    if (stored === "usa") {
      router.replace("/library?scope=usa");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScope("world");
    setStoredLibraryScope("world");
  }, [searchParams, router]);

  if (scope === null) return <LibraryPageFallback />;

  return <LibraryBrowser key={scope} scope={scope} />;
}
