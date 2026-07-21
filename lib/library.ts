import { getPlacesForScope, getRegionsForScope } from "@/lib/countries";
import { normalizeAnswerText } from "@/lib/answer-matcher";
import type { Country, GameScope, Region } from "@/lib/types";

export type LibraryFilter = "All" | Region;

export type LibrarySort = "alphabetical" | "commonly-missed";

export const LIBRARY_FILTER_STORAGE_KEY = "atlas-academy-library-filters";
export const LIBRARY_SORT_STORAGE_KEY = "atlas-academy-library-sort";

export function isLibraryFilter(scope: GameScope, value: string): value is LibraryFilter {
  return value === "All" || getRegionsForScope(scope).includes(value as Region);
}

export function isLibrarySort(value: string | null | undefined): value is LibrarySort {
  return value === "alphabetical" || value === "commonly-missed";
}

export function normalizeLibraryFilter(
  scope: GameScope,
  value: string | null | undefined,
): LibraryFilter {
  if (!value || value === "All") return "All";
  return isLibraryFilter(scope, value) ? value : "All";
}

export function normalizeLibrarySort(value: string | null | undefined): LibrarySort {
  return isLibrarySort(value) ? value : "alphabetical";
}

export function getFilteredLibraryPlaces(
  scope: GameScope,
  filter: LibraryFilter,
  sort: LibrarySort = "alphabetical",
  commonlyMissedCodes: string[] = [],
): Country[] {
  const places = getPlacesForScope(scope).filter(
    (place) => filter === "All" || place.continent === filter,
  );

  if (sort === "commonly-missed" && commonlyMissedCodes.length > 0) {
    const missedSet = new Set(commonlyMissedCodes);
    return places.toSorted((a, b) => {
      const aMissed = missedSet.has(a.code);
      const bMissed = missedSet.has(b.code);
      if (aMissed !== bMissed) return aMissed ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  return places.toSorted((a, b) => a.name.localeCompare(b.name));
}

function getSearchableTexts(place: Country): string[] {
  return [
    place.name,
    place.officialName,
    place.nativeName,
    place.languages,
    place.code,
    place.code3,
    ...(place.aliases ?? []),
  ]
    .filter((text): text is string => Boolean(text))
    .map(normalizeAnswerText);
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
  sort: LibrarySort = "alphabetical",
  commonlyMissedCodes: string[] = [],
): {
  prev: Country | null;
  next: Country | null;
  index: number;
  total: number;
  filter: LibraryFilter;
} {
  let places = getFilteredLibraryPlaces(scope, filter, sort, commonlyMissedCodes);
  let index = places.findIndex((place) => place.code === currentCode);

  if (index === -1) {
    places = getFilteredLibraryPlaces(scope, "All", sort, commonlyMissedCodes);
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
  sort: LibrarySort = "alphabetical",
): string {
  const params = new URLSearchParams();
  if (scope === "usa") params.set("scope", "usa");
  if (filter !== "All") params.set("region", filter);
  if (sort !== "alphabetical") params.set("sort", sort);
  const query = params.toString();
  return `/library/${code.toLowerCase()}${query ? `?${query}` : ""}`;
}

export function buildLibraryListHref(
  scope: GameScope,
  filter: LibraryFilter,
  sort: LibrarySort = "alphabetical",
): string {
  const params = new URLSearchParams();
  if (scope === "usa") params.set("scope", "usa");
  if (filter !== "All") params.set("region", filter);
  if (sort !== "alphabetical") params.set("sort", sort);
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

export function getStoredLibrarySort(scope: GameScope): LibrarySort {
  if (typeof window === "undefined") return "alphabetical";

  try {
    const raw = localStorage.getItem(LIBRARY_SORT_STORAGE_KEY);
    if (!raw) return "alphabetical";
    const parsed = JSON.parse(raw) as Partial<Record<GameScope, string>>;
    return normalizeLibrarySort(parsed[scope]);
  } catch {
    return "alphabetical";
  }
}

export function setStoredLibrarySort(scope: GameScope, sort: LibrarySort): void {
  try {
    const raw = localStorage.getItem(LIBRARY_SORT_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Record<GameScope, string>>) : {};
    parsed[scope] = sort;
    localStorage.setItem(LIBRARY_SORT_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    localStorage.setItem(LIBRARY_SORT_STORAGE_KEY, JSON.stringify({ [scope]: sort }));
  }
}
