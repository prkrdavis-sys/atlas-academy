import { normalizeLibraryFilter, normalizeLibrarySort, type LibraryFilter, type LibrarySort } from "@/lib/library";
import { normalizeScope } from "@/lib/scope";
import type { GameScope } from "@/lib/types";

export const LIBRARY_SCROLL_STORAGE_KEY = "atlas-academy-library-detail-scroll";
export const LIBRARY_LIST_SCROLL_STORAGE_KEY = "atlas-academy-library-list-scroll";
export const LIBRARY_SCROLL_RESTORE_KEY = "atlas-academy-library-scroll-restore";
export const LIBRARY_LAST_PATH_KEY = "atlas-academy-library-last-path";

/** @deprecated Use {@link LIBRARY_SCROLL_RESTORE_KEY}. */
export const LIBRARY_LIST_SCROLL_RESTORE_KEY = LIBRARY_SCROLL_RESTORE_KEY;

export type LibraryLocation = {
  pathname: string;
  search: string;
};

export const LIBRARY_PLACE_HEADER_ID = "library-place-header";
export const LIBRARY_PLACE_TITLE_ID = "library-place-title";
export const LIBRARY_DETAIL_NAV_ID = "library-detail-nav";

export const LIBRARY_SECTION_ANCHOR_IDS = [
  "country-details-heading",
  "location-heading",
  "neighbors-heading",
  "capital-city-heading",
] as const;

export type LibrarySectionAnchorId = (typeof LIBRARY_SECTION_ANCHOR_IDS)[number];

export type LibraryScrollState = {
  y: number;
  heroHeight: number;
  anchorId: LibrarySectionAnchorId | null;
  anchorOffset: number;
};

const LIBRARY_NAV_BAND_PX = 56;

function getElementDocumentTop(element: HTMLElement): number {
  return element.getBoundingClientRect().top + window.scrollY;
}

function getHeroHeight(): number {
  return document.getElementById(LIBRARY_PLACE_HEADER_ID)?.offsetHeight ?? 0;
}

function getScrollChromeHeight(): number {
  const stickyNav = document.getElementById(LIBRARY_DETAIL_NAV_ID);
  if (stickyNav) {
    return Math.max(0, stickyNav.getBoundingClientRect().bottom);
  }

  const headerOffset = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--app-header-offset"),
  );
  return (Number.isFinite(headerOffset) ? headerOffset : 0) + LIBRARY_NAV_BAND_PX;
}

/** Viewport line below sticky app + library chrome used to anchor section context. */
function getScrollReferenceY(): number {
  return window.scrollY + getScrollChromeHeight();
}

function getMaxScrollY(): number {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function findRestorableAnchorId(
  anchorId: LibrarySectionAnchorId,
): LibrarySectionAnchorId | null {
  const startIndex = LIBRARY_SECTION_ANCHOR_IDS.indexOf(anchorId);
  if (startIndex === -1) return null;

  for (let index = startIndex; index >= 0; index -= 1) {
    const candidate = LIBRARY_SECTION_ANCHOR_IDS[index];
    if (document.getElementById(candidate)) return candidate;
  }

  return null;
}

export function captureLibraryScrollState(): void {
  if (typeof window === "undefined") return;

  const y = window.scrollY;
  const heroHeight = getHeroHeight();
  const referenceY = getScrollReferenceY();

  let anchorId: LibrarySectionAnchorId | null = null;
  let anchorOffset = 0;

  for (const id of LIBRARY_SECTION_ANCHOR_IDS) {
    const element = document.getElementById(id);
    if (!element) continue;

    const top = getElementDocumentTop(element);
    if (top <= referenceY + 1) {
      anchorId = id;
      anchorOffset = referenceY - top;
    }
  }

  const state: LibraryScrollState = { y, heroHeight, anchorId, anchorOffset };
  sessionStorage.setItem(LIBRARY_SCROLL_STORAGE_KEY, JSON.stringify(state));
}

export function consumeLibraryScrollState(): LibraryScrollState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(LIBRARY_SCROLL_STORAGE_KEY);
    if (!raw) return null;

    sessionStorage.removeItem(LIBRARY_SCROLL_STORAGE_KEY);
    return JSON.parse(raw) as LibraryScrollState;
  } catch {
    sessionStorage.removeItem(LIBRARY_SCROLL_STORAGE_KEY);
    return null;
  }
}

export function restoreLibraryScrollState(state: LibraryScrollState): void {
  const chrome = getScrollChromeHeight();

  if (state.anchorId) {
    const anchorId = findRestorableAnchorId(state.anchorId);
    if (anchorId) {
      const anchor = document.getElementById(anchorId);
      if (anchor) {
        const targetY = getElementDocumentTop(anchor) + state.anchorOffset - chrome;
        window.scrollTo(0, Math.min(Math.max(0, targetY), getMaxScrollY()));
        return;
      }
    }
  }

  const heroDelta = getHeroHeight() - state.heroHeight;
  const targetY = state.y + heroDelta;
  window.scrollTo(0, Math.min(Math.max(0, targetY), getMaxScrollY()));
}

