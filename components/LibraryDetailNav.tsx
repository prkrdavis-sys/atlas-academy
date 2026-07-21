import Link from "next/link";
import { LibrarySearch } from "@/components/LibrarySearch";
import {
  buildLibraryDetailHref,
  buildLibraryListHref,
  type LibraryFilter,
} from "@/lib/library";
import type { Country, GameScope } from "@/lib/types";

type LibraryDetailNavProps = {
  scope: GameScope;
  filter: LibraryFilter;
  isState: boolean;
  prev: Country | null;
  next: Country | null;
  index: number;
  total: number;
};

const navButtonClass =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-teal-400 hover:text-teal-700 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-teal-500 dark:hover:text-teal-300";

const disabledNavClass = `${navButtonClass} pointer-events-none opacity-40`;

export function LibraryDetailNav({
  scope,
  filter,
  isState,
  prev,
  next,
  index,
  total,
}: LibraryDetailNavProps) {
  const positionLabel = index >= 0 && total > 0 ? `${index + 1} of ${total}` : null;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link href={buildLibraryListHref(scope, filter)} className={`${navButtonClass} shrink-0`}>
        {isState ? "← All states" : "← All countries"}
      </Link>

      <LibrarySearch
        scope={scope}
        filter={filter}
        isState={isState}
        className="min-w-0 flex-1"
      />

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {positionLabel ? (
          <p className="hidden text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400 sm:block">
            {positionLabel}
          </p>
        ) : null}
        {prev ? (
          <Link
            href={buildLibraryDetailHref(prev.code, scope, filter)}
            aria-label={`Previous: ${prev.name}`}
            className={navButtonClass}
          >
            <span aria-hidden>←</span>
            <span className="hidden sm:inline">Previous</span>
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledNavClass}>
            <span aria-hidden>←</span>
            <span className="hidden sm:inline">Previous</span>
          </span>
        )}
        {next ? (
          <Link
            href={buildLibraryDetailHref(next.code, scope, filter)}
            aria-label={`Next: ${next.name}`}
            className={navButtonClass}
          >
            <span className="hidden sm:inline">Next</span>
            <span aria-hidden>→</span>
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledNavClass}>
            <span className="hidden sm:inline">Next</span>
            <span aria-hidden>→</span>
          </span>
        )}
      </div>
    </div>
  );
}
