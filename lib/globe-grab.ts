import * as THREE from "three";

const _ndc = new THREE.Vector2();
const _grabProjected = new THREE.Vector3();
const _grabWorld = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _spherical = new THREE.Spherical();
const _quat = new THREE.Quaternion();
const _pointerUnit = new THREE.Vector3();
const _toCamera = new THREE.Vector3();
const _sphere = new THREE.Sphere();
const _raycaster = new THREE.Raycaster();
const _hit = new THREE.Vector3();

/** Max radians for the post-snap screen-space polish step (avoids close-up blowups). */
const MAX_POLISH_STEP = 0.08;

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
  allowMissFallback = false,
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
 * Orbit a Y-up camera so `grabUnit` stays under the pointer.
 *
 * 1. Geometric trackball step (stable at any zoom): rotate the camera by the
 *    inverse of the sphere-arc from the grab to the current pointer hit.
 * 2. Snap to a Y-up spherical orbit (OrbitControls-compatible, no roll).
 * 3. Tiny clamped screen-space polish to cancel snap slip — gain is capped so
 *    close-ups cannot overshoot.
 */
export function orbitCameraToKeepGrab(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  grabUnit: THREE.Vector3,
  clientX: number,
  clientY: number,
  rect: DOMRect,
  radius = 1,
  minPolar = 0.01,
  maxPolar = Math.PI - 0.01,
): void {
  _toCamera.copy(camera.position).sub(target).normalize();
  if (grabUnit.dot(_toCamera) < 0.05) return;

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

  // Camera orbit is the inverse of an object-trackball grab→pointer arc, so the
  // grabbed surface point follows the finger (same direction as OrbitControls).
  _quat.setFromUnitVectors(_pointerUnit, grabUnit);
  _offset.copy(camera.position).sub(target).applyQuaternion(_quat);

  _spherical.setFromVector3(_offset);
  _spherical.phi = THREE.MathUtils.clamp(_spherical.phi, minPolar, maxPolar);
  _spherical.makeSafe();
  _offset.setFromSpherical(_spherical);
  camera.position.copy(target).add(_offset);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateMatrixWorld();

  // Polish: match OrbitControls drag signs, but clamp the step for close-ups.
  clientToNdc(clientX, clientY, rect, _ndc);
  _grabWorld.copy(grabUnit).multiplyScalar(radius).add(target);
  _grabProjected.copy(_grabWorld).project(camera);
  if (_grabProjected.z > 1) return;

  const errX = _ndc.x - _grabProjected.x;
  const errY = _ndc.y - _grabProjected.y;
  if (errX * errX + errY * errY < 1e-10) return;

  const fovY = THREE.MathUtils.degToRad(camera.fov);
  const fovX = 2 * Math.atan(Math.tan(fovY / 2) * Math.max(camera.aspect, 1e-6));
  let dTheta = -errX * (fovX / 2);
  let dPhi = errY * (fovY / 2);
  const step = Math.hypot(dTheta, dPhi);
  if (step > MAX_POLISH_STEP) {
    const scale = MAX_POLISH_STEP / step;
    dTheta *= scale;
    dPhi *= scale;
  }

  _spherical.setFromVector3(_offset.copy(camera.position).sub(target));
  _spherical.theta += dTheta;
  _spherical.phi = THREE.MathUtils.clamp(_spherical.phi + dPhi, minPolar, maxPolar);
  _spherical.makeSafe();
  _offset.setFromSpherical(_spherical);
  camera.position.copy(target).add(_offset);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
}
