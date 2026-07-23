import type { PanzoomOptions } from "@panzoom/panzoom";
import { PANZOOM_EXCLUDE_CLASS } from "@/lib/map-colors";

/** Shared Panzoom config for interactive map explorers. */
export const MAP_PANZOOM_OPTIONS = {
  maxScale: 16,
  minScale: 1,
  contain: "outside",
  cursor: "grab",
  excludeClass: PANZOOM_EXCLUDE_CLASS,
  handleStartEvent: (event: Event) => {
    event.preventDefault();
  },
} satisfies PanzoomOptions;
