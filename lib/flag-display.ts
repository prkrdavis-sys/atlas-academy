import flagDisplayData from "@/data/flag-display.json";

const DEFAULT_ASPECT_RATIO = 4 / 3;

const ratioByCode = new Map(
  Object.entries(flagDisplayData.ratios).map(([code, ratio]) => [code.toLowerCase(), ratio]),
);

export type FlagDisplayProfile = "standard" | "square" | "pennant" | "ultra-wide" | "swallowtail";

const profileByCode = new Map(
  Object.entries(flagDisplayData.profiles).map(([code, profile]) => [
    code.toUpperCase(),
    profile as Exclude<FlagDisplayProfile, "standard">,
  ]),
);

const shapedClipByCode = new Map(
  Object.entries(flagDisplayData.shaped).map(([code, clipPath]) => [code.toUpperCase(), clipPath]),
);

/** Quiz choice tiles prefer 3:2, the most common national-flag ratio. */
export const FLAG_GRID_ASPECT_RATIO = 3 / 2;

/**
 * How far a flag may be stretched to sit flush in a shared tile.
 * 3:5 versus 3:2 is about 11%, so that family still fills the preferred tile.
 * 1:2 ensigns are past this limit: cropping them drops fly-side symbols
 * (New Zealand's stars sit on the cut line), and stretching them that far
 * distorts the design. Those flags are shown whole inside the tile instead.
 */
const FLAG_GRID_MAX_STRETCH = 1.12;

/** Display width / height from the flag SVG's rendered viewport metadata. */
export function getFlagAspectRatio(code: string): number {
  return ratioByCode.get(code.toLowerCase()) ?? DEFAULT_ASPECT_RATIO;
}

function withinGridStretch(flagRatio: number, tileRatio: number): boolean {
  if (tileRatio <= 0) return false;
  const delta = flagRatio / tileRatio;
  return delta >= 1 / FLAG_GRID_MAX_STRETCH && delta <= FLAG_GRID_MAX_STRETCH;
}

/**
 * Shared tile ratio for a set of flag choices.
 * Uses 3:2 whenever every flag can fill it without a hard stretch.
 * If the whole set shares some other ratio, uses that so those flags fill
 * the tile completely. Mixed sets fall back to 3:2 and letterbox the outliers.
 */
export function getFlagGridAspectRatio(codes: string[]): number {
  const ratios = codes.map((code) => getFlagAspectRatio(code));
  if (ratios.length === 0) return FLAG_GRID_ASPECT_RATIO;
  if (ratios.every((ratio) => withinGridStretch(ratio, FLAG_GRID_ASPECT_RATIO))) {
    return FLAG_GRID_ASPECT_RATIO;
  }

  const sorted = [...ratios].sort((left, right) => left - right);
  const median = sorted[Math.floor((sorted.length - 1) / 2)] ?? FLAG_GRID_ASPECT_RATIO;
  if (ratios.every((ratio) => withinGridStretch(ratio, median))) return median;
  return FLAG_GRID_ASPECT_RATIO;
}

/** How a flag should fill a fixed-ratio quiz tile. Never crops. */
export function getFlagGridObjectFit(
  code: string,
  gridAspectRatio: number,
): "fill" | "contain" {
  const ratio = getFlagAspectRatio(code);
  if (withinGridStretch(ratio, gridAspectRatio)) return "fill";
  return "contain";
}

/** Returns the explicit geometry exception, or the profile implied by its ratio. */
export function getFlagDisplayProfile(code: string): FlagDisplayProfile {
  const explicitProfile = profileByCode.get(code.toUpperCase());
  if (explicitProfile) return explicitProfile;

  const ratio = getFlagAspectRatio(code);
  if (ratio < 1) return "pennant";
  if (Math.abs(ratio - 1) < 0.01) return "square";
  if (ratio > 2.5) return "ultra-wide";
  return "standard";
}

export function isShapedFlag(code: string): boolean {
  return shapedClipByCode.has(code.toUpperCase());
}

export function getFlagClipPath(code: string): string | undefined {
  return shapedClipByCode.get(code.toUpperCase()) ?? undefined;
}
