/**
 * Lon/lat → SVG user-space projection for context maps. Matches the Natural
 * Earth / Albers USA fits used when generating public/maps/*.svg
 * (see land-color-ne.json and usa-projection.json).
 */

import { geoAlbersUsa, geoNaturalEarth1, type GeoProjection } from "d3-geo";

/** Keep in sync with public/maps/land-color-ne.json projectionParams. */
const NATURAL_EARTH_PROJECTION = {
  scale: 1785.067040128928,
  translate: [4981.604028887083, 2460.937588242929] as [number, number],
  center: [0, 0] as [number, number],
  rotate: [0, 0, 0] as [number, number, number],
};

/** Keep in sync with public/maps/usa-projection.json. */
const USA_PROJECTION = {
  scale: 12350.341148956522,
  translate: [5358.9878669320715, 3454.656098304476] as [number, number],
};

let naturalEarthProjection: GeoProjection | null = null;
let usaProjection: GeoProjection | null = null;

function getNaturalEarthProjection(): GeoProjection {
  if (!naturalEarthProjection) {
    naturalEarthProjection = geoNaturalEarth1()
      .scale(NATURAL_EARTH_PROJECTION.scale)
      .translate(NATURAL_EARTH_PROJECTION.translate)
      .center(NATURAL_EARTH_PROJECTION.center)
      .rotate(NATURAL_EARTH_PROJECTION.rotate);
  }
  return naturalEarthProjection;
}

function getUsaProjection(): GeoProjection {
  if (!usaProjection) {
    usaProjection = geoAlbersUsa()
      .scale(USA_PROJECTION.scale)
      .translate(USA_PROJECTION.translate);
  }
  return usaProjection;
}

/** Project WGS84 lon/lat into the SVG coordinate space for a context-map template. */
export function projectLonLatToMap(
  lng: number,
  lat: number,
  templateKey: string,
): [number, number] | null {
  const projection = templateKey === "usa" ? getUsaProjection() : getNaturalEarthProjection();
  const point = projection([lng, lat]);
  if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    return null;
  }
  return [point[0], point[1]];
}
