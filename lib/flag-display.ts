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

// Wide flags with a centered emblem or symbol need a centered crop in quiz tiles.
// Other wide flags stay left-anchored so hoist-side details remain visible.
const centeredSubjectCodes = new Set([
  "AS",
  "AZ",
  "BN",
  "BZ",
  "CA",
  "CV",
  "DE",
  "FM",
  "GT",
  "GU",
  "HN",
  "HR",
  "IM",
  "JE",
  "KG",
  "KI",
  "KM",
  "LC",
  "LI",
  "MD",
  "MK",
  "NF",
  "NI",
  "PY",
  "TJ",
]);

/** Display width / height from the flag SVG's rendered viewport metadata. */
export function getFlagAspectRatio(code: string): number {
  return ratioByCode.get(code.toLowerCase()) ?? DEFAULT_ASPECT_RATIO;
}

/** Returns the crop anchor for wide flags in fixed-ratio quiz tiles. */
export function getFlagGridObjectPosition(code: string): "left center" | "center center" {
  return centeredSubjectCodes.has(code.toUpperCase()) ? "center center" : "left center";
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
