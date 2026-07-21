export type MapPathRole = "default" | "neighbor" | "highlight";

export type MapPathStyle = {
  fill: string;
  stroke: string;
  strokeWidth: number;
};

type MapPalette = Record<MapPathRole, MapPathStyle> & { ocean: string };

const LIGHT_MAP_PALETTE: MapPalette = {
  ocean: "#e0f2fe",
  default: {
    fill: "#cbd5e1",
    stroke: "#94a3b8",
    strokeWidth: 0.6,
  },
  neighbor: {
    fill: "#99f6e4",
    stroke: "#14b8a6",
    strokeWidth: 0.9,
  },
  highlight: {
    fill: "#14b8a6",
    stroke: "#0f766e",
    strokeWidth: 1.5,
  },
};

const DARK_MAP_PALETTE: MapPalette = {
  ocean: "#0f172a",
  default: {
    fill: "#475569",
    stroke: "#64748b",
    strokeWidth: 0.6,
  },
  neighbor: {
    fill: "#115e59",
    stroke: "#14b8a6",
    strokeWidth: 0.9,
  },
  highlight: {
    fill: "#2dd4bf",
    stroke: "#99f6e4",
    strokeWidth: 1.5,
  },
};

export function getMapPalette(isDark: boolean): MapPalette {
  return isDark ? DARK_MAP_PALETTE : LIGHT_MAP_PALETTE;
}

export function getMapPathRole(
  pathId: string,
  highlightIds: Set<string>,
  neighborIds: Set<string>,
): MapPathRole {
  if (highlightIds.has(pathId)) return "highlight";
  if (neighborIds.has(pathId)) return "neighbor";
  return "default";
}

export function parseMapViewBox(viewBox: string): [number, number, number, number] {
  const parts = viewBox.trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    return [0, 0, 100, 100];
  }
  return [parts[0], parts[1], parts[2], parts[3]];
}

export function sortMapPathsForRender<T extends { id: string }>(
  paths: T[],
  highlightIds: Set<string>,
  neighborIds: Set<string>,
): T[] {
  const roleOrder: Record<MapPathRole, number> = {
    default: 0,
    neighbor: 1,
    highlight: 2,
  };

  return [...paths].sort((a, b) => {
    const roleA = getMapPathRole(a.id, highlightIds, neighborIds);
    const roleB = getMapPathRole(b.id, highlightIds, neighborIds);
    return roleOrder[roleA] - roleOrder[roleB];
  });
}
