const EXPLORE_ROUTE_PREFIXES = ["/extras", "/library"] as const;

export function isMapRoute(pathname: string): boolean {
  return pathname === "/map" || pathname.startsWith("/map/");
}

export function isExploreRoute(pathname: string): boolean {
  return EXPLORE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function getPrimaryNavHref(pathname: string): "/" | "/extras" | "/map" {
  if (pathname === "/" || pathname.startsWith("/play/")) return "/";
  if (isMapRoute(pathname)) return "/map";
  if (isExploreRoute(pathname)) return "/extras";
  return "/";
}
