"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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
/** Radians of spin per pixel of horizontal drag. */
export const GLOBE_DRAG_SPIN_FACTOR = 0.006;

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
};

/**
 * Builds the progress-painted planet texture at the highest resolution the
 * device's GPU comfortably supports, rebuilding when the profile, difficulty,
 * US rendering mode, or theme changes.
 */
export function useGlobeTexture(
  profile: Profile | null,
  { difficulty, usMode, isDark }: GlobeTextureConfig,
): THREE.CanvasTexture {
  const gl = useThree((state) => state.gl);
  const size = useMemo(
    () => resolveGlobeTextureSize(gl.capabilities.maxTextureSize),
    [gl],
  );

  const texture = useMemo(() => {
    const canvasTexture = new THREE.CanvasTexture(
      buildGlobeTextureCanvas(profile, { difficulty, usMode, isDark, size }),
    );
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    canvasTexture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    return canvasTexture;
  }, [profile, difficulty, usMode, isDark, size, gl]);

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
 * Real-time sunlight for the planet mesh. Mount as a child of the earth mesh
 * so the day/night terminator stays locked to geographic longitude while the
 * globe spins or the camera orbits.
 */
export function EarthSunLight() {
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

  // Keep the sun gentle — ambient does most of the lighting so night stays readable.
  return <directionalLight ref={lightRef} intensity={0.65} color="#fff4e0" />;
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