export type LibraryListScrollState = {
  y: number;
  scope: GameScope;
  filter: LibraryFilter;
  sort: LibrarySort;
};

export function isLibraryListPath(pathname: string): boolean {
  return pathname === "/library";
}

/** Scrollport for the warm library list pane inside `GlobeExperience`. */
export const LIBRARY_LIST_SCROLL_ROOT_ATTR = "data-library-list-scroll";

function getLibraryListScrollRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${LIBRARY_LIST_SCROLL_ROOT_ATTR}]`);
}

function getLibraryListScrollY(): number {
  return getLibraryListScrollRoot()?.scrollTop ?? window.scrollY;
}

function getLibraryListMaxScrollY(): number {
  const root = getLibraryListScrollRoot();
  if (!root) return getMaxScrollY();
  return Math.max(0, root.scrollHeight - root.clientHeight);
}

export function captureLibraryListScrollState(
  scope: GameScope,
  filter: LibraryFilter,
  sort: LibrarySort,
): void {
  if (typeof window === "undefined") return;

  const state: LibraryListScrollState = {
    y: getLibraryListScrollY(),
    scope,
    filter,
    sort,
  };
  sessionStorage.setItem(LIBRARY_LIST_SCROLL_STORAGE_KEY, JSON.stringify(state));
}

export function markLibraryScrollRestore(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(LIBRARY_SCROLL_RESTORE_KEY, "1");
}

/** @deprecated Use {@link markLibraryScrollRestore}. */
export function markLibraryListScrollRestore(): void {
  markLibraryScrollRestore();
}

export function clearLibraryScrollRestore(): void {
  sessionStorage.removeItem(LIBRARY_SCROLL_RESTORE_KEY);
}

export function shouldRestoreLibraryScroll(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(LIBRARY_SCROLL_RESTORE_KEY) === "1";
}

/** @deprecated Use {@link shouldRestoreLibraryScroll}. */
export function shouldRestoreLibraryListScroll(): boolean {
  return shouldRestoreLibraryScroll();
}

export function getLastLibraryHref(): string {
  if (typeof window === "undefined") return "/library";
  return sessionStorage.getItem(LIBRARY_LAST_PATH_KEY) ?? "/library";
}

export function persistLibrarySession(location: LibraryLocation): void {
  if (typeof window === "undefined") return;

  const path = location.search
    ? `${location.pathname}?${location.search}`
    : location.pathname;
  sessionStorage.setItem(LIBRARY_LAST_PATH_KEY, path);

  if (isLibraryListPath(location.pathname)) {
    const params = new URLSearchParams(location.search);
    const scope = normalizeScope(params.get("scope"));
    const filter = normalizeLibraryFilter(scope, params.get("region"));
    const sort = normalizeLibrarySort(params.get("sort"));
    captureLibraryListScrollState(scope, filter, sort);
  } else if (location.pathname.startsWith("/library/")) {
    captureLibraryScrollState();
  }

  markLibraryScrollRestore();
}

export function consumeLibraryListScrollState(): LibraryListScrollState | null {
  if (typeof window === "undefined") return null;

  clearLibraryScrollRestore();

  try {
    const raw = sessionStorage.getItem(LIBRARY_LIST_SCROLL_STORAGE_KEY);
    if (!raw) return null;

    sessionStorage.removeItem(LIBRARY_LIST_SCROLL_STORAGE_KEY);
    return JSON.parse(raw) as LibraryListScrollState;
  } catch {
    sessionStorage.removeItem(LIBRARY_LIST_SCROLL_STORAGE_KEY);
    return null;
  }
}

export function restoreLibraryListScrollState(state: LibraryListScrollState): void {
  const y = Math.min(Math.max(0, state.y), getLibraryListMaxScrollY());
  const root = getLibraryListScrollRoot();
  if (root) {
    root.scrollTop = y;
    return;
  }
  window.scrollTo(0, y);
}

/** Layout can settle after fonts/images; retry the same restore a few times. */
export function scheduleRestoreAttempts(apply: () => void): () => void {
  apply();
  const raf = requestAnimationFrame(apply);
  const shortDelay = window.setTimeout(apply, 100);
  const longDelay = window.setTimeout(apply, 400);
  window.addEventListener("load", apply, { once: true });
  return () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(shortDelay);
    window.clearTimeout(longDelay);
    window.removeEventListener("load", apply);
  };
}
