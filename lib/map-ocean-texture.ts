/**
 * Natural Earth / Albers USA–projected GEBCO bathymetry for 2D context maps.
 * Same NASA source as the globe (`public/globe/ocean-depth.png`), warped into
 * SVG map coordinates and recolored with the globe ocean ramp so Learn/Library
 * water matches the globe instead of a flat navy that disappears into the card.
 *
 * Full-world (or full-USA) bakes — not per-crop images — so SVG viewBox zoom
 * reveals the correct region without rectangular gaps. See
 * scripts/generate-map-ocean-texture.ts.
 */

import {
  MAP_LAND_TEXTURE_HEIGHT,
  MAP_LAND_TEXTURE_WIDTH,
} from "@/lib/map-land-texture";

export const MAP_OCEAN_NE_DARK_PATH = "/maps/ocean-depth-ne-dark.jpg";
export const MAP_OCEAN_NE_LIGHT_PATH = "/maps/ocean-depth-ne-light.jpg";
export const MAP_OCEAN_USA_DARK_PATH = "/maps/ocean-depth-usa-dark.jpg";
export const MAP_OCEAN_USA_LIGHT_PATH = "/maps/ocean-depth-usa-light.jpg";

/** SVG user units — matches the Natural Earth fitSize canvas. */
export const MAP_OCEAN_NE_WIDTH = MAP_LAND_TEXTURE_WIDTH;
export const MAP_OCEAN_NE_HEIGHT = MAP_LAND_TEXTURE_HEIGHT;

/** SVG user units — matches public/maps/usa-projection.json. */
export const MAP_OCEAN_USA_WIDTH = 10000;
export const MAP_OCEAN_USA_HEIGHT = 7000;

export type MapOceanTexture = {
  href: string;
  width: number;
  height: number;
};

export function getMapOceanTexture(templateKey: string, isDark: boolean): MapOceanTexture {
  if (templateKey === "usa") {
    return {
      href: isDark ? MAP_OCEAN_USA_DARK_PATH : MAP_OCEAN_USA_LIGHT_PATH,
      width: MAP_OCEAN_USA_WIDTH,
      height: MAP_OCEAN_USA_HEIGHT,
    };
  }
  return {
    href: isDark ? MAP_OCEAN_NE_DARK_PATH : MAP_OCEAN_NE_LIGHT_PATH,
    width: MAP_OCEAN_NE_WIDTH,
    height: MAP_OCEAN_NE_HEIGHT,
  };
}

const preloadedOceanHrefs = new Set<string>();

/** Warm the themed bathymetry JPEG so Learn/Library maps paint without a hitch. */
export function preloadMapOceanTexture(templateKey: string, isDark: boolean): void {
  if (typeof window === "undefined") return;
  const { href } = getMapOceanTexture(templateKey, isDark);
  if (preloadedOceanHrefs.has(href)) return;
  preloadedOceanHrefs.add(href);
  const image = new Image();
  image.decoding = "async";
  image.src = href;
}
