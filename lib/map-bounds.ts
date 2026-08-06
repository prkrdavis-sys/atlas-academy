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
 * Decide whether a partially visible neighbor should be pulled fully into frame.
 * Completes meaningful surroundings; ignores tiny corner overlaps of huge countries.
 */
function shouldCompletePartiallyVisible(
  focus: PathBounds,
  crop: PathBounds,
  subjectArea: number,
): boolean {
  const visible = intersectionArea(focus, crop);
  const area = boundsArea(focus);
  if (visible <= 0 || area <= 0) return false;
  if (visible >= area * 0.999) return false;

  const visibleFraction = visible / area;
  // Huge neighbors (e.g. Brazil next to Guyana): leave partial unless already mostly in view.
  if (subjectArea > 0 && area > subjectArea * 6 && visibleFraction < 0.55) {
    return false;
  }

  if (visibleFraction >= 0.15) return true;

  const overflowX =
    Math.max(0, crop[0] - focus[0]) + Math.max(0, focus[2] - crop[2]);
  const overflowY =
    Math.max(0, crop[1] - focus[1]) + Math.max(0, focus[3] - crop[3]);
  const cropWidth = crop[2] - crop[0];
  const cropHeight = crop[3] - crop[1];
  return overflowX <= cropWidth * 0.35 && overflowY <= cropHeight * 0.35;
}

/**
 * Subject-centered crop that fully covers `bounds` (LTRB), matching aspect if given.
 */
function cropCenteredOnSubject(
  subjectCenterX: number,
  subjectCenterY: number,
  boundsLtrb: PathBounds,
  options: { aspectRatio?: number; padRatio?: number },
): PathBounds {
  const pad =
    Math.max(boundsLtrb[2] - boundsLtrb[0], boundsLtrb[3] - boundsLtrb[1]) *
    (options.padRatio ?? 0.04);
  const needLeft = subjectCenterX - (boundsLtrb[0] - pad);
  const needRight = boundsLtrb[2] + pad - subjectCenterX;
  const needTop = subjectCenterY - (boundsLtrb[1] - pad);
  const needBottom = boundsLtrb[3] + pad - subjectCenterY;
  let width = 2 * Math.max(needLeft, needRight, 1e-6);
  let height = 2 * Math.max(needTop, needBottom, 1e-6);

  if (options.aspectRatio !== undefined) {
    const aspectRatio = options.aspectRatio;
    if (width / height < aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }
  }

  return [subjectCenterX - width / 2, subjectCenterY - height / 2, width, height];
}

/**
 * Expand a subject-centered close-up so border neighbors already in view are not
 * sliced mid-shape. Always keeps the featured place centered; never recenters on
 * surrounding countries (which previously pushed places like France off-frame).
 */
function expandCropToCompleteSurroundings(
  cropXYWH: PathBounds,
  template: MapTemplateBounds,
  subject: PathBounds,
  options: {
    aspectRatio?: number;
    maxExpandRatio: number;
    /** When set, only these path ids are candidates (typically land-border neighbors). */
    neighborPathIds?: string[];
  },
): PathBounds {
  const [x0, y0, originalWidth, originalHeight] = cropXYWH;
  const subjectCenterX = (subject[0] + subject[2]) / 2;
  const subjectCenterY = (subject[1] + subject[3]) / 2;
  const subjectArea = boundsArea(subject);
  const originalCropLtrb: PathBounds = [x0, y0, x0 + originalWidth, y0 + originalHeight];

  const candidateIds =
    options.neighborPathIds !== undefined
      ? options.neighborPathIds
      : Object.keys(template.focusPaths ?? template.paths);

  const toInclude: PathBounds[] = [];
  for (const pathId of candidateIds) {
    const focus = template.focusPaths?.[pathId] ?? template.paths[pathId];
    if (!focus || !shouldCompletePartiallyVisible(focus, originalCropLtrb, subjectArea)) {
      continue;
    }

    // Only complete a neighbor if it fits within the zoom budget while staying
    // subject-centered — otherwise leave it partially visible at the edge.
    const needed = cropCenteredOnSubject(subjectCenterX, subjectCenterY, focus, {
      aspectRatio: options.aspectRatio,
      padRatio: 0.04,
    });
    if (
      needed[2] / originalWidth > options.maxExpandRatio ||
      needed[3] / originalHeight > options.maxExpandRatio
    ) {
      continue;
    }

    toInclude.push(focus);
  }

  if (toInclude.length === 0) {
    return cropXYWH;
  }

  const united = unionBounds([originalCropLtrb, ...toInclude]);
  if (!united) return cropXYWH;

  let next = cropCenteredOnSubject(subjectCenterX, subjectCenterY, united, {
    aspectRatio: options.aspectRatio,
    padRatio: 0.04,
  });

  const widthScale = next[2] / originalWidth;
  const heightScale = next[3] / originalHeight;
  if (widthScale > options.maxExpandRatio || heightScale > options.maxExpandRatio) {
    const scale = Math.min(
      options.maxExpandRatio / widthScale,
      options.maxExpandRatio / heightScale,
      1,
    );
    next = [
      subjectCenterX - (next[2] * scale) / 2,
      subjectCenterY - (next[3] * scale) / 2,
      next[2] * scale,
      next[3] * scale,
    ];
  }

  // Subject-centered crops always contain the subject when at least as large as
  // the original close-up (which already framed it with margin).
  if (next[2] < originalWidth || next[3] < originalHeight) {
    return cropXYWH;
  }

  return next;
}

