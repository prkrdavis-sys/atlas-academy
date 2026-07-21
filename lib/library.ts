import { getPlacesForScope, getRegionsForScope } from "@/lib/countries";
import { normalizeAnswerText } from "@/lib/answer-matcher";
import type { Country, GameScope, Region } from "@/lib/types";

export type LibraryFilter = "All" | Region;

export const LIBRARY_FILTER_STORAGE_KEY = "atlas-academy-library-filters";

export function isLibraryFilter(scope: GameScope, value: string): value is LibraryFilter {
  return value === "All" || getRegionsForScope(scope).includes(value as Region);
}

export function normalizeLibraryFilter(
  scope: GameScope,
  value: string | null | undefined,
): LibraryFilter {
  if (!value || value === "All") return "All";
  return isLibraryFilter(scope, value) ? value : "All";
}

export function getFilteredLibraryPlaces(
  scope: GameScope,
  filter: LibraryFilter,
): Country[] {
  return getPlacesForScope(scope)
    .filter((place) => filter === "All" || place.continent === filter)
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

function getSearchableTexts(place: Country): string[] {
  return [
    place.name,
    place.officialName,
    place.code,
    place.code3,
    ...(place.aliases ?? []),
  ].map(normalizeAnswerText);
}

/** Prefix matches rank above substring matches; searches the full scope pool. */
export function searchLibraryPlaces(
  scope: GameScope,
  query: string,
  limit = 8,
): Country[] {
  const normalizedQuery = normalizeAnswerText(query);
  if (!normalizedQuery) return [];

  return getPlacesForScope(scope)
    .filter((place) =>
      getSearchableTexts(place).some((text) => text.includes(normalizedQuery)),
    )
    .toSorted((a, b) => {
      const aName = normalizeAnswerText(a.name);
      const bName = normalizeAnswerText(b.name);
      const aStarts = aName.startsWith(normalizedQuery) ? 0 : 1;
      const bStarts = bName.startsWith(normalizedQuery) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

export function getLibraryNeighbors(
  currentCode: string,
  scope: GameScope,
  filter: LibraryFilter,
): {
  prev: Country | null;
  next: Country | null;
  index: number;
  total: number;
  filter: LibraryFilter;
} {
  let places = getFilteredLibraryPlaces(scope, filter);
  let index = places.findIndex((place) => place.code === currentCode);

  if (index === -1) {
    places = getFilteredLibraryPlaces(scope, "All");
    index = places.findIndex((place) => place.code === currentCode);
    filter = "All";
  }

  return {
    prev: index > 0 ? places[index - 1] : null,
    next: index < places.length - 1 ? places[index + 1] : null,
    index,
    total: places.length,
    filter,
  };
}

export function buildLibraryDetailHref(
  code: string,
  scope: GameScope,
  filter: LibraryFilter,
): string {
  const params = new URLSearchParams();
  if (scope === "usa") params.set("scope", "usa");
  if (filter !== "All") params.set("region", filter);
  const query = params.toString();
  return `/library/${code.toLowerCase()}${query ? `?${query}` : ""}`;
}

export function buildLibraryListHref(scope: GameScope, filter: LibraryFilter): string {
  const params = new URLSearchParams();
  if (scope === "usa") params.set("scope", "usa");
  if (filter !== "All") params.set("region", filter);
  const query = params.toString();
  return `/library${query ? `?${query}` : ""}`;
}

/** Persists the user's last library filter; list page syncs this into the URL. */
export function getStoredLibraryFilter(scope: GameScope): LibraryFilter {
  if (typeof window === "undefined") return "All";

  try {
    const raw = localStorage.getItem(LIBRARY_FILTER_STORAGE_KEY);
    if (!raw) return "All";
    const parsed = JSON.parse(raw) as Partial<Record<GameScope, string>>;
    return normalizeLibraryFilter(scope, parsed[scope]);
  } catch {
    return "All";
  }
}

export function setStoredLibraryFilter(scope: GameScope, filter: LibraryFilter): void {
  try {
    const raw = localStorage.getItem(LIBRARY_FILTER_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Record<GameScope, string>>) : {};
    parsed[scope] = filter;
    localStorage.setItem(LIBRARY_FILTER_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    localStorage.setItem(LIBRARY_FILTER_STORAGE_KEY, JSON.stringify({ [scope]: filter }));
  }
}
