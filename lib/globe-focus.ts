import * as THREE from "three";
import { GLOBE_TEXTURE_DATA } from "@/lib/globe-texture";
import { isStateCode } from "@/lib/scope";

/** Y rotation on the map-page globe mesh — keep in sync with InteractiveGlobe. */
export const GLOBE_MESH_Y_ROTATION = -1.1;

/** Camera polar angle when the camera sits on the +Z axis at default zoom. */
export const GLOBE_DEFAULT_POLAR = Math.PI / 2;

export type GlobeFocusTarget = {
  /** Mesh Y rotation that brings the place to the front (+Z) in longitude. */
  meshRotationY: number;
  /** OrbitControls polar angle that centers the place in latitude. */
  polarAngle: number;
};

function ringCentroid(ring: number[]): [number, number] {
  let sumX = 0;
  let sumY = 0;
  const pointCount = ring.length / 2;
  for (let index = 0; index < ring.length; index += 2) {
    sumX += ring[index];
    sumY += ring[index + 1];
  }
  return [sumX / pointCount, sumY / pointCount];
}

function findShapeCentroid(code: string): [number, number] | null {
  const normalized = code.toUpperCase();
  const shapes = isStateCode(normalized)
    ? GLOBE_TEXTURE_DATA.usStates
    : GLOBE_TEXTURE_DATA.countries;
  const shape = shapes.find((entry) => entry.code === normalized);
  // Use the largest ring (mainland) so overseas scraps don't steal the focus.
  if (!shape || shape.rings.length === 0) return null;
  let bestRing = shape.rings[0];
  for (const ring of shape.rings) {
    if (ring.length > bestRing.length) bestRing = ring;
  }
  return ringCentroid(bestRing);
}

/** Normalized equirectangular (0..1) → unit direction in mesh-local space.
 * Matches three.js SphereGeometry UV layout (u=0 at -X, u=0.25 at +Z). */
function normalizedToLocalDirection(nx: number, ny: number): THREE.Vector3 {
  const lat = 90 - ny * 180;
  const latRad = THREE.MathUtils.degToRad(lat);
  // SphereGeometry: theta = u * 2π, x = -cos(θ)sin(φ), z = sin(θ)sin(φ).
  const theta = nx * Math.PI * 2;
  const phi = Math.PI / 2 - latRad;
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    -Math.cos(theta) * sinPhi,
    Math.cos(phi),
    Math.sin(theta) * sinPhi,
  );
}

/**
 * Target globe orientation and camera tilt that frame a place from the default
 * +Z camera position. Longitude is handled by spinning the mesh; latitude by
 * tilting the camera polar angle.
 */
export function getGlobeFocusTarget(code: string): GlobeFocusTarget | null {
  const centroid = findShapeCentroid(code);
  if (!centroid) return null;

  const [nx, ny] = centroid;
  const local = normalizedToLocalDirection(nx, ny);

  return {
    meshRotationY: Math.atan2(-local.x, local.z),
    polarAngle: Math.acos(THREE.MathUtils.clamp(local.y, -1, 1)),
  };
}

export function lerpAngle(start: number, end: number, t: number): number {
  let delta = end - start;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return start + delta * t;
}
