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
  "AR",
  "AS",
  "AZ",
  "BI",
  "BN",
  "BZ",
  "CA",
  "CR",
  "CV",
  "CX",
  "DE",
  "DM",
  "ET",
  "FM",
  "GB",
  "GI",
  "GT",
  "GU",
  "HN",
  "HR",
  "HT",
  "IM",
  "IR",
  "JE",
  "JM",
  "KG",
  "KH",
  "KI",
  "KM",
  "KZ",
  "LC",
  "LI",
  "LY",
  "MD",
  "ME",
  "MK",
  "MP",
  "MX",
  "NC",
  "NF",
  "NI",
  "PY",
  "SC",
  "SI",
  "SV",
  "TJ",
  "US-IL",
  "US-KS",
  "US-KY",
  "US-LA",
  "US-MA",
  "US-MN",
  "US-MO",
  "US-MS",
  "US-NE",
  "US-NJ",
  "US-NY",
  "US-SD",
  "US-TN",
  "US-UT",
  "US-VT",
  "US-WA",
  "US-WV",
]);

// Mildly wide flags whose outer frame (borders, stars along the edge) is essential
// to recognition. Stretching into the 3:2 tile preserves the full design better
// than cropping a thin strip off one or both sides.
const preserveFrameCodes = new Set(["GD"]);

/** Display width / height from the flag SVG's rendered viewport metadata. */
export function getFlagAspectRatio(code: string): number {
  return ratioByCode.get(code.toLowerCase()) ?? DEFAULT_ASPECT_RATIO;
}

/** How a flag should fill a fixed-ratio quiz tile. */
export function getFlagGridObjectFit(
  code: string,
  gridAspectRatio: number,
): "fill" | "cover" {
  const ratio = getFlagAspectRatio(code);
  if (ratio <= gridAspectRatio) return "fill";
  if (preserveFrameCodes.has(code.toUpperCase())) return "fill";
  return "cover";
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
