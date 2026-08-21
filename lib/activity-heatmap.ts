import type { Profile } from "@/lib/types";
import { getDailyDateKey } from "@/lib/daily-calendar";
import { DAILY_CHALLENGE_QUESTION_COUNT } from "@/lib/types";

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export type ActivityCell = {
  dateKey: string;
  count: number;
  level: ActivityLevel;
};

export type ActivityWeek = {
  /** Sun..Sat; null pads days outside the trailing-year window. */
  days: (ActivityCell | null)[];
  /** Single-letter month label when this week starts a new month. */
  monthLabel: string | null;
};

export type ActivityCalendar = {
  weeks: ActivityWeek[];
  /** Date key of the profile's creation day when it falls inside the window. */
  birthdayDateKey: string | null;
  /** How many trailing months the window covers (grows with account age). */
  monthsShown: number;
  totalCount: number;
  /** e.g. "July" — month with the highest summed count, null when no activity. */
  mostActiveMonth: string | null;
  /** e.g. "Jul 28, 2026" — day with the highest count, null when no activity. */
  mostActiveDay: string | null;
  /** Longest run of consecutive active days, in days. */
  longestStreak: number;
  /** Consecutive active days ending today or yesterday, in days. */
  currentStreak: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Date keys are EST calendar days. UTC noon on the same year-month-day is
 * always within that EST day, so plain UTC math steps days safely (no DST
 * edge cases and no repeated Intl formatting).
 */
function dateKeyToUtcNoon(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day, 12);
}

