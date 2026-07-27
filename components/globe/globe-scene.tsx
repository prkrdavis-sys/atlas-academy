"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, useTexture } from "@react-three/drei";
import * as THREE from "three";
import {
  buildGlobeTextureCanvas,
  resolveGlobeTextureSize,
  type GlobeUsMode,
} from "@/lib/globe-texture";
import { subsolarDirection } from "@/lib/sun-position";
import type { MapProgressDifficulty, Profile } from "@/lib/types";

export const GLOBE_ROTATION_SPEED = 0.045;
/** Pointer travel (px) below which a release counts as a tap, not a drag. */
export const GLOBE_TAP_TRAVEL_THRESHOLD = 8;
/** Radians of spin per pixel of pointer drag. */
export const GLOBE_DRAG_SPIN_FACTOR = 0.006;
/** Max mesh tilt (radians) from vertical drag before clamping. */
export const GLOBE_MAX_TILT = Math.PI * 0.45;
/** Idle time after a drag before the globe eases back onto its default axis. */
export const GLOBE_IDLE_RETURN_DELAY_MS = 2000;
/** Damping factor for easing tilt back to the default axis (higher = snappier). */
export const GLOBE_TILT_RETURN_DAMP = 2.4;

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export type GlobeSceneEnvironment = {
  /** null until detection runs on the client. */
  webglOk: boolean | null;
  reducedMotion: boolean;
  pageVisible: boolean;
};

/** Client-side WebGL support, reduced-motion preference, and tab visibility. */
export function useGlobeSceneEnvironment(): GlobeSceneEnvironment {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglOk(supportsWebGL());
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onMotionChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", onMotionChange);

    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      query.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { webglOk, reducedMotion, pageVisible };
}

export type GlobeTextureConfig = {
  difficulty: MapProgressDifficulty;
  usMode: GlobeUsMode;
  isDark: boolean;
  /** Place currently selected on the interactive map globe. */
  selectedCode?: string | null;
};

/**
 * Builds the progress-painted planet texture at the highest resolution the
 * device's GPU comfortably supports, rebuilding when the profile, difficulty,
 * US rendering mode, theme, or selected place changes.
 */
export function useGlobeTexture(
  profile: Profile | null,
  { difficulty, usMode, isDark, selectedCode = null }: GlobeTextureConfig,
): THREE.CanvasTexture {
  const gl = useThree((state) => state.gl);
  const size = useMemo(
    () => resolveGlobeTextureSize(gl.capabilities.maxTextureSize),
    [gl],
  );

  const texture = useMemo(() => {
    const canvasTexture = new THREE.CanvasTexture(
      buildGlobeTextureCanvas(profile, { difficulty, usMode, isDark, size, selectedCode }),
    );
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    canvasTexture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    return canvasTexture;
  }, [profile, difficulty, usMode, isDark, size, selectedCode, gl]);

  useEffect(() => () => texture.dispose(), [texture]);

  return texture;
}

/** Cheap additive atmosphere halo around the planet's rim. */
export function GlobeAtmosphere({ isDark }: { isDark: boolean }) {
  return (
    <mesh scale={1.07}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshBasicMaterial
        color={isDark ? "#2dd4bf" : "#38bdf8"}
        transparent
        opacity={isDark ? 0.1 : 0.16}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Scene fill lights for the globe. When day/night is on, ambient + real-time
 * sun create a clear terminator. When off, lighting stays nearly even with only
 * a soft key so the sphere still reads in 3D — especially important in dark
 * mode, where a hard shade would swallow the navy ocean.
 */
export function GlobeFillLights({
  isDark,
  dayNight,
}: {
  isDark: boolean;
  dayNight: boolean;
}) {
  if (dayNight) {
    // Dark mode needs more fill so navy oceans stay visible; light stays a bit dimmer.
    return <ambientLight intensity={isDark ? 0.78 : 0.62} />;
  }
  return (
    <>
      <ambientLight intensity={isDark ? 1.35 : 1.2} />
      {/* Soft key only — enough roundness, not a dark shaded hemisphere. */}
      <directionalLight position={[3, 2, 4]} intensity={isDark ? 0.28 : 0.4} />
    </>
  );
}

/**
 * Real-time sunlight for the planet mesh. Mount as a child of the earth mesh
 * so the day/night terminator stays locked to geographic longitude while the
 * globe spins or the camera orbits.
 */
export function EarthSunLight({ isDark }: { isDark: boolean }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useLayoutEffect(() => {
    const light = lightRef.current;
    if (!light?.parent) return;
    // DirectionalLight.target is not auto-parented; keep it at the mesh origin
    // so the beam tracks the spinning earth instead of world (0,0,0).
    light.target.position.set(0, 0, 0);
    light.parent.add(light.target);
    return () => {
      light.target.removeFromParent();
    };
  }, []);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    const sun = subsolarDirection();
    light.position.set(sun.x, sun.y, sun.z).multiplyScalar(5);
  });

  // Slightly stronger in dark mode so the day side pops against space.
  return (
    <directionalLight
      ref={lightRef}
      intensity={isDark ? 1.95 : 1.75}
      color="#fff4e0"
    />
  );
}

/** How far the visible sun sits from Earth's center (mesh-local units). */
const DISTANT_SUN_DISTANCE = 56;

/** NASA SDO / AIA 304 Å disk — public domain (see public/globe/SUN_ATTRIBUTION.txt). */
const SUN_TEXTURE_URL = "/globe/sun.jpg";

/** Skip picking so the sun never steals globe taps. */
function ignoreRaycast() {}

function DistantSunVisual({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useTexture(SUN_TEXTURE_URL);

  useLayoutEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, texture.anisotropy || 1);
  }, [texture]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const sun = subsolarDirection();
    group.position.set(sun.x, sun.y, sun.z).multiplyScalar(DISTANT_SUN_DISTANCE);
  });

  return (
    <group ref={groupRef} frustumCulled={false}>
      <Billboard follow>
        {/* Soft corona so the NASA disk blooms a little in space / pale sky. */}
        <mesh scale={5.2} raycast={ignoreRaycast} frustumCulled={false}>
          <circleGeometry args={[1, 48]} />
          <meshBasicMaterial
            color="#ff7a3c"
            transparent
            opacity={isDark ? 0.18 : 0.22}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh scale={2.35} raycast={ignoreRaycast} frustumCulled={false}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial
            map={texture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
    </group>
  );
}

/**
 * Bright distant sun in outer space, locked to the real subsolar direction.
 * Always mounted (independent of the day/night lighting toggle) as a child of
 * the earth mesh so it stays aligned with geography while the globe spins.
 * Uses a NASA SDO AIA image (public domain).
 */
export function DistantSun({ isDark }: { isDark: boolean }) {
  return (
    <Suspense fallback={null}>
      <DistantSunVisual isDark={isDark} />
    </Suspense>
  );
}

/** Pointer capture can throw for already-released or synthetic pointers. */
export function trySetPointerCapture(target: Element, pointerId: number) {
  try {
    target.setPointerCapture?.(pointerId);
  } catch {
    // Dragging still works without capture; moves just stop at the globe edge.
  }
}

export function tryReleasePointerCapture(target: Element, pointerId: number) {
  try {
    target.releasePointerCapture?.(pointerId);
  } catch {
    // Already released.
  }
}
