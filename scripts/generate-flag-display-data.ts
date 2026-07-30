import fs from "node:fs";
import path from "node:path";

const FLAGS_DIR = path.join(process.cwd(), "public/flags");
const OUTPUT_PATH = path.join(process.cwd(), "data/flag-display.json");

/** Flags whose outline is not a plain rectangle — borders clip to this shape. */
const SHAPED_FLAGS: Record<string, string> = {
  NP: "polygon(1.6% 96.7%, 92.6% 96.7%, 33% 48.6%, 94.9% 48.7%, 1.6% 1.2%)",
  "US-OH": "polygon(0% 100%, 0% 0%, 100% 18.75%, 76.92% 50%, 100% 81.25%)",
};

function parseAspectRatio(svg: string): number | null {
  const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    const width = parts[2];
    const height = parts[3];
    if (width > 0 && height > 0) return width / height;
  }

  const widthMatch = svg.match(/\bwidth=["']([\d.]+)/);
  const heightMatch = svg.match(/\bheight=["']([\d.]+)/);
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
    ratios[code] = Math.round(ratio * 10000) / 10000;
  }

  const output = {
    ratios,
    shaped: SHAPED_FLAGS,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(ratios).length} flag ratios to ${OUTPUT_PATH}`);
}

main();
