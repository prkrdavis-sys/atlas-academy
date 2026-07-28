"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  buildRingFillGeometry,
  buildRingLineGeometry,
  disposeObject3D,
  GLOBE_DETAIL_ACTIVATE_DISTANCE,
  indexDetailCountries,
  loadGlobeDetailData,
  resolveDetailFillColor,
  selectDetailOverlays,
  type DetailOverlayCandidate,
} from "@/lib/globe-detail";
import {
  GLOBE_DETAIL_MAX_OVERLAYS_BY_TIER,
  isGlobeDetailFocusOnly,
  type GlobePerfTier,
} from "@/lib/globe-performance";
import type { MapProgressDifficulty, Profile } from "@/lib/types";

type GlobeDetailOverlaysProps = {
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  isDark: boolean;
  selectedCode: string | null;
  /** When true, force overlays on even before the camera finishes zooming in. */
  forceActive?: boolean;
  perfTier?: GlobePerfTier;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  spinGroupRef: RefObject<THREE.Group | null>;
};

function applyActiveCodes(
  nextCodes: string[],
  activeCodesRef: RefObject<string[]>,
  setActiveCodes: (codes: string[]) => void,
) {
  const prev = activeCodesRef.current;
  const same =
    nextCodes.length === prev.length && nextCodes.every((code, index) => code === prev[index]);
  if (same) return;
  activeCodesRef.current = nextCodes;
  setActiveCodes(nextCodes);
}

/**
 * High-detail vector country fills drawn on the sphere when the camera is close
 * (or a place is focused). Complements the low-res equirectangular texture so
 * microstates and small islands stay recognizable without raising GPU texture size.
 */
export function GlobeDetailOverlays({
  profile,
  difficulty,
  isDark,
  selectedCode,
  forceActive = false,
  perfTier = "desktop",
  controlsRef,
  spinGroupRef,
}: GlobeDetailOverlaysProps) {
  const groupRef = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const [candidates, setCandidates] = useState<DetailOverlayCandidate[] | null>(null);
  const [activeCodes, setActiveCodes] = useState<string[]>([]);
  const loadStartedRef = useRef(false);
  const activeCodesRef = useRef<string[]>([]);
  const lookDirRef = useRef(new THREE.Vector3());
  const localCameraRef = useRef(new THREE.Vector3());
  const maxOverlays = GLOBE_DETAIL_MAX_OVERLAYS_BY_TIER[perfTier];
  const focusOnly = isGlobeDetailFocusOnly(perfTier);

  // Kick off lazy load once we need detail (close zoom or place focus).
  useEffect(() => {
    const shouldLoad = forceActive || selectedCode !== null;
    if (!shouldLoad && !loadStartedRef.current) return;
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;
    let cancelled = false;
    void loadGlobeDetailData().then((data) => {
      if (cancelled) return;
      setCandidates(indexDetailCountries(data));
    });
    return () => {
      cancelled = true;
    };
  }, [forceActive, selectedCode]);

  /**
   * Place-focus / selection must work even when the Canvas frameloop is paused
   * (background tab). Seed overlays from the selected place's centroid.
   */
  useEffect(() => {
    if (!candidates) return;
    if (!forceActive && selectedCode === null) return;

    const anchor =
      (selectedCode ? candidates.find((entry) => entry.code === selectedCode) : null) ??
      candidates[0];
    if (!anchor) return;

    const selected = selectDetailOverlays(
      candidates,
      anchor.centroid,
      selectedCode,
      maxOverlays,
    );
    applyActiveCodes(
      selected.map((entry) => entry.code),
      activeCodesRef,
      setActiveCodes,
    );
  }, [candidates, forceActive, selectedCode, maxOverlays]);

  useFrame(() => {
    const controls = controlsRef.current;
    const spinGroup = spinGroupRef.current;
    if (!controls || !spinGroup) return;

    const distance = controls.getDistance();
    // Phones: detail overlays only for place-focus / selection, not free zoom.
    const active =
      forceActive ||
      selectedCode !== null ||
      (!focusOnly && distance < GLOBE_DETAIL_ACTIVATE_DISTANCE);

    if (!active) {
      if (activeCodesRef.current.length > 0) {
        applyActiveCodes([], activeCodesRef, setActiveCodes);
      }
      return;
    }

    if (!loadStartedRef.current) {
      loadStartedRef.current = true;
      void loadGlobeDetailData().then((data) => {
        setCandidates(indexDetailCountries(data));
      });
    }

    if (!candidates) return;

    // Front-of-globe direction in mesh-local space = local camera position
    // from the globe origin (not camera→center, which points at the far side).
    localCameraRef.current.copy(controls.object.position);
    spinGroup.worldToLocal(localCameraRef.current);
    lookDirRef.current.copy(localCameraRef.current).normalize();

    const selected = selectDetailOverlays(
      candidates,
      lookDirRef.current,
      selectedCode,
      maxOverlays,
    );
    applyActiveCodes(
      selected.map((entry) => entry.code),
      activeCodesRef,
      setActiveCodes,
    );
  });

  const overlayShapes = useMemo(() => {
    if (!candidates || activeCodes.length === 0) return [];
    const byCode = new Map(candidates.map((entry) => [entry.code, entry]));
    return activeCodes
      .map((code) => byCode.get(code))
      .filter((entry): entry is DetailOverlayCandidate => entry !== undefined);
  }, [candidates, activeCodes]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      disposeObject3D(child);
    }

    for (const shape of overlayShapes) {
      const colors = resolveDetailFillColor(shape.code, profile, {
        difficulty,
        isDark,
        selectedCode,
      });

      const countryGroup = new THREE.Group();
      countryGroup.name = `detail-${shape.code}`;

      for (const ring of shape.rings) {
        const fillGeometry = buildRingFillGeometry(ring);
        if (fillGeometry) {
          const fillMaterial = new THREE.MeshBasicMaterial({
            color: colors.fill,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
            toneMapped: false,
          });
          const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
          fillMesh.renderOrder = 10;
          fillMesh.raycast = () => {};
          countryGroup.add(fillMesh);
        }

        const lineGeometry = buildRingLineGeometry(ring);
        if (lineGeometry) {
          const lineMaterial = new THREE.LineBasicMaterial({
            color: colors.stroke,
            depthTest: false,
            depthWrite: false,
            toneMapped: false,
          });
          const line = new THREE.LineLoop(lineGeometry, lineMaterial);
          line.renderOrder = 11;
          line.raycast = () => {};
          countryGroup.add(line);
        }
      }

      group.add(countryGroup);
    }

    invalidate();

    return () => {
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        disposeObject3D(child);
      }
    };
  }, [overlayShapes, profile, difficulty, isDark, selectedCode, invalidate]);

  return <group ref={groupRef} />;
}
