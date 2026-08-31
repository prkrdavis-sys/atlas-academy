"use client";

import { useEffect, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import {
  applyMasteryDetailAnisotropy,
  createMasterySurfaceMaterial,
  MASTERY_FULL_GLOBE_UV_WINDOW,
  loadMasteryDetailTextures,
  updateMasteryDetailBlend,
  type MasteryDetailTextures,
} from "@/lib/globe-gold-material";
import type { GlobePerfTier } from "@/lib/globe-performance";
import { getMasteryFinish } from "@/lib/mastery-finish";
import type { MapProgressDifficulty } from "@/lib/types";

/**
 * One lighting rig for every globe surface and zoom level.
 *
 * Day/night OFF: bright, even "studio" lighting — a readable base with a soft
 * key light for surface relief, stable at every camera distance.
 * Day/night ON: low ambient so the real-time sun casts a deep night shadow and
 * a sharp terminator; a thin earthshine wash keeps land faintly readable.
 */
export function globeAmbientIntensity(isDark: boolean, dayNight: boolean): number {
  // Keep the night side readable and the day side vivid — crushed midtones
  // were reading as muddy brown instead of ocean blue / land green.
  if (dayNight) return isDark ? 0.48 : 0.42;
  return isDark ? 1.45 : 1.28;
}

export function globeHemisphereIntensity(dayNight: boolean): number {
  return dayNight ? 0.22 : 0.58;
}

export function globeSunIntensity(dayNight: boolean): number {
  return dayNight ? 1.35 : 0.4;
}

export function globeEarthshineIntensity(): number {
  return 0.38;
}

export const GLOBE_MATTE_METALNESS = 0.04;
export const GLOBE_MATTE_ROUGHNESS = 0.72;

/**
 * Shared mastery-material configuration for the globe and the close-up patch,
 * so both shade identically as the camera crosses the close-up activation
 * distance. `uvWindow` is the region of global equirectangular space the mesh
 * UVs cover — that is what keeps the tiling grain welded to geography.
 */
export function globeMasteryMaterialConfig(
  map: THREE.Texture,
  masteryMask: THREE.Texture,
  detail: MasteryDetailTextures,
  uvWindow: THREE.Vector4,
  difficulty: MapProgressDifficulty = "medium",
) {
  return {
    map,
    masteryMask,
    detail,
    uvWindow,
    finish: getMasteryFinish(difficulty),
    matteMetalness: GLOBE_MATTE_METALNESS,
    matteRoughness: GLOBE_MATTE_ROUGHNESS,
  };
}

/**
 * Loads the tiling PBR set for the current finish once and keeps its
 * anisotropy matched to the renderer. Returns null until the images decode,
 * so the surface falls back to a flat painted fill rather than blocking the
 * first frame.
 */
export function useMasteryDetailTextures(
  enabled: boolean,
  difficulty: MapProgressDifficulty = "medium",
): MasteryDetailTextures | null {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const [detail, setDetail] = useState<MasteryDetailTextures | null>(null);
  const finish = getMasteryFinish(difficulty);

  useEffect(() => {
    if (!enabled) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    loadMasteryDetailTextures(finish)
      .then((textures) => {
        if (cancelled) return;
        applyMasteryDetailAnisotropy(textures, gl, 8);
        setDetail(textures);
        invalidate();
      })
      .catch(() => {
        // Flat painted finish remains the fallback.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, finish, gl, invalidate]);

  return enabled ? detail : null;
}

/**
 * Studio IBL for mastered-finish reflections only. Matte land/ocean keep
 * `envMapIntensity` at 0 so the HDRI cannot tint the painted albedo.
 */
export function GlobeMetalReflection({ perfTier = "desktop" }: { perfTier?: GlobePerfTier }) {
  if (perfTier === "phone") return null;
  return <Environment preset="studio" environmentIntensity={0.3} />;
}

/**
 * Planet surface material. Matte land and ocean stay Lambert so the painted
 * colors read true. When any place is mastery-4, the surface upgrades to a
 * StandardMaterial whose metal response is evaluated per-pixel from tiling
 * maps, masked to those places.
 */
export function GlobeSurfaceMaterial({
  map,
  masteryMask = null,
  masteryDetail = null,
  difficulty = "medium",
}: {
  map: THREE.Texture;
  masteryMask?: THREE.Texture | null;
  masteryDetail?: MasteryDetailTextures | null;
  difficulty?: MapProgressDifficulty;
}) {
  const material = useMemo(() => {
    if (!masteryMask || !masteryDetail) return null;
    return createMasterySurfaceMaterial(
      globeMasteryMaterialConfig(
        map,
        masteryMask,
        masteryDetail,
        MASTERY_FULL_GLOBE_UV_WINDOW,
        difficulty,
      ),
    );
  }, [map, masteryMask, masteryDetail, difficulty]);

  useEffect(() => {
    if (!material) return;
    return () => material.dispose();
  }, [material]);

  useFrame(({ camera }) => {
    updateMasteryDetailBlend(material, camera.position.length());
  });

  if (!material) return <meshLambertMaterial map={map} />;
  return <primitive object={material} attach="material" />;
}

/**
 * Scene fill lights for the globe: an ambient base plus a soft hemisphere
 * bounce so the sphere always reads as a lit object. Day/night on: low fill
 * so the night hemisphere stays clearly in shadow. One rig for every surface
 * and zoom level.
 */
export function GlobeFillLights({
  isDark,
  dayNight,
}: {
  isDark: boolean;
  dayNight: boolean;
}) {
  return (
    <>
      <ambientLight intensity={globeAmbientIntensity(isDark, dayNight)} />
      <hemisphereLight
        color="#ffffff"
        groundColor="#c8d4e2"
        intensity={globeHemisphereIntensity(dayNight)}
      />
    </>
  );
}
