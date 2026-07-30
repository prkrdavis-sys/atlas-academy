"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { GlobePerfTier } from "@/lib/globe-performance";

/** Skip picking so flybys never steal globe taps. */
function ignoreRaycast() {}

const MAX_METEORS = 2;
const METEOR_SPAWN_MIN_S = 4;
const METEOR_SPAWN_MAX_S = 10;
const METEOR_DURATION_MIN_S = 0.45;
const METEOR_DURATION_MAX_S = 0.8;
const METEOR_PERIAPSIS_MIN = 1.08;
const METEOR_PERIAPSIS_MAX = 2.8;
const METEOR_PATH_HALF_LEN = 4.5;
const METEOR_STREAK_LEN = 0.55;
const METEOR_STREAK_WIDTH = 0.012;

const FLYBY_SPAWN_MIN_S = 90;
const FLYBY_SPAWN_MAX_S = 180;
const FLYBY_DURATION_MIN_S = 10;
const FLYBY_DURATION_MAX_S = 16;
const FLYBY_PERIAPSIS_MIN = 1.5;
const FLYBY_PERIAPSIS_MAX = 3.0;
const FLYBY_PATH_HALF_LEN = 5.5;

/** Classic hero palette — generic flying figure, no logos or trademarks. */
const HERO_SUIT = "#0055a4";
const HERO_CAPE = "#c8102e";
const HERO_ACCENT = "#ffc72c";
const HERO_SKIN = "#d4a574";
const HERO_TRAIL = "#60a5fa";

type Chord = {
  start: THREE.Vector3;
  end: THREE.Vector3;
};

type MeteorSlot = {
  active: boolean;
  t: number;
  duration: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  opacity: number;
};

type FlybyState = {
  active: boolean;
  t: number;
  duration: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
};

const flybyFadeMaterial = {
  flybyFade: true,
} as const;

function fadeMaterial(
  color: string,
  baseOpacity: number,
  options: {
    depthWrite?: boolean;
    blending?: THREE.Blending;
    toneMapped?: boolean;
    side?: THREE.Side;
  } = {},
) {
  return (
    <meshBasicMaterial
      color={color}
      transparent
      opacity={baseOpacity}
      depthWrite={options.depthWrite ?? true}
      depthTest
      blending={options.blending}
      toneMapped={options.toneMapped}
      side={options.side}
      userData={{ ...flybyFadeMaterial, baseOpacity }}
    />
  );
}

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomUnitVector(out: THREE.Vector3) {
  // Marsaglia method for a uniform point on the unit sphere.
  let x = 0;
  let y = 0;
  let s = 2;
  while (s >= 1 || s === 0) {
    x = Math.random() * 2 - 1;
    y = Math.random() * 2 - 1;
    s = x * x + y * y;
  }
  const z = 1 - 2 * s;
  const scale = 2 * Math.sqrt(1 - s);
  return out.set(x * scale, y * scale, z);
}

/**
 * Straight chord past Earth with a controlled periapsis so objects can skim
 * near the surface or farther out — sometimes behind the disk from the camera.
 */
function randomFlybyChord(
  periapsisMin: number,
  periapsisMax: number,
  halfLen: number,
  out: Chord,
): Chord {
  const periapsis = randRange(periapsisMin, periapsisMax);
  const radial = randomUnitVector(new THREE.Vector3());
  // Direction of travel: perpendicular to the radial closest-approach vector.
  const scratch = randomUnitVector(new THREE.Vector3());
  const dir = new THREE.Vector3().crossVectors(radial, scratch);
  if (dir.lengthSq() < 1e-8) {
    dir.crossVectors(radial, new THREE.Vector3(0, 1, 0));
  }
  if (dir.lengthSq() < 1e-8) {
    dir.set(1, 0, 0);
  }
  dir.normalize();

  const closest = radial.multiplyScalar(periapsis);
  out.start.copy(closest).addScaledVector(dir, -halfLen);
  out.end.copy(closest).addScaledVector(dir, halfLen);
  return out;
}

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function meteorOpacity(t: number) {
  if (t < 0.12) return t / 0.12;
  if (t > 0.75) return Math.max(0, (1 - t) / 0.25);
  return 1;
}

type SpaceFlybysProps = {
  enabled: boolean;
  isDark: boolean;
  perfTier?: GlobePerfTier;
  onActivity: () => void;
};

/**
 * World-space meteors and a rare flyby — UFO in dark mode, a generic caped
 * hero in light mode. Mount as a sibling of the planet (not inside the Earth
 * spin group) so depth testing against the globe works and orbiting the camera
 * changes parallax.
 */
