"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  globeGoldMaterialConfig,
  useGoldDetailTextures,
} from "@/components/globe/globe-materials";
import {
  createGoldMaskTexture,
  createGoldSurfaceMaterial,
  updateGoldDetailBlend,
  type GoldDetailTextures,
} from "@/lib/globe-gold-material";
import {
  buildCloseupPatchGeometry,
  closeupWindowNeedsRebuild,
  disposeCloseupResources,
  GLOBE_CLOSEUP_ACTIVATE_DISTANCE,
  GLOBE_CLOSEUP_DEACTIVATE_DISTANCE,
  loadGlobeCloseupData,
  paintGlobeCloseupRegion,
  resolveCloseupWindow,
  type CloseupWindow,
  type GlobeCloseupData,
} from "@/lib/globe-closeup";
import {
  GLOBE_CLOSEUP_TEXTURE_WIDTH_BY_TIER,
  isGlobeCloseupFocusOnly,
  type GlobePerfTier,
} from "@/lib/globe-performance";
import { awaitPaintYield, createPaintYieldGate, yieldToAnimationFrame } from "@/lib/globe-yield";
import { loadOceanDepthImage } from "@/lib/globe-ocean-depth";
import { loadLandColorImage } from "@/lib/globe-land-color";
import { profileHasMastery4, type GlobeUsMode } from "@/lib/globe-texture";
import type { MapProgressDifficulty, Profile } from "@/lib/types";

type GlobeCloseupLayerProps = {
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  usMode: GlobeUsMode;
  isDark: boolean;
  selectedCode: string | null;
  /** When true, force the close-up on even before the camera finishes zooming in. */
  forceActive?: boolean;
  perfTier?: GlobePerfTier;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  spinGroupRef: RefObject<THREE.Group | null>;
};

const REBUILD_DEBOUNCE_MS = 120;
const FADE_SPEED = 5; // opacity units per second (~200ms 0→1)

type PatchResources = {
  mesh: THREE.Mesh;
  texture: THREE.CanvasTexture;
  goldMaskTexture: THREE.CanvasTexture | null;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshLambertMaterial | THREE.MeshStandardMaterial;
  window: CloseupWindow;
  paintKey: string;
};

type PaintInputs = {
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  usMode: GlobeUsMode;
  isDark: boolean;
  selectedCode: string | null;
  textureWidth: number;
  forceActive: boolean;
  focusOnly: boolean;
  oceanDepthImage: HTMLImageElement | null;
  landColorImage: HTMLImageElement | null;
  goldDetail: GoldDetailTextures | null;
};

function paintKeyOf(inputs: PaintInputs): string {
  return [
    inputs.profile?.id ?? "anon",
    inputs.difficulty,
    inputs.usMode,
    inputs.isDark ? "d" : "l",
    inputs.selectedCode ?? "",
    inputs.textureWidth,
    inputs.oceanDepthImage ? "depth" : "flat",
    inputs.landColorImage ? "terrain" : "flat",
    inputs.goldDetail ? "gold" : "flat",
  ].join("|");
}

/**
 * High-density regional map patch drawn above the base globe texture when the
 * camera is close. Covers every country in view without raising the full-earth
 * texture size. Microstate vector overlays still sit above this layer.
 */
