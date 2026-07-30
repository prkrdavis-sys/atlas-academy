"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
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
import type { GlobeUsMode } from "@/lib/globe-texture";
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
  geometry: THREE.BufferGeometry;
  material: THREE.MeshBasicMaterial;
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
};

function paintKeyOf(inputs: PaintInputs): string {
  return [
    inputs.profile?.id ?? "anon",
    inputs.difficulty,
    inputs.usMode,
    inputs.isDark ? "d" : "l",
    inputs.selectedCode ?? "",
    inputs.textureWidth,
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

  const inputsRef = useRef<PaintInputs>({
    profile,
    difficulty,
    usMode,
    isDark,
    selectedCode,
    textureWidth: GLOBE_CLOSEUP_TEXTURE_WIDTH_BY_TIER[perfTier],
    forceActive,
    focusOnly: isGlobeCloseupFocusOnly(perfTier),
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

    const canvas = paintGlobeCloseupRegion(data, inputs.profile, window, {
      difficulty: inputs.difficulty,
      usMode: inputs.usMode,
      isDark: inputs.isDark,
      selectedCode: inputs.selectedCode,
      textureWidth: inputs.textureWidth,
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;

    const geometry = buildCloseupPatchGeometry(window);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 5;
    mesh.raycast = () => {};

    return {
      mesh,
      texture,
      geometry,
      material,
      window,
      paintKey: paintKeyOf(inputs),
    };
  };

  const commitPatch = (window: CloseupWindow) => {
    const next = buildPatch(window);
    if (!next) return;

    if (fadingPatchRef.current) {
      disposePatch(fadingPatchRef.current);
      fadingPatchRef.current = null;
    }
    if (livePatchRef.current) {
      fadingPatchRef.current = livePatchRef.current;
    }

    livePatchRef.current = next;
    groupRef.current?.add(next.mesh);
    invalidate();
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
    const gen = ++paintGenRef.current;
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (gen !== paintGenRef.current) return;
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
    }
    if (fadingPatchRef.current) {
      const mat = fadingPatchRef.current.material;
      mat.opacity = Math.max(0, mat.opacity - fadeStep);
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
