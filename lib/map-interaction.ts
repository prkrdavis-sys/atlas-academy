import { getContextMapPathIds } from "@/lib/context-maps";
import { getCountryByCode } from "@/lib/countries";
import { PANZOOM_EXCLUDE_CLASS, resolveProgressMapPathStyle } from "@/lib/map-colors";
import { createProgressPathStyleResolver } from "@/lib/map-progress";
import type { PlaceMasteryLevel } from "@/lib/types";

const MAP_TAP_MOVE_THRESHOLD_PX = 8;

function isPrimaryPointerButton(event: PointerEvent, phase: "down" | "up"): boolean {
  if (event.pointerType === "mouse") {
    return event.button === 0;
  }

  // Touch and pen releases often report button -1 on pointerup.
  if (phase === "up") {
    return event.button === 0 || event.button === -1;
  }

  return event.isPrimary;
}

export const EMPTY_MAP_PATH_ID_SET = new Set<string>();

type MapPlaceTapHandlers = {
  onPathClick: (pathId: string) => void;
  onBackgroundClick?: () => void;
};

/** Native SVG tap handlers that run before Panzoom and distinguish taps from pans. */
export function attachMapPlaceTapHandlers(
  svg: SVGSVGElement,
  { onPathClick, onBackgroundClick }: MapPlaceTapHandlers,
): () => void {
  const activeTaps = new Map<number, { pathId: string; x: number; y: number }>();
  let backgroundTap: { x: number; y: number } | null = null;

  const isTap = (startX: number, startY: number, endX: number, endY: number) => {
    const dx = endX - startX;
    const dy = endY - startY;
    return dx * dx + dy * dy <= MAP_TAP_MOVE_THRESHOLD_PX * MAP_TAP_MOVE_THRESHOLD_PX;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!isPrimaryPointerButton(event, "down")) return;

    const target = event.target;
    if (target instanceof SVGPathElement && target.id) {
      backgroundTap = null;
      activeTaps.set(event.pointerId, {
        pathId: target.id,
        x: event.clientX,
        y: event.clientY,
      });
      return;
    }

    if (target instanceof SVGRectElement) {
      backgroundTap = { x: event.clientX, y: event.clientY };
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    const activeTap = activeTaps.get(event.pointerId);
    if (activeTap) {
      if (!isTap(activeTap.x, activeTap.y, event.clientX, event.clientY)) {
        activeTaps.delete(event.pointerId);
      }
      return;
    }

    if (backgroundTap && !isTap(backgroundTap.x, backgroundTap.y, event.clientX, event.clientY)) {
      backgroundTap = null;
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!isPrimaryPointerButton(event, "up")) return;

    const activeTap = activeTaps.get(event.pointerId);
    if (activeTap) {
      activeTaps.delete(event.pointerId);
      if (!isTap(activeTap.x, activeTap.y, event.clientX, event.clientY)) return;

      event.stopPropagation();
      event.preventDefault();
      onPathClick(activeTap.pathId);
      return;
    }

    if (!onBackgroundClick || !backgroundTap) return;
    if (!(event.target instanceof SVGRectElement)) {
      backgroundTap = null;
      return;
    }

    const tap = backgroundTap;
    backgroundTap = null;
    if (!isTap(tap.x, tap.y, event.clientX, event.clientY)) return;

    event.stopPropagation();
    onBackgroundClick();
  };

  const onPointerCancel = (event: PointerEvent) => {
    activeTaps.delete(event.pointerId);
    backgroundTap = null;
  };

  // Capture phase lets us track tap intent before Panzoom handles pan/pinch.
  svg.addEventListener("pointerdown", onPointerDown, true);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", onPointerUp);
  svg.addEventListener("pointercancel", onPointerCancel);

  return () => {
    svg.removeEventListener("pointerdown", onPointerDown, true);
    svg.removeEventListener("pointermove", onPointerMove);
    svg.removeEventListener("pointerup", onPointerUp);
    svg.removeEventListener("pointercancel", onPointerCancel);
  };
}

export function isMapPlaceElement(target: EventTarget | null): target is SVGPathElement {
  return (
    target instanceof SVGPathElement &&
    Boolean(target.id) &&
    (target.classList.contains(PANZOOM_EXCLUDE_CLASS) || target.hasAttribute("data-map-place"))
  );
}

/** All SVG path ids for a selected place (handles multi-path countries/states). */
export function getMapSelectionPathIds(selectedCode: string | null | undefined): Set<string> {
  if (!selectedCode) return new Set();
  const place = getCountryByCode(selectedCode);
  if (!place) return new Set();
  return new Set(getContextMapPathIds(place));
}

/** Shared progress + selection styling for interactive and stats maps. */
export function createInteractiveProgressPathStyleResolver(
  fillMap: Map<string, PlaceMasteryLevel>,
  isDark: boolean,
  selectedCode: string | null | undefined,
  hoveredPathId: string | null,
) {
  const selectedPathIds = getMapSelectionPathIds(selectedCode);
  const baseResolver = createProgressPathStyleResolver(fillMap, isDark);

  return (pathId: string) =>
    resolveProgressMapPathStyle(pathId, {
      isDark,
      baseResolver,
      selectedPathIds,
      hoveredPathId,
      allowHover: !selectedCode,
    });
}
