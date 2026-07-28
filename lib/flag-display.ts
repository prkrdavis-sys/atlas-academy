import flagDisplayData from "@/data/flag-display.json";

const DEFAULT_ASPECT_RATIO = 4 / 3;

const ratioByCode = new Map(
  Object.entries(flagDisplayData.ratios).map(([code, ratio]) => [code.toLowerCase(), ratio]),
);

const shapedClipByCode = new Map(
  Object.entries(flagDisplayData.shaped).map(([code, clipPath]) => [code.toUpperCase(), clipPath]),
);

/** Width / height from the flag SVG viewBox (or width/height attributes). */
export function getFlagAspectRatio(code: string): number {
  return ratioByCode.get(code.toLowerCase()) ?? DEFAULT_ASPECT_RATIO;
}

export function isShapedFlag(code: string): boolean {
  return shapedClipByCode.has(code.toUpperCase());
}

export function getFlagClipPath(code: string): string | undefined {
  return shapedClipByCode.get(code.toUpperCase());
}
