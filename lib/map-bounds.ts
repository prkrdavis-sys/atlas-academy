import type { ContextMapTemplateKey } from "@/lib/context-maps";
import { parseMapViewBox } from "@/lib/map-colors";

export type PathBounds = [left: number, top: number, right: number, bottom: number];

export type MapTemplateBounds = {
  viewBox: PathBounds;
  paths: Record<string, PathBounds>;
  focusPaths?: Record<string, PathBounds>;
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

function fitViewBoxToAspect(
  bounds: PathBounds,
  aspectRatio: number | undefined,
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

  if (aspectRatio !== undefined) {
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
  }

  return [left, top, width, height];
}

export function pathFullyInsideViewBox(
  template: MapTemplateBounds,
  pathId: string,
  viewBox: string,
): boolean {
  const pathBounds = template.paths[pathId];
  if (!pathBounds) return true;

  const [viewLeft, viewTop, viewWidth, viewHeight] = parseMapViewBox(viewBox);
  const viewRight = viewLeft + viewWidth;
  const viewBottom = viewTop + viewHeight;
  const [pathLeft, pathTop, pathRight, pathBottom] = pathBounds;

  return (
    pathLeft >= viewLeft &&
    pathRight <= viewRight &&
    pathTop >= viewTop &&
    pathBottom <= viewBottom
  );
}

export function computeFocusedViewBox(
  template: MapTemplateBounds,
  focusPathIds: string[],
  options: {
    aspectRatio?: number;
    paddingRatio: number;
    minSizeRatio?: number;
  },
): string {
  const focusBounds = unionBounds(
    focusPathIds
      .map((pathId) => template.focusPaths?.[pathId] ?? template.paths[pathId])
      .filter((bounds): bounds is PathBounds => Boolean(bounds)),
  );
  if (!focusBounds) {
    const [x, y, width, height] = template.viewBox;
    return `${x} ${y} ${width} ${height}`;
  }

  const [left, top, width, height] = fitViewBoxToAspect(
    focusBounds,
    options.aspectRatio,
    options.paddingRatio,
    options.minSizeRatio ?? 0.06,
    template.viewBox,
  );

  return formatViewBox([left, top, width, height]);
}

export function formatViewBox(bounds: PathBounds): string {
  const [left, top, width, height] = bounds;
  return `${left.toFixed(2)} ${top.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
}
