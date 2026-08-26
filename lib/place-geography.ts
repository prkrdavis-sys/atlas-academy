import type { Country } from "@/lib/types";

/** Places whose English name contains "and" but are not island groups. */
export const NON_ISLAND_AND_NAMES = new Set(["Bosnia and Herzegovina"]);

/**
 * Name-based island vocabulary used by distractors and learn-card copy.
 * Border heuristics (sovereign nations with no land neighbors) live in
 * `isIslandCountry` — they are not a name kind.
 */
export type NamedIslandKind = "archipelago" | "remote-island";

export function namedIslandKind(country: Country): NamedIslandKind | null {
  if (NON_ISLAND_AND_NAMES.has(country.name)) return null;
  if (/\bIslands\b/i.test(country.name)) return "archipelago";
  if (/\band\b/i.test(country.name)) return "archipelago";
  if (/\bIsland\b/i.test(country.name)) return "remote-island";
  return null;
}

/**
 * Heuristic used when picking lookalike distractors: island nations should
 * mostly see other islands in the multiple-choice set.
 */
export function isIslandCountry(country: Country): boolean {
  if (NON_ISLAND_AND_NAMES.has(country.name)) return false;
  if (/\bIslands?\b/i.test(country.name)) return true;
  if (/\band\b/i.test(country.name) && country.borders.length === 0) return true;
  // Sovereign island nations have no land borders; skip US states where border data is incomplete.
  if (!country.code.startsWith("US-") && country.borders.length === 0) return true;
  return false;
}
