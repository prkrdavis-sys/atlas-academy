import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const subtleBackLinkClass =
  "inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50/50 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100/70 hover:text-slate-700 dark:border-slate-600/75 dark:bg-slate-700/45 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700/60 dark:hover:text-slate-100";

export function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function uniqueBy<T>(array: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return array.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}
