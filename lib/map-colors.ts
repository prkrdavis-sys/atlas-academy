import {
  getMasteryGlowClass,
  getMasteryGradientId,
  getMasterySolidColor,
} from "@/lib/map-mastery-fx";
import type { MapProgressDifficulty, PlaceMasteryLevel } from "@/lib/types";

/** Panzoom skips pointer handling on elements with this class (and their descendants). */
export const PANZOOM_EXCLUDE_CLASS = "panzoom-exclude";

export type MapPathRole = "default" | "neighbor" | "highlight";

export type MapPathStyle = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Optional CSS class (e.g. mastery glow pulse). */
  className?: string;
};

type MapPalette = Record<MapPathRole, MapPathStyle> & { ocean: string };

const LIGHT_MAP_PALETTE: MapPalette = {
  ocean: "#e0f2fe",
  default: {
    // Soft grey with a whisper of sage — reads as default land, not tinted mint.
    fill: "#cad2cb",
    stroke: "#94a3b8",
    strokeWidth: 0.35,
  },
  neighbor: {
    fill: "#99f6e4",
    stroke: "#14b8a6",
    strokeWidth: 0.5,
  },
  highlight: {
    fill: "#14b8a6",
    stroke: "#0f766e",
    strokeWidth: 0.65,
  },
};

const DARK_MAP_PALETTE: MapPalette = {
  ocean: "#0f172a",
  default: {
    // Cool grey with a soft sage cast so bare land reads more natural.
    fill: "#46554d",
    stroke: "#64748b",
    strokeWidth: 0.35,
  },
  neighbor: {
    fill: "#115e59",
    stroke: "#14b8a6",
    strokeWidth: 0.5,
  },
  highlight: {
    fill: "#2dd4bf",
    stroke: "#99f6e4",
    strokeWidth: 0.65,
  },
};

const LIGHT_SUBTLE_NEIGHBOR: MapPathStyle = {
  fill: "#bdcfd2",
  stroke: "#94a3b8",
  strokeWidth: 0.35,
};

const DARK_SUBTLE_NEIGHBOR: MapPathStyle = {
  fill: "#405b60",
  stroke: "#64748b",
  strokeWidth: 0.35,
};

export function getMapPalette(isDark: boolean): MapPalette {
  return isDark ? DARK_MAP_PALETTE : LIGHT_MAP_PALETTE;
}

/**
 * Soft edge bloom for the selected country on canvas maps / globe textures.
 * Multiplied by texture pixel scale (same contract as mastery glow).
 */
export const MAP_SELECTION_GLOW_BLUR = 2.2;

/** Fills a country path with optional soft teal glow around the selection. */
export function fillSelectedMapPath(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  fill: string,
  {
    glowBlur = 0,
    allowGlow = true,
  }: {
    glowBlur?: number;
    allowGlow?: boolean;
  } = {},
) {
  ctx.save();
  if (allowGlow && glowBlur > 0) {
    ctx.shadowColor = fill;
    ctx.shadowBlur = glowBlur;
  }
  ctx.fillStyle = fill;
  ctx.fill(path, "evenodd");
  ctx.restore();
}

