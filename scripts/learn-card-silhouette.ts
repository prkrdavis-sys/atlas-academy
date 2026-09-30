/**
 * Quiz/library silhouettes use the same polygons the learn card draws.
 *
 * Learn cards clip the context-map path to a close-up viewBox; they do not
 * delete islands. The old azimuthal silhouette dropped any ring farther than
 * 1.75× the largest island, so archipelagos (Cape Verde, Greece, Indonesia)
 * showed a fragment of the land on the card.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getContextMapPathIds,
  getNeighborContextMapPathIds,
} from "../lib/context-maps";
import {
  computeFocusedViewBox,
  LEARN_CARD_MAP_CROP,
  parseSvgViewBox,
  type MapBoundsManifest,
  type MapTemplateBounds,
} from "../lib/map-bounds";
import { isStateCode } from "../lib/scope";
import type { Country } from "../lib/types";
import { buildShapeSvg, subpathsIntersectingViewBox } from "./map-path-utils";

const MAPS_DIR = join(process.cwd(), "public", "maps");

export function learnCardTemplateKey(country: Country): "world" | "usa" {
  return isStateCode(country.code) ? "usa" : "world";
}

export function parseSvgPathMap(svgText: string): Map<string, string> {
  const paths = new Map<string, string>();
  for (const match of svgText.matchAll(/<path\s+id="([^"]+)"\s+d="([^"]+)"\s*\/?>/g)) {
    paths.set(match[1], match[2]);
  }
  return paths;
}

export function loadContextMapPaths(templateKey: "world" | "usa"): Map<string, string> {
  return parseSvgPathMap(readFileSync(join(MAPS_DIR, `${templateKey}.svg`), "utf8"));
}

/** Rings of this place that intersect the learn-card crop, in path order. */
export function learnCardVisibleSubpaths(
  country: Country,
  manifest: MapBoundsManifest,
  pathsByTemplate: { world: Map<string, string>; usa: Map<string, string> },
): string[] | null {
  const templateKey = learnCardTemplateKey(country);
  const template: MapTemplateBounds | undefined = manifest[templateKey];
  if (!template) return null;

  const ids = getContextMapPathIds(country);
  const paths = pathsByTemplate[templateKey];
  const chunks: string[] = [];
  for (const id of ids) {
    const path = paths.get(id);
    if (!path) return null;
    chunks.push(path);
  }

  const viewBox = computeFocusedViewBox(template, ids, {
    ...LEARN_CARD_MAP_CROP,
    neighborPathIds: getNeighborContextMapPathIds(country),
  });
  const visible = subpathsIntersectingViewBox(chunks.join(""), parseSvgViewBox(viewBox));
  return visible.length > 0 ? visible : null;
}

/** Tight silhouette SVG of the land the learn card shows for this place. */
export function buildLearnCardSilhouetteSvg(
  country: Country,
  manifest: MapBoundsManifest,
  pathsByTemplate: { world: Map<string, string>; usa: Map<string, string> },
): string | null {
  const visible = learnCardVisibleSubpaths(country, manifest, pathsByTemplate);
  if (!visible) return null;
  // One path so hole rings keep their winding and punch out of the fill.
  return buildShapeSvg([visible.join("")]);
}