function utcNoonToDateKey(ms: number): string {
  const date = new Date(ms);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function monthIndexOf(dateKey: string): number {
  return Number(dateKey.slice(5, 7)) - 1;
}

/** Formats an EST date key like "Jul 28, 2026". */
export function formatActivityDate(dateKey: string): string {
  const [year, , day] = dateKey.split("-").map(Number);
  return `${MONTH_SHORT[monthIndexOf(dateKey)]} ${day}, ${year}`;
}

export function getActivityLevel(count: number): ActivityLevel {
  if (count <= 0) return 0;
  if (count <= 9) return 1;
  if (count <= 24) return 2;
  if (count <= 49) return 3;
  return 4;
}

/**
 * Effective per-day counts: the recorded activity counter, backfilled with
 * daily-challenge completions (10 questions each) for days recorded before
 * the counter existed. `max` keeps this a no-op once real counts accrue.
 */
export function getEffectiveActivityCounts(profile: Profile): Record<string, number> {
  const counts: Record<string, number> = { ...(profile.activityByDate ?? {}) };

  const completionsPerDay = new Map<string, number>();
  for (const stored of profile.dailyChallengeCompletions ?? []) {
    const dateKey = stored.includes(":") ? stored.slice(stored.indexOf(":") + 1) : stored;
    completionsPerDay.set(dateKey, (completionsPerDay.get(dateKey) ?? 0) + 1);
  }
  for (const [dateKey, completions] of completionsPerDay) {
    counts[dateKey] = Math.max(
      counts[dateKey] ?? 0,
      completions * DAILY_CHALLENGE_QUESTION_COUNT,
    );
  }

  return counts;
}

/** EST date key of the profile's creation day, or null when unparseable. */
function getCreatedDateKey(profile: Profile): string | null {
  if (!profile.createdAt) return null;
  const created = new Date(profile.createdAt);
  if (Number.isNaN(created.getTime())) return null;
  return getDailyDateKey(created);
}

/**
 * Window size in whole months: one month for a fresh account, expanding by a
 * month each time the account crosses another month of age.
 */
function getMonthsToShow(createdKey: string | null, endDateKey: string): number {
  if (!createdKey || createdKey > endDateKey) return 1;
  const [createdYear, createdMonth, createdDay] = createdKey.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDateKey.split("-").map(Number);
  let fullMonths = (endYear - createdYear) * 12 + (endMonth - createdMonth);
  if (endDay < createdDay) fullMonths -= 1;
  return Math.max(0, fullMonths) + 1;
}

/** Start of an N-month window ending on `endMs` (both UTC-noon timestamps). */
function getWindowStartMs(endMs: number, months: number): number {
  const start = new Date(endMs);
  const targetMonth = (((start.getUTCMonth() - months) % 12) + 12) % 12;
  start.setUTCMonth(start.getUTCMonth() - months);
  // Day-of-month overflow (e.g. Mar 31 minus one month) rolls forward; clamp
  // back to the last day of the intended month.
  if (start.getUTCMonth() !== targetMonth) start.setUTCDate(0);
  return start.getTime() + DAY_MS;
}

/**
 * Builds a calendar (Sun-Sat columns) ending on `endDateKey` (defaults to
 * today in EST) and starting a whole number of months earlier based on
 * account age, plus the derived stats shown in the heatmap card footer.
 */
export function getActivityCalendar(
  profile: Profile,
  endDateKey = getDailyDateKey(),
): ActivityCalendar {
  const counts = getEffectiveActivityCounts(profile);

  const endMs = dateKeyToUtcNoon(endDateKey);
  const createdKey = getCreatedDateKey(profile);
  const monthsShown = getMonthsToShow(createdKey, endDateKey);
  let startMs = getWindowStartMs(endMs, monthsShown);
  // The account-creation day must always be visible.
  if (createdKey) {
    startMs = Math.min(startMs, dateKeyToUtcNoon(createdKey));
  }
  startMs = Math.min(startMs, endMs);
  // Align the grid to the Sunday of the first week.
  const gridStartMs = startMs - new Date(startMs).getUTCDay() * DAY_MS;

  const weeks: ActivityWeek[] = [];
  let totalCount = 0;
  const monthTotals = new Array<number>(12).fill(0);
  let mostActiveDayKey: string | null = null;
  let mostActiveDayCount = 0;
  let longestStreak = 0;
  let runningStreak = 0;
  let previousMonthLabel: number | null = null;

  for (let weekStart = gridStartMs; weekStart <= endMs; weekStart += 7 * DAY_MS) {
    const days: (ActivityCell | null)[] = [];
    let monthLabel: string | null = null;

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const dayMs = weekStart + dayIndex * DAY_MS;
      if (dayMs < startMs || dayMs > endMs) {
        days.push(null);
        continue;
      }
      const dateKey = utcNoonToDateKey(dayMs);
      const count = counts[dateKey] ?? 0;
      days.push({ dateKey, count, level: getActivityLevel(count) });

      totalCount += count;
      const monthIndex = monthIndexOf(dateKey);
      monthTotals[monthIndex] += count;
      if (count > mostActiveDayCount) {
        mostActiveDayCount = count;
        mostActiveDayKey = dateKey;
      }
      if (count > 0) {
        runningStreak += 1;
        longestStreak = Math.max(longestStreak, runningStreak);
      } else {
        runningStreak = 0;
      }
      if (monthLabel === null && monthIndex !== previousMonthLabel) {
        monthLabel = MONTH_SHORT[monthIndex][0];
        previousMonthLabel = monthIndex;
      }
    }

    weeks.push({ days, monthLabel });
  }

  // Current streak anchors on today, or yesterday if today has no plays yet.
  let currentStreak = 0;
  let cursor = endMs;
  if ((counts[utcNoonToDateKey(cursor)] ?? 0) <= 0) cursor -= DAY_MS;
  while (cursor >= startMs && (counts[utcNoonToDateKey(cursor)] ?? 0) > 0) {
    currentStreak += 1;
    cursor -= DAY_MS;
  }

  let mostActiveMonth: string | null = null;
  const bestMonthTotal = Math.max(...monthTotals);
  if (bestMonthTotal > 0) {
    mostActiveMonth = MONTH_NAMES[monthTotals.indexOf(bestMonthTotal)];
  }

  const startKey = utcNoonToDateKey(startMs);

  return {
    weeks,
    birthdayDateKey:
      createdKey && createdKey >= startKey && createdKey <= endDateKey ? createdKey : null,
    monthsShown,
    totalCount,
    mostActiveMonth,
    mostActiveDay: mostActiveDayKey ? formatActivityDate(mostActiveDayKey) : null,
    longestStreak,
    currentStreak,
  };
}
