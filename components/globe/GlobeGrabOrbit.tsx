"use client";

import { useEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
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

    const endGrab = () => {
      if (pointerId !== null) {
        try {
          el.releasePointerCapture(pointerId);
        } catch {
          // Capture may already be released.
        }
      }
      pointerId = null;
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

      const rect = el.getBoundingClientRect();
      if (
        !pointerGlobeUnit(
          event.clientX,
          event.clientY,
          rect,
          controls.object,
          controls.target,
          radius,
          grabUnit,
          false,
        )
      ) {
        return;
      }

      pointerId = event.pointerId;
      el.setPointerCapture(event.pointerId);
      // Kill auto-spin immediately — waiting on React state would let a frame
      // of autoRotate fight the grab in controls.update().
      controls.autoRotate = false;
      onGrabStart?.();
      invalidate();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const controls = controlsRef.current;
      if (!controls || !controls.enabled) return;

      const rect = el.getBoundingClientRect();
      orbitCameraToKeepGrab(
        controls.object,
        controls.target,
        grabUnit,
        event.clientX,
        event.clientY,
        rect,
        radius,
        controls.minPolarAngle,
        controls.maxPolarAngle,
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

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    return () => {
      endGrab();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [controlsRef, gl, invalidate, onGrabStart, radius]);

  return null;
}
