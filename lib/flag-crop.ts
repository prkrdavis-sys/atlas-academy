import flagCropData from "@/data/flag-crops.json";
import { getFlagAspectRatio } from "@/lib/flag-display";

export type FlagCrop = {
  x: number;
  y: number;
  zoom: number;
  colors: number;
  reviewed: true;
};

const records = flagCropData.records as Record<string, FlagCrop>;
const excludedCodes = new Set<string>(flagCropData.excludedCodes);

export const FLAG_CROP_DISPLAY_ASPECT_RATIO = flagCropData.displayAspectRatio;

export function getFlagCrop(code: string): FlagCrop | undefined {
  return records[code.toUpperCase()];
}

export function isFlagCropEligible(code: string): boolean {
  const normalized = code.toUpperCase();
  return Boolean(records[normalized]) && !excludedCodes.has(normalized);
}

function backgroundPositionForCenter(centerPercent: number, imageScale: number) {
  if (imageScale <= 1) return 50;
  const center = centerPercent / 100;
  const position = (center - 0.5 / imageScale) / (1 - 1 / imageScale);
  return Math.min(100, Math.max(0, position * 100));
}

export function getFlagCropStyle(code: string): {
  backgroundPosition: string;
  backgroundSize: string;
} {
  const crop = getFlagCrop(code) ?? {
    x: 50,
    y: 50,
    zoom: 2.9,
    colors: 2,
    reviewed: true,
  };
  const flagRatio = getFlagAspectRatio(code);
  const widthScale =
    flagRatio >= FLAG_CROP_DISPLAY_ASPECT_RATIO
      ? (flagRatio / FLAG_CROP_DISPLAY_ASPECT_RATIO) * crop.zoom
      : crop.zoom;
  const heightScale =
    flagRatio >= FLAG_CROP_DISPLAY_ASPECT_RATIO
      ? crop.zoom
      : (FLAG_CROP_DISPLAY_ASPECT_RATIO / flagRatio) * crop.zoom;

  return {
    backgroundPosition: `${backgroundPositionForCenter(crop.x, widthScale)}% ${backgroundPositionForCenter(crop.y, heightScale)}%`,
    backgroundSize:
      flagRatio >= FLAG_CROP_DISPLAY_ASPECT_RATIO
        ? `auto ${crop.zoom * 100}%`
        : `${crop.zoom * 100}% auto`,
  };
}
