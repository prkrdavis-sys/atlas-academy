import type { PanzoomOptions } from "@panzoom/panzoom";
import { PANZOOM_EXCLUDE_CLASS } from "@/lib/map-colors";

function isMapPlaceTarget(target: EventTarget | null): boolean {
  return (
    target instanceof SVGPathElement &&
    Boolean(target.id) &&
    (target.classList.contains(PANZOOM_EXCLUDE_CLASS) || target.hasAttribute("data-map-place"))
  );
}

/** Shared Panzoom config for interactive map explorers. */
export const MAP_PANZOOM_OPTIONS = {
  maxScale: 16,
  minScale: 1,
  contain: "outside",
  cursor: "grab",
  excludeClass: PANZOOM_EXCLUDE_CLASS,
  handleStartEvent: (event: Event) => {
    if (isMapPlaceTarget(event.target)) {
      return;
    }
    event.preventDefault();
  },
} satisfies PanzoomOptions;
