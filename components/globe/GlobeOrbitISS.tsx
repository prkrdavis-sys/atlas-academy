"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  GLOBE_ISS_DETAIL_BY_TIER,
  type GlobeIssDetail,
  type GlobePerfTier,
} from "@/lib/globe-performance";
import { subsolarDirection } from "@/lib/sun-position";

/** Skip picking so the station never steals globe taps. */
function ignoreRaycast() {}

/** Orbit altitude in planet radii — well clear of the atmosphere shell (1.16). */
const ORBIT_RADIUS = 1.32;
/** Real ISS inclination. */
const ORBIT_INCLINATION_DEG = 51.6;
/** Seconds per revolution. Slow enough to read as an orbit, not a whizzing dot. */
const ORBIT_PERIOD_S = 150;

/**
 * Station dimensions, in planet radii. Heavily exaggerated versus the real
 * 109m truss (which would be sub-pixel at this globe scale) but the proportions
 * between the truss, modules, and arrays are kept true.
 */
const TRUSS_HALF_LENGTH = 0.055;
const TRUSS_THICKNESS = 0.0055;
const MODULE_RADIUS = 0.0075;
const CORE_STACK_HALF_LENGTH = 0.032;
/** Alpha rotary joint positions along the truss (mirrored to the other side). */
const WING_JOINT_OFFSETS = [0.036, 0.05];
const BLANKET_LENGTH = 0.046;
const BLANKET_WIDTH = 0.016;
const BLANKET_THICKNESS = 0.0008;

const HULL_COLOR = "#d8dee8";
const HULL_SHADED_COLOR = "#8f9aa8";
const TRUSS_COLOR = "#9aa3ae";
const ARRAY_COLOR = "#1d2a52";
const ARRAY_EMISSIVE = "#3f5ba8";
const RADIATOR_COLOR = "#f2f5f9";
const CAPSULE_COLOR = "#c7ccd4";
const BEACON_COLOR = "#ff5a4d";
const GLINT_COLOR = "#fff6d8";

let glintTexture: THREE.CanvasTexture | null = null;

/** Soft radial falloff for the sun glint, so the sprite has no square edge. */
function getGlintTexture(): THREE.CanvasTexture {
  if (glintTexture) return glintTexture;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create ISS glint canvas");

  const center = size / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.22, "rgba(255, 255, 255, 0.42)");
  gradient.addColorStop(0.55, "rgba(255, 255, 255, 0.08)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  glintTexture = new THREE.CanvasTexture(canvas);
  glintTexture.colorSpace = THREE.SRGBColorSpace;
  return glintTexture;
}

/** Orbit plane basis: two orthonormal in-plane vectors at the inclination. */
const INCLINATION = THREE.MathUtils.degToRad(ORBIT_INCLINATION_DEG);
const ORBIT_U = new THREE.Vector3(1, 0, 0);
const ORBIT_V = new THREE.Vector3(0, Math.sin(INCLINATION), Math.cos(INCLINATION));