/**
 * Scaled close-up around a place: pad the full geometry, then expand to the
 * display aspect ratio. Never shrinks below the padded subject, so nothing is cut off.
 *
 * Framing is relative to the subject only (not the continent template), so
 * microstates stay large enough to show their detailed outline.
 *
 * Padding is per-axis (not based on the longer side). Ultra-wide places like
 * Russia used to inherit enormous vertical pad from their east–west span,
 * which zoomed out into Natural Earth polar scallops where the terrain fill
 * shows broken pole artifacts. High-Arctic subjects (Canada, Greenland, …)
 * have the same failure mode from ordinary north pad alone — their mainland
 * already sits on the polar edge — so they get a tight northern margin and
 * spill leftover vertical context south.
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
  let centerY = (subjectTop + subjectBottom) / 2;
  const subjectAspect = subjectWidth / subjectHeight;
  // Subject northern edge already in the high Arctic (NE y near the pole band).
  const isArcticSubject = subjectTop < 100;

  let padX = subjectWidth * options.paddingRatio;
  let padY = subjectHeight * options.paddingRatio;
  // Extreme landscape (Russia, …): horizontal pad tied to width alone
  // leaves a continent-scale ocean halo. Cap it against the short side.
  if (subjectAspect > 2.5) {
    padX = Math.min(padX, subjectHeight * options.paddingRatio * 1.25);
  }
  // Canada / Greenland / Svalbard: symmetric pad opens straight into the
  // polar scallop and over-zooms. Tighten both axes before aspect fit.
  if (isArcticSubject) {
    padX = Math.min(padX, subjectWidth * Math.min(options.paddingRatio, 0.28));
    padY = Math.min(padY, subjectHeight * Math.min(options.paddingRatio, 0.25));
  }

  let width = Math.max(subjectWidth + padX * 2, subjectWidth * 1.12);
  let height = Math.max(subjectHeight + padY * 2, subjectHeight * 1.12);
  const paddedHeight = height;
  // Cap how far the frame opens above the subject into Arctic void.
  const comfortNorthPad = Math.min(
    padY,
    subjectHeight * (isArcticSubject ? 0.08 : 0.2),
  );

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

  // Spill surplus height south when aspect fit grew the frame, or when the
  // subject already sits on the polar edge (Canada) so north pad is wasted void.
  if (height > paddedHeight + 1e-6 || isArcticSubject) {
    centerY = subjectTop - comfortNorthPad + height / 2;
  }

  // Final clamp: do not open the crop into NE polar scallops above y=0 unless
  // the subject itself extends there (keep the subject fully in frame).
  const top = centerY - height / 2;
  const polarFloor = Math.min(subjectTop, 0);
  if (top < polarFloor) {
    centerY += polarFloor - top;
  }

  return [centerX - width / 2, centerY - height / 2, width, height];
}

/**
 * Close-up crop of a place on its context map.
 * By default frames the mainland/core landmass (`focusPaths`) so remote
 * territories (e.g. Caribbean Netherlands) and antimeridian fragments do not
 * force a continent-scale zoom-out.
 *
 * The featured place stays centered on the east–west axis. Zoom is relative to
 * its size (via `paddingRatio`); optional surroundings completion only pulls in
 * nearby border neighbors that fit within `maxExpandRatio`. Extra height from
 * card aspect — and ordinary north pad on high-Arctic subjects like Canada — is
 * biased south so polar scallops stay out of Learn/Library crops.
 */
