import * as THREE from "three";
import { normalizedToLocalDirection, ringCentroid } from "@/lib/globe-focus";
import {
  getMapPalette,
  getProgressFillColor,
  MAP_SELECTION_BORDER,
} from "@/lib/map-colors";
import { getPlaceMasteryLevel } from "@/lib/map-progress";
import type { GlobeCountryShape } from "@/lib/globe-texture";
import type { MapProgressDifficulty, Profile } from "@/lib/types";

export type GlobeDetailData = {
  countries: GlobeCountryShape[];
};

/** Camera distance below which detail overlays activate (place-focus sits near 1.005). */
export const GLOBE_DETAIL_ACTIVATE_DISTANCE = 1.6;

/** Max concurrent detail country meshes — keeps draw calls bounded. */
export const GLOBE_DETAIL_MAX_OVERLAYS = 12;

/** Radius bias so fills sit just above the textured sphere. */
export const GLOBE_DETAIL_MESH_RADIUS = 1.0015;

/** Half-angle (radians) of the cone around the camera-facing direction for neighbor picks. */
const OVERLAY_VIEW_HALF_ANGLE = THREE.MathUtils.degToRad(25);

/**
 * Skip detail overlays for places larger than this (radians). Mid-size countries
 * already look fine on the texture and would paint over the view if drawn with
 * depthTest disabled.
 */
const OVERLAY_MAX_ANGULAR_RADIUS = THREE.MathUtils.degToRad(1.5);

let detailLoadPromise: Promise<GlobeDetailData> | null = null;

/** Lazy-loads the high-detail ring set on first close-zoom / place focus. */
export function loadGlobeDetailData(): Promise<GlobeDetailData> {
  if (!detailLoadPromise) {
    detailLoadPromise = import("@/data/globe-detail-countries.json").then(
      (module) => module.default as GlobeDetailData,
    );
  }
  return detailLoadPromise;
}

export type DetailOverlayCandidate = {
  code: string;
  rings: number[][];
  /** Unit direction of the largest-ring centroid in mesh-local space. */
  centroid: THREE.Vector3;
  /** Angular half-extent of the largest ring from its centroid. */
  angularRadius: number;
};

/** Precompute centroids so overlay selection is cheap each frame. */
export function indexDetailCountries(data: GlobeDetailData): DetailOverlayCandidate[] {
  return data.countries.map((country) => {
    let bestRing = country.rings[0];
    for (const ring of country.rings) {
      if (ring.length > bestRing.length) bestRing = ring;
    }
    const [nx, ny] = ringCentroid(bestRing);
    const centroid = normalizedToLocalDirection(nx, ny);
    let angularRadius = 0;
    for (let i = 0; i < bestRing.length; i += 2) {
      const point = normalizedToLocalDirection(bestRing[i], bestRing[i + 1]);
      const angle = centroid.angleTo(point);
      if (angle > angularRadius) angularRadius = angle;
    }
    return {
      code: country.code,
      rings: country.rings,
      centroid,
      angularRadius,
    };
  });
}

/**
 * Picks up to `maxOverlays` detail countries near the camera-facing side of
 * the globe, always including `selectedCode` when present.
 * `lookDirection` must be the mesh-local direction from the globe origin toward
 * the camera (the surface point in the middle of the view).
 *
 * When a place is selected/focused, only that place is overlaid — neighbors at
 * Earth-center angles would otherwise punch through with depthTest disabled.
 */
export function selectDetailOverlays(
  candidates: DetailOverlayCandidate[],
  lookDirection: THREE.Vector3,
  selectedCode: string | null,
  maxOverlays: number = GLOBE_DETAIL_MAX_OVERLAYS,
): DetailOverlayCandidate[] {
  if (selectedCode) {
    const focused = candidates.find((entry) => entry.code === selectedCode);
    return focused ? [focused] : [];
  }

  const scored: { candidate: DetailOverlayCandidate; angle: number }[] = [];

  for (const candidate of candidates) {
    if (candidate.angularRadius > OVERLAY_MAX_ANGULAR_RADIUS) continue;
    const angle = lookDirection.angleTo(candidate.centroid);
    if (angle > Math.PI / 2) continue;
    if (angle > OVERLAY_VIEW_HALF_ANGLE) continue;
    scored.push({ candidate, angle });
  }

  scored.sort((a, b) => a.angle - b.angle);
  return scored.slice(0, maxOverlays).map((entry) => entry.candidate);
}

