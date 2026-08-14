import flagNameRegionData from "@/data/flag-name-regions.json";
import { getFlagCropTransform } from "@/lib/flag-crop";

export type FlagNameRegion = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const regionsByCode = new Map<string, FlagNameRegion[]>(
  Object.entries(flagNameRegionData).map(([code, regions]) => [
    code.toUpperCase(),
    regions as FlagNameRegion[],
  ]),
);

/** Extra padding so letter edges don't stay sharp at the overlay clip. */
const REGION_PAD_RATIO = 0.14;

export function getFlagNameRegions(code: string): FlagNameRegion[] {
  return regionsByCode.get(code.toUpperCase()) ?? [];
}

export function expandFlagNameRegion(region: FlagNameRegion): FlagNameRegion {
  const padX = region.w * REGION_PAD_RATIO;
  const padY = region.h * REGION_PAD_RATIO;
  return intersectRegion({
    x: region.x - padX,
    y: region.y - padY,
    w: region.w + padX * 2,
    h: region.h + padY * 2,
  }) ?? region;
}

export function mapFlagRegionToDisplayBox(
  region: FlagNameRegion,
  flagAspect: number,
  boxAspect: number,
  objectFit: "contain" | "fill" | "cover",
  objectPosition = "center center",
): FlagNameRegion | null {
  if (objectFit === "fill" || Math.abs(flagAspect - boxAspect) < 0.01) {
    return intersectRegion(region);
  }

  const { xAnchor, yAnchor } = parseObjectPosition(objectPosition);

  if (objectFit === "cover") {
    if (flagAspect > boxAspect) {
      const visibleW = boxAspect / flagAspect;
      const originX = originForAnchor(xAnchor, visibleW);
      return intersectRegion({
        x: ((region.x / 100 - originX) / visibleW) * 100,
        y: region.y,
        w: (region.w / 100 / visibleW) * 100,
        h: region.h,
      });
    }

    const visibleH = flagAspect / boxAspect;
    const originY = originForAnchor(yAnchor, visibleH);
    return intersectRegion({
      x: region.x,
      y: ((region.y / 100 - originY) / visibleH) * 100,
      w: region.w,
      h: (region.h / 100 / visibleH) * 100,
    });
  }

  if (flagAspect > boxAspect) {
    const displayedH = boxAspect / flagAspect;
    const originY = (1 - displayedH) / 2;
    return intersectRegion({
      x: region.x,
      y: (originY + (region.y / 100) * displayedH) * 100,
      w: region.w,
      h: region.h * displayedH,
    });
  }

  const displayedW = flagAspect / boxAspect;
  const originX = (1 - displayedW) / 2;
  return intersectRegion({
    x: (originX + (region.x / 100) * displayedW) * 100,
    y: region.y,
    w: region.w * displayedW,
    h: region.h,
  });
}

export function mapFlagRegionToCropViewport(
  code: string,
  region: FlagNameRegion,
): FlagNameRegion | null {
  const { widthScale, heightScale, posX, posY } = getFlagCropTransform(code);
  return intersectRegion({
    x: (1 - widthScale) * posX + region.x * widthScale,
    y: (1 - heightScale) * posY + region.y * heightScale,
    w: region.w * widthScale,
    h: region.h * heightScale,
  });
}

export function getDisplayFlagNameRegions(
  code: string,
  flagAspect: number,
  boxAspect: number,
  objectFit: "contain" | "fill" | "cover",
  objectPosition?: string,
): FlagNameRegion[] {
  return getFlagNameRegions(code)
    .map(expandFlagNameRegion)
    .map((region) =>
      mapFlagRegionToDisplayBox(region, flagAspect, boxAspect, objectFit, objectPosition),
    )
    .filter((region): region is FlagNameRegion => region !== null);
}

export function getCropFlagNameRegions(code: string): FlagNameRegion[] {
  return getFlagNameRegions(code)
    .map(expandFlagNameRegion)
    .map((region) => mapFlagRegionToCropViewport(code, region))
    .filter((region): region is FlagNameRegion => region !== null);
}

function originForAnchor(anchor: "start" | "center" | "end", visibleFraction: number) {
  if (anchor === "start") return 0;
  if (anchor === "end") return 1 - visibleFraction;
  return (1 - visibleFraction) / 2;
}

function parseObjectPosition(objectPosition: string): {
  xAnchor: "start" | "center" | "end";
  yAnchor: "start" | "center" | "end";
} {
  const parts = objectPosition.trim().split(/\s+/);
  return {
    xAnchor: horizontalAnchor(parts[0] ?? "center"),
    yAnchor: verticalAnchor(parts[1] ?? parts[0] ?? "center"),
  };
}

function horizontalAnchor(value: string): "start" | "center" | "end" {
  const normalized = value.toLowerCase();
  if (normalized === "left") return "start";
  if (normalized === "right") return "end";
  return "center";
}

function verticalAnchor(value: string): "start" | "center" | "end" {
  const normalized = value.toLowerCase();
  if (normalized === "top") return "start";
  if (normalized === "bottom") return "end";
  return "center";
}

function intersectRegion(region: FlagNameRegion): FlagNameRegion | null {
  const x1 = Math.max(0, region.x);
  const y1 = Math.max(0, region.y);
  const x2 = Math.min(100, region.x + region.w);
  const y2 = Math.min(100, region.y + region.h);
  const w = x2 - x1;
  const h = y2 - y1;
  if (w < 0.5 || h < 0.5) return null;
  return { x: x1, y: y1, w, h };
}
