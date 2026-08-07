import { Suspense } from "react";
import { LibraryPageContent } from "@/components/LibraryPageContent";
import { GLASS_PANEL_CLASS } from "@/lib/glass";

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-5 sm:space-y-7">
          <div className={`${GLASS_PANEL_CLASS} h-44 animate-pulse rounded-[1.75rem]`} />
        </div>
      }
    >
      <LibraryPageContent />
    </Suspense>
  );
}
