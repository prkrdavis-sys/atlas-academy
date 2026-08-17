import * as THREE from "three";
import { GLOBE_TEXTURE_DATA } from "@/lib/globe-texture";
import { isStateCode } from "@/lib/scope";

/** Y rotation that faces Europe toward the camera — keep in sync with home globe. */
export const GLOBE_MESH_Y_ROTATION = -1.65;

/**
 * Resting camera polar angle for idle auto-spin / home reset.
 * Equator is π/2; ~20% toward the north pole so more landmass stays in frame.
 */
export const GLOBE_DEFAULT_POLAR = (Math.PI / 2) * 0.8;

/**
 * How much of the vertical FOV the place should fill (half-angle).
 * Tuned so mid-size countries (France, Japan) land near the old fixed distance ~2.3.
 */
const PLACE_FOCUS_SCREEN_HALF_ANGLE = THREE.MathUtils.degToRad(5);

/**
 * Microstates need a larger on-screen share — at the normal 5° framing their
 * coastlines are only a few dozen pixels and read as a speck on the blurred texture.
 */
const MICROSTATE_SCREEN_HALF_ANGLE = THREE.MathUtils.degToRad(12);

/** Places smaller than this (radians) get the microstate framing boost. */
const MICROSTATE_ANGULAR_RADIUS = THREE.MathUtils.degToRad(0.15);

/** Extra margin around the place so borders aren't flush with the frame. */
const PLACE_FOCUS_PADDING = 1.2;

/** Closest approach for microstates (camera near must stay below this gap). */
export const PLACE_FOCUS_MIN_DISTANCE = 1.005;

/** Widest framing for continental-scale places. */
export const PLACE_FOCUS_MAX_DISTANCE = 4;

export type GlobeFocusTarget = {
  /** Mesh Y rotation that brings the place to the front (+Z) in longitude. */
  meshRotationY: number;
  /** OrbitControls polar angle that centers the place in latitude. */
  polarAngle: number;
  /** Camera distance from globe center so the place fills a consistent on-screen size. */
  cameraDistance: number;
};

export function ringCentroid(ring: number[]): [number, number] {
  let sumX = 0;
  let sumY = 0;
  const pointCount = ring.length / 2;
  for (let index = 0; index < ring.length; index += 2) {
    sumX += ring[index];
    sumY += ring[index + 1];
  }
  return [sumX / pointCount, sumY / pointCount];
}

function findLargestRing(code: string): number[] | null {
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
  return bestRing;
}

/** Normalized equirectangular (0..1) → unit direction in mesh-local space.
 * Matches three.js SphereGeometry UV layout (u=0 at -X, u=0.25 at +Z). */
export function normalizedToLocalDirection(nx: number, ny: number): THREE.Vector3 {
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

/** WGS84 lon/lat (degrees) → unit direction in mesh-local space. */
export function lonLatToLocalDirection(lng: number, lat: number): THREE.Vector3 {
  const wrappedLon = ((((lng + 180) % 360) + 360) % 360) - 180;
  const clampedLat = THREE.MathUtils.clamp(lat, -90, 90);
  const nx = (wrappedLon + 180) / 360;
  const ny = (90 - clampedLat) / 180;
  return normalizedToLocalDirection(nx, ny);
}

/** Angular half-extent of the mainland ring from its centroid, in radians. */
function ringAngularRadius(ring: number[]): number {
  const [nx, ny] = ringCentroid(ring);
  const center = normalizedToLocalDirection(nx, ny);
  let maxAngle = 0;
  for (let index = 0; index < ring.length; index += 2) {
    const point = normalizedToLocalDirection(ring[index], ring[index + 1]);
    const angle = center.angleTo(point);
    if (angle > maxAngle) maxAngle = angle;
  }
  return maxAngle;
}

/**
 * Camera distance from the globe origin that makes a surface patch of angular
 * half-width `alpha` subtend the given screen half-angle.
 */
function cameraDistanceForAngularRadius(
  alpha: number,
  screenHalfAngle: number = PLACE_FOCUS_SCREEN_HALF_ANGLE,
): number {
  const padded = Math.max(alpha * PLACE_FOCUS_PADDING, 1e-6);
  const distance =
    Math.cos(padded) + Math.sin(padded) / Math.tan(screenHalfAngle);
  return THREE.MathUtils.clamp(
    distance,
    PLACE_FOCUS_MIN_DISTANCE,
    PLACE_FOCUS_MAX_DISTANCE,
  );
}

/**
 * Target globe orientation and camera tilt that frame a place from the default
 * +Z camera position. Longitude is handled by spinning the mesh; latitude by
 * tilting the camera polar angle. Distance scales with place size so Monaco and
 * France land at a similar on-screen scale.
 */
export function getGlobeFocusTarget(code: string): GlobeFocusTarget | null {
  const ring = findLargestRing(code);
  if (!ring) return null;

  const [nx, ny] = ringCentroid(ring);
  const local = normalizedToLocalDirection(nx, ny);
  const angularRadius = ringAngularRadius(ring);
  const screenHalfAngle =
    angularRadius < MICROSTATE_ANGULAR_RADIUS
      ? MICROSTATE_SCREEN_HALF_ANGLE
      : PLACE_FOCUS_SCREEN_HALF_ANGLE;

  return {
    meshRotationY: Math.atan2(-local.x, local.z),
    polarAngle: Math.acos(THREE.MathUtils.clamp(local.y, -1, 1)),
    cameraDistance: cameraDistanceForAngularRadius(angularRadius, screenHalfAngle),
  };
}

export function lerpAngle(start: number, end: number, t: number): number {
  let delta = end - start;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return start + delta * t;
}
