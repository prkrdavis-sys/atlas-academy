import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildShapeSvg } from "./map-path-utils";

/** Alpha-2 codes with non–Natural Earth silhouettes (Antarctica matches flag art). */
const CUSTOM_SHAPE_CODES = new Set(["AQ"]);

export function isCustomShapeCode(code: string): boolean {
  return CUSTOM_SHAPE_CODES.has(code.toUpperCase());
}

/** Uses the Graham Bartram continent path from the AQ flag so shape matches flag. */
function writeAntarcticaShape(shapesDir: string): boolean {
  const flagPath = join(process.cwd(), "public", "flags", "aq.svg");
  const flagSvg = readFileSync(flagPath, "utf8");
  const match = flagSvg.match(/<path[^>]*fill="#fff"[^>]*d="([^"]+)"/);
  if (!match) return false;

  writeFileSync(join(shapesDir, "ata.svg"), buildShapeSvg([match[1]]));
  return true;
}

export async function writeCustomShape(
  code: string,
  _code3: string,
  shapesDir = join(process.cwd(), "public", "shapes"),
): Promise<boolean> {
  switch (code.toUpperCase()) {
    case "AQ":
      return writeAntarcticaShape(shapesDir);
    default:
      return false;
  }
}
