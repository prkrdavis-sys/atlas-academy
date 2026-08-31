"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  createGlobeTexturePaint,
  createGlobeTexturePaintAsync,
  resolveGlobeTextureSize,
  type GlobeTexturePaintHandle,
  type GlobeUsMode,
} from "@/lib/globe-texture";
import { ensureOceanDepthCanvas, loadOceanDepthImage } from "@/lib/globe-ocean-depth";
import { loadLandColorImage } from "@/lib/globe-land-color";
import { createMasteryMaskTexture } from "@/lib/globe-gold-material";
import {
  getGlobePerfTier,
  isGlobeFxConstrained,
  type GlobePerfTier,
} from "@/lib/globe-performance";
import {
  createPaintYieldGate,
  yieldToAnimationFrame,
} from "@/lib/globe-yield";
import type { MapProgressDifficulty, Profile } from "@/lib/types";

export type GlobeTextureConfig = {
  difficulty: MapProgressDifficulty;
  usMode: GlobeUsMode;
  isDark: boolean;
  /** Place currently selected on the interactive map globe. */
  selectedCode?: string | null;
  perfTier?: GlobePerfTier;
};

export type GlobeSurfaceMaps = {
  map: THREE.CanvasTexture;
  /** Mastery-4 coverage for the shader; null when nothing is mastered. */
  masteryMask: THREE.CanvasTexture | null;
  ready?: boolean;
};

function configureGlobeCanvasTexture(
  texture: THREE.CanvasTexture,
  anisotropy: number,
) {
  // CanvasTexture mipmaps flicker/band when the canvas is repainted (selection,
  // mastery FX). Linear filtering keeps borders and fills stable.
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = anisotropy;
}

function mapsFromPaint(
  paint: GlobeTexturePaintHandle,
  gl: THREE.WebGLRenderer,
  fxConstrained: boolean,
): GlobeSurfaceMaps {
  const anisotropy = Math.min(
    fxConstrained ? 2 : 8,
    gl.capabilities.getMaxAnisotropy(),
  );

  const map = new THREE.CanvasTexture(paint.canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  configureGlobeCanvasTexture(map, anisotropy);

  const masteryMask = paint.masteryMaskCanvas
    ? createMasteryMaskTexture(paint.masteryMaskCanvas, gl)
    : null;

  return { map, masteryMask };
}

function disposeGlobeMaps(maps: GlobeSurfaceMaps) {
  maps.map.dispose();
  maps.masteryMask?.dispose();
}

/**
 * Builds the progress-painted planet texture at the highest resolution the
 * device's GPU comfortably supports, rebuilding when inputs change. Hard
 * mastery-4 places use a diamond-camo tile; Normal gold uses a brushed
 * metal albedo plus metalness/roughness maps so sunlight catches those places.
 * Selection highlight updates without rebuilding the base layer.
 *
 * Heavy rebuilds (land/ocean imagery arriving, theme changes) paint across
 * animation frames and keep the previous texture on-screen so auto-rotation
 * never freezes while borders upscale.
 */
export function useGlobeTexture(
  profile: Profile | null,
  {
    difficulty,
    usMode,
    isDark,
    selectedCode = null,
    perfTier = getGlobePerfTier(),
  }: GlobeTextureConfig,
): GlobeSurfaceMaps {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const fxConstrained = isGlobeFxConstrained(perfTier);
  const size = useMemo(
    () => resolveGlobeTextureSize(gl.capabilities.maxTextureSize, perfTier),
    [gl.capabilities.maxTextureSize, perfTier],
  );

  const [oceanDepthImage, setOceanDepthImage] = useState<HTMLImageElement | null>(null);
  const [landColorImage, setLandColorImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadOceanDepthImage()
      .then((image) => {
        if (!cancelled) setOceanDepthImage(image);
      })
      .catch(() => {
        // Flat ocean fill remains the fallback.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLandColorImage()
      .then((image) => {
        if (!cancelled) setLandColorImage(image);
      })
      .catch(() => {
        // Flat land fill remains the fallback.
        if (!cancelled) setLandColorImage(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const paintOptions = useMemo(
    () => ({
      difficulty,
      usMode,
      isDark,
      size,
      selectedCode: null as string | null,
      allowCanvasGlow: !fxConstrained,
      oceanDepthImage,
      landColorImage,
    }),
    [difficulty, usMode, isDark, size, fxConstrained, oceanDepthImage, landColorImage],
  );

  // First paint is a low-res preview so mount never freezes the spin; the
  // effect below upscales to full resolution across animation frames.
  const initialBundle = useMemo(() => {
    const previewSize = Math.min(1024, size);
    const paint = createGlobeTexturePaint(profile, {
      ...paintOptions,
      size: previewSize,
      oceanDepthImage: null,
      landColorImage: null,
    });
    return { paint, maps: mapsFromPaint(paint, gl, fxConstrained) };
    // Intentionally once per mount identity — upgrades go through the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [bundle, setBundle] = useState(initialBundle);
  const [textureReady, setTextureReady] = useState(false);
  const bundleRef = useRef(bundle);
  bundleRef.current = bundle;
  const buildGenRef = useRef(0);

  useEffect(() => {
    const gen = ++buildGenRef.current;
    let cancelled = false;
    setTextureReady(false);
    const shouldContinue = () => !cancelled && gen === buildGenRef.current;
    const gate = createPaintYieldGate(shouldContinue);

    void (async () => {
      // Let the current spin frame finish before any heavy canvas work.
      await yieldToAnimationFrame();
      if (!shouldContinue()) return;

      if (paintOptions.oceanDepthImage) {
        const depth = await ensureOceanDepthCanvas(
          paintOptions.oceanDepthImage,
          paintOptions.isDark,
          gate,
        );
        if (!shouldContinue() || !depth) return;
        await yieldToAnimationFrame();
        if (!shouldContinue()) return;
      }

      const paint = await createGlobeTexturePaintAsync(profile, paintOptions, gate);
      if (!paint || !shouldContinue()) return;

      const nextMaps = mapsFromPaint(paint, gl, fxConstrained);
      const prevMaps = bundleRef.current.maps;
      setBundle({ paint, maps: nextMaps });
      setTextureReady(true);
      invalidate();
      // Dispose the previous GPU textures after a frame so the material swap
      // isn't racing a dispose mid-draw.
      if (prevMaps !== nextMaps) {
        requestAnimationFrame(() => disposeGlobeMaps(prevMaps));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, paintOptions, gl, fxConstrained, invalidate]);

  useEffect(
    () => () => {
      disposeGlobeMaps(bundleRef.current.maps);
    },
    [],
  );

  const { paint, maps } = bundle;

  // Selection is an overlay layer — update without rebuilding the base canvas.
  useEffect(() => {
    paint.setSelectedCode(selectedCode);
    paint.paintSelection();
    maps.map.needsUpdate = true;
    invalidate();
  }, [paint, selectedCode, maps, invalidate]);

  return { ...maps, ready: textureReady };
}

/** Forces initial draws after Canvas mount (avoids a blank first frame). */
export function GlobeInitialInvalidate() {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
    const id = requestAnimationFrame(() => invalidate());
    const id2 = requestAnimationFrame(() => invalidate());
    return () => {
      cancelAnimationFrame(id);
      cancelAnimationFrame(id2);
    };
  }, [invalidate]);
  return null;
}
