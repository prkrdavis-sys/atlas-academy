"use client";

import { cn } from "@/lib/utils";
import { scopeText } from "@/lib/scope";
import type { ModeStatRow } from "@/lib/stats-helpers";
import type { GameScope } from "@/lib/types";

export type StatsChartMetric = "accuracy" | "played" | "bestStreak";

const METRIC_OPTIONS: { id: StatsChartMetric; label: string }[] = [
  { id: "accuracy", label: "Accuracy" },
  { id: "played", label: "Played" },
  { id: "bestStreak", label: "Best streak" },
];

function metricValue(row: ModeStatRow, metric: StatsChartMetric): number {
  switch (metric) {
    case "accuracy":
      return row.accuracy;
    case "played":
      return row.totalPlayed;
    case "bestStreak":
      return row.bestStreak;
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function formatMetric(row: ModeStatRow, metric: StatsChartMetric): string {
  switch (metric) {
    case "accuracy":
      return row.totalPlayed > 0 ? `${row.accuracy}%` : "—";
    case "played":
      return String(row.totalPlayed);
    case "bestStreak":
      return String(row.bestStreak);
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

type StatsModeChartProps = {
  rows: ModeStatRow[];
  scope: GameScope;
  metric: StatsChartMetric;
  onMetricChange: (metric: StatsChartMetric) => void;
  className?: string;
};

export function StatsModeChart({
  rows,
  scope,
  metric,
  onMetricChange,
  className,
}: StatsModeChartProps) {
  const chartRows = rows.filter((row) => row.totalPlayed > 0);
  const maxValue = Math.max(1, ...chartRows.map((row) => metricValue(row, metric)));
  const hasAnyPlay = chartRows.length > 0;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90",
        className,
      )}
    >
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/80 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100 sm:text-lg">
              Mode comparison
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
              Quick look at how each mode stacks up
            </p>
          </div>
          <div
            className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800"
            role="group"
            aria-label="Chart metric"
          >
            {METRIC_OPTIONS.map((option) => {
              const active = metric === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onMetricChange(option.id)}
                  className={cn(
                    "min-h-9 rounded-xl px-2.5 py-1.5 font-display text-xs font-extrabold transition-all sm:px-3 sm:text-sm",
                    active
                      ? "bg-white text-teal-800 shadow-sm dark:bg-slate-900 dark:text-teal-300"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5">
        {!hasAnyPlay ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            Play a few rounds to fill this chart.
          </p>
        ) : (
          <ul className="space-y-3" aria-label={`Mode ${metric} chart`}>
            {chartRows.map((row) => {
              const value = metricValue(row, metric);
              const widthPct = Math.max(value > 0 ? 4 : 0, (value / maxValue) * 100);

              return (
                <li key={row.mode} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2 sm:grid-cols-[minmax(0,11rem)_1fr_3.5rem] sm:gap-3">
                  <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                    <span className="shrink-0 text-base" aria-hidden>
                      {row.icon}
                    </span>
                    <span className="truncate font-display text-xs font-extrabold text-slate-800 dark:text-slate-100 sm:text-sm">
                      {scopeText(row.title, scope)}
                    </span>
                  </div>
                  <div
                    className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:h-3.5"
                    role="img"
                    aria-label={`${scopeText(row.title, scope)}: ${formatMetric(row, metric)}`}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        metric === "accuracy"
                          ? "bg-gradient-to-r from-teal-400 to-emerald-500"
                          : metric === "bestStreak"
                            ? "bg-gradient-to-r from-amber-400 to-orange-500"
                            : "bg-gradient-to-r from-sky-400 to-cyan-500",
                      )}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="text-right font-mono text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100 sm:text-sm">
                    {formatMetric(row, metric)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
