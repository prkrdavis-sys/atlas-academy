const EXPLORE_ROUTE_PREFIXES = ["/extras", "/library", "/map"] as const;

export function isExploreRoute(pathname: string): boolean {
  return EXPLORE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
