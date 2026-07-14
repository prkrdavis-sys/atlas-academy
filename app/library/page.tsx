import { Suspense } from "react";
import { LibraryPageContent } from "@/components/LibraryPageContent";

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-5 sm:space-y-7">
          <div className="h-44 animate-pulse rounded-[1.75rem] bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
      }
    >
      <LibraryPageContent />
    </Suspense>
  );
}
