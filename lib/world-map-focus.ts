import type Panzoom from "@panzoom/panzoom";
import type { SvgViewBox } from "@/lib/map-bounds";

type PanzoomInstance = ReturnType<typeof Panzoom>;

type FocusWorldMapOptions = {
  maxScale?: number;
  padding?: number;
};

function unionScreenRect(paths: SVGGraphicsElement[]): DOMRect | null {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const path of paths) {
    const rect = path.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }

  if (!Number.isFinite(left)) return null;

  return new DOMRect(left, top, right - left, bottom - top);
}

export function focusWorldMapOnPaths(
  svg: SVGSVGElement,
  container: HTMLElement,
  panzoom: PanzoomInstance,
  pathIds: string[],
  options: FocusWorldMapOptions = {},
): boolean {
  const { maxScale = 16, padding = 1.35 } = options;
  const paths = pathIds
    .map((pathId) => svg.querySelector<SVGGraphicsElement>(`#${CSS.escape(pathId)}`))
    .filter((path): path is SVGGraphicsElement => Boolean(path));

  if (paths.length === 0) return false;

  panzoom.reset({ animate: false });

  const focusRect = unionScreenRect(paths);
  const containerRect = container.getBoundingClientRect();
  if (!focusRect || focusRect.width <= 0 || focusRect.height <= 0) return false;

  const minScale = panzoom.getOptions().minScale ?? 1;
  const scaleX = containerRect.width / focusRect.width / padding;
  const scaleY = containerRect.height / focusRect.height / padding;
  const targetScale = Math.min(maxScale, Math.max(minScale, Math.min(scaleX, scaleY)));

  if (targetScale <= minScale + 0.01) return true;

  panzoom.zoomToPoint(
    targetScale,
    {
      clientX: focusRect.left + focusRect.width / 2,
      clientY: focusRect.top + focusRect.height / 2,
    },
    { animate: true },
  );

  return true;
}

/**
 * Zoom/pan so `focusViewBox` fills the container, assuming the SVG currently
 * displays `baseViewBox` at panzoom scale 1 (same aspect, edge-to-edge).
 * Used by the library map to keep the static close-up as the starting frame.
 */
export function focusPanzoomOnViewBoxRegion(
  container: HTMLElement,
  panzoom: PanzoomInstance,
  baseViewBox: SvgViewBox,
  focusViewBox: SvgViewBox,
  options: { animate?: boolean; maxScale?: number } = {},
): number {
  const { animate = false, maxScale = panzoom.getOptions().maxScale ?? 16 } = options;
  const [, , baseWidth, baseHeight] = baseViewBox;
  const [focusX, focusY, focusWidth, focusHeight] = focusViewBox;
  const [baseX, baseY] = baseViewBox;

  if (baseWidth <= 0 || baseHeight <= 0 || focusWidth <= 0 || focusHeight <= 0) {
    return 1;
  }

  panzoom.reset({ animate: false });

  const minScale = panzoom.getOptions().minScale ?? 1;
  const rawScale = Math.min(baseWidth / focusWidth, baseHeight / focusHeight);
  const targetScale = Math.min(maxScale, Math.max(minScale, rawScale));

  if (targetScale <= minScale + 0.01) {
    return targetScale;
  }

  const containerRect = container.getBoundingClientRect();
  const focusCenterX = focusX + focusWidth / 2;
  const focusCenterY = focusY + focusHeight / 2;
  const clientX = containerRect.left + ((focusCenterX - baseX) / baseWidth) * containerRect.width;
  const clientY = containerRect.top + ((focusCenterY - baseY) / baseHeight) * containerRect.height;

  panzoom.zoomToPoint(targetScale, { clientX, clientY }, { animate });
  return targetScale;
}
