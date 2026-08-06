/**
 * Quiz/library silhouette projection: each place is drawn alone with an
 * azimuthal equal-area view centered on its landmass so outlines keep true
 * proportions (no world Natural Earth I / Albers flat-map stretch).
 */
import {
  geoArea,
  geoAzimuthalEqualArea,
  geoBounds,
  geoCentroid,
  geoDistance,
  geoPath,
} from "d3-geo";
import type { Feature, Geometry, MultiPolygon, Polygon, Position } from "geojson";
import { buildShapeSvg } from "./map-path-utils";

/** Working canvas before crop/pad in buildShapeSvg. */
const PROJECT_SIZE = 2000;

type AreaGeometry = Polygon | MultiPolygon;

function isAreaGeometry(geometry: Geometry | null | undefined): geometry is AreaGeometry {
  return geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";
}

function asFeature(geometry: Geometry): Feature {
  return { type: "Feature", properties: {}, geometry };
}

/** Spherical area that tolerates clockwise exterior rings. */
function polygonArea(coordinates: Position[][]): number {
  const raw = geoArea(asFeature({ type: "Polygon", coordinates }));
  return Math.min(raw, 4 * Math.PI - raw);
}

/**
 * Keeps the main landmass and nearby substantial islands in geographic space,
 * dropping remote overseas scraps before projection so fitExtent is not pulled
 * outward (Caribbean Netherlands, French Guiana, Alaska/Hawaii for USA, etc.).
 */
export function toFocusGeometry(geometry: Geometry): Geometry {
  if (!isAreaGeometry(geometry)) return geometry;

  const polygons: Position[][][] =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  if (polygons.length <= 1) return geometry;

  const analyzed = polygons
    .map((coordinates) => {
      const feature = asFeature({ type: "Polygon", coordinates });
      return {
        coordinates,
        area: polygonArea(coordinates),
        centroid: geoCentroid(feature),
        bounds: geoBounds(feature),
      };
    })
    .sort((a, b) => b.area - a.area);

  const primary = analyzed[0];
  const primarySpan = Math.max(
    geoDistance(primary.bounds[0], primary.bounds[1]),
    1e-9,
  );
  const included = analyzed.filter(
    (entry) =>
      entry.area >= primary.area * 0.005 &&
      geoDistance(primary.centroid, entry.centroid) <= primarySpan * 1.75,
  );

  if (included.length === 1) {
    return { type: "Polygon", coordinates: included[0].coordinates };
  }
  return {
    type: "MultiPolygon",
    coordinates: included.map((entry) => entry.coordinates),
  };
}

/**
 * Projects a country/state outline with local azimuthal equal-area framing.
 * Antarctica is pinned to the South Pole so the continent is face-on.
 */
export function projectTrueShapePath(
  geometry: Geometry,
  options: { southPole?: boolean } = {},
): string | null {
  const focused = toFocusGeometry(geometry);
  if (!isAreaGeometry(focused)) return null;

  const feature = asFeature(focused);
  const projection = geoAzimuthalEqualArea();

  if (options.southPole) {
    projection.rotate([0, 90]);
  } else {
    const [lon, lat] = geoCentroid(feature);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    projection.rotate([-lon, -lat]);
  }

  projection.fitSize([PROJECT_SIZE, PROJECT_SIZE], feature);
  const path = geoPath(projection).digits(2)(feature);
  return path || null;
}

/** Full silhouette SVG from GeoJSON geometry. */
export function buildTrueShapeSvg(
  geometry: Geometry,
  options: { southPole?: boolean } = {},
): string | null {
  const path = projectTrueShapePath(geometry, options);
  if (!path) return null;
  return buildShapeSvg([path]);
}
