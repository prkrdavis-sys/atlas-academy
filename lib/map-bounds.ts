import type { ContextMapTemplateKey } from "@/lib/context-maps";

export type PathBounds = [left: number, top: number, right: number, bottom: number];

export type MapTemplateBounds = {
  viewBox: PathBounds;
  paths: Record<string, PathBounds>;
  /** Mainland / nearby-island bounds used for framing (excludes remote territories). */
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

/**
 * Builds a photo-crop viewBox around the subject: pad for regional context,
 * match the display aspect ratio, and keep the subject comfortably large —
 * without ever clipping it.
 */
function fitRegionalViewBox(
  subject: PathBounds,
  options: {
    aspectRatio?: number;
    paddingRatio: number;
    minSizeRatio: number;
    /** Target minimum share of the frame for the subject on its dominant axis. */
    minSubjectFill?: number;
  },
  templateBounds: PathBounds,
): PathBounds {
  const [, , templateWidth, templateHeight] = templateBounds;
  const [subjectLeft, subjectTop, subjectRight, subjectBottom] = subject;
  const subjectWidth = Math.max(subjectRight - subjectLeft, 1e-6);
  const subjectHeight = Math.max(subjectBottom - subjectTop, 1e-6);
  const subjectCenterX = (subjectLeft + subjectRight) / 2;
  const subjectCenterY = (subjectTop + subjectBottom) / 2;
  const aspectRatio = options.aspectRatio;
  const minSubjectFill = options.minSubjectFill ?? 0.26;

  // Padded window that fully contains the subject.
  const pad = Math.max(subjectWidth, subjectHeight) * options.paddingRatio;
  let width = subjectWidth + pad * 2;
  let height = subjectHeight + pad * 2;

  const minWidth = templateWidth * options.minSizeRatio;
  const minHeight = templateHeight * options.minSizeRatio;
  width = Math.max(width, minWidth, subjectWidth * 1.08);
  height = Math.max(height, minHeight, subjectHeight * 1.08);

  if (aspectRatio !== undefined) {
    if (width / height < aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }

    // If aspect expansion made the subject too small, zoom in — but never clip it.
    const fillX = subjectWidth / width;
    const fillY = subjectHeight / height;
    if (Math.min(fillX, fillY) < minSubjectFill) {
      const widthFromSubject = subjectWidth / minSubjectFill;
      const heightFromSubject = subjectHeight / minSubjectFill;
      // Pick the zoom that restores fill on the weaker axis, then re-apply aspect
      // while still containing the subject with a little margin.
      if (fillX < fillY) {
        width = Math.max(widthFromSubject, subjectWidth * 1.08);
        height = width / aspectRatio;
        if (height < subjectHeight * 1.08) {
          height = subjectHeight * 1.08;
          width = height * aspectRatio;
        }
      } else {
        height = Math.max(heightFromSubject, subjectHeight * 1.08);
        width = height * aspectRatio;
        if (width < subjectWidth * 1.08) {
          width = subjectWidth * 1.08;
          height = width / aspectRatio;
        }
      }
    }
  }

  return [
    subjectCenterX - width / 2,
    subjectCenterY - height / 2,
    width,
    height,
  ];
}

/**
 * Crop a context-map template around the featured place like a photo crop of a
 * regional map. The place is the subject; surrounding land stays in frame.
 */
export function computeFocusedViewBox(
  template: MapTemplateBounds,
  focusPathIds: string[],
  options: {
    aspectRatio?: number;
    /** Extra space around the subject relative to its size (0.7 ≈ subject ~40% of frame). */
    paddingRatio: number;
    /** Floor for how small the crop can be, as a fraction of the template. */
    minSizeRatio?: number;
  },
): string {
  const subjectBounds = unionBounds(
    focusPathIds
      .map((pathId) => template.focusPaths?.[pathId] ?? template.paths[pathId])
      .filter((bounds): bounds is PathBounds => Boolean(bounds)),
  );

  if (!subjectBounds) {
    const [x, y, width, height] = template.viewBox;
    return formatViewBox([x, y, width, height]);
  }

  const [, , templateWidth, templateHeight] = template.viewBox;
  const [subjectLeft, subjectTop, subjectRight, subjectBottom] = subjectBounds;
  const subjectWidth = Math.max(subjectRight - subjectLeft, 1e-6);
  const subjectHeight = Math.max(subjectBottom - subjectTop, 1e-6);
  const subjectDiagonal = Math.hypot(subjectWidth, subjectHeight);
  const templateDiagonal = Math.hypot(templateWidth, templateHeight);
  // Diagonal ratio is stable across templates that contain huge neighbors (e.g. Russia in Europe).
  const diagonalRatio = subjectDiagonal / templateDiagonal;

  let frameSubject = subjectBounds;
  let paddingRatio = options.paddingRatio;
  let minSizeRatio = options.minSizeRatio ?? 0.08;

  if (diagonalRatio < 0.015) {
    // Microstates / tiny islands: size the crop so the subject stays legible
    // (~25–30% of the frame) with a bit of neighboring coastline. Do not union
    // with a giant neighbor — that hides places like Monaco inside France.
    const targetFill = 0.3;
    const targetWidth = Math.max(subjectWidth / targetFill, subjectWidth * 3.2);
    const targetHeight = Math.max(subjectHeight / targetFill, subjectHeight * 3.2);
    const centerX = (subjectLeft + subjectRight) / 2;
    const centerY = (subjectTop + subjectBottom) / 2;
    frameSubject = [
      centerX - targetWidth / 2,
      centerY - targetHeight / 2,
      centerX + targetWidth / 2,
      centerY + targetHeight / 2,
    ];
    paddingRatio = 0.15;
    minSizeRatio = 0;
  } else if (diagonalRatio < 0.06) {
    // Smaller countries/islands: a bit more regional context than the default pad.
    paddingRatio = Math.max(paddingRatio, 0.85);
    minSizeRatio = Math.min(minSizeRatio, 0.045);
  }

  return formatViewBox(
    fitRegionalViewBox(
      frameSubject,
      {
        aspectRatio: options.aspectRatio,
        paddingRatio,
        minSizeRatio,
        minSubjectFill: 0.26,
      },
      template.viewBox,
    ),
  );
}

export function formatViewBox(bounds: PathBounds): string {
  const [left, top, width, height] = bounds;
  return `${left.toFixed(2)} ${top.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
}