export function SpaceFlybys({
  enabled,
  isDark,
  perfTier = "desktop",
  onActivity,
}: SpaceFlybysProps) {
  const simplified = perfTier === "phone";
  const groupRef = useRef<THREE.Group>(null);
  const meteorMeshes = useRef<(THREE.Mesh | null)[]>([null, null]);
  const meteorMats = useRef<(THREE.MeshBasicMaterial | null)[]>([null, null]);
  const flybyGroupRef = useRef<THREE.Group>(null);
  const flybyGlowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const capeRef = useRef<THREE.Group>(null);

  const chordScratch = useMemo<Chord>(
    () => ({ start: new THREE.Vector3(), end: new THREE.Vector3() }),
    [],
  );
  const posScratch = useMemo(() => new THREE.Vector3(), []);
  const lookScratch = useMemo(() => new THREE.Vector3(), []);

  const meteorsRef = useRef<MeteorSlot[]>(
    Array.from({ length: MAX_METEORS }, () => ({
      active: false,
      t: 0,
      duration: 0.6,
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      opacity: 0,
    })),
  );
  const flybyRef = useRef<FlybyState>({
    active: false,
    t: 0,
    duration: 12,
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
  });
  const nextMeteorAtRef = useRef(randRange(METEOR_SPAWN_MIN_S, METEOR_SPAWN_MAX_S));
  const nextFlybyAtRef = useRef(randRange(FLYBY_SPAWN_MIN_S, FLYBY_SPAWN_MAX_S));
  const elapsedRef = useRef(0);
  const wasEnabledRef = useRef(false);

  const streakColor = isDark ? "#e8f4ff" : "#64748b";
  const streakOpacityScale = isDark ? 0.95 : 0.45;
  const ufoBody = isDark ? "#9aa3b2" : "#788193";
  const ufoDome = isDark ? "#7dd3c7" : "#5b9a92";
  const ufoGlow = isDark ? "#a7f3d0" : "#6ee7b7";

  useLayoutEffect(() => {
    if (!enabled && wasEnabledRef.current) {
      for (const slot of meteorsRef.current) slot.active = false;
      flybyRef.current.active = false;
      for (const mat of meteorMats.current) {
        if (mat) mat.opacity = 0;
      }
      if (flybyGroupRef.current) flybyGroupRef.current.visible = false;
    }
    if (enabled && !wasEnabledRef.current) {
      elapsedRef.current = 0;
      nextMeteorAtRef.current = randRange(METEOR_SPAWN_MIN_S * 0.4, METEOR_SPAWN_MAX_S * 0.6);
      nextFlybyAtRef.current = randRange(FLYBY_SPAWN_MIN_S, FLYBY_SPAWN_MAX_S);
    }
    wasEnabledRef.current = enabled;
  }, [enabled]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const dt = Math.min(delta, 0.05);
    elapsedRef.current += dt;
    let anyActive = false;

    // --- Meteor spawn ---
    if (elapsedRef.current >= nextMeteorAtRef.current) {
      const free = meteorsRef.current.find((m) => !m.active);
      if (free) {
        randomFlybyChord(
          METEOR_PERIAPSIS_MIN,
          METEOR_PERIAPSIS_MAX,
          METEOR_PATH_HALF_LEN,
          chordScratch,
        );
        free.active = true;
        free.t = 0;
        free.duration = randRange(METEOR_DURATION_MIN_S, METEOR_DURATION_MAX_S);
        free.start.copy(chordScratch.start);
        free.end.copy(chordScratch.end);
        free.opacity = 0;
      }
      nextMeteorAtRef.current =
        elapsedRef.current + randRange(METEOR_SPAWN_MIN_S, METEOR_SPAWN_MAX_S);
    }

    // --- Rare flyby spawn (UFO in dark mode, hero in light mode) ---
    if (
      !flybyRef.current.active &&
      elapsedRef.current >= nextFlybyAtRef.current
    ) {
      randomFlybyChord(
        FLYBY_PERIAPSIS_MIN,
        FLYBY_PERIAPSIS_MAX,
        FLYBY_PATH_HALF_LEN,
        chordScratch,
      );
      const flyby = flybyRef.current;
      flyby.active = true;
      flyby.t = 0;
      flyby.duration = randRange(FLYBY_DURATION_MIN_S, FLYBY_DURATION_MAX_S);
      flyby.start.copy(chordScratch.start);
      flyby.end.copy(chordScratch.end);
      nextFlybyAtRef.current =
        elapsedRef.current + randRange(FLYBY_SPAWN_MIN_S, FLYBY_SPAWN_MAX_S);
    }

    // --- Update meteors ---
    for (let i = 0; i < MAX_METEORS; i++) {
      const slot = meteorsRef.current[i];
      const mesh = meteorMeshes.current[i];
      const mat = meteorMats.current[i];
      if (!slot || !mesh || !mat) continue;

      if (!slot.active) {
        mesh.visible = false;
        continue;
      }

      slot.t += dt / slot.duration;
      if (slot.t >= 1) {
        slot.active = false;
        mesh.visible = false;
        mat.opacity = 0;
        continue;
      }

      anyActive = true;
      const u = slot.t;
      posScratch.lerpVectors(slot.start, slot.end, u);
      lookScratch.lerpVectors(slot.start, slot.end, Math.min(1, u + 0.02));
      mesh.position.copy(posScratch);
      mesh.lookAt(lookScratch);
      mesh.rotateY(Math.PI / 2);

      const opacity = meteorOpacity(u) * streakOpacityScale;
      mat.opacity = opacity;
      mesh.visible = opacity > 0.01;
    }

    // --- Update flyby (UFO or hero) ---
    const flyby = flybyRef.current;
    const flybyGroup = flybyGroupRef.current;
    if (flybyGroup) {
      if (!flyby.active) {
        flybyGroup.visible = false;
      } else {
        flyby.t += dt / flyby.duration;
        if (flyby.t >= 1) {
          flyby.active = false;
          flybyGroup.visible = false;
        } else {
          anyActive = true;
          const u = easeInOutQuad(flyby.t);
          posScratch.lerpVectors(flyby.start, flyby.end, u);
          lookScratch.lerpVectors(flyby.start, flyby.end, Math.min(1, u + 0.01));
          flybyGroup.position.copy(posScratch);
          flybyGroup.rotation.set(0, 0, 0);
          if (isDark) {
            // Keep the saucer dome pointing roughly away from Earth while facing travel.
            flybyGroup.up.copy(posScratch).normalize();
          } else {
            flybyGroup.up.set(0, 1, 0);
          }
          flybyGroup.lookAt(lookScratch);

          const cape = capeRef.current;
          if (!isDark && cape) {
            const flutter = Math.sin(elapsedRef.current * 8) * 0.12;
            cape.rotation.x = -0.35 + flutter;
          }

          // Soft fade at the ends of the flyby.
          let fade = 1;
          if (flyby.t < 0.08) fade = flyby.t / 0.08;
          else if (flyby.t > 0.9) fade = (1 - flyby.t) / 0.1;
          flybyGroup.visible = fade > 0.02;
          flybyGroup.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            const mat = mesh.material as THREE.MeshBasicMaterial;
            if (mat && "opacity" in mat && mat.userData?.flybyFade) {
              mat.opacity = fade * (mat.userData.baseOpacity as number);
            }
          });
          if (flybyGlowMatRef.current) {
            const pulse = 0.55 + Math.sin(elapsedRef.current * 6) * 0.2;
            flybyGlowMatRef.current.opacity = fade * pulse * (isDark ? 0.7 : 0.55);
          }
        }
      }
    }

    if (anyActive) onActivity();
  });

  const flybyScale = simplified ? 0.045 : 0.055;
  const heroScale = simplified ? 0.07 : 0.085;
  const limbSegments = simplified ? 6 : 10;

  return (
    <group ref={groupRef}>
      {Array.from({ length: MAX_METEORS }, (_, i) => (
        <mesh
          key={i}
          ref={(node) => {
            meteorMeshes.current[i] = node;
          }}
          visible={false}
          raycast={ignoreRaycast}
          frustumCulled={false}
        >
          <boxGeometry args={[METEOR_STREAK_LEN, METEOR_STREAK_WIDTH, METEOR_STREAK_WIDTH]} />
          <meshBasicMaterial
            ref={(node) => {
              meteorMats.current[i] = node;
            }}
            color={streakColor}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      {isDark ? (
        <group ref={flybyGroupRef} visible={false} scale={flybyScale} frustumCulled={false}>
          <mesh raycast={ignoreRaycast}>
            <cylinderGeometry args={[1.1, 1.4, 0.22, simplified ? 12 : 20]} />
            {fadeMaterial(ufoBody, 0.92)}
          </mesh>
          <mesh raycast={ignoreRaycast} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <torusGeometry args={[1.15, 0.06, 6, simplified ? 12 : 20]} />
            {fadeMaterial(isDark ? "#c5ced9" : "#8b95a5", 0.85)}
          </mesh>
          <mesh raycast={ignoreRaycast} position={[0, 0.18, 0]}>
            <sphereGeometry
              args={[0.45, simplified ? 10 : 16, simplified ? 8 : 12, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            {fadeMaterial(ufoDome, 0.9)}
          </mesh>
          {!simplified ? (
            <mesh raycast={ignoreRaycast} position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.7, 16]} />
              <meshBasicMaterial
                ref={flybyGlowMatRef}
                color={ufoGlow}
                transparent
                opacity={0.5}
                depthWrite={false}
                depthTest
                blending={THREE.AdditiveBlending}
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          ) : null}
        </group>
      ) : (
        <group ref={flybyGroupRef} visible={false} scale={heroScale} frustumCulled={false}>
          {/* Prone flying pose along -Z (lookAt forward). */}
          <mesh raycast={ignoreRaycast} position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.22, 0.52, 4, limbSegments]} />
            {fadeMaterial(HERO_SUIT, 0.94)}
          </mesh>
          <mesh raycast={ignoreRaycast} position={[0, 0.1, -0.4]}>
            <sphereGeometry args={[0.15, limbSegments, limbSegments]} />
            {fadeMaterial(HERO_SKIN, 0.95)}
          </mesh>
          <mesh raycast={ignoreRaycast} position={[-0.28, 0.04, -0.28]} rotation={[0.45, 0, 0.25]}>
            <capsuleGeometry args={[0.07, 0.38, 4, limbSegments]} />
            {fadeMaterial(HERO_SUIT, 0.94)}
          </mesh>
          <mesh raycast={ignoreRaycast} position={[0.28, 0.04, -0.28]} rotation={[0.45, 0, -0.25]}>
            <capsuleGeometry args={[0.07, 0.38, 4, limbSegments]} />
            {fadeMaterial(HERO_SUIT, 0.94)}
          </mesh>
          <mesh raycast={ignoreRaycast} position={[-0.12, 0.04, 0.32]} rotation={[-0.55, 0, 0.08]}>
            <capsuleGeometry args={[0.08, 0.42, 4, limbSegments]} />
            {fadeMaterial(HERO_SUIT, 0.94)}
          </mesh>
          <mesh raycast={ignoreRaycast} position={[0.12, 0.04, 0.32]} rotation={[-0.55, 0, -0.08]}>
            <capsuleGeometry args={[0.08, 0.42, 4, limbSegments]} />
            {fadeMaterial(HERO_SUIT, 0.94)}
          </mesh>
          <mesh raycast={ignoreRaycast} position={[-0.12, 0.02, 0.5]}>
            <boxGeometry args={[0.14, 0.1, 0.16]} />
            {fadeMaterial(HERO_ACCENT, 0.92)}
          </mesh>
          <mesh raycast={ignoreRaycast} position={[0.12, 0.02, 0.5]}>
            <boxGeometry args={[0.14, 0.1, 0.16]} />
            {fadeMaterial(HERO_ACCENT, 0.92)}
          </mesh>
          <mesh raycast={ignoreRaycast} position={[0, 0.08, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.24, 0.05, 6, simplified ? 10 : 14]} />
            {fadeMaterial(HERO_ACCENT, 0.95)}
          </mesh>
          <group ref={capeRef} position={[0, 0.12, 0.06]}>
            <mesh raycast={ignoreRaycast} position={[0, 0, 0.28]} rotation={[-0.35, 0, 0]}>
              <planeGeometry args={[0.72, 0.88]} />
              {fadeMaterial(HERO_CAPE, 0.88, { side: THREE.DoubleSide })}
            </mesh>
          </group>
          {!simplified ? (
            <>
              <mesh raycast={ignoreRaycast} position={[0, 0.06, -0.58]} rotation={[Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.22, 12]} />
                <meshBasicMaterial
                  ref={flybyGlowMatRef}
                  color={HERO_TRAIL}
                  transparent
                  opacity={0.45}
                  depthWrite={false}
                  depthTest
                  blending={THREE.AdditiveBlending}
                  toneMapped={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <mesh raycast={ignoreRaycast} position={[0, 0.06, -0.72]} rotation={[Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.14, 10]} />
                {fadeMaterial(HERO_CAPE, 0.35, {
                  depthWrite: false,
                  blending: THREE.AdditiveBlending,
                  toneMapped: false,
                  side: THREE.DoubleSide,
                })}
              </mesh>
            </>
          ) : null}
        </group>
      )}
    </group>
  );
}
