import type { PanzoomOptions } from "@panzoom/panzoom";
import { PANZOOM_EXCLUDE_CLASS } from "@/lib/map-colors";

/** Pinch, wheel, and button zoom sensitivity (Panzoom default is 0.3). */
export const MAP_PANZOOM_STEP = 1;

/** Smaller step for toolbar +/- buttons so desktop clicks stay controlled. */
export const MAP_ZOOM_BUTTON_STEP = 0.55;

/** Shared Panzoom config for interactive map explorers. */
export const MAP_PANZOOM_OPTIONS = {
  maxScale: 16,
  minScale: 1,
  step: MAP_PANZOOM_STEP,
  contain: "outside",
  // Bind pointers to the viewport parent so panning works across the whole
  // visible frame when the map is scaled past the container edges.
  canvas: true,
  cursor: "grab",
  excludeClass: PANZOOM_EXCLUDE_CLASS,
  // Pinch+pan while `contain` is on uses stale dimensions mid-gesture and makes
  // follow-up pans feel wrongly scaled on mobile. Pinch still zooms; single-finger
  // pan divides deltas by the current scale for 1:1 screen tracking.
  pinchAndPan: false,
  duration: 120,
  handleStartEvent: (event: Event) => {
    event.preventDefault();
  },
} satisfies PanzoomOptions;
