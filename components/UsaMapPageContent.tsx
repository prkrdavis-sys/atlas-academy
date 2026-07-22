"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const UsaMapExplorer = dynamic(
  () => import("@/components/UsaMapExplorer").then((module) => module.UsaMapExplorer),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[16/9] animate-pulse rounded-[1.75rem] border-2 border-slate-200 bg-slate-200/60 dark:border-slate-700 dark:bg-slate-700/60 sm:aspect-[2/1]" />
    ),
  },
);

export function UsaMapPageContent() {
  const searchParams = useSearchParams();
  const initialPlaceCode = searchParams.get("place");

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          🇺🇸 USA Map
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Explore all 50 states on an interactive U.S. map. Pan and zoom to find a place, then click to
          select it and jump to its Library entry.
        </p>
      </header>

      <UsaMapExplorer initialPlaceCode={initialPlaceCode} />
    </div>
  );
}
