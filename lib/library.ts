import { formatAirportChip } from "@/lib/airport";
import { getPlacesForScope, getRegionsForScope } from "@/lib/countries";
import { normalizeAnswerText } from "@/lib/answer-matcher";
import { formatTimeZoneName } from "@/lib/timezone";
import type { Country, GameScope, Region } from "@/lib/types";

export const LIBRARY_TERRITORIES_FILTER = "Territories" as const;

export type LibraryFilter = "All" | typeof LIBRARY_TERRITORIES_FILTER | Region;

export type LibrarySort = "alphabetical" | "commonly-missed";

export const LIBRARY_ICON = "📚";

export const LIBRARY_FILTER_STORAGE_KEY = "atlas-academy-library-filters";
export const LIBRARY_SORT_STORAGE_KEY = "atlas-academy-library-sort";

export function isLibraryTerritoriesFilter(
  filter: LibraryFilter,
): filter is typeof LIBRARY_TERRITORIES_FILTER {
  return filter === LIBRARY_TERRITORIES_FILTER;
}

export function isLibraryFilter(scope: GameScope, value: string): value is LibraryFilter {
  if (value === "All") return true;
  if (scope === "world" && value === LIBRARY_TERRITORIES_FILTER) return true;
  return getRegionsForScope(scope).includes(value as Region);
}

export function getLibraryFilterOptions(scope: GameScope): LibraryFilter[] {
  const regions = getRegionsForScope(scope);
  if (scope === "usa") {
    return ["All", ...regions];
  }

  const withoutAntarctica = regions.filter((region) => region !== "Antarctica");
  return ["All", ...withoutAntarctica, LIBRARY_TERRITORIES_FILTER, "Antarctica"];
}

