import flagNameRegionData from "@/data/flag-name-regions.json";
import { getFlagCropTransform } from "@/lib/flag-crop";
import { getFlagAspectRatio } from "@/lib/flag-display";

export type FlagNameBox = {
  shape?: "capsule";
  x: number;
  y: number;
  w: number;
  h: number;
};

export type FlagNameArc = {
  shape: "arc";
  cx: number;
  cy: number;
  /** Midline radius as a percent of flag width. */
  r: number;
  /** Degrees; 0 is 12 o'clock, increasing clockwise. */
  start: number;
  end: number;
  /** Band thickness as a percent of flag width. */
  thickness: number;
};

export type FlagNameRegion = FlagNameBox | FlagNameArc;

export type DisplayFlagNameMask =
  | { kind: "capsule" }
  | {
      kind: "arc";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      start: number;
      end: number;
      tx: number;
      ty: number;
    };

export type DisplayFlagNameRegion = {
  x: number;
  y: number;
  w: number;
  h: number;
  letterSize: number;
  mask: DisplayFlagNameMask;
};

type SpaceMap = {
  mapX: (x: number) => number;
  mapY: (y: number) => number;
  scaleX: number;
  scaleY: number;
};

const regionsByCode = new Map<string, FlagNameRegion[]>(
  Object.entries(flagNameRegionData).map(([code, regions]) => [
    code.toUpperCase(),
    (regions as FlagNameRegion[]).map(parseRegion),
  ]),
);

const CAPSULE_PAD_X = 0.04;
const CAPSULE_PAD_Y = 0.16;
const ARC_THICKNESS_PAD = 0.08;
const ARC_ANGLE_PAD = 1.6;

export function getFlagNameRegions(code: string): FlagNameRegion[] {
  return regionsByCode.get(code.toUpperCase()) ?? [];
}

export function expandFlagNameRegion(region: FlagNameRegion): FlagNameRegion {
  if (isArc(region)) {
    const pad = region.thickness * ARC_THICKNESS_PAD;
    return {
      ...region,
      thickness: region.thickness + pad * 2,
      start: region.start - ARC_ANGLE_PAD,
      end: region.end + ARC_ANGLE_PAD,
    };
  }

  const padX = region.w * CAPSULE_PAD_X;
  const padY = region.h * CAPSULE_PAD_Y;
  return {
    shape: "capsule",
    x: region.x - padX,
    y: region.y - padY,
    w: region.w + padX * 2,
    h: region.h + padY * 2,
  };
}

export function getDisplayFlagNameRegions(
  code: string,
  flagAspect: number,
  boxAspect: number,
  objectFit: "contain" | "fill" | "cover",
  objectPosition?: string,
): DisplayFlagNameRegion[] {
  const space = spaceMapForDisplay(flagAspect, boxAspect, objectFit, objectPosition);
  return getFlagNameRegions(code)
    .map(expandFlagNameRegion)
    .map((region) => toDisplayRegion(region, flagAspect, space))
    .filter((region): region is DisplayFlagNameRegion => region !== null);
}

export function getCropFlagNameRegions(code: string): DisplayFlagNameRegion[] {
  const flagAspect = getFlagAspectRatio(code);
  return getFlagNameRegions(code)
    .map(expandFlagNameRegion)
    .map((region) => toDisplayRegion(region, flagAspect, spaceMapForCrop(code)))
    .filter((region): region is DisplayFlagNameRegion => region !== null);
}

export function flagNameLetterSize(region: DisplayFlagNameRegion): number {
  return region.letterSize;
}

export function flagNameMaskSvg(region: DisplayFlagNameRegion): string {
  const { mask } = region;
  switch (mask.kind) {
    case "capsule":
      return capsuleMaskSvg(region.w, region.h);
    case "arc":
      return arcMaskSvg(region, mask);
    default: {
      const _exhaustive: never = mask;
      return _exhaustive;
    }
  }
}

