"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
} from "react";
import { cn } from "@/lib/utils";
import {
  formatActivityDate,
  getActivityCalendar,
  type ActivityCell,
  type ActivityLevel,
} from "@/lib/activity-heatmap";
import type { Profile } from "@/lib/types";

const LEVEL_CLASSES: Record<ActivityLevel, string> = {
  0: "bg-slate-200/70 dark:bg-slate-700/50",
  1: "bg-emerald-200 dark:bg-emerald-900",
  2: "bg-emerald-300 dark:bg-emerald-700",
  3: "bg-emerald-500 dark:bg-emerald-500",
  4: "bg-emerald-600 dark:bg-emerald-400",
};

const LEGEND_LEVELS: ActivityLevel[] = [0, 1, 2, 3, 4];

/** Rows showing a weekday label, matching the reference card (M / W / F). */
const WEEKDAY_LABELS = ["", "M", "", "W", "", "F", ""];

type TooltipState = {
  dateKey: string;
  count: number;
  isBirthday: boolean;
  /** Center of the cell, relative to the card body wrapper. */
  left: number;
  top: number;
};

function cellSummary(day: ActivityCell, isBirthday: boolean): string {
  const date = formatActivityDate(day.dateKey);
  const played =
    day.count === 0
      ? `No questions on ${date}`
      : `${day.count.toLocaleString()} question${day.count === 1 ? "" : "s"} on ${date}`;
  return isBirthday ? `Account created · ${played}` : played;
}

type StatsActivityHeatmapProps = {
  profile: Profile;
  className?: string;
};

export function StatsActivityHeatmap({ profile, className }: StatsActivityHeatmapProps) {
  const calendar = useMemo(() => getActivityCalendar(profile), [profile]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // The grid scrolls sideways when it overflows; start on the recent weeks.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  function openTooltip(
    event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>,
    day: ActivityCell,
  ) {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const cellRect = event.currentTarget.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const margin = 72;
    const left = Math.min(
      Math.max(cellRect.left - wrapperRect.left + cellRect.width / 2, margin),
      Math.max(wrapperRect.width - margin, margin),
    );
    setTooltip({
      dateKey: day.dateKey,
      count: day.count,
      isBirthday: day.dateKey === calendar.birthdayDateKey,
      left,
      top: cellRect.top - wrapperRect.top,
    });
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.75rem] border-2 border-slate-200 bg-white/90 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/90",
        className,
      )}
    >
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/80 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-100 sm:text-lg">
              Questions answered
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
              {calendar.monthsShown === 1
                ? "Daily activity for your first month"
                : `Daily activity over the last ${calendar.monthsShown} months`}
              , across every mode and difficulty
            </p>
          </div>
          <p className="font-display text-2xl font-extrabold tabular-nums text-slate-800 dark:text-slate-100 sm:text-3xl">
            {calendar.totalCount.toLocaleString()}
          </p>
        </div>
      </div>

      <div ref={wrapperRef} className="relative px-4 py-4 sm:px-6 sm:py-5">
        {tooltip ? (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-center shadow-lg dark:bg-slate-700"
            style={{ left: tooltip.left, top: tooltip.top - 6 }}
            role="status"
          >
            <p className="text-[11px] font-bold leading-tight text-white">
              {tooltip.isBirthday ? "🎂 Account created" : formatActivityDate(tooltip.dateKey)}
            </p>
            <p className="text-[11px] leading-tight text-slate-300">
              {tooltip.isBirthday ? `${formatActivityDate(tooltip.dateKey)} · ` : ""}
              {tooltip.count === 0
                ? "No questions"
                : `${tooltip.count.toLocaleString()} question${tooltip.count === 1 ? "" : "s"}`}
            </p>
          </div>
        ) : null}

        <div className="flex gap-1.5">
          <div
            className="flex shrink-0 flex-col gap-[3px] pt-[17px] text-right"
            aria-hidden
          >
            {WEEKDAY_LABELS.map((label, index) => (
              <span
                key={index}
                className="flex h-[11px] items-center justify-end font-mono text-[9px] leading-none text-slate-500 dark:text-slate-400"
              >
                {label}
              </span>
            ))}
          </div>

          <div
            ref={scrollRef}
            className="overflow-x-auto pb-1"
            onScroll={() => setTooltip(null)}
          >
            <div className="flex gap-[3px]" aria-hidden>
              {calendar.weeks.map((week, index) => (
                <span
                  key={index}
                  className="h-[14px] w-[11px] shrink-0 font-mono text-[9px] leading-none text-slate-500 dark:text-slate-400"
                >
                  {week.monthLabel}
                </span>
              ))}
            </div>
            <div
              className="flex gap-[3px]"
              role="grid"
              aria-label={`Activity heatmap: ${calendar.totalCount.toLocaleString()} questions answered in the last ${calendar.monthsShown === 1 ? "month" : `${calendar.monthsShown} months`}`}
              onMouseLeave={() => setTooltip(null)}
            >
              {calendar.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex shrink-0 flex-col gap-[3px]">
                  {week.days.map((day, dayIndex) => {
                    if (!day) {
                      return <div key={dayIndex} className="h-[11px] w-[11px]" />;
                    }
                    const isBirthday = day.dateKey === calendar.birthdayDateKey;
                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        aria-label={cellSummary(day, isBirthday)}
                        onMouseEnter={(event) => openTooltip(event, day)}
                        onFocus={(event) => openTooltip(event, day)}
                        onClick={(event) =>
                          tooltip?.dateKey === day.dateKey
                            ? setTooltip(null)
                            : openTooltip(event, day)
                        }
                        onBlur={() => setTooltip(null)}
                        className={cn(
                          "flex h-[11px] w-[11px] items-center justify-center rounded-[3px] p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                          LEVEL_CLASSES[day.level],
                          isBirthday && "ring-1 ring-amber-400",
                        )}
                      >
                        {isBirthday ? (
                          <span className="text-[8px] leading-none" aria-hidden>
                            🎂
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Most active month
            </p>
            <p className="mt-0.5 font-display text-sm font-extrabold text-slate-800 dark:text-slate-100 sm:text-base">
              {calendar.mostActiveMonth ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Most active day
            </p>
            <p className="mt-0.5 font-display text-sm font-extrabold text-slate-800 dark:text-slate-100 sm:text-base">
              {calendar.mostActiveDay ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Longest streak
            </p>
            <p className="mt-0.5 font-display text-sm font-extrabold text-slate-800 dark:text-slate-100 sm:text-base">
              {calendar.longestStreak}d
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Current streak
            </p>
            <p className="mt-0.5 font-display text-sm font-extrabold text-slate-800 dark:text-slate-100 sm:text-base">
              {calendar.currentStreak}d
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span>Fewer</span>
          {LEGEND_LEVELS.map((level) => (
            <span
              key={level}
              className={cn("h-[11px] w-[11px] rounded-[3px]", LEVEL_CLASSES[level])}
              aria-hidden
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  );
}
