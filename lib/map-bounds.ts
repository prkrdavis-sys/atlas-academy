import type { ContextMapTemplateKey } from "@/lib/context-maps";

export type PathBounds = [left: number, top: number, right: number, bottom: number];

export type MapTemplateBounds = {
  viewBox: PathBounds;
  paths: Record<string, PathBounds>;
  /** Optional mainland-only bounds; not used for framing (full paths must stay unclipped). */
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
 * Scaled close-up around a place: pad the full geometry, then expand to the
 * display aspect ratio. Never shrinks below the padded subject, so nothing is cut off.
 */
function fitCloseUpViewBox(
  subject: PathBounds,
  options: {
    aspectRatio?: number;
    paddingRatio: number;
    minSizeRatio: number;
  },
  templateBounds: PathBounds,
): PathBounds {
  const [, , templateWidth, templateHeight] = templateBounds;
  const [subjectLeft, subjectTop, subjectRight, subjectBottom] = subject;
  const subjectWidth = Math.max(subjectRight - subjectLeft, 1e-6);
  const subjectHeight = Math.max(subjectBottom - subjectTop, 1e-6);
  const centerX = (subjectLeft + subjectRight) / 2;
  const centerY = (subjectTop + subjectBottom) / 2;

  const pad = Math.max(subjectWidth, subjectHeight) * options.paddingRatio;
  let width = Math.max(subjectWidth + pad * 2, subjectWidth * 1.12);
  let height = Math.max(subjectHeight + pad * 2, subjectHeight * 1.12);

  // Tiny places still get a readable regional window.
  width = Math.max(width, templateWidth * options.minSizeRatio);
  height = Math.max(height, templateHeight * options.minSizeRatio);

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
 * Close-up crop of a place on its context map. Uses the full path bounds so the
 * entire country/state stays inside the frame.
 */
export function computeFocusedViewBox(
  template: MapTemplateBounds,
  focusPathIds: string[],
  options: {
    aspectRatio?: number;
    /** Padding around the subject relative to its larger side. */
    paddingRatio: number;
    /** Minimum crop size as a fraction of the template (helps microstates). */
    minSizeRatio?: number;
  },
): string {
  // Always frame the full rendered geometry — never focusPaths — so islands,
  // exclaves, and elongated countries are not clipped at the edges.
  const subjectBounds = unionBounds(
    focusPathIds
      .map((pathId) => template.paths[pathId])
      .filter((bounds): bounds is PathBounds => Boolean(bounds)),
  );

  if (!subjectBounds) {
    const [x, y, width, height] = template.viewBox;
    return formatViewBox([x, y, width, height]);
  }

  return formatViewBox(
    fitCloseUpViewBox(
      subjectBounds,
      {
        aspectRatio: options.aspectRatio,
        paddingRatio: options.paddingRatio,
        minSizeRatio: options.minSizeRatio ?? 0.05,
      },
      template.viewBox,
    ),
  );
}

export function formatViewBox(bounds: PathBounds): string {
  const [left, top, width, height] = bounds;
  return `${left.toFixed(2)} ${top.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
}