export function computeFocusedViewBox(
  template: MapTemplateBounds,
  focusPathIds: string[],
  options: {
    aspectRatio?: number;
    /** Padding around the subject as a fraction of each axis (width → padX, height → padY). */
    paddingRatio: number;
    /**
     * When true (default), prefer mainland focus bounds over full path bounds.
     * Set false only when the full overseas footprint must stay in frame.
     */
    useFocusBounds?: boolean;
    /**
     * Expand the crop so border neighbors already substantially in view are not
     * cut off mid-shape. Default true. The subject remains centered.
     */
    completeSurroundings?: boolean;
    /**
     * Path ids allowed for surroundings completion (typically land-border
     * neighbors). When provided — including an empty list — only these ids are
     * considered, which prevents cascading to distant countries grazed by a
     * wide aspect frame. Omit to fall back to any partially visible path.
     */
    neighborPathIds?: string[];
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
    crop = expandCropToCompleteSurroundings(crop, template, subjectBounds, {
      aspectRatio: options.aspectRatio,
      maxExpandRatio: options.maxExpandRatio ?? 1.6,
      neighborPathIds: options.neighborPathIds,
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

export function parseSvgViewBox(viewBox: string): SvgViewBox {
  const parts = viewBox.trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return [0, 0, 100, 100];
  }
  return [parts[0], parts[1], parts[2], parts[3]];
}

/**
 * Wider framing for interactive library maps. At panzoom scale 1 the user sees
 * this crop (extra surroundings for beginners); the focused close-up is restored
 * by zooming in so the starting frame matches the static library map.
 *
 * Never returns a crop tighter than `focusedViewBox`. Large places whose library
 * close-up already exceeds the continent overview keep that close-up as the
 * minimum frame and expand around it for zoom-out room — otherwise panzoom
 * cannot restore the library framing and the country appears clipped inside a
 * nearby continent view.
 */
export function computeInteractiveSurroundingsViewBox(
  focusedViewBox: SvgViewBox,
  overviewViewBox: SvgViewBox,
  options: {
    /** Linear grow vs the focused crop. Default 3.5. */
    expandRatio?: number;
    /**
     * Floor so microstates still zoom out to a readable regional frame
     * (fraction of the continent/USA overview width/height). Default 0.06.
     */
    minOverviewFraction?: number;
  } = {},
): SvgViewBox {
  const expandRatio = options.expandRatio ?? 3.5;
  const minOverviewFraction = options.minOverviewFraction ?? 0.06;
  const [fx, fy, fw, fh] = focusedViewBox;
  const [ox, oy, ow, oh] = overviewViewBox;

  if (fw <= 0 || fh <= 0) {
    return overviewViewBox;
  }

  const aspectRatio = fw / fh;
  const overviewUsable = ow > 0 && oh > 0;
  const overviewContainsFocus =
    overviewUsable &&
    ox <= fx + 1e-6 &&
    oy <= fy + 1e-6 &&
    ox + ow >= fx + fw - 1e-6 &&
    oy + oh >= fy + fh - 1e-6;

  const focusCenterX = fx + fw / 2;
  const focusCenterY = fy + fh / 2;

  // When the library close-up already exceeds the continent overview (large
  // places / wide aspect crops), keep that close-up as the pan base. Expanding
  // further only adds empty ocean and softens the terrain texture.
  if (!overviewContainsFocus) {
    return focusedViewBox;
  }

  let width = Math.max(fw * expandRatio, ow * minOverviewFraction, fw);
  let height = Math.max(fh * expandRatio, oh * minOverviewFraction, fh);

  if (width / height < aspectRatio) {
    width = height * aspectRatio;
  } else {
    height = width / aspectRatio;
  }

  width = Math.min(width, ow);
  height = Math.min(height, oh);
  if (width / height < aspectRatio) {
    height = width / aspectRatio;
  } else {
    width = height * aspectRatio;
  }
  width = Math.min(width, ow);
  height = Math.min(height, oh);

  // Final guard: never tighter than the static library crop.
  if (width < fw - 1e-6 || height < fh - 1e-6) {
    return focusedViewBox;
  }

  let x = focusCenterX - width / 2;
  let y = focusCenterY - height / 2;

  x = Math.min(Math.max(x, ox), ox + ow - width);
  y = Math.min(Math.max(y, oy), oy + oh - height);

  return [x, y, width, height];
}
