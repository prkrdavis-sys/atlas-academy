import * as THREE from "three";

const _ndc = new THREE.Vector2();
const _grabProjected = new THREE.Vector3();
const _grabWorld = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _spherical = new THREE.Spherical();
const _quat = new THREE.Quaternion();
const _pointerUnit = new THREE.Vector3();
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

export type PointerGlobeUnitResult = "hit" | "miss";

/**
 * Unit vector from `center` to where a pointer ray meets the globe sphere.
 *
 * Returns `"hit"` when the ray intersects the sphere, `"miss"` when
 * `allowMissFallback` projects via the ray's closest approach, or `null` on
 * failure.
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
): PointerGlobeUnitResult | null {
  clientToNdc(clientX, clientY, rect, _ndc);
  _raycaster.setFromCamera(_ndc, camera);
  _sphere.center.copy(center);
  _sphere.radius = radius;

  if (_raycaster.ray.intersectSphere(_sphere, _hit)) {
    out.copy(_hit).sub(center).normalize();
    return "hit";
  }

  if (!allowMissFallback) return null;

  _raycaster.ray.closestPointToPoint(center, _hit);
  out.copy(_hit).sub(center);
  if (out.lengthSq() < 1e-12) {
    out.copy(_raycaster.ray.direction).normalize();
  } else {
    out.normalize();
  }
  return "miss";
}

function applyTrackballOrbit(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  fromUnit: THREE.Vector3,
  toUnit: THREE.Vector3,
  minPolar: number,
  maxPolar: number,
): void {
  // Same convention as the on-surface grab: rotate the camera by the sphere
  // arc from `fromUnit` toward `toUnit`.
  _quat.setFromUnitVectors(toUnit, fromUnit);
  _offset.copy(camera.position).sub(target).applyQuaternion(_quat);

  _spherical.setFromVector3(_offset);
  _spherical.phi = THREE.MathUtils.clamp(_spherical.phi, minPolar, maxPolar);
  _spherical.makeSafe();
  _offset.setFromSpherical(_spherical);
  camera.position.copy(target).add(_offset);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
}

function applySphericalOrbitStep(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  dTheta: number,
  dPhi: number,
  minPolar: number,
  maxPolar: number,
): void {
  _offset.copy(camera.position).sub(target);
  _spherical.setFromVector3(_offset);
  _spherical.theta += dTheta;
  _spherical.phi = THREE.MathUtils.clamp(_spherical.phi + dPhi, minPolar, maxPolar);
  _spherical.makeSafe();
  _offset.setFromSpherical(_spherical);
  camera.position.copy(target).add(_offset);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
}

/**
 * Incremental virtual trackball for off-disc drags. Uses the same geometry as
 * the on-surface grab so speed and direction stay continuous at the limb.
 */
function orbitCameraByPointerDelta(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  lastPointerUnit: THREE.Vector3,
  clientX: number,
  clientY: number,
  rect: DOMRect,
  radius: number,
  minPolar: number,
  maxPolar: number,
): void {
  if (
    pointerGlobeUnit(
      clientX,
      clientY,
      rect,
      camera,
      target,
      radius,
      _pointerUnit,
      true,
    ) === null
  ) {
    return;
  }

  applyTrackballOrbit(
    camera,
    target,
    lastPointerUnit,
    _pointerUnit,
    minPolar,
    maxPolar,
  );
  lastPointerUnit.copy(_pointerUnit);
}

/**
 * Orbit a Y-up camera so `grabUnit` stays under the pointer.
 *
 * 1. Geometric trackball step when the pointer ray hits the sphere.
 * 2. Incremental virtual trackball when the pointer leaves the globe disc.
 * 3. Snap to a Y-up spherical orbit (OrbitControls-compatible, no roll).
 * 4. Tiny clamped screen-space polish to cancel snap slip — gain is capped so
 *    close-ups cannot overshoot.
 */
export function orbitCameraToKeepGrab(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  grabUnit: THREE.Vector3,
  lastPointerUnit: THREE.Vector3,
  clientX: number,
  clientY: number,
  rect: DOMRect,
  radius = 1,
  minPolar = 0.01,
  maxPolar = Math.PI - 0.01,
  /** Once the pointer leaves the disc, stay on incremental trackball for this drag. */
  screenDragOnly = false,
): void {
  if (screenDragOnly) {
    orbitCameraByPointerDelta(
      camera,
      target,
      lastPointerUnit,
      clientX,
      clientY,
      rect,
      radius,
      minPolar,
      maxPolar,
    );
    return;
  }

  const pointerResult = pointerGlobeUnit(
    clientX,
    clientY,
    rect,
    camera,
    target,
    radius,
    _pointerUnit,
    false,
  );

  if (pointerResult !== "hit") {
    orbitCameraByPointerDelta(
      camera,
      target,
      lastPointerUnit,
      clientX,
      clientY,
      rect,
      radius,
      minPolar,
      maxPolar,
    );
    return;
  }

  applyTrackballOrbit(
    camera,
    target,
    grabUnit,
    _pointerUnit,
    minPolar,
    maxPolar,
  );
  camera.updateMatrixWorld();
  lastPointerUnit.copy(_pointerUnit);

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

  applySphericalOrbitStep(camera, target, dTheta, dPhi, minPolar, maxPolar);
}
