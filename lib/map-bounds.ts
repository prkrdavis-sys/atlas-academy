import type { ContextMapTemplateKey } from "@/lib/context-maps";

export type PathBounds = [left: number, top: number, right: number, bottom: number];

export type MapTemplateBounds = {
  viewBox: PathBounds;
  paths: Record<string, PathBounds>;
  /**
   * Mainland / core-landmass bounds: primary polygon plus nearby islands,
   * excluding remote overseas territories that would force an unreadably wide crop.
   */
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

function boundsIntersect(a: PathBounds, b: PathBounds): boolean {
  return !(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]);
}

function intersectionArea(a: PathBounds, b: PathBounds): number {
  const left = Math.max(a[0], b[0]);
  const top = Math.max(a[1], b[1]);
  const right = Math.min(a[2], b[2]);
  const bottom = Math.min(a[3], b[3]);
  if (right <= left || bottom <= top) return 0;
  return (right - left) * (bottom - top);
}

function boundsArea([left, top, right, bottom]: PathBounds): number {
  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

/**
 * Decide whether a partially visible country should be pulled fully into frame.
 * Completes meaningful surroundings; ignores tiny corner overlaps of huge countries.
 */
function shouldCompletePartiallyVisible(focus: PathBounds, crop: PathBounds): boolean {
  const visible = intersectionArea(focus, crop);
  const area = boundsArea(focus);
  if (visible <= 0 || area <= 0) return false;
  if (visible >= area * 0.999) return false;

  const visibleFraction = visible / area;
  if (visibleFraction >= 0.2) return true;

  const overflowX =
    Math.max(0, crop[0] - focus[0]) + Math.max(0, focus[2] - crop[2]);
  const overflowY =
    Math.max(0, crop[1] - focus[1]) + Math.max(0, focus[3] - crop[3]);
  const cropWidth = crop[2] - crop[0];
  const cropHeight = crop[3] - crop[1];
  return overflowX <= cropWidth * 0.4 && overflowY <= cropHeight * 0.4;
}

/**
 * Expand an x/y/width/height crop so countries that are already substantially
 * in view are not sliced mid-shape at the frame edge.
 */
function expandCropToCompleteSurroundings(
  cropXYWH: PathBounds,
  template: MapTemplateBounds,
  options: { aspectRatio?: number; maxExpandRatio: number },
): PathBounds {
  let [x, y, width, height] = cropXYWH;
  const originalWidth = width;
  const originalHeight = height;

  for (let iteration = 0; iteration < 5; iteration += 1) {
    const cropLtrb: PathBounds = [x, y, x + width, y + height];
    const toInclude: PathBounds[] = [];

    for (const pathId of Object.keys(template.paths)) {
      const focus = template.focusPaths?.[pathId] ?? template.paths[pathId];
      if (!focus || !shouldCompletePartiallyVisible(focus, cropLtrb)) continue;
      toInclude.push(focus);
    }

    if (toInclude.length === 0) break;

    const united = unionBounds([cropLtrb, ...toInclude]);
    if (!united) break;

    const pad = Math.max(united[2] - united[0], united[3] - united[1]) * 0.04;
    let nextLeft = united[0] - pad;
    let nextTop = united[1] - pad;
    let nextWidth = united[2] - united[0] + pad * 2;
    let nextHeight = united[3] - united[1] + pad * 2;
    const centerX = nextLeft + nextWidth / 2;
    const centerY = nextTop + nextHeight / 2;

    if (options.aspectRatio !== undefined) {
      const aspectRatio = options.aspectRatio;
      if (nextWidth / nextHeight < aspectRatio) {
        nextWidth = nextHeight * aspectRatio;
      } else {
        nextHeight = nextWidth / aspectRatio;
      }
    }

    const widthScale = nextWidth / originalWidth;
    const heightScale = nextHeight / originalHeight;
    if (widthScale > options.maxExpandRatio || heightScale > options.maxExpandRatio) {
      const scale = Math.min(
        options.maxExpandRatio / widthScale,
        options.maxExpandRatio / heightScale,
        1,
      );
      nextWidth *= scale;
      nextHeight *= scale;
    }

    const nextX = centerX - nextWidth / 2;
    const nextY = centerY - nextHeight / 2;
    if (
      Math.abs(nextX - x) < 0.01 &&
      Math.abs(nextY - y) < 0.01 &&
      Math.abs(nextWidth - width) < 0.01 &&
      Math.abs(nextHeight - height) < 0.01
    ) {
      break;
    }

    x = nextX;
    y = nextY;
    width = nextWidth;
    height = nextHeight;
  }

  return [x, y, width, height];
}

/**
 * Scaled close-up around a place: pad the full geometry, then expand to the
 * display aspect ratio. Never shrinks below the padded subject, so nothing is cut off.
 *
 * Framing is relative to the subject only (not the continent template), so
 * microstates stay large enough to show their detailed outline.
 */
function fitCloseUpViewBox(
  subject: PathBounds,
  options: {
    aspectRatio?: number;
    paddingRatio: number;
  },
): PathBounds {
  const [subjectLeft, subjectTop, subjectRight, subjectBottom] = subject;
  const subjectWidth = Math.max(subjectRight - subjectLeft, 1e-6);
  const subjectHeight = Math.max(subjectBottom - subjectTop, 1e-6);
  const centerX = (subjectLeft + subjectRight) / 2;
  const centerY = (subjectTop + subjectBottom) / 2;
  const subjectSpan = Math.max(subjectWidth, subjectHeight);

  const pad = subjectSpan * options.paddingRatio;
  let width = Math.max(subjectWidth + pad * 2, subjectWidth * 1.12);
  let height = Math.max(subjectHeight + pad * 2, subjectHeight * 1.12);

  // Final safety: the subject must always fit with a little margin.
  width = Math.max(width, subjectWidth * 1.12);
  height = Math.max(height, subjectHeight * 1.12);

  if (options.aspectRatio !== undefined) {
    const aspectRatio = options.aspectRatio;
    if (width / height < aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }

    // Aspect fit only expands. If a wide/tall frame would still be tighter than
    // the subject on an axis, grow that axis (and re-match aspect).
    if (width < subjectWidth * 1.12) {
      width = subjectWidth * 1.12;
      height = width / aspectRatio;
    }
    if (height < subjectHeight * 1.12) {
      height = subjectHeight * 1.12;
      width = height * aspectRatio;
    }
  }

  return [centerX - width / 2, centerY - height / 2, width, height];
}

/**
 * Close-up crop of a place on its context map.
 * By default frames the mainland/core landmass (`focusPaths`) so remote
 * territories (e.g. Caribbean Netherlands) and antimeridian fragments do not
 * force a continent-scale zoom-out.
 */
export function computeFocusedViewBox(
  template: MapTemplateBounds,
  focusPathIds: string[],
  options: {
    aspectRatio?: number;
    /** Padding around the subject relative to its larger side. */
    paddingRatio: number;
    /**
     * When true (default), prefer mainland focus bounds over full path bounds.
     * Set false only when the full overseas footprint must stay in frame.
     */
    useFocusBounds?: boolean;
    /**
     * Expand the crop so countries already substantially in view are not cut
     * off mid-shape. Default true.
     */
    completeSurroundings?: boolean;
    /** Max crop growth vs the initial subject close-up when completing surroundings. */
    maxExpandRatio?: number;
  },
): string {
  const useFocusBounds = options.useFocusBounds !== false;
  const subjectBounds = unionBounds(
    focusPathIds
      .map((pathId) => {
        if (useFocusBounds && template.focusPaths?.[pathId]) {
          return template.focusPaths[pathId];
        }
        return template.paths[pathId];
      })
      .filter((bounds): bounds is PathBounds => Boolean(bounds)),
  );

  if (!subjectBounds) {
    const [x, y, width, height] = template.viewBox;
    return formatViewBox([x, y, width, height]);
  }

  let crop = fitCloseUpViewBox(subjectBounds, {
    aspectRatio: options.aspectRatio,
    paddingRatio: options.paddingRatio,
  });

  if (options.completeSurroundings !== false) {
    crop = expandCropToCompleteSurroundings(crop, template, {
      aspectRatio: options.aspectRatio,
      maxExpandRatio: options.maxExpandRatio ?? 1.85,
    });
  }

  return formatViewBox(crop);
}

export function formatViewBox(bounds: PathBounds): string {
  const [left, top, width, height] = bounds;
  return `${left.toFixed(2)} ${top.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
}

/** SVG viewBox as `[x, y, width, height]` (distinct from path LTRB bounds). */
export type SvgViewBox = readonly [x: number, y: number, width: number, height: number];

/**
 * Ignore remote speck islands when framing the interactive overview — they
 * stretch the Pacific without adding readable landmass at world scale.
 * Relative to the largest focus polygon (typically Russia / Antarctica).
 */
const OVERVIEW_MIN_FOCUS_AREA_RATIO = 0.0002;

function overviewFocusBounds(template: MapTemplateBounds): PathBounds[] {
  const focus = template.focusPaths ?? template.paths;
  const entries = Object.entries(focus);
  if (entries.length === 0) return [];

  const areas = entries.map(([id, bounds]) => ({
    id,
    bounds,
    area: boundsArea(bounds),
  }));
  const maxArea = Math.max(...areas.map((entry) => entry.area), 1e-6);

  return areas
    .filter((entry) => entry.area >= maxArea * OVERVIEW_MIN_FOCUS_AREA_RATIO)
    .map((entry) => entry.bounds);
}

/**
 * Comfortable default framing for the interactive map explorer.
 * Uses mainland `focusPaths`, drops speck islands, then cover-crops to
 * `aspectRatio` so scale-1 fills the viewport (crops empty ocean / polar edge).
 */
export function getMapOverviewViewBox(
  template: MapTemplateBounds,
  options: { paddingRatio?: number; aspectRatio?: number } = {},
): SvgViewBox {
  const { paddingRatio = 0.02, aspectRatio } = options;
  const subject = unionBounds(overviewFocusBounds(template));

  if (!subject) {
    // Template viewBox is stored as XYWH (see generate-context-maps).
    const [x, y, width, height] = template.viewBox;
    return [x, y, width, height];
  }

  const [left, top, right, bottom] = subject;
  let width = Math.max(right - left, 1e-6);
  let height = Math.max(bottom - top, 1e-6);
  const pad = Math.max(width, height) * paddingRatio;
  width += pad * 2;
  height += pad * 2;
  let x = left - pad;
  let y = top - pad;

  if (aspectRatio !== undefined && aspectRatio > 0) {
    if (width / height < aspectRatio) {
      // Too tall for the viewport: keep the north, crop the south (Antarctica band).
      const nextHeight = width / aspectRatio;
      height = nextHeight;
    } else if (width / height > aspectRatio) {
      // Too wide: crop both sides equally (empty Pacific).
      const nextWidth = height * aspectRatio;
      x += (width - nextWidth) / 2;
      width = nextWidth;
    }
  }

  return [x, y, width, height];
}

export function formatSvgViewBox(viewBox: SvgViewBox): string {
  const [x, y, width, height] = viewBox;
  return `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
}
