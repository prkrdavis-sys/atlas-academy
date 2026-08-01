import * as THREE from "three";
import { clientToNdc } from "@/lib/globe-grab";
import {
  GLOBE_TEXTURE_DATA,
  type GlobeCountryShape,
  type GlobeUsMode,
} from "@/lib/globe-texture";

const _pickNdc = new THREE.Vector2();
const _pickRaycaster = new THREE.Raycaster();

type ShapeBounds = {
  shape: GlobeCountryShape;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function computeBounds(shape: GlobeCountryShape): ShapeBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const ring of shape.rings) {
    for (let i = 0; i < ring.length; i += 2) {
      const x = ring[i];
      const y = ring[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { shape, minX, maxX, minY, maxY };
}

const countryBounds = GLOBE_TEXTURE_DATA.countries.map(computeBounds);
const stateBounds = GLOBE_TEXTURE_DATA.usStates.map(computeBounds);

/** Even-odd ray cast over one ring; matches the canvas "evenodd" fill rule. */
function ringContains(ring: number[], x: number, y: number): boolean {
  let inside = false;
  const pointCount = ring.length / 2;
  for (let i = 0, j = pointCount - 1; i < pointCount; j = i, i += 1) {
    const xi = ring[i * 2];
    const yi = ring[i * 2 + 1];
    const xj = ring[j * 2];
    const yj = ring[j * 2 + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function shapeContains(bounds: ShapeBounds, x: number, y: number): boolean {
  // Antimeridian-crossing rings are stored with x spilling past 0..1, so test
  // the point shifted by ±1 as well.
  for (const testX of [x, x - 1, x + 1]) {
    if (testX < bounds.minX || testX > bounds.maxX || y < bounds.minY || y > bounds.maxY) {
      continue;
    }
    let crossings = 0;
    for (const ring of bounds.shape.rings) {
      if (ringContains(ring, testX, y)) crossings += 1;
    }
    if (crossings % 2 === 1) return true;
  }
  return false;
}

/**
 * Resolves the place code under a texture UV coordinate (as reported by a
 * raycast hit on the globe sphere). UVs are texture-space, so the mesh's
 * current rotation doesn't matter: u maps to longitude, v to latitude.
 * In "states" mode a hit inside a US state returns the "US-XX" code;
 * otherwise the country code (or null over the ocean).
 */
export function pickGlobePlaceAtUv(
  u: number,
  v: number,
  usMode: GlobeUsMode,
): string | null {
  // Texture y runs top-down while UV v runs bottom-up; wrap u into 0..1.
  const x = ((u % 1) + 1) % 1;
  const y = 1 - v;

  if (usMode === "states") {
    for (const bounds of stateBounds) {
      if (shapeContains(bounds, x, y)) return bounds.shape.code;
    }
  }

  for (const bounds of countryBounds) {
    if (shapeContains(bounds, x, y)) {
      if (usMode === "states" && bounds.shape.code === "US") {
        // Inside the US polygon but not in any of the 50 states (e.g. minor
        // outlying islands): nothing selectable in states mode.
        return null;
      }
      return bounds.shape.code;
    }
  }

  return null;
}

/** Raycast the globe mesh at client coordinates and resolve a place code. */
export function pickGlobePlaceAtClient(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  camera: THREE.Camera,
  mesh: THREE.Object3D,
  usMode: GlobeUsMode,
): string | null {
  clientToNdc(clientX, clientY, rect, _pickNdc);
  _pickRaycaster.setFromCamera(_pickNdc, camera);
  const hit = _pickRaycaster.intersectObject(mesh, false)[0];
  if (!hit?.uv) return null;
  return pickGlobePlaceAtUv(hit.uv.x, hit.uv.y, usMode);
}
