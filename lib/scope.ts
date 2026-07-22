import type { Country, GameMode, GameScope, Question } from "@/lib/types";
import { GAME_MODES } from "@/lib/types";

type PlaceLike = Pick<Country, "isTerritory">;

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
  if (!value) return "world";
  // Guard against malformed URLs like ?scope=usa?autostart=1.
  const normalized = value.split(/[?&#]/)[0]?.toLowerCase();
  return normalized === "usa" ? "usa" : "world";
}

/** Prefer an explicit ?scope= query param; otherwise use persisted play scope. */
export function resolveGameScope(scopeParam: string | null | undefined): GameScope {
  if (scopeParam != null) {
    return normalizeScope(scopeParam);
  }
  return getStoredScope();
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

/** Builds a path with scope and optional query params without duplicating `?`. */
export function scopedHref(
  path: string,
  scope: GameScope,
  params?: Record<string, string>,
): string {
  const search = new URLSearchParams(params);
  if (scope === "usa") search.set("scope", "usa");
  const query = search.toString();
  return query ? `${path}?${query}` : path;
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

export function getPlaceNoun(scope: GameScope, isTerritory = false): {
  lower: string;
  upper: string;
  plural: string;
} {
  if (scope === "usa") {
    return { lower: "state", upper: "State", plural: "states" };
  }
  if (isTerritory) {
    return { lower: "territory", upper: "Territory", plural: "territories" };
  }
  return { lower: "country", upper: "Country", plural: "countries" };
}

/**
 * Rewords country-centric copy for the active scope and, in world mode,
 * swaps country/countries to territory/territories when the place is a territory.
 */
export function placeText(text: string, scope: GameScope, place?: PlaceLike): string {
  if (scope === "usa") return scopeText(text, scope);
  if (!place?.isTerritory) return text;
  return text
    .replace(/\bcountries\b/g, "territories")
    .replace(/\bCountries\b/g, "Territories")
    .replace(/\bcountry\b/g, "territory")
    .replace(/\bCountry\b/g, "Territory");
}

export function buildCapitalPrompt(country: Country, scope: GameScope): string {
  if (scope === "usa") {
    return `What is the capital of ${country.name}?`;
  }
  if (country.isTerritory) {
    return `What is the capital of the territory of ${country.name}?`;
  }
  return `What is the capital of ${country.name}?`;
}

export function buildFlagFromPlacePrompt(country: Country, scope: GameScope): string {
  if (scope === "usa") {
    return scopeText(`Which flag belongs to ${country.name}?`, scope);
  }
  if (country.isTerritory) {
    return `Which flag belongs to the territory of ${country.name}?`;
  }
  return `Which flag belongs to ${country.name}?`;
}

export function buildNeighborPrompt(
  country: Country,
  neighbor: Country | undefined,
  scope: GameScope,
): string {
  if (scope === "usa") {
    return scopeText(`Which state borders ${country.name}?`, scope);
  }

  const answerNoun = getPlaceNoun(scope, neighbor?.isTerritory ?? false).lower;
  if (country.isTerritory) {
    return `Which ${answerNoun} borders the territory of ${country.name}?`;
  }
  return `Which ${answerNoun} borders ${country.name}?`;
}

export function getNamePlaceTaskLabel(scope: GameScope, isTerritory: boolean): string {
  return scopeText(
    isTerritory && scope === "world" ? "Name the territory" : "Name the country",
    scope,
  );
}

export function getTypeInPlacePlaceholder(scope: GameScope, isTerritory: boolean): string {
  return scopeText(
    isTerritory && scope === "world" ? "Type the territory..." : "Type the country...",
    scope,
  );
}

export function getQuestionTaskLabel(
  question: Question,
  sessionMode: GameMode,
  scope: GameScope,
  place?: PlaceLike | null,
): string {
  if (sessionMode === "weak-spots") {
    return scopeText(
      scope === "world" ? "Practice commonly missed countries and territories" : "Practice commonly missed states",
      scope,
    );
  }
  if (sessionMode === "daily-challenge") {
    return "Daily challenge";
  }

  const effectiveMode = sessionMode === "mixed" ? question.mode : sessionMode;
  const isTerritory = scope === "world" && (place?.isTerritory ?? false);

  switch (effectiveMode) {
    case "flag-to-country":
    case "shape-to-country":
    case "capital-to-country":
      return getNamePlaceTaskLabel(scope, isTerritory);
    case "country-to-flag":
      return isTerritory ? "Pick the territory's flag" : "Pick the flag";
    case "neighbor-quiz":
      return isTerritory ? "Find the neighboring territory" : "Find the neighbor";
    case "population-showdown":
      return isTerritory ? "Pick the larger territory" : "Pick the larger population";
    case "fact-to-country":
      return placeText("Which country does this profile describe?", scope, place ?? undefined);
    case "country-to-capital":
      return "Name the capital";
    case "marathon":
      return "Keep your streak alive";
    case "speed-round":
      return "Beat the clock";
    case "mixed":
      return "All types, shuffled";
    case "daily-challenge":
      return "Daily challenge";
    case "weak-spots":
      return scopeText(
        scope === "world" ? "Practice commonly missed countries and territories" : "Practice commonly missed states",
        scope,
      );
    default: {
      const _exhaustive: never = effectiveMode;
      return _exhaustive;
    }
  }
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
