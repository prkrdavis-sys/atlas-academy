import Link from "next/link";
import { cn } from "@/lib/utils";

type SnapshotCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone: "amber" | "emerald" | "sky" | "slate";
};

const TONE_STYLES: Record<SnapshotCardProps["tone"], string> = {
  amber:
    "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950/50 dark:to-orange-950/50",
  emerald:
    "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-800 dark:from-emerald-950/50 dark:to-teal-950/50",
  sky: "border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 dark:border-sky-800 dark:from-sky-950/50 dark:to-cyan-950/50",
  slate:
    "border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 dark:border-slate-600 dark:from-slate-900/80 dark:to-slate-800/80",
};

const TONE_LABEL: Record<SnapshotCardProps["tone"], string> = {
  amber: "text-amber-700 dark:text-amber-400",
  emerald: "text-emerald-700 dark:text-emerald-400",
  sky: "text-sky-700 dark:text-sky-400",
  slate: "text-slate-600 dark:text-slate-400",
};

const TONE_VALUE: Record<SnapshotCardProps["tone"], string> = {
  amber: "text-amber-900 dark:text-amber-200",
  emerald: "text-emerald-900 dark:text-emerald-200",
  sky: "text-sky-900 dark:text-sky-200",
  slate: "text-slate-900 dark:text-slate-100",
};

const TONE_HINT: Record<SnapshotCardProps["tone"], string> = {
  amber: "text-amber-800/80 dark:text-amber-300/80",
  emerald: "text-emerald-800/80 dark:text-emerald-300/80",
  sky: "text-sky-800/80 dark:text-sky-300/80",
  slate: "text-slate-600 dark:text-slate-400",
};

export function StatsSnapshotCard({ label, value, hint, tone }: SnapshotCardProps) {
  return (
    <div className={cn("rounded-2xl border-2 p-4 shadow-sm sm:p-5", TONE_STYLES[tone])}>
      <p className={cn("text-xs font-semibold uppercase tracking-wide", TONE_LABEL[tone])}>
        {label}
      </p>
      <p className={cn("mt-1 font-display text-3xl font-extrabold tabular-nums sm:text-4xl", TONE_VALUE[tone])}>
        {value}
      </p>
      {hint ? (
        <p className={cn("mt-1 hidden text-sm sm:block", TONE_HINT[tone])}>{hint}</p>
      ) : null}
    </div>
  );
}

export function AdvancedStatsLink({ className }: { className?: string }) {
  return (
    <Link
      href="/stats/advanced"
      className={cn(
        "group flex items-center justify-between gap-4 rounded-[1.75rem] border-2 border-slate-200 bg-white/90 px-5 py-4 shadow-md backdrop-blur transition-colors hover:border-teal-300 hover:bg-teal-50/60 dark:border-slate-700 dark:bg-slate-900/90 dark:hover:border-teal-600 dark:hover:bg-teal-950/30 sm:px-6 sm:py-5",
        className,
      )}
    >
      <div>
        <p className="font-display text-base font-extrabold text-slate-900 dark:text-slate-100 sm:text-lg">
          Advanced stats
        </p>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
          Full mode tables, difficulty breakdowns, and weak spots
        </p>
      </div>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500 font-display text-lg font-extrabold text-white shadow-[0_3px_0_var(--color-teal-700)] transition-transform group-hover:translate-x-0.5"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}
