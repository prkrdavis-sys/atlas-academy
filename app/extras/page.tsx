import { Suspense } from "react";
import { ExtrasPageContent } from "@/components/ExtrasPageContent";

function ExtrasPageFallback() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="h-14 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[5.25rem] animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70"
          />
        ))}
      </div>
      <div className="grid gap-3 sm:gap-4">
        <div className="h-44 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
        <div className="h-44 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
      </div>
    </div>
  );
}

export default function ExtrasPage() {
  return (
    <Suspense fallback={<ExtrasPageFallback />}>
      <ExtrasPageContent />
    </Suspense>
  );
}
