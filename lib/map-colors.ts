/** Panzoom skips pointer handling on elements with this class (and their descendants). */
export const PANZOOM_EXCLUDE_CLASS = "panzoom-exclude";

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

/** Shared land borders for all progress map fills (same as default context-map borders). */
const LIGHT_PROGRESS_BORDER = {
  stroke: LIGHT_MAP_PALETTE.default.stroke,
  strokeWidth: LIGHT_MAP_PALETTE.default.strokeWidth,
} as const;

const DARK_PROGRESS_BORDER = {
  stroke: DARK_MAP_PALETTE.default.stroke,
  strokeWidth: DARK_MAP_PALETTE.default.strokeWidth,
} as const;

export function getProgressBorder(isDark: boolean): Pick<MapPathStyle, "stroke" | "strokeWidth"> {
  return isDark ? DARK_PROGRESS_BORDER : LIGHT_PROGRESS_BORDER;
}

function progressPathStyle(fill: string, isDark: boolean): MapPathStyle {
  const border = getProgressBorder(isDark);
  return { fill, ...border };
}

const LIGHT_PROGRESS_FILL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: LIGHT_MAP_PALETTE.default.fill,
  1: "#134e4a",
  2: "#0f766e",
  3: "#14b8a6",
  4: "#2dd4bf",
};

const DARK_PROGRESS_FILL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: DARK_MAP_PALETTE.default.fill,
  1: "#042f2e",
  2: "#0f5e56",
  3: "#119e90",
  4: "#2dd4bf",
};

const LIGHT_PROGRESS_FILLS: Record<0 | 1 | 2 | 3 | 4, MapPathStyle> = {
  0: progressPathStyle(LIGHT_PROGRESS_FILL_COLORS[0], false),
  1: progressPathStyle(LIGHT_PROGRESS_FILL_COLORS[1], false),
  2: progressPathStyle(LIGHT_PROGRESS_FILL_COLORS[2], false),
  3: progressPathStyle(LIGHT_PROGRESS_FILL_COLORS[3], false),
  4: progressPathStyle(LIGHT_PROGRESS_FILL_COLORS[4], false),
};

const DARK_PROGRESS_FILLS: Record<0 | 1 | 2 | 3 | 4, MapPathStyle> = {
  0: progressPathStyle(DARK_PROGRESS_FILL_COLORS[0], true),
  1: progressPathStyle(DARK_PROGRESS_FILL_COLORS[1], true),
  2: progressPathStyle(DARK_PROGRESS_FILL_COLORS[2], true),
  3: progressPathStyle(DARK_PROGRESS_FILL_COLORS[3], true),
  4: progressPathStyle(DARK_PROGRESS_FILL_COLORS[4], true),
};

export function getProgressPathStyle(
  level: 0 | 1 | 2 | 3 | 4,
  isDark: boolean,
): MapPathStyle {
  return isDark ? DARK_PROGRESS_FILLS[level] : LIGHT_PROGRESS_FILLS[level];
}

export function getProgressFillColor(level: 0 | 1 | 2 | 3 | 4, isDark: boolean): string {
  return isDark ? DARK_PROGRESS_FILL_COLORS[level] : LIGHT_PROGRESS_FILL_COLORS[level];
}

/** Hover/selection emphasis with the same standardized border color. */
export function getProgressPathHoverStyle(style: MapPathStyle, isDark: boolean): MapPathStyle {
  const border = getProgressBorder(isDark);
  return {
    fill: style.fill,
    stroke: border.stroke,
    strokeWidth: Math.min(border.strokeWidth + 0.4, 1.2),
  };
}

/** Resolve path styling for interactive progress maps with click selection. */
export function resolveProgressMapPathStyle(
  pathId: string,
  {
    isDark,
    baseResolver,
    selectedPathIds,
    hoveredPathId,
    allowHover = true,
  }: {
    isDark: boolean;
    baseResolver: (pathId: string) => MapPathStyle | null;
    selectedPathIds: Set<string>;
    hoveredPathId: string | null;
    allowHover?: boolean;
  },
): MapPathStyle | null {
  const palette = getMapPalette(isDark);

  if (selectedPathIds.has(pathId)) {
    return palette.highlight;
  }

  const base = baseResolver(pathId);
  if (!base) {
    return allowHover && hoveredPathId === pathId ? palette.neighbor : null;
  }

  if (allowHover && hoveredPathId === pathId) {
    return getProgressPathHoverStyle(base, isDark);
  }

  return base;
}
