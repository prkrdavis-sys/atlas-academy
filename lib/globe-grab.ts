import * as THREE from "three";

const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _spherical = new THREE.Spherical();
const _quat = new THREE.Quaternion();
const _sphere = new THREE.Sphere();
const _raycaster = new THREE.Raycaster();
const _pointerUnit = new THREE.Vector3();

/** Client coordinates → NDC for the canvas element. */
export function clientToNdc(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  target: THREE.Vector2,
): THREE.Vector2 {
  target.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  target.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  return target;
}

/**
 * Unit vector from `center` to where a pointer ray meets the globe sphere.
 * Returns false when the ray misses (and `allowMissFallback` is false).
 *
 * With `allowMissFallback`, a miss projects onto the sphere via the ray's
 * closest approach so an in-progress drag stays continuous off the limb.
 */
export function pointerGlobeUnit(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  camera: THREE.Camera,
  center: THREE.Vector3,
  radius: number,
  out: THREE.Vector3,
  allowMissFallback: boolean,
): boolean {
  clientToNdc(clientX, clientY, rect, _ndc);
  _raycaster.setFromCamera(_ndc, camera);
  _sphere.center.copy(center);
  _sphere.radius = radius;

  if (_raycaster.ray.intersectSphere(_sphere, _hit)) {
    out.copy(_hit).sub(center).normalize();
    return true;
  }

  if (!allowMissFallback) return false;

  _raycaster.ray.closestPointToPoint(center, _hit);
  out.copy(_hit).sub(center);
  if (out.lengthSq() < 1e-12) {
    out.copy(_raycaster.ray.direction).normalize();
  } else {
    out.normalize();
  }
  return true;
}

/**
 * Rotate the camera around `target` so `grabUnit` (fixed world direction from
 * the globe center to the grabbed surface point) stays under the pointer.
 *
 * Each step applies the quaternion mapping the current pointer hit onto the
 * grab, then rebuilds a Y-up spherical orbit (OrbitControls-compatible, no
 * roll). Re-raycasting after each rebuild cancels the small slip from stripping
 * roll — typically converges in 2–4 iterations.
 */
export function orbitCameraToKeepGrab(
  camera: THREE.Camera,
  target: THREE.Vector3,
  grabUnit: THREE.Vector3,
  clientX: number,
  clientY: number,
  rect: DOMRect,
  radius: number,
  minPolar = 0.01,
  maxPolar = Math.PI - 0.01,
  iterations = 4,
): void {
  for (let i = 0; i < iterations; i += 1) {
    if (
      !pointerGlobeUnit(
        clientX,
        clientY,
        rect,
        camera,
        target,
        radius,
        _pointerUnit,
        true,
      )
    ) {
      return;
    }

    _quat.setFromUnitVectors(_pointerUnit, grabUnit);
    _offset.copy(camera.position).sub(target).applyQuaternion(_quat);
    _spherical.setFromVector3(_offset);
    _spherical.phi = THREE.MathUtils.clamp(_spherical.phi, minPolar, maxPolar);
    _spherical.makeSafe();
    _offset.setFromSpherical(_spherical);
    camera.position.copy(target).add(_offset);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
  }
}
