/** Opens the interactive 3D globe map, overriding any stored 2D map preference. */
export const GLOBE_MAP_HREF = "/map?view=globe";

export function isMapRoute(pathname: string): boolean {
  return pathname === "/map" || pathname.startsWith("/map/");
}

export function isExploreRoute(pathname: string): boolean {
  return pathname === "/library" || pathname.startsWith("/library/");
}

/** @deprecated Use {@link isExploreRoute}. */
export function isLibraryRoute(pathname: string): boolean {
  return isExploreRoute(pathname);
}

export function getPrimaryNavHref(pathname: string): "/" | "/library" | "/map" {
  if (pathname === "/" || pathname.startsWith("/play/")) return "/";
  if (isMapRoute(pathname)) return "/map";
  if (isExploreRoute(pathname)) return "/library";
  return "/";
}