export function resolveDetailFillColor(
  code: string,
  profile: Profile | null,
  {
    difficulty,
    isDark,
    selectedCode,
  }: {
    difficulty: MapProgressDifficulty;
    isDark: boolean;
    selectedCode: string | null;
  },
): { fill: string; stroke: string } {
  const stroke = isDark ? "#5a7896" : "#1e293b";
  if (selectedCode === code) {
    return { fill: getMapPalette(isDark).highlight.fill, stroke: MAP_SELECTION_BORDER };
  }
  const level = profile ? getPlaceMasteryLevel(code, profile, difficulty) : 0;
  return {
    fill: getProgressFillColor(level, isDark, difficulty),
    stroke,
  };
}

/**
 * Builds a triangulated fill mesh for one normalized ring, projected onto a
 * sphere via a local tangent plane (accurate for microstates / small islands).
 */
export function buildRingFillGeometry(
  ring: number[],
  radius = GLOBE_DETAIL_MESH_RADIUS,
): THREE.BufferGeometry | null {
  const pointCount = ring.length / 2;
  if (pointCount < 3) return null;

  const [cx, cy] = ringCentroid(ring);
  const origin = normalizedToLocalDirection(cx, cy);
  const east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), origin);
  if (east.lengthSq() < 1e-10) {
    east.set(1, 0, 0);
  } else {
    east.normalize();
  }
  const north = new THREE.Vector3().crossVectors(origin, east).normalize();

  const contour: THREE.Vector2[] = [];
  const spherePoints: THREE.Vector3[] = [];

  for (let i = 0; i < pointCount; i += 1) {
    const direction = normalizedToLocalDirection(ring[i * 2], ring[i * 2 + 1]);
    // Skip duplicate closing vertex — ShapeUtils expects an open contour.
    if (
      i === pointCount - 1 &&
      ring[0] === ring[i * 2] &&
      ring[1] === ring[i * 2 + 1]
    ) {
      continue;
    }
    const offset = direction.clone().sub(origin);
    contour.push(new THREE.Vector2(offset.dot(east), offset.dot(north)));
    spherePoints.push(direction.multiplyScalar(radius));
  }

  if (contour.length < 3) return null;

  let triangles: number[][];
  try {
    triangles = THREE.ShapeUtils.triangulateShape(contour, []);
  } catch {
    return null;
  }
  if (triangles.length === 0) return null;

  const positions = new Float32Array(spherePoints.length * 3);
  for (let i = 0; i < spherePoints.length; i += 1) {
    const point = spherePoints[i];
    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
  }

  const indices: number[] = [];
  for (const tri of triangles) {
    indices.push(tri[0], tri[1], tri[2]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Outline loop for a ring on the sphere surface. */
export function buildRingLineGeometry(
  ring: number[],
  radius = GLOBE_DETAIL_MESH_RADIUS,
): THREE.BufferGeometry | null {
  const pointCount = ring.length / 2;
  if (pointCount < 3) return null;

  const positions: number[] = [];
  for (let i = 0; i < pointCount; i += 1) {
    const direction = normalizedToLocalDirection(ring[i * 2], ring[i * 2 + 1]);
    positions.push(direction.x * radius, direction.y * radius, direction.z * radius);
  }
  // Close the loop for LineLoop.
  const first = normalizedToLocalDirection(ring[0], ring[1]);
  const lastX = positions[positions.length - 3];
  const lastY = positions[positions.length - 2];
  const lastZ = positions[positions.length - 1];
  if (
    Math.abs(lastX - first.x * radius) > 1e-8 ||
    Math.abs(lastY - first.y * radius) > 1e-8 ||
    Math.abs(lastZ - first.z * radius) > 1e-8
  ) {
    positions.push(first.x * radius, first.y * radius, first.z * radius);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      object.geometry.dispose();
      const material = object.material;
      if (Array.isArray(material)) {
        for (const entry of material) entry.dispose();
      } else {
        material.dispose();
      }
    }
  });
}
