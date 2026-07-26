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
  cursor: "grab",
  excludeClass: PANZOOM_EXCLUDE_CLASS,
  // Pan while pinching feels more natural on touch screens.
  pinchAndPan: true,
  duration: 120,
  handleStartEvent: (event: Event) => {
    event.preventDefault();
  },
} satisfies PanzoomOptions;
