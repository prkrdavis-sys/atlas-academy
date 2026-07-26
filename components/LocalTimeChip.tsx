"use client";

import { useSyncExternalStore } from "react";
import { formatLocalClockTime, formatTimeZoneName } from "@/lib/timezone";

const CLOCK_TICK_MS = 30_000;

function subscribeToClock(onStoreChange: () => void) {
  const intervalId = window.setInterval(onStoreChange, CLOCK_TICK_MS);
  return () => window.clearInterval(intervalId);
}

function getClockTick() {
  return Math.floor(Date.now() / CLOCK_TICK_MS);
}

function getServerClockTick() {
  return null;
}

type LocalTimeChipProps = {
  timeZone: string;
};

/**
 * Library detail chip showing the live local clock and timezone name for a place.
 */
export function LocalTimeChip({ timeZone }: LocalTimeChipProps) {
  const tick = useSyncExternalStore(subscribeToClock, getClockTick, getServerClockTick);
  const now = tick == null ? null : new Date();
  const zoneName = formatTimeZoneName(timeZone, now ?? new Date());
  const clock = now ? formatLocalClockTime(timeZone, now) : "—";

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/80">
      <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">Local time</dt>
      <dd className="mt-1 font-display text-base font-extrabold leading-snug text-slate-900 dark:text-slate-100 sm:text-lg">
        <span className="block tabular-nums">{clock}</span>
        <span className="mt-0.5 block text-xs font-bold text-slate-500 dark:text-slate-400 sm:text-sm">
          {zoneName}
        </span>
      </dd>
    </div>
  );
}