function SolarWing({ offsetX, angleRef }: { offsetX: number; angleRef: { current: number } }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    // Alpha rotary joint: the whole wing pivots about the truss axis to face the sun.
    group.rotation.x = angleRef.current;
  });

  return (
    <group ref={groupRef} position={[offsetX, 0, 0]}>
      {[1, -1].map((side) => (
        <mesh
          key={side}
          position={[0, 0, (side * BLANKET_LENGTH) / 2 + side * 0.004]}
          raycast={ignoreRaycast}
        >
          <boxGeometry args={[BLANKET_WIDTH, BLANKET_THICKNESS, BLANKET_LENGTH]} />
          <meshStandardMaterial
            color={ARRAY_COLOR}
            emissive={ARRAY_EMISSIVE}
            emissiveIntensity={0.35}
            metalness={0.65}
            roughness={0.32}
          />
        </mesh>
      ))}
      {/* Mast between the two blankets. */}
      <mesh raycast={ignoreRaycast}>
        <boxGeometry args={[0.002, 0.002, BLANKET_LENGTH * 2]} />
        <meshStandardMaterial color={TRUSS_COLOR} metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Truss({ detail }: { detail: GlobeIssDetail }) {
  const segments = useMemo(() => {
    const list: number[] = [];
    const step = TRUSS_HALF_LENGTH / detail.trussSegments;
    for (let i = 0; i < detail.trussSegments; i += 1) {
      const center = step * (i + 0.5);
      list.push(center, -center);
    }
    return list;
  }, [detail.trussSegments]);

  const step = TRUSS_HALF_LENGTH / detail.trussSegments;

  return (
    <group>
      {segments.map((center) => (
        <mesh key={center} position={[center, 0, 0]} raycast={ignoreRaycast}>
          <boxGeometry args={[step * 0.94, TRUSS_THICKNESS, TRUSS_THICKNESS]} />
          <meshStandardMaterial color={TRUSS_COLOR} metalness={0.7} roughness={0.42} />
        </mesh>
      ))}
    </group>
  );
}

function PressurizedStack({ detail }: { detail: GlobeIssDetail }) {
  const radial = detail.cylinderSegments;

  return (
    <group>
      {/* Core stack runs fore-aft: Russian segment, nodes, Destiny. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
        <cylinderGeometry args={[MODULE_RADIUS, MODULE_RADIUS, CORE_STACK_HALF_LENGTH * 2, radial]} />
        <meshStandardMaterial color={HULL_COLOR} metalness={0.45} roughness={0.5} />
      </mesh>
      {/* Aft Russian segment, slightly narrower and darker. */}
      <mesh
        position={[0, 0, -CORE_STACK_HALF_LENGTH - 0.012]}
        rotation={[Math.PI / 2, 0, 0]}
        raycast={ignoreRaycast}
      >
        <cylinderGeometry args={[MODULE_RADIUS * 0.82, MODULE_RADIUS * 0.82, 0.024, radial]} />
        <meshStandardMaterial color={HULL_SHADED_COLOR} metalness={0.4} roughness={0.55} />
      </mesh>
      {/* Forward node with its berthing rings. */}
      <mesh
        position={[0, 0, CORE_STACK_HALF_LENGTH + 0.008]}
        rotation={[Math.PI / 2, 0, 0]}
        raycast={ignoreRaycast}
      >
        <cylinderGeometry args={[MODULE_RADIUS * 1.1, MODULE_RADIUS * 1.1, 0.016, radial]} />
        <meshStandardMaterial color={HULL_COLOR} metalness={0.45} roughness={0.48} />
      </mesh>
      {detail.sideModules ? (
        <>
          {/* Columbus and Kibo, berthed athwartships off the forward node. */}
          {[1, -1].map((side) => (
            <mesh
              key={side}
              position={[side * 0.018, 0, CORE_STACK_HALF_LENGTH * 0.55]}
              rotation={[0, 0, Math.PI / 2]}
              raycast={ignoreRaycast}
            >
              <cylinderGeometry
                args={[MODULE_RADIUS * 0.85, MODULE_RADIUS * 0.85, 0.026, radial]}
              />
              <meshStandardMaterial color={HULL_COLOR} metalness={0.45} roughness={0.52} />
            </mesh>
          ))}
          {/* Kibo's exposed facility pallet. */}
          <mesh
            position={[0.03, 0.006, CORE_STACK_HALF_LENGTH * 0.55]}
            raycast={ignoreRaycast}
          >
            <boxGeometry args={[0.012, 0.004, 0.014]} />
            <meshStandardMaterial color={HULL_SHADED_COLOR} metalness={0.5} roughness={0.55} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

function Radiators() {
  return (
    <group>
      {[-0.014, 0, 0.014].map((offsetX, index) => (
        <mesh
          key={offsetX}
          position={[offsetX, -0.014, 0]}
          rotation={[0, 0, THREE.MathUtils.degToRad(index === 1 ? 0 : index === 0 ? 14 : -14)]}
          raycast={ignoreRaycast}
        >
          <boxGeometry args={[0.011, 0.0008, 0.03]} />
          <meshStandardMaterial
            color={RADIATOR_COLOR}
            metalness={0.2}
            roughness={0.75}
          />
        </mesh>
      ))}
    </group>
  );
}

function DockedCapsule() {
  return (
    <group position={[0, 0, CORE_STACK_HALF_LENGTH + 0.026]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
        <cylinderGeometry args={[MODULE_RADIUS * 0.7, MODULE_RADIUS * 0.7, 0.014, 12]} />
        <meshStandardMaterial color={CAPSULE_COLOR} metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
        <coneGeometry args={[MODULE_RADIUS * 0.7, 0.012, 12]} />
        <meshStandardMaterial color={HULL_SHADED_COLOR} metalness={0.45} roughness={0.5} />
      </mesh>
    </group>
  );
}

type GlobeOrbitISSProps = {
  perfTier: GlobePerfTier;
  reducedMotion: boolean;
  /** Keeps the demand frameloop alive while the station is orbiting. */
  onActivity?: () => void;
};

/**
 * The ISS on a slow inclined orbit. The whole rig mounts inside the globe's spin
 * group, so the orbit plane stays fixed relative to the planet as you drag the
 * globe around, and the opaque planet occludes the station on the far leg of
 * every revolution.
 */
export function GlobeOrbitISS({ perfTier, reducedMotion }: GlobeOrbitISSProps) {
  const detail = GLOBE_ISS_DETAIL_BY_TIER[perfTier];
  const stationRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.MeshBasicMaterial>(null);
  const glintRef = useRef<THREE.MeshBasicMaterial>(null);
  const wingAngleRef = useRef(0);
  const elapsedRef = useRef(0);
  const glintMap = useMemo(() => getGlintTexture(), []);

  const scratch = useMemo(
    () => ({
      position: new THREE.Vector3(),
      radial: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      truss: new THREE.Vector3(),
      basis: new THREE.Matrix4(),
      sun: new THREE.Vector3(),
      sunLocal: new THREE.Vector3(),
      inverse: new THREE.Quaternion(),
    }),
    [],
  );

  useFrame((_state, delta) => {
    const station = stationRef.current;
    if (!station) return;

    if (!reducedMotion) {
      elapsedRef.current += Math.min(delta, 0.1);
    }

    const angle = (elapsedRef.current / ORBIT_PERIOD_S) * Math.PI * 2;
    const { position, radial, velocity, truss, basis, sun, sunLocal, inverse } = scratch;

    position
      .copy(ORBIT_U)
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(ORBIT_V, Math.sin(angle))
      .multiplyScalar(ORBIT_RADIUS);
    station.position.copy(position);

    radial.copy(position).normalize();
    velocity
      .copy(ORBIT_U)
      .multiplyScalar(-Math.sin(angle))
      .addScaledVector(ORBIT_V, Math.cos(angle))
      .normalize();
    // Local frame: +Z along the velocity, +Y to zenith, +X down the truss.
    truss.crossVectors(radial, velocity);
    basis.makeBasis(truss, radial, velocity);
    station.quaternion.setFromRotationMatrix(basis);

    const subsolar = subsolarDirection();
    sun.set(subsolar.x, subsolar.y, subsolar.z);
    inverse.copy(station.quaternion).invert();
    sunLocal.copy(sun).applyQuaternion(inverse);
    // Blanket normal starts at +Y and sweeps toward +Z as the joint rotates.
    wingAngleRef.current = Math.atan2(sunLocal.z, sunLocal.y);

    // In sunlight until the station crosses into the planet's shadow.
    const lit = THREE.MathUtils.smoothstep(radial.dot(sun), -0.12, 0.08);
    if (glintRef.current) glintRef.current.opacity = 0.5 * lit;
    if (beaconRef.current) {
      const blink = reducedMotion
        ? 0.6
        : Math.max(0, Math.sin(elapsedRef.current * 2.4)) ** 6;
      beaconRef.current.opacity = 0.25 + 0.75 * blink;
    }
  });

  return (
    <group ref={stationRef}>
      <Truss detail={detail} />
      <PressurizedStack detail={detail} />
      {detail.radiators ? <Radiators /> : null}
      {detail.dockedCapsule ? <DockedCapsule /> : null}
      {WING_JOINT_OFFSETS.flatMap((offset) => [offset, -offset]).map((offset) => (
        <SolarWing key={offset} offsetX={offset} angleRef={wingAngleRef} />
      ))}
      <mesh position={[0, -0.012, CORE_STACK_HALF_LENGTH * 0.4]} raycast={ignoreRaycast}>
        <sphereGeometry args={[0.0016, 6, 6]} />
        <meshBasicMaterial
          ref={beaconRef}
          color={BEACON_COLOR}
          transparent
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <Billboard follow>
        <mesh scale={0.07} raycast={ignoreRaycast} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={glintRef}
            map={glintMap}
            color={GLINT_COLOR}
            transparent
            opacity={0.4}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
