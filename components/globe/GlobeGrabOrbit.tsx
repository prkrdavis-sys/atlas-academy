"use client";

import { useEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
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
    let pointerId: number | null = null;
    let activePointers = 0;
    let lastClientX = 0;
    let lastClientY = 0;
    let windowListenersAttached = false;

    const detachWindowListeners = () => {
      if (!windowListenersAttached) return;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      windowListenersAttached = false;
    };

    const endGrab = () => {
      detachWindowListeners();
      if (pointerId !== null) {
        tryReleasePointerCapture(el, pointerId);
      }
      pointerId = null;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const controls = controlsRef.current;
      if (!controls || !controls.enabled) return;

      const camera = controls.object;
      if (!(camera instanceof THREE.PerspectiveCamera)) return;

      const deltaX = event.clientX - lastClientX;
      const deltaY = event.clientY - lastClientY;
      lastClientX = event.clientX;
      lastClientY = event.clientY;

      const rect = el.getBoundingClientRect();
      orbitCameraToKeepGrab(
        camera,
        controls.target,
        grabUnit,
        event.clientX,
        event.clientY,
        rect,
        radius,
        controls.minPolarAngle,
        controls.maxPolarAngle,
        deltaX,
        deltaY,
      );
      // Re-sync OrbitControls' internal spherical from the new camera pose.
      controls.update();
      invalidate();
    };

    const onPointerUp = (event: PointerEvent) => {
      activePointers = Math.max(0, activePointers - 1);
      if (pointerId !== null && event.pointerId === pointerId) {
        endGrab();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      activePointers += 1;
      // Second finger is pinch-zoom — don't fight OrbitControls dolly.
      if (activePointers > 1) {
        endGrab();
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
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      trySetPointerCapture(el, event.pointerId);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
      windowListenersAttached = true;
      // Kill auto-spin immediately — waiting on React state would let a frame
      // of autoRotate fight the grab in controls.update().
      controls.autoRotate = false;
      onGrabStart?.();
      invalidate();
    };

    el.addEventListener("pointerdown", onPointerDown);

    return () => {
      endGrab();
      el.removeEventListener("pointerdown", onPointerDown);
    };
  }, [controlsRef, gl, invalidate, onGrabStart, radius]);

  return null;
}
