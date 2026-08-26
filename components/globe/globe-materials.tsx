"use client";

import { useEffect, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import {
  applyGoldDetailAnisotropy,
  createGoldSurfaceMaterial,
  GOLD_FULL_GLOBE_UV_WINDOW,
  loadGoldDetailTextures,
  updateGoldDetailBlend,
  type GoldDetailTextures,
} from "@/lib/globe-gold-material";
import type { GlobePerfTier } from "@/lib/globe-performance";

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

/**
 * Worked-gold normal intensity — the map is baked from a real height field
 * (hammered dents + scratches), so slopes are already physical; this just
 * compensates for mip softening at globe scale so sun glints stay crisp.
 */
const GOLD_NORMAL_SCALE = new THREE.Vector2(2.4, 2.4);

/**
 * PBR tuning for Normal mastery-4 gold vs the matte globe surface. Gold
 * roughness is not listed here — it comes per-pixel from the tiling roughness
 * map, which is what makes the foil catch the sun unevenly.
 */
export const GLOBE_GOLD_METALNESS = 0.96;
export const GLOBE_GOLD_EMISSIVE = "#c4921a";
export const GLOBE_GOLD_EMISSIVE_INTENSITY = 0.07;
export const GLOBE_GOLD_ENV_MAP_INTENSITY = 1.35;
export const GLOBE_MATTE_METALNESS = 0.04;
export const GLOBE_MATTE_ROUGHNESS = 0.72;

/**
 * Shared gold-material configuration for the globe and the close-up patch, so
 * both shade identically as the camera crosses the close-up activation
 * distance. `uvWindow` is the region of global equirectangular space the mesh
 * UVs cover — that is what keeps the tiling grain welded to geography.
 */
export function globeGoldMaterialConfig(
  map: THREE.Texture,
  goldMask: THREE.Texture,
  detail: GoldDetailTextures,
  uvWindow: THREE.Vector4,
) {
  return {
    map,
    goldMask,
    detail,
    uvWindow,
    goldMetalness: GLOBE_GOLD_METALNESS,
    matteMetalness: GLOBE_MATTE_METALNESS,
    matteRoughness: GLOBE_MATTE_ROUGHNESS,
    emissive: GLOBE_GOLD_EMISSIVE,
    emissiveIntensity: GLOBE_GOLD_EMISSIVE_INTENSITY,
    envMapIntensity: GLOBE_GOLD_ENV_MAP_INTENSITY,
    normalScale: GOLD_NORMAL_SCALE,
  };
}

/**
 * Loads the shared tiling gold PBR set once and keeps its anisotropy matched
 * to the renderer. Returns null until the images decode, so the surface falls
 * back to flat painted gold rather than blocking the first frame.
 */
export function useGoldDetailTextures(enabled: boolean): GoldDetailTextures | null {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const [detail, setDetail] = useState<GoldDetailTextures | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadGoldDetailTextures()
      .then((textures) => {
        if (cancelled) return;
        applyGoldDetailAnisotropy(textures, gl, 8);
        setDetail(textures);
        invalidate();
      })
      .catch(() => {
        // Flat painted gold remains the fallback.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, gl, invalidate]);

  return enabled ? detail : null;
}

/**
 * Studio IBL for mastered-gold reflections only. Matte land/ocean keep
 * `envMapIntensity` at 0 so the HDRI cannot tint the painted albedo.
 */
export function GlobeMetalReflection({ perfTier = "desktop" }: { perfTier?: GlobePerfTier }) {
  if (perfTier === "phone") return null;
  return <Environment preset="studio" environmentIntensity={0.3} />;
}

/**
 * Planet surface material. Matte land and ocean stay Lambert so the painted
 * colors read true. When any place is mastered gold, the surface upgrades to a
 * StandardMaterial whose metal response is evaluated per-pixel from tiling gold
 * maps, masked to those places — so gold reacts to the sun and the studio IBL
 * without any canvas ever being repainted for lighting.
 *
 * Day/night does NOT use the color map as emissiveMap — that turned borders and
 * selection glow into a globe-wide lit grid whenever the texture updated.
 * Night stays dark via low ambient; a thin earthshine wash keeps land faintly
 * readable without washing out the terminator.
 */
export function GlobeSurfaceMaterial({
  map,
  goldMask = null,
  goldDetail = null,
}: {
  map: THREE.Texture;
  goldMask?: THREE.Texture | null;
  goldDetail?: GoldDetailTextures | null;
}) {
  const material = useMemo(() => {
    if (!goldMask || !goldDetail) return null;
    return createGoldSurfaceMaterial(
      globeGoldMaterialConfig(map, goldMask, goldDetail, GOLD_FULL_GLOBE_UV_WINDOW),
    );
  }, [map, goldMask, goldDetail]);

  useEffect(() => {
    if (!material) return;
    return () => material.dispose();
  }, [material]);

  // The two tiling tiers cross-fade with camera distance: one float per frame,
  // no repaint and no texture upload.
  useFrame(({ camera }) => {
    updateGoldDetailBlend(material, camera.position.length());
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