export function GlobeCloseupLayer({
  profile,
  difficulty,
  usMode,
  isDark,
  selectedCode,
  forceActive = false,
  perfTier = "desktop",
  controlsRef,
  spinGroupRef,
}: GlobeCloseupLayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);

  const dataRef = useRef<GlobeCloseupData | null>(null);
  const loadStartedRef = useRef(false);
  const activeRef = useRef(false);
  const livePatchRef = useRef<PatchResources | null>(null);
  const fadingPatchRef = useRef<PatchResources | null>(null);
  const pendingWindowRef = useRef<CloseupWindow | null>(null);
  const pendingPaintKeyRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paintGenRef = useRef(0);
  const lookDirRef = useRef(new THREE.Vector3());
  const localCameraRef = useRef(new THREE.Vector3());

  const goldDetail = useGoldDetailTextures(
    profileHasMastery4(profile, difficulty, usMode),
    difficulty,
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

  const inputsRef = useRef<PaintInputs>({
    profile,
    difficulty,
    usMode,
    isDark,
    selectedCode,
    textureWidth: GLOBE_CLOSEUP_TEXTURE_WIDTH_BY_TIER[perfTier],
    forceActive,
    focusOnly: isGlobeCloseupFocusOnly(perfTier),
    oceanDepthImage,
    landColorImage,
    goldDetail,
  });
  inputsRef.current = {
    profile,
    difficulty,
    usMode,
    isDark,
    selectedCode,
    textureWidth: GLOBE_CLOSEUP_TEXTURE_WIDTH_BY_TIER[perfTier],
    forceActive,
    focusOnly: isGlobeCloseupFocusOnly(perfTier),
    oceanDepthImage,
    landColorImage,
    goldDetail,
  };

  const clearDebounce = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  const disposePatch = (patch: PatchResources | null) => {
    if (!patch) return;
    groupRef.current?.remove(patch.mesh);
    disposeCloseupResources(patch.texture, patch.geometry, patch.material);
    patch.goldMaskTexture?.dispose();
  };

  const ensureData = () => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;
    void loadGlobeCloseupData().then((data) => {
      dataRef.current = data;
      invalidate();
    });
  };

  const buildPatch = (window: CloseupWindow): PatchResources | null => {
    const data = dataRef.current;
    if (!data) return null;
    const inputs = inputsRef.current;

    const painted = paintGlobeCloseupRegion(data, inputs.profile, window, {
      difficulty: inputs.difficulty,
      usMode: inputs.usMode,
      isDark: inputs.isDark,
      selectedCode: inputs.selectedCode,
      textureWidth: inputs.textureWidth,
      oceanDepthImage: inputs.oceanDepthImage,
      landColorImage: inputs.landColorImage,
    });

    const texture = new THREE.CanvasTexture(painted.color);
    texture.colorSpace = THREE.SRGBColorSpace;
    // A patch canvas is painted exactly once, so mipmaps are safe here (unlike
    // the repainted base globe canvas) and are what keeps minified borders
    // from aliasing into a fuzzy edge.
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;

    const goldMaskTexture =
      painted.goldMaskCanvas && inputs.goldDetail
        ? createGoldMaskTexture(painted.goldMaskCanvas, gl)
        : null;

    const geometry = buildCloseupPatchGeometry(window);
    // Lit material matching the planet surface, so the patch shades exactly
    // like the globe beneath it — zooming across the activation distance must
    // not shift tone. Gold detail is sampled in global equirectangular space,
    // so the patch's grain lines up with the planet's texel for texel.
    const material =
      goldMaskTexture && inputs.goldDetail
        ? createGoldSurfaceMaterial({
            ...globeGoldMaterialConfig(
              texture,
              goldMaskTexture,
              inputs.goldDetail,
              new THREE.Vector4(
                window.centerX - window.halfX,
                window.centerY - window.halfY,
                window.halfX * 2,
                window.halfY * 2,
              ),
              inputs.difficulty,
            ),
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        : new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 5;
    mesh.raycast = () => {};

    return {
      mesh,
      texture,
      goldMaskTexture,
      geometry,
      material,
      window,
      paintKey: paintKeyOf(inputs),
    };
  };

  const commitPatch = (window: CloseupWindow) => {
    const gen = ++paintGenRef.current;
    const shouldContinue = () => gen === paintGenRef.current;
    const gate = createPaintYieldGate(shouldContinue);

    void (async () => {
      // Never paint on the same turn as the debounce fire — let auto-rotate
      // advance at least one frame before the high-res border patch builds.
      await yieldToAnimationFrame();
      if (!shouldContinue()) return;
      await awaitPaintYield(gate);
      if (!shouldContinue()) return;

      // Yield once more right before the sync canvas work so a spin step
      // lands between "schedule" and "upload", then build the patch.
      await yieldToAnimationFrame();
      if (!shouldContinue()) return;

      const next = buildPatch(window);
      if (!next || !shouldContinue()) {
        if (next) disposePatch(next);
        return;
      }

      if (fadingPatchRef.current) {
        disposePatch(fadingPatchRef.current);
        fadingPatchRef.current = null;
      }

      const previous = livePatchRef.current;
      if (previous) {
        // A pure window drift paints the same geography in the same place, so
        // cross-fading it would just stack two sets of borders at slightly
        // different sub-pixel offsets — that doubling is what reads as a fuzzy
        // shadow beside every border. Hand the opacity over and swap outright;
        // only genuine content changes are worth a fade.
        if (previous.paintKey === next.paintKey) {
          next.material.opacity = previous.material.opacity;
          disposePatch(previous);
        } else {
          fadingPatchRef.current = previous;
        }
      }

      livePatchRef.current = next;
      groupRef.current?.add(next.mesh);
      invalidate();
    })();
  };

  const scheduleRebuild = (window: CloseupWindow, key: string) => {
    // Avoid resetting the debounce every frame while the camera is still.
    const pending = pendingWindowRef.current;
    if (
      debounceTimerRef.current &&
      pending &&
      pendingPaintKeyRef.current === key &&
      !closeupWindowNeedsRebuild(pending, window)
    ) {
      pendingWindowRef.current = window;
      return;
    }

    pendingWindowRef.current = window;
    pendingPaintKeyRef.current = key;
    clearDebounce();
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      const nextWindow = pendingWindowRef.current;
      if (!nextWindow) return;
      pendingPaintKeyRef.current = null;
      commitPatch(nextWindow);
    }, REBUILD_DEBOUNCE_MS);
  };

  useEffect(() => {
    if (forceActive || selectedCode !== null) {
      ensureData();
    }
  }, [forceActive, selectedCode]);

  useEffect(() => {
    return () => {
      clearDebounce();
      disposePatch(livePatchRef.current);
      disposePatch(fadingPatchRef.current);
      livePatchRef.current = null;
      fadingPatchRef.current = null;
    };
  }, []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const spinGroup = spinGroupRef.current;
    const group = groupRef.current;
    if (!controls || !spinGroup || !group) return;

    const inputs = inputsRef.current;
    const distance = controls.getDistance();
    // Selection must NOT force close-up: at overview distance the patch spans
    // ~half Earth as a low-poly unlit mesh and corrupts globe lighting/texture.
    // Highlight stays on the main equirect canvas; close-up only for zoom / place-focus.
    const wantActive =
      inputs.forceActive ||
      (!inputs.focusOnly && distance <= GLOBE_CLOSEUP_ACTIVATE_DISTANCE);

    if (activeRef.current) {
      const keep =
        inputs.forceActive ||
        (!inputs.focusOnly && distance < GLOBE_CLOSEUP_DEACTIVATE_DISTANCE);
      if (!keep) {
        activeRef.current = false;
        clearDebounce();
        if (fadingPatchRef.current) {
          disposePatch(fadingPatchRef.current);
          fadingPatchRef.current = null;
        }
        if (livePatchRef.current) {
          fadingPatchRef.current = livePatchRef.current;
          livePatchRef.current = null;
        }
      }
    } else if (wantActive) {
      activeRef.current = true;
      ensureData();
    }

    const fadeStep = FADE_SPEED * delta;
    if (livePatchRef.current) {
      const mat = livePatchRef.current.material;
      mat.opacity = Math.min(1, mat.opacity + fadeStep);
      updateGoldDetailBlend(mat, distance);
    }
    if (fadingPatchRef.current) {
      const mat = fadingPatchRef.current.material;
      mat.opacity = Math.max(0, mat.opacity - fadeStep);
      updateGoldDetailBlend(mat, distance);
      if (mat.opacity <= 0.001) {
        disposePatch(fadingPatchRef.current);
        fadingPatchRef.current = null;
      }
    }

    if (!activeRef.current) {
      if (livePatchRef.current || fadingPatchRef.current) invalidate();
      return;
    }

    if (!dataRef.current) return;

    localCameraRef.current.copy(controls.object.position);
    spinGroup.worldToLocal(localCameraRef.current);
    lookDirRef.current.copy(localCameraRef.current).normalize();

    const aspect = size.width / Math.max(size.height, 1);
    const nextWindow = resolveCloseupWindow(lookDirRef.current, distance, {
      fovDeg: 45,
      aspect,
    });

    const live = livePatchRef.current;
    const key = paintKeyOf(inputs);
    const needsPaint =
      !live ||
      live.paintKey !== key ||
      closeupWindowNeedsRebuild(live.window, nextWindow);

    if (needsPaint) {
      scheduleRebuild(nextWindow, key);
    }

    if (livePatchRef.current || fadingPatchRef.current) {
      invalidate();
    }
  });

  return <group ref={groupRef} />;
}
