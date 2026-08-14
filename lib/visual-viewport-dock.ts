/** Treat anything past this as page zoom (pinch or leftover focus auto-zoom). */
export const PAGE_ZOOM_EPSILON = 0.01;

/**
 * Soft keyboards shrink the visual viewport far more than browser chrome.
 * Upward jumps larger than this at scale 1 are ignored unless an editable is
 * focused, so a stale post-keyboard `visualViewport.height` cannot park the
 * tab bar mid-screen.
 */
export const KEYBOARD_HEIGHT_GAP_PX = 120;

export type ViewportBox = {
  offsetTop: number;
  height: number;
  scale: number;
};

export type DockShiftOptions = {
  /** True when a text field (or similar) is focused and may have opened the keyboard. */
  allowLargeUpwardShift: boolean;
};

/**
 * How far a `position: fixed; bottom: 0` dock must move to sit on the visible
 * bottom edge.
 *
 * iOS Safari pins `position: fixed` to the visual viewport once the page is
 * zoomed, while Chrome keeps it on the layout viewport. Using
 * `visualViewport.height` as the dock's own height double-counts on iOS and
 * parks the bar mid-screen. Measure instead, and when zoomed pick the smaller
 * correction so we do not apply layout offsets to a visual-relative box.
 */
export function dockShiftYToVisualBottom(
  untransformedBottom: number,
  vv: ViewportBox,
  options: DockShiftOptions = { allowLargeUpwardShift: false },
): number {
  const errorLayout = vv.offsetTop + vv.height - untransformedBottom;
  if (Math.abs(vv.scale - 1) <= PAGE_ZOOM_EPSILON) {
    if (errorLayout >= -KEYBOARD_HEIGHT_GAP_PX || options.allowLargeUpwardShift) {
      return errorLayout;
    }
    return 0;
  }

  const errorVisual = vv.height - untransformedBottom;
  return Math.abs(errorVisual) < Math.abs(errorLayout) ? errorVisual : errorLayout;
}
