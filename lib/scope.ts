import type { GameMode, GameScope } from "@/lib/types";
import { GAME_MODES } from "@/lib/types";

export const SCOPE_STORAGE_KEY = "atlas-academy-scope";
export const LIBRARY_SCOPE_STORAGE_KEY = "atlas-academy-library-scope";

export const SCOPE_INFO: Record<
  GameScope,
  {
    label: string;
    shortLabel: string;
    icon: string;
    /** Singular noun for one quiz subject. */
    noun: string;
    /** Plural noun for quiz subjects. */
    nounPlural: string;
    tagline: string;
    libraryTitle: string;
    regionLabel: string;
  }
> = {
  world: {
    label: "Around the World",
    shortLabel: "World",
    icon: "🌍",
    noun: "country",
    nounPlural: "countries",
    tagline: "Flags, capitals, and country shapes. Build a streak and beat your best.",
    libraryTitle: "Global Library",
    regionLabel: "Continents",
  },
  usa: {
    label: "Across America",
    shortLabel: "USA",
    icon: "🇺🇸",
    noun: "state",
    nounPlural: "states",
    tagline: "Flags, capitals, and shapes for all 50 states. Build a streak and beat your best.",
    libraryTitle: "State Library",
    regionLabel: "Regions",
  },
};

export function normalizeScope(value: string | null | undefined): GameScope {
  return value === "usa" ? "usa" : "world";
}

export function getStoredScope(): GameScope {
  if (typeof window === "undefined") return "world";
  return normalizeScope(localStorage.getItem(SCOPE_STORAGE_KEY));
}

export function setStoredScope(scope: GameScope): void {
  localStorage.setItem(SCOPE_STORAGE_KEY, scope);
}

export function getStoredLibraryScope(): GameScope {
  if (typeof window === "undefined") return "world";
  return normalizeScope(localStorage.getItem(LIBRARY_SCOPE_STORAGE_KEY));
}

export function setStoredLibraryScope(scope: GameScope): void {
  localStorage.setItem(LIBRARY_SCOPE_STORAGE_KEY, scope);
}

/** Query string to append to play links so the quiz scope carries through. */
export function scopeQuery(scope: GameScope): string {
  return scope === "usa" ? "?scope=usa" : "";
}

/**
 * Rewords country-centric copy for the active scope, e.g.
 * "Which country borders X?" -> "Which state borders X?".
 */
export function scopeText(text: string, scope: GameScope): string {
  if (scope !== "usa") return text;
  return text
    .replace(/countries/g, "states")
    .replace(/Countries/g, "States")
    .replace(/country/g, "state")
    .replace(/Country/g, "State");
}

export function getScopedModeInfo(mode: GameMode, scope: GameScope) {
  const info = GAME_MODES.find((m) => m.id === mode);
  if (!info) return undefined;
  return {
    ...info,
    title: scopeText(info.title, scope),
    description: scopeText(info.description, scope),
  };
}

/**
 * Daily-challenge dates are stored as plain "YYYY-MM-DD" keys for the world
 * scope and "usa:YYYY-MM-DD" for the USA scope, so each scope has its own
 * independent daily challenge.
 */
export function scopedDailyKey(dateKey: string, scope: GameScope): string {
  return scope === "usa" ? `usa:${dateKey}` : dateKey;
}

/** Extracts the plain date keys belonging to a scope from a stored list. */
export function filterDailyDatesByScope(
  dates: string[] | undefined,
  scope: GameScope,
): string[] {
  const list = dates ?? [];
  if (scope === "usa") {
    return list.filter((d) => d.startsWith("usa:")).map((d) => d.slice(4));
  }
  return list.filter((d) => !d.includes(":"));
}

export function isStateCode(code: string): boolean {
  return code.toUpperCase().startsWith("US-");
}

/** Returns the user-facing code (e.g. "VA" instead of "US-VA"). */
export function formatDisplayCode(code: string): string {
  if (isStateCode(code)) {
    return code.slice(3).toUpperCase();
  }
  return code;
}
