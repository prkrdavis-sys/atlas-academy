"use client";

import { useEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  GLOBE_TAP_TRAVEL_THRESHOLD,
  tryReleasePointerCapture,
  trySetPointerCapture,
} from "@/components/globe/globe-scene";
import { orbitCameraToKeepGrab, pointerGlobeUnit } from "@/lib/globe-grab";

type GlobeGrabOrbitProps = {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  /** Globe mesh radius (unit sphere). */
  radius?: number;
  onGrabStart?: () => void;
};

/**
 * Finger/cursor stick grab: the surface point under the pointer stays under it
 * while dragging. Pair with OrbitControls `enableRotate={false}` — zoom/dolly
 * still work; this drives orbit from raycasts instead of pixel-scaled rotateSpeed.
 */
export function GlobeGrabOrbit({
  controlsRef,
  radius = 1,
  onGrabStart,
}: GlobeGrabOrbitProps) {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const grabUnit = new THREE.Vector3();
    const lastPointerUnit = new THREE.Vector3();
    const probeUnit = new THREE.Vector3();
    let pointerId: number | null = null;
    let activePointers = 0;
    /** Pointer went down on the globe but hasn't moved enough to count as a drag. */
    let pendingGrab = false;
    /** Latched on first ray miss — avoids trackball re-entry at the limb. */
    let screenDragOnly = false;
    let startClientX = 0;
    let startClientY = 0;
    let windowListenersAttached = false;

    const detachWindowListeners = () => {
      if (!windowListenersAttached) return;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      windowListenersAttached = false;
    };

    const resetPointerSession = () => {
      detachWindowListeners();
      if (pointerId !== null) {
        tryReleasePointerCapture(el, pointerId);
      }
      pointerId = null;
      pendingGrab = false;
      screenDragOnly = false;
    };

    const activateGrab = (controls: OrbitControlsImpl) => {
      if (pointerId === null) return;
      pendingGrab = false;
      trySetPointerCapture(el, pointerId);
      controls.autoRotate = false;
      onGrabStart?.();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const controls = controlsRef.current;
      if (!controls || !controls.enabled) return;

      const camera = controls.object;
      if (!(camera instanceof THREE.PerspectiveCamera)) return;

      if (pendingGrab) {
        const travel =
          Math.abs(event.clientX - startClientX) + Math.abs(event.clientY - startClientY);
        if (travel < GLOBE_TAP_TRAVEL_THRESHOLD) return;
        activateGrab(controls);
      }

      const rect = el.getBoundingClientRect();
      if (
        !screenDragOnly &&
        pointerGlobeUnit(
          event.clientX,
          event.clientY,
          rect,
          camera,
          controls.target,
          radius,
          probeUnit,
        ) !== "hit"
      ) {
        screenDragOnly = true;
      }
      orbitCameraToKeepGrab(
        camera,
        controls.target,
        grabUnit,
        lastPointerUnit,
        event.clientX,
        event.clientY,
        rect,
        radius,
        controls.minPolarAngle,
        controls.maxPolarAngle,
        screenDragOnly,
      );
      controls.update();
      invalidate();
    };

    const onPointerUp = (event: PointerEvent) => {
      activePointers = Math.max(0, activePointers - 1);
      if (pointerId !== null && event.pointerId === pointerId) {
        resetPointerSession();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      activePointers += 1;
      // Second finger is pinch-zoom — don't fight OrbitControls dolly.
      if (activePointers > 1) {
        resetPointerSession();
        return;
      }
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const controls = controlsRef.current;
      if (!controls || !controls.enabled) return;

      const camera = controls.object;
      if (!(camera instanceof THREE.PerspectiveCamera)) return;

      const rect = el.getBoundingClientRect();
      if (
        pointerGlobeUnit(
          event.clientX,
          event.clientY,
          rect,
          camera,
          controls.target,
          radius,
          grabUnit,
        ) !== "hit"
      ) {
        return;
      }

      pointerId = event.pointerId;
      pendingGrab = true;
      screenDragOnly = false;
      startClientX = event.clientX;
      startClientY = event.clientY;
      lastPointerUnit.copy(grabUnit);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
      windowListenersAttached = true;
      invalidate();
    };

    el.addEventListener("pointerdown", onPointerDown);

    return () => {
      resetPointerSession();
      el.removeEventListener("pointerdown", onPointerDown);
    };
  }, [controlsRef, gl, invalidate, onGrabStart, radius]);

  return null;
}
