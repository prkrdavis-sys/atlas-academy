"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getCapitalLatLng } from "@/lib/capital-coordinates";
import { lonLatToLocalDirection } from "@/lib/globe-focus";

/** Just above the planet / close-up patch so the star sits on the surface. */
const MARKER_RADIUS = 1.0008;
/** Screen-height fraction when zoomed in on a country. */
const SCREEN_FRAC_NEAR = 0.008;
/** Screen-height fraction when the whole globe is in view. */
const SCREEN_FRAC_FAR = 0.003;
const NEAR_ALTITUDE = 0.08;
const FAR_ALTITUDE = 2.1;
/** Hard cap in globe radii — never grows into a large sticker. */
const MAX_WORLD_SCALE = 0.0055;

const Z_AXIS = new THREE.Vector3(0, 0, 1);

function ignoreRaycast() {}

function createStarGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 1 : 0.38;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

const starGeometry = createStarGeometry();
const worldPosScratch = new THREE.Vector3();

type GlobeCapitalMarkerProps = {
  selectedCode: string | null;
};

/**
 * Small black star planted on the globe (tangent to the surface). Mounts only
 * while a place is selected. Scale tracks zoom but stays tiny at every distance.
 */
export function GlobeCapitalMarker({ selectedCode }: GlobeCapitalMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pose = useMemo(() => {
    if (!selectedCode) return null;
    const latLng = getCapitalLatLng(selectedCode);
    if (!latLng) return null;
    const [lat, lng] = latLng;
    const dir = lonLatToLocalDirection(lng, lat);
    return {
      position: dir.clone().multiplyScalar(MARKER_RADIUS),
      quaternion: new THREE.Quaternion().setFromUnitVectors(Z_AXIS, dir),
    };
  }, [selectedCode]);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh || !pose) return;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    mesh.getWorldPosition(worldPosScratch);
    const spriteDist = Math.max(camera.position.distanceTo(worldPosScratch), 1e-4);
    const worldHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * spriteDist;
    const altitude = Math.max(camera.position.length() - 1, 0);
    const zoomT = THREE.MathUtils.smoothstep(NEAR_ALTITUDE, FAR_ALTITUDE, altitude);
    const screenFrac = THREE.MathUtils.lerp(SCREEN_FRAC_NEAR, SCREEN_FRAC_FAR, zoomT);
    mesh.scale.setScalar(Math.min(worldHeight * screenFrac, MAX_WORLD_SCALE));
  });

  if (!pose) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={starGeometry}
      position={pose.position}
      quaternion={pose.quaternion}
      renderOrder={12}
      raycast={ignoreRaycast}
      scale={0.004}
    >
      <meshBasicMaterial
        color="#111111"
        toneMapped={false}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
  );
}
