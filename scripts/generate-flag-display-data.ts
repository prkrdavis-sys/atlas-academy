import fs from "node:fs";
import path from "node:path";

const FLAGS_DIR = path.join(process.cwd(), "public/flags");
const OUTPUT_PATH = path.join(process.cwd(), "data/flag-display.json");

/** Explicit official ratios for codes whose source or grouped asset can vary. */
const FLAG_RATIO_OVERRIDES: Record<string, number> = {
  ch: 1,
  lr: 19 / 10,
  mh: 19 / 10,
  // The project currently uses the U.S. flag asset for this grouped code.
  um: 19 / 10,
  us: 19 / 10,
  // Qatar's legal flag proportion is 28:11. Its SVG uses preserveAspectRatio="none".
  qa: 28 / 11,
  va: 1,
};

type FlagDisplayProfile = "square" | "pennant" | "ultra-wide" | "swallowtail";

/** Geometric exceptions that need more than the standard rectangular sizing rule. */
const FLAG_DISPLAY_PROFILES: Record<string, FlagDisplayProfile> = {
  CH: "square",
  NP: "pennant",
  QA: "ultra-wide",
  "US-OH": "swallowtail",
  VA: "square",
};

/**
 * Flags whose outline is not a plain rectangle.
 *
 * Nepal's downloaded SVG already has the correct transparent pennant outline,
 * so it deliberately has no CSS clip path. Ohio needs a clip path because its
 * source SVG keeps a rectangular canvas around the swallowtail.
 */
const SHAPED_FLAGS: Record<string, string | null> = {
  NP: null,
  "US-OH": "polygon(0% 100%, 0% 0%, 100% 18.75%, 76.92% 50%, 100% 81.25%)",
};

function parseAspectRatio(svg: string): number | null {
  // Only inspect the root <svg>. Some Wikimedia assets contain nested
  // viewBoxes before the root dimensions in serialized metadata or children.
  const rootSvg = svg.match(/<svg\b[^>]*>/i)?.[0];
  if (!rootSvg) return null;

  const preserveAspectRatio = rootSvg.match(/\bpreserveAspectRatio=["']([^"']+)["']/i)?.[1]
    .trim()
    .toLowerCase()
    .split(/\s+/)[0];
  const viewBoxMatch = rootSvg.match(/\bviewBox=["']([^"']+)["']/i);
  const widthMatch = rootSvg.match(/\bwidth=["']([\d.]+)/i);
  const heightMatch = rootSvg.match(/\bheight=["']([\d.]+)/i);

  // With preserveAspectRatio="none", the browser renders the viewBox into the
  // explicit viewport dimensions, so width/height—not the viewBox—determines
  // the displayed flag ratio. Qatar is the current example.
  if (preserveAspectRatio === "none" && widthMatch && heightMatch) {
    const width = Number(widthMatch[1]);
    const height = Number(heightMatch[1]);
    if (width > 0 && height > 0) return width / height;
  }

  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    const width = parts[2];
    const height = parts[3];
    if (width > 0 && height > 0) return width / height;
  }

  if (widthMatch && heightMatch) {
    const width = Number(widthMatch[1]);
    const height = Number(heightMatch[1]);
    if (width > 0 && height > 0) return width / height;
  }

  return null;
}

function main() {
  const ratios: Record<string, number> = {};

  for (const file of fs.readdirSync(FLAGS_DIR).filter((name) => name.endsWith(".svg"))) {
    const code = file.replace(/\.svg$/i, "");
    const svg = fs.readFileSync(path.join(FLAGS_DIR, file), "utf8");
    const ratio = parseAspectRatio(svg);
    if (ratio === null) {
      console.warn(`Could not parse aspect ratio for ${file}`);
      continue;
    }
    ratios[code] =
      FLAG_RATIO_OVERRIDES[code.toLowerCase()] ?? Math.round(ratio * 10000) / 10000;
  }

  const output = {
    ratios,
    profiles: FLAG_DISPLAY_PROFILES,
    shaped: SHAPED_FLAGS,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(ratios).length} flag ratios to ${OUTPUT_PATH}`);
}

main();