function parseRegion(raw: FlagNameRegion): FlagNameRegion {
  if (raw.shape === "arc") {
    return {
      shape: "arc",
      cx: raw.cx,
      cy: raw.cy,
      r: raw.r,
      start: raw.start,
      end: raw.end,
      thickness: raw.thickness,
    };
  }
  return {
    shape: "capsule",
    x: raw.x,
    y: raw.y,
    w: raw.w,
    h: raw.h,
  };
}

function isArc(region: FlagNameRegion): region is FlagNameArc {
  return region.shape === "arc";
}

function toDisplayRegion(
  region: FlagNameRegion,
  flagAspect: number,
  space: SpaceMap,
): DisplayFlagNameRegion | null {
  if (isArc(region)) {
    const mapped: Extract<DisplayFlagNameMask, { kind: "arc" }> = {
      kind: "arc",
      cx: space.mapX(region.cx),
      cy: space.mapY(region.cy),
      rx: region.r * space.scaleX,
      ry: region.r * flagAspect * space.scaleY,
      start: region.start,
      end: region.end,
      tx: (region.thickness / 2) * space.scaleX,
      ty: (region.thickness / 2) * flagAspect * space.scaleY,
    };
    const box = arcBoundingBox(mapped);
    const clipped = intersectBox(box);
    if (!clipped) return null;
    return {
      ...clipped,
      letterSize: region.thickness * flagAspect * space.scaleY,
      mask: mapped,
    };
  }

  const box = intersectBox({
    x: space.mapX(region.x),
    y: space.mapY(region.y),
    w: region.w * space.scaleX,
    h: region.h * space.scaleY,
  });
  if (!box) return null;
  return {
    ...box,
    letterSize: box.h,
    mask: { kind: "capsule" },
  };
}

function spaceMapForDisplay(
  flagAspect: number,
  boxAspect: number,
  objectFit: "contain" | "fill" | "cover",
  objectPosition = "center center",
): SpaceMap {
  if (objectFit === "fill" || Math.abs(flagAspect - boxAspect) < 0.01) {
    return identitySpace();
  }

  const { xAnchor, yAnchor } = parseObjectPosition(objectPosition);

  if (objectFit === "cover") {
    if (flagAspect > boxAspect) {
      const visibleW = boxAspect / flagAspect;
      const originX = originForAnchor(xAnchor, visibleW);
      return {
        mapX: (x) => ((x / 100 - originX) / visibleW) * 100,
        mapY: (y) => y,
        scaleX: 1 / visibleW,
        scaleY: 1,
      };
    }

    const visibleH = flagAspect / boxAspect;
    const originY = originForAnchor(yAnchor, visibleH);
    return {
      mapX: (x) => x,
      mapY: (y) => ((y / 100 - originY) / visibleH) * 100,
      scaleX: 1,
      scaleY: 1 / visibleH,
    };
  }

  if (flagAspect > boxAspect) {
    const displayedH = boxAspect / flagAspect;
    const originY = (1 - displayedH) / 2;
    return {
      mapX: (x) => x,
      mapY: (y) => (originY + y / 100 * displayedH) * 100,
      scaleX: 1,
      scaleY: displayedH,
    };
  }

  const displayedW = flagAspect / boxAspect;
  const originX = (1 - displayedW) / 2;
  return {
    mapX: (x) => (originX + x / 100 * displayedW) * 100,
    mapY: (y) => y,
    scaleX: displayedW,
    scaleY: 1,
  };
}

function spaceMapForCrop(code: string): SpaceMap {
  const { widthScale, heightScale, posX, posY } = getFlagCropTransform(code);
  return {
    mapX: (x) => (1 - widthScale) * posX + x * widthScale,
    mapY: (y) => (1 - heightScale) * posY + y * heightScale,
    scaleX: widthScale,
    scaleY: heightScale,
  };
}

function identitySpace(): SpaceMap {
  return {
    mapX: (x) => x,
    mapY: (y) => y,
    scaleX: 1,
    scaleY: 1,
  };
}

