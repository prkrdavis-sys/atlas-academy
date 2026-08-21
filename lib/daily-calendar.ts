import type { GameScope } from "@/lib/types";

const DAILY_TIMEZONE = "America/New_York";

export const DAILY_COUNTING_SESSION_KEY = "daily-counting-session";

export function getDailyDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DAILY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dailySeedFromDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  const base = year * 10000 + month * 100 + day;
  return base;
}

export function getDailySeed(date = new Date()): number {
  return dailySeedFromDateKey(getDailyDateKey(date));
}

export function getDailySeedForDateKey(dateKey: string): number {
  return dailySeedFromDateKey(dateKey);
}

export function isValidDailyDateKey(dateKey: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  return getDailyDateKey(new Date(Date.UTC(year, month - 1, day, 17))) === dateKey;
}

export function formatDailyDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return formatDailyDate(new Date(Date.UTC(year, month - 1, day, 17)));
}

export function formatDailyDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getWeekdayInEastern(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  for (let hour = 12; hour <= 20; hour += 1) {
    const probe = new Date(Date.UTC(year, month - 1, day, hour));
    if (getDailyDateKey(probe) === dateKey) {
      const weekday = new Intl.DateTimeFormat("en-US", {
        timeZone: DAILY_TIMEZONE,
        weekday: "short",
      }).format(probe);
      return WEEKDAY_INDEX[weekday] ?? 0;
    }
  }
  return 0;
}

export function getDailyCalendarParts(date = new Date()) {
  const dateKey = getDailyDateKey(date);
  const [year, month, day] = dateKey.split("-").map(Number);
  const monthShort = new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_TIMEZONE,
    month: "short",
  })
    .format(date)
    .toUpperCase();

  return {
    dateKey,
    monthShort,
    day,
    daysInMonth: new Date(year, month, 0).getDate(),
    firstWeekday: getWeekdayInEastern(`${year}-${String(month).padStart(2, "0")}-01`),
  };
}

function normalizeStoredDailyDate(stored: string): string {
  return stored.includes(":") ? stored.slice(stored.indexOf(":") + 1) : stored;
}

export function hasPlayedDailyToday(
  playedDates: string[] | undefined,
  _scope: GameScope = "world",
  date = new Date(),
): boolean {
  const normalized = new Set((playedDates ?? []).map(normalizeStoredDailyDate));
  return normalized.has(getDailyDateKey(date));
}

export function hasCompletedDailyToday(
  completions: string[] | undefined,
  _scope: GameScope = "world",
  date = new Date(),
): boolean {
  const normalized = new Set((completions ?? []).map(normalizeStoredDailyDate));
  return normalized.has(getDailyDateKey(date));
}

export function dailyDateKeyToDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  for (let hour = 12; hour <= 20; hour += 1) {
    const probe = new Date(Date.UTC(year, month - 1, day, hour));
    if (getDailyDateKey(probe) === dateKey) return probe;
  }
  return new Date(Date.UTC(year, month - 1, day, 17));
}

export function offsetDailyDateKey(dateKey: string, dayOffset: number): string {
  const base = dailyDateKeyToDate(dateKey);
  base.setUTCDate(base.getUTCDate() + dayOffset);
  return getDailyDateKey(base);
}

export function getMillisecondsUntilDailyReset(now = new Date()): number {
  const todayKey = getDailyDateKey(now);
  const probe = new Date(now.getTime());
  probe.setSeconds(0, 0);
  probe.setMinutes(probe.getMinutes() + 1);

  const limit = now.getTime() + 25 * 60 * 60 * 1000;
  while (probe.getTime() < limit) {
    if (getDailyDateKey(probe) !== todayKey) {
      return probe.getTime() - now.getTime();
    }
    probe.setMinutes(probe.getMinutes() + 1);
  }
  return 0;
}

export function formatDailyResetCountdown(ms: number): string {
  if (ms <= 0) return "Soon";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function getDailyChallengeRun(
  completions: string[] | undefined,
  _scope: GameScope = "world",
  date = new Date(),
): number {
  const set = new Set((completions ?? []).map(normalizeStoredDailyDate));
  if (set.size === 0) return 0;

  const today = getDailyDateKey(date);
  const yesterday = offsetDailyDateKey(today, -1);

  let anchor: string | null = null;
  if (set.has(today)) {
    anchor = today;
  } else if (set.has(yesterday)) {
    anchor = yesterday;
  }
  if (!anchor) return 0;

  let count = 0;
  let current = anchor;
  while (set.has(current)) {
    count += 1;
    current = offsetDailyDateKey(current, -1);
  }
  return count;
}
