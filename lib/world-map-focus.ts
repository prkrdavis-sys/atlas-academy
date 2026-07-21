import type Panzoom from "@panzoom/panzoom";

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
  const { maxScale = 6, padding = 1.35 } = options;
  const paths = pathIds
    .map((pathId) => svg.querySelector<SVGGraphicsElement>(`#${CSS.escape(pathId)}`))
    .filter((path): path is SVGGraphicsElement => Boolean(path));

  if (paths.length === 0) return false;

  panzoom.reset({ animate: false });

  const focusRect = unionScreenRect(paths);
  const containerRect = container.getBoundingClientRect();
  if (!focusRect || focusRect.width <= 0 || focusRect.height <= 0) return false;

  const scaleX = containerRect.width / focusRect.width / padding;
  const scaleY = containerRect.height / focusRect.height / padding;
  const targetScale = Math.min(maxScale, Math.max(1, Math.min(scaleX, scaleY)));

  if (targetScale <= 1.01) return true;

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
