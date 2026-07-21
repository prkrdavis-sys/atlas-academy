import type { ContextMapTemplateKey } from "@/lib/context-maps";

export type PathBounds = [left: number, top: number, right: number, bottom: number];

export type MapTemplateBounds = {
  viewBox: PathBounds;
  paths: Record<string, PathBounds>;
};

export type MapBoundsManifest = Record<ContextMapTemplateKey, MapTemplateBounds>;

const manifestCache: { data: MapBoundsManifest | null } = { data: null };

export async function loadMapBoundsManifest(): Promise<MapBoundsManifest> {
  if (manifestCache.data) return manifestCache.data;

  const response = await fetch("/maps/bounds.json");
  if (!response.ok) {
    throw new Error("Failed to load map bounds manifest");
  }

  manifestCache.data = (await response.json()) as MapBoundsManifest;
  return manifestCache.data;
}

function unionBounds(boundsList: PathBounds[]): PathBounds | null {
  if (boundsList.length === 0) return null;

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const [pathLeft, pathTop, pathRight, pathBottom] of boundsList) {
    left = Math.min(left, pathLeft);
    top = Math.min(top, pathTop);
    right = Math.max(right, pathRight);
    bottom = Math.max(bottom, pathBottom);
  }

  return [left, top, right, bottom];
}

function pathBoundsArea(bounds: PathBounds): number {
  const [left, top, right, bottom] = bounds;
  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

function rectDistance(a: PathBounds, b: PathBounds): number {
  const dx = Math.max(0, a[0] - b[2], b[0] - a[2]);
  const dy = Math.max(0, a[1] - b[3], b[1] - a[3]);
  return Math.hypot(dx, dy);
}

function templateViewBoxSize(viewBox: PathBounds): { width: number; height: number } {
  return { width: viewBox[2], height: viewBox[3] };
}

/** Adds nearby land paths when an island has no bordering neighbors to crop around. */
export function findNearestShorePathIds(
  template: MapTemplateBounds,
  focusPathIds: string[],
  options: {
    maxCount?: number;
    focusAreaRatioThreshold?: number;
    maxShoreAreaRatio?: number;
    minShoreAreaRatio?: number;
  } = {},
): string[] {
  const {
    maxCount = 1,
    focusAreaRatioThreshold = 0.015,
    maxShoreAreaRatio = 0.08,
    minShoreAreaRatio = 0.00008,
  } = options;
  const focusSet = new Set(focusPathIds);
  const focusBounds = unionBounds(
    focusPathIds
      .map((pathId) => template.paths[pathId])
      .filter((bounds): bounds is PathBounds => Boolean(bounds)),
  );
  if (!focusBounds) return [];

  if (focusPathIds.length === 1 && focusPathIds[0] === "hi" && template.paths.ca) {
    return ["ca"];
  }

  const focusArea = pathBoundsArea(focusBounds);
  const { width: templateWidth, height: templateHeight } = templateViewBoxSize(template.viewBox);
  const templateArea = templateWidth * templateHeight;
  if (focusArea / templateArea >= focusAreaRatioThreshold) {
    return [];
  }

  const minShoreArea = templateArea * minShoreAreaRatio;
  const maxShoreArea = templateArea * maxShoreAreaRatio;
  const candidates: { id: string; distance: number }[] = [];

  for (const [pathId, bounds] of Object.entries(template.paths)) {
    if (focusSet.has(pathId)) continue;

    const area = pathBoundsArea(bounds);
    if (area < minShoreArea || area > maxShoreArea) continue;

    const edgeDistance = rectDistance(focusBounds, bounds);
    if (edgeDistance === 0 && area > focusArea * 20 && area > maxShoreArea * 0.5) continue;

    candidates.push({ id: pathId, distance: edgeDistance });
  }

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, maxCount).map((candidate) => candidate.id);
}

function fitViewBoxToAspect(
  bounds: PathBounds,
  aspectRatio: number,
  paddingRatio: number,
  minSizeRatio: number,
  templateBounds: PathBounds,
): PathBounds {
  const [, , templateWidth, templateHeight] = templateBounds;
  let [left, top, right, bottom] = bounds;
  let width = right - left;
  let height = bottom - top;

  const minWidth = templateWidth * minSizeRatio;
  const minHeight = templateHeight * minSizeRatio;
  if (width < minWidth) {
    const expand = (minWidth - width) / 2;
    left -= expand;
    right += expand;
    width = minWidth;
  }
  if (height < minHeight) {
    const expand = (minHeight - height) / 2;
    top -= expand;
    bottom += expand;
    height = minHeight;
  }

  const pad = Math.max(width, height) * paddingRatio;
  left -= pad;
  top -= pad;
  width += pad * 2;
  height += pad * 2;

  const currentAspect = width / height;
  if (currentAspect < aspectRatio) {
    const newWidth = height * aspectRatio;
    const expand = (newWidth - width) / 2;
    left -= expand;
    width = newWidth;
  } else if (currentAspect > aspectRatio) {
    const newHeight = width / aspectRatio;
    const expand = (newHeight - height) / 2;
    top -= expand;
    height = newHeight;
  }

  return [left, top, width, height];
}

export function computeFocusedViewBox(
  template: MapTemplateBounds,
  focusPathIds: string[],
  contextPathIds: string[],
  options: {
    aspectRatio: number;
    paddingRatio: number;
    minSizeRatio?: number;
  },
): string {
  const autoShoreIds =
    contextPathIds.length === 0 ? findNearestShorePathIds(template, focusPathIds) : [];
  const contextIds = contextPathIds.length > 0 ? contextPathIds : autoShoreIds;
  const pathIds = [...new Set([...focusPathIds, ...contextIds])];
  const boundsList = pathIds
    .map((pathId) => template.paths[pathId])
    .filter((bounds): bounds is PathBounds => Boolean(bounds));

  const focusBounds = unionBounds(
    focusPathIds
      .map((pathId) => template.paths[pathId])
      .filter((bounds): bounds is PathBounds => Boolean(bounds)),
  );

  const combinedBounds = unionBounds(boundsList) ?? focusBounds;
  if (!combinedBounds) {
    const [x, y, width, height] = template.viewBox;
    return `${x} ${y} ${width} ${height}`;
  }

  const paddingRatio =
    autoShoreIds.length > 0 ? options.paddingRatio * 1.15 : options.paddingRatio;

  const [left, top, width, height] = fitViewBoxToAspect(
    combinedBounds,
    options.aspectRatio,
    paddingRatio,
    options.minSizeRatio ?? 0.06,
    template.viewBox,
  );

  return `${left.toFixed(2)} ${top.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
}

export function formatViewBox(bounds: PathBounds): string {
  const [left, top, width, height] = bounds;
  return `${left.toFixed(2)} ${top.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
}
