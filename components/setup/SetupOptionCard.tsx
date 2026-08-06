"use client";

import { cn } from "@/lib/utils";

type SetupOptionCardProps = {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  icon?: string;
  /** Extra caveat shown under the description, e.g. Easy not tracking progress. */
  note?: string;
};

/** Radio option sized for a sheet: title, what it changes, and a filled dot. */
export function SetupOptionCard({
  selected,
  onSelect,
  title,
  description,
  icon,
  note,
}: SetupOptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left transition-colors sm:p-3.5",
        selected
          ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          selected
            ? "border-emerald-600 dark:border-emerald-400"
            : "border-slate-300 dark:border-slate-600",
        )}
      >
        {selected ? (
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-extrabold text-slate-900 dark:text-slate-100">
          {icon ? <span aria-hidden>{icon} </span> : null}
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-600 dark:text-slate-400">
          {description}
        </span>
        {note ? (
          <span className="mt-1.5 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[0.7rem] font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
            {note}
          </span>
        ) : null}
      </span>
    </button>
  );
}