function matchesLibraryFilter(
  scope: GameScope,
  place: Country,
  filter: LibraryFilter,
): boolean {
  if (filter === "All") return true;
  if (filter === LIBRARY_TERRITORIES_FILTER) {
    return scope === "world" && place.isTerritory;
  }
  return place.continent === filter;
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
  const places = getPlacesForScope(scope).filter((place) =>
    matchesLibraryFilter(scope, place, filter),
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

export type LibrarySearchCategory =
  | "official name"
  | "native name"
  | "alias"
  | "language"
  | "code"
  | "capital"
  | "airport"
  | "currency"
  | "time zone"
  | "trivia";

export type LibrarySearchMatch = {
  place: Country;
  keyword: string | null;
  category: LibrarySearchCategory | null;
};

type SearchDescriptor = {
  label: string;
  values: string[];
  category: LibrarySearchCategory | null;
  isPlaceName: boolean;
};

type ScoredSearchMatch = LibrarySearchMatch & {
  rank: number;
};

const timeZoneNameCache = new Map<string, string>();

function getCachedTimeZoneName(timeZone: string): string {
  const cached = timeZoneNameCache.get(timeZone);
  if (cached) return cached;

  const name = formatTimeZoneName(timeZone);
  timeZoneNameCache.set(timeZone, name);
  return name;
}

function addSearchDescriptor(
  descriptors: SearchDescriptor[],
  seen: Set<string>,
  label: string | undefined,
  category: LibrarySearchCategory | null,
  values: string[] = [],
  isPlaceName = false,
): void {
  const trimmedLabel = label?.trim();
  if (!trimmedLabel || !normalizeAnswerText(trimmedLabel)) return;

  const searchableValues = [...new Set([trimmedLabel, ...values])]
    .filter((value) => normalizeAnswerText(value).length > 0);
  if (searchableValues.length === 0) return;

  const key = `${category ?? "name"}:${normalizeAnswerText(trimmedLabel)}`;
  if (seen.has(key)) return;
  seen.add(key);
  descriptors.push({
    label: trimmedLabel,
    values: searchableValues,
    category,
    isPlaceName,
  });
}

function getSearchDescriptors(place: Country): SearchDescriptor[] {
  const descriptors: SearchDescriptor[] = [];
  const seen = new Set<string>();

  addSearchDescriptor(descriptors, seen, place.name, null, [], true);
  addSearchDescriptor(descriptors, seen, place.officialName, "official name");
  addSearchDescriptor(descriptors, seen, place.nativeName, "native name");

  for (const alias of place.aliases ?? []) {
    addSearchDescriptor(descriptors, seen, alias, "alias");
  }

  for (const language of place.languages?.split(" · ") ?? []) {
    addSearchDescriptor(descriptors, seen, language, "language");
  }

  addSearchDescriptor(descriptors, seen, place.code, "code");
  addSearchDescriptor(descriptors, seen, place.code3, "code");
  addSearchDescriptor(descriptors, seen, place.capital, "capital");

  if (place.largestAirport) {
    const airportLabel = formatAirportChip(place.largestAirport);
    addSearchDescriptor(
      descriptors,
      seen,
      airportLabel,
      "airport",
      [place.largestAirport],
    );
  }

  if (place.currency) {
    addSearchDescriptor(descriptors, seen, place.currency.name, "currency");
    addSearchDescriptor(descriptors, seen, place.currency.code, "currency");
    addSearchDescriptor(descriptors, seen, place.currency.symbol, "currency");
  }

  if (place.timezone) {
    addSearchDescriptor(
      descriptors,
      seen,
      getCachedTimeZoneName(place.timezone),
      "time zone",
    );
    addSearchDescriptor(
      descriptors,
      seen,
      place.timezone,
      "time zone",
      [place.timezone.replace(/[\/_]/gu, " ")],
    );
  }

  for (const keyword of place.searchKeywords ?? []) {
    addSearchDescriptor(descriptors, seen, keyword, "trivia");
  }

  return descriptors;
}

function getDescriptorMatch(
  descriptor: SearchDescriptor,
  normalizedQuery: string,
): { rank: number } | null {
  let bestRank: number | null = null;

  for (const value of descriptor.values) {
    const normalizedValue = normalizeAnswerText(value);
    if (!normalizedValue) continue;

    const isExact = normalizedValue === normalizedQuery;
    const isPrefix = normalizedValue.startsWith(normalizedQuery);
    const isSubstring = normalizedValue.includes(normalizedQuery);
    if (!isSubstring) continue;

    const rank = descriptor.isPlaceName
      ? isExact
        ? 0
        : isPrefix
          ? 1
          : 2
      : isExact
        ? 3
        : isPrefix
          ? 4
          : 5;

    bestRank = bestRank === null ? rank : Math.min(bestRank, rank);
  }

  return bestRank === null ? null : { rank: bestRank };
}

/** Searches the full scope pool, ranking direct names and metadata matches. */
export function searchLibraryPlaces(
  scope: GameScope,
  query: string,
  limit = 8,
): LibrarySearchMatch[] {
  const normalizedQuery = normalizeAnswerText(query);
  if (!normalizedQuery) return [];

  const matches: ScoredSearchMatch[] = [];

  for (const place of getPlacesForScope(scope)) {
    let bestMatch: ScoredSearchMatch | null = null;

    for (const descriptor of getSearchDescriptors(place)) {
      const descriptorMatch = getDescriptorMatch(descriptor, normalizedQuery);
      if (!descriptorMatch) continue;

      const candidate: ScoredSearchMatch = {
        place,
        keyword: descriptor.isPlaceName ? null : descriptor.label,
        category: descriptor.category,
        rank: descriptorMatch.rank,
      };

      if (
        !bestMatch ||
        candidate.rank < bestMatch.rank ||
        (candidate.rank === bestMatch.rank &&
          (candidate.keyword ?? "").length < (bestMatch.keyword ?? "").length)
      ) {
        bestMatch = candidate;
      }
    }

    if (bestMatch) matches.push(bestMatch);
  }

  return matches
    .toSorted((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      const nameOrder = a.place.name.localeCompare(b.place.name);
      if (nameOrder !== 0) return nameOrder;
      return (a.keyword ?? "").localeCompare(b.keyword ?? "");
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
