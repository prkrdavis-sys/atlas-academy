"use client";

import { useRef, type RefObject } from "react";
import type { ThreeElements } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { GlobeAtmosphere } from "@/components/globe/globe-atmosphere";
import {
  DistantSun,
  EarthshineLight,
  EarthSunLight,
  GlobeCityLights,
} from "@/components/globe/globe-celestial";
import {
  GlobeSurfaceMaterial,
  useGoldDetailTextures,
} from "@/components/globe/globe-materials";
import { getGlobeSphereSegments } from "@/components/globe/globe-runtime";
import { useGlobeTexture } from "@/components/globe/globe-scene";
import type { GlobePerfTier } from "@/lib/globe-performance";
import { getGlobePalette, type GlobeUsMode } from "@/lib/globe-texture";
import type { MapProgressDifficulty, Profile } from "@/lib/types";

/**
 * Camera distance at which a unit globe's limb reaches the viewport corners
 * (outer space no longer visible). Matches the SpaceFlybys cutoff.
 */
export function globeFillDistance(
  fovDeg: number,
  aspect: number,
  radius = 1,
): number {
  const halfV = THREE.MathUtils.degToRad(fovDeg / 2);
  const halfH = Math.atan(Math.tan(halfV) * Math.max(aspect, 1e-6));
  const halfCorner = Math.atan(Math.hypot(Math.tan(halfH), Math.tan(halfV)));
  const sinCorner = Math.sin(halfCorner);
  if (sinCorner <= 1e-6) return radius;
  return radius / sinCorner;
}

/** Ocean-colored placeholder shown while the painted globe texture loads. */
export function GlobeLoadingSphere({
  isDark,
  perfTier = "desktop",
}: {
  isDark: boolean;
  perfTier?: GlobePerfTier;
}) {
  const ocean = getGlobePalette(isDark).ocean;
  const segments = getGlobeSphereSegments(perfTier);
  return (
    <mesh>
      <sphereGeometry args={[1, segments, segments]} />
      <meshBasicMaterial color={ocean} />
    </mesh>
  );
}

type GlobeMeshProps = Omit<ThreeElements["mesh"], "ref" | "children">;

export type GlobePlanetProps = {
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  usMode: GlobeUsMode;
  isDark: boolean;
  dayNight: boolean;
  selectedCode?: string | null;
  perfTier: GlobePerfTier;
  /** Orbit controls (map explorer) — lets the atmosphere fade with distance. */
  controlsRef?: RefObject<OrbitControlsImpl | null>;
  meshRef?: RefObject<THREE.Mesh | null>;
  /** Pointer handlers / initial rotation for the planet mesh. */
  meshProps?: GlobeMeshProps;
};

/**
 * The shared planet unit: progress-painted sphere, sun + earthshine lights,
 * distant sun visual, night-side city lights, and the atmosphere rim — one
 * component so the home globe and the map explorer are always the same globe.
 * Interactivity stays with the caller via `meshProps` / `meshRef`.
 */
export function GlobePlanet({
  profile,
  difficulty,
  usMode,
  isDark,
  dayNight,
  selectedCode = null,
  perfTier,
  controlsRef,
  meshRef,
  meshProps,
}: GlobePlanetProps) {
  const internalMeshRef = useRef<THREE.Mesh>(null);
  const planetMeshRef = meshRef ?? internalMeshRef;
  const { map, goldMask, ready } = useGlobeTexture(profile, {
    difficulty,
    usMode,
    isDark,
    selectedCode,
    perfTier,
  });
  const goldDetail = useGoldDetailTextures(goldMask !== null);
  const segments = getGlobeSphereSegments(perfTier);

  if (!ready) {
    return <GlobeLoadingSphere isDark={isDark} perfTier={perfTier} />;
  }

  return (
    <>
      <mesh ref={planetMeshRef} {...meshProps}>
        <sphereGeometry args={[1, segments, segments]} />
        <GlobeSurfaceMaterial map={map} goldMask={goldMask} goldDetail={goldDetail} />
        <GlobeCityLights dayNight={dayNight} perfTier={perfTier} />
        {!isDark ? <DistantSun isDark={isDark} perfTier={perfTier} /> : null}
        <EarthSunLight dayNight={dayNight} />
        <EarthshineLight isDark={isDark} dayNight={dayNight} />
      </mesh>
      <GlobeAtmosphere isDark={isDark} perfTier={perfTier} controlsRef={controlsRef} />
      {isDark ? (
        <DistantSun isDark={isDark} perfTier={perfTier} anchorRef={planetMeshRef} />
      ) : null}
    </>
  );
}
