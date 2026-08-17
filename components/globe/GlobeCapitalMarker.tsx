"use client";

import { useMemo, useRef } from "react";
import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getCapitalLatLng } from "@/lib/capital-coordinates";
import { lonLatToLocalDirection } from "@/lib/globe-focus";

/** Sit just above the planet and close-up patch, inside the camera min distance. */
const MARKER_RADIUS = 1.0026;
/** Screen-height fraction when zoomed in on a country. */
const SCREEN_FRAC_NEAR = 0.034;
/** Screen-height fraction when the whole globe is in view. */
const SCREEN_FRAC_FAR = 0.016;
const NEAR_ALTITUDE = 0.08;
const FAR_ALTITUDE = 2.1;

function ignoreRaycast() {}

function createStarGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 1 : 0.4;
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
  isDark: boolean;
};

/**
 * Camera-facing 2D star on the globe surface. Mounts only while a place is
 * selected, matching the country highlight. Scale tracks zoom so the marker
 * stays a small capital icon up close and a modest pin at overview.
 */
export function GlobeCapitalMarker({ selectedCode, isDark }: GlobeCapitalMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const position = useMemo(() => {
    if (!selectedCode) return null;
    const latLng = getCapitalLatLng(selectedCode);
    if (!latLng) return null;
    const [lat, lng] = latLng;
    return lonLatToLocalDirection(lng, lat).multiplyScalar(MARKER_RADIUS);
  }, [selectedCode]);

  const color = isDark ? "#fb7185" : "#e11d48";

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh || !position) return;

    mesh.getWorldPosition(worldPosScratch);
    const spriteDist = Math.max(camera.position.distanceTo(worldPosScratch), 1e-4);
    const facing = camera.position.dot(worldPosScratch);
    mesh.visible = facing > 0;

    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const worldHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * spriteDist;
    const altitude = Math.max(camera.position.length() - 1, 0);
    const zoomT = THREE.MathUtils.smoothstep(NEAR_ALTITUDE, FAR_ALTITUDE, altitude);
    const screenFrac = THREE.MathUtils.lerp(SCREEN_FRAC_NEAR, SCREEN_FRAC_FAR, zoomT);
    const scale = worldHeight * screenFrac;
    mesh.scale.setScalar(scale);
  });

  if (!position) return null;

  return (
    <Billboard follow position={position}>
      <mesh
        ref={meshRef}
        geometry={starGeometry}
        renderOrder={12}
        raycast={ignoreRaycast}
        scale={0.02}
      >
        <meshBasicMaterial
          color={color}
          toneMapped={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Billboard>
  );
}