export function getSubtleNeighborMapStyle(isDark: boolean): MapPathStyle {
  return isDark ? DARK_SUBTLE_NEIGHBOR : LIGHT_SUBTLE_NEIGHBOR;
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

/**
 * Normal (medium) progress — teal ladder warming toward gold at level 3,
 * with level 4 represented by a metallic gold solid (animated texture applied
 * separately on the map / globe).
 */
const LIGHT_PROGRESS_FILL_COLORS: Record<PlaceMasteryLevel, string> = {
  0: LIGHT_MAP_PALETTE.default.fill,
  1: "#115e59",
  2: "#0f766e",
  3: "#0d9488",
  4: getMasterySolidColor("medium"),
};

const DARK_PROGRESS_FILL_COLORS: Record<PlaceMasteryLevel, string> = {
  0: DARK_MAP_PALETTE.default.fill,
  1: "#0f5e56",
  2: "#0f766e",
  3: "#14b8a6",
  4: getMasterySolidColor("medium"),
};

/**
 * Hard progress — deep violet → magenta → hot pink/cyan accents, with level 4
 * as a Clash Royale–style legendary solid (animated holographic texture on map/globe).
 */
const LIGHT_HARD_PROGRESS_FILL_COLORS: Record<PlaceMasteryLevel, string> = {
  0: LIGHT_MAP_PALETTE.default.fill,
  1: "#2e1065",
  2: "#86198f",
  3: "#e879f9",
  4: getMasterySolidColor("hard"),
};

const DARK_HARD_PROGRESS_FILL_COLORS: Record<PlaceMasteryLevel, string> = {
  0: DARK_MAP_PALETTE.default.fill,
  1: "#1e0b3d",
  2: "#6b21a8",
  3: "#d946ef",
  4: getMasterySolidColor("hard"),
};

function progressFillColors(
  difficulty: MapProgressDifficulty,
  isDark: boolean,
): Record<PlaceMasteryLevel, string> {
  if (difficulty === "hard") {
    return isDark ? DARK_HARD_PROGRESS_FILL_COLORS : LIGHT_HARD_PROGRESS_FILL_COLORS;
  }
  return isDark ? DARK_PROGRESS_FILL_COLORS : LIGHT_PROGRESS_FILL_COLORS;
}

function progressPathStyleForLevel(
  level: PlaceMasteryLevel,
  fill: string,
  isDark: boolean,
  difficulty: MapProgressDifficulty,
): MapPathStyle {
  const border = getProgressBorder(isDark);
  const paint =
    level === 4 ? `url(#${getMasteryGradientId(difficulty)})` : fill;
  return {
    fill: paint,
    ...border,
    className: getMasteryGlowClass(level, difficulty),
  };
}

function buildProgressFills(
  colors: Record<PlaceMasteryLevel, string>,
  isDark: boolean,
  difficulty: MapProgressDifficulty,
): Record<PlaceMasteryLevel, MapPathStyle> {
  return {
    0: progressPathStyleForLevel(0, colors[0], isDark, difficulty),
    1: progressPathStyleForLevel(1, colors[1], isDark, difficulty),
    2: progressPathStyleForLevel(2, colors[2], isDark, difficulty),
    3: progressPathStyleForLevel(3, colors[3], isDark, difficulty),
    4: progressPathStyleForLevel(4, colors[4], isDark, difficulty),
  };
}

const LIGHT_PROGRESS_FILLS = buildProgressFills(LIGHT_PROGRESS_FILL_COLORS, false, "medium");
const DARK_PROGRESS_FILLS = buildProgressFills(DARK_PROGRESS_FILL_COLORS, true, "medium");
const LIGHT_HARD_PROGRESS_FILLS = buildProgressFills(LIGHT_HARD_PROGRESS_FILL_COLORS, false, "hard");
const DARK_HARD_PROGRESS_FILLS = buildProgressFills(DARK_HARD_PROGRESS_FILL_COLORS, true, "hard");

function progressFills(
  difficulty: MapProgressDifficulty,
  isDark: boolean,
): Record<PlaceMasteryLevel, MapPathStyle> {
  if (difficulty === "hard") {
    return isDark ? DARK_HARD_PROGRESS_FILLS : LIGHT_HARD_PROGRESS_FILLS;
  }
  return isDark ? DARK_PROGRESS_FILLS : LIGHT_PROGRESS_FILLS;
}

export function getProgressPathStyle(
  level: PlaceMasteryLevel,
  isDark: boolean,
  difficulty: MapProgressDifficulty = "medium",
): MapPathStyle {
  return progressFills(difficulty, isDark)[level];
}

export function getProgressFillColor(
  level: PlaceMasteryLevel,
  isDark: boolean,
  difficulty: MapProgressDifficulty = "medium",
): string {
  return progressFillColors(difficulty, isDark)[level];
}

/** Hover/selection emphasis with the same standardized border color. */
export function getProgressPathHoverStyle(style: MapPathStyle, isDark: boolean): MapPathStyle {
  const border = getProgressBorder(isDark);
  return {
    fill: style.fill,
    stroke: border.stroke,
    strokeWidth: Math.min(border.strokeWidth + 0.2, 0.75),
    className: style.className,
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
