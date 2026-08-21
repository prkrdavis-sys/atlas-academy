import { getDailyDateKey, getWeekdayInEastern, offsetDailyDateKey } from "@/lib/daily-calendar";
import type { Profile } from "@/lib/types";

/** How many recent login date keys to keep on the profile (enough for the week view). */
export const MAX_LOGIN_DATE_HISTORY_DAYS = 14;

/**
 * Current daily login streak in days. The streak survives until a full EST day
 * is missed: if the last login was today or yesterday the run is alive,
 * otherwise it has lapsed and reads as 0.
 */
export function getLoginStreak(
  loginStreak: Profile["loginStreak"],
  date = new Date(),
): number {
  if (!loginStreak) return 0;
  const today = getDailyDateKey(date);
  if (loginStreak.lastDateKey === today) return loginStreak.length;
  if (loginStreak.lastDateKey === offsetDailyDateKey(today, -1)) return loginStreak.length;
  return 0;
}

/** Whether the streak has been secured today (app opened during today's EST day). */
export function hasLoggedInToday(
  loginStreak: Profile["loginStreak"],
  date = new Date(),
): boolean {
  return loginStreak?.lastDateKey === getDailyDateKey(date);
}

export type LoginWeekDayState = "kept" | "missed" | "future";

export type LoginWeekDay = {
  dateKey: string;
  /** Single-letter weekday label (S M T W T F S). */
  label: string;
  state: LoginWeekDayState;
  isToday: boolean;
};

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/**
 * The current EST calendar week (Sunday through Saturday) for the streak
 * panel's Duolingo-style week view.
 */
export function getLoginWeekView(
  loginDates: string[] | undefined,
  date = new Date(),
): LoginWeekDay[] {
  const today = getDailyDateKey(date);
  const todayWeekday = getWeekdayInEastern(today);
  const logins = new Set(loginDates ?? []);

  return WEEKDAY_LETTERS.map((label, weekday) => {
    const dateKey = offsetDailyDateKey(today, weekday - todayWeekday);
    const state: LoginWeekDayState =
      weekday > todayWeekday ? "future" : logins.has(dateKey) ? "kept" : "missed";
    return { dateKey, label, state, isToday: weekday === todayWeekday };
  });
}

/** Streak lengths that deserve a little celebration when reached. */
const LOGIN_STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

export function isLoginStreakMilestone(length: number): boolean {
  return LOGIN_STREAK_MILESTONES.includes(length);
}
