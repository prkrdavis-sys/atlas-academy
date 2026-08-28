import { GLASS_PANEL_CLASS } from "@/lib/glass";

export function LibraryPageFallback() {
  return (
    <div className="space-y-5 sm:space-y-7">
      <div className={`${GLASS_PANEL_CLASS} h-56 animate-pulse rounded-[1.75rem]`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className={`${GLASS_PANEL_CLASS} h-48 animate-pulse rounded-2xl sm:h-56`}
          />
        ))}
      </div>
    </div>
  );
}
