import { Suspense } from "react";
import { MapPageContent } from "@/components/MapPageContent";

function MapPageFallback() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="h-16 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="aspect-[2/1] animate-pulse rounded-[1.75rem] border-2 border-slate-200 bg-slate-200/60 dark:border-slate-700 dark:bg-slate-700/60" />
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<MapPageFallback />}>
      <MapPageContent />
    </Suspense>
  );
}