function arcBoundingBox(mask: Extract<DisplayFlagNameMask, { kind: "arc" }>) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of arcBandPoints(mask)) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const padX = Math.max(mask.tx, 0.6);
  const padY = Math.max(mask.ty, 0.6);
  return {
    x: minX - padX,
    y: minY - padY,
    w: maxX - minX + padX * 2,
    h: maxY - minY + padY * 2,
  };
}

function arcBandPoints(mask: Extract<DisplayFlagNameMask, { kind: "arc" }>) {
  const points: Array<[number, number]> = [];
  for (const angle of arcAngles(mask.start, mask.end)) {
    const { ux, uy } = arcUnit(angle);
    points.push([mask.cx + (mask.rx + mask.tx) * ux, mask.cy + (mask.ry + mask.ty) * uy]);
    points.push([mask.cx + Math.max(mask.rx - mask.tx, 0) * ux, mask.cy + Math.max(mask.ry - mask.ty, 0) * uy]);
  }
  return points;
}

function arcAngles(start: number, end: number): number[] {
  let finish = end;
  while (finish < start) finish += 360;
  const span = finish - start;
  const steps = Math.max(16, Math.round(span / 3));
  return Array.from({ length: steps + 1 }, (_, index) => start + (span * index) / steps);
}

function arcUnit(degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    ux: Math.sin(radians),
    uy: -Math.cos(radians),
  };
}

function capsuleMaskSvg(width: number, height: number): string {
  const radius = height / 2;
  const insetX = Math.min(width * 0.02, 0.35);
  const insetY = height * 0.08;
  return maskSvg(
    width,
    height,
    `<rect x="${fmt(insetX)}" y="${fmt(insetY)}" width="${fmt(width - insetX * 2)}" height="${fmt(height - insetY * 2)}" rx="${fmt(radius)}" ry="${fmt(radius)}" fill="white"/>`,
  );
}

function arcMaskSvg(
  box: DisplayFlagNameRegion,
  mask: Extract<DisplayFlagNameMask, { kind: "arc" }>,
): string {
  const toLocalX = (value: number) => value - box.x;
  const toLocalY = (value: number) => value - box.y;
  const outer: Array<[number, number]> = [];
  const inner: Array<[number, number]> = [];
  for (const angle of arcAngles(mask.start, mask.end)) {
    const { ux, uy } = arcUnit(angle);
    outer.push([
      toLocalX(mask.cx + (mask.rx + mask.tx) * ux),
      toLocalY(mask.cy + (mask.ry + mask.ty) * uy),
    ]);
    inner.push([
      toLocalX(mask.cx + Math.max(mask.rx - mask.tx, 0) * ux),
      toLocalY(mask.cy + Math.max(mask.ry - mask.ty, 0) * uy),
    ]);
  }
  const path = [
    `M${fmt(outer[0][0])} ${fmt(outer[0][1])}`,
    ...outer.slice(1).map(([x, y]) => `L${fmt(x)} ${fmt(y)}`),
    ...inner.reverse().map(([x, y]) => `L${fmt(x)} ${fmt(y)}`),
    "Z",
  ].join("");
  return maskSvg(box.w, box.h, `<path d="${path}" fill="white"/>`);
}

function maskSvg(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(width)} ${fmt(height)}" preserveAspectRatio="none">${body}</svg>`;
}

function fmt(value: number): string {
  return value.toFixed(2);
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

function intersectBox(region: { x: number; y: number; w: number; h: number }) {
  const x1 = Math.max(0, region.x);
  const y1 = Math.max(0, region.y);
  const x2 = Math.min(100, region.x + region.w);
  const y2 = Math.min(100, region.y + region.h);
  const w = x2 - x1;
  const h = y2 - y1;
  if (w < 0.4 || h < 0.4) return null;
  return { x: x1, y: y1, w, h };
}
