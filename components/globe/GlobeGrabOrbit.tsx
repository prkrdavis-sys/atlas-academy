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
  /** Cancel settle animations and re-enable controls without treating as a drag. */
  onPointerDownOnGlobe?: () => void;
  /** Short press release without enough travel to count as a drag. */
  onTap?: (clientX: number, clientY: number) => void;
};

/**
 * Unified globe pointer handler: tap-to-select vs drag-to-orbit, including
 * off-disc screen tracking for the rest of a drag.
 */
export function GlobeGrabOrbit({
  controlsRef,
  radius = 1,
  onGrabStart,
  onPointerDownOnGlobe,
  onTap,
}: GlobeGrabOrbitProps) {
  const { camera, gl, invalidate, raycaster, scene } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const grabUnit = new THREE.Vector3();
    const lastPointerUnit = new THREE.Vector3();
    const probeUnit = new THREE.Vector3();
    let pointerId: number | null = null;
    const pressedPointers = new Set<number>();
    let pendingGrab = false;
    let dragActivated = false;
    let screenDragOnly = false;
    let startClientX = 0;
    let startClientY = 0;
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

    const attachWindowListeners = () => {
      detachWindowListeners();
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
      windowListenersAttached = true;
    };

    const resetPointerSession = () => {
      detachWindowListeners();
      if (pointerId !== null) {
        tryReleasePointerCapture(el, pointerId);
      }
      pointerId = null;
      pendingGrab = false;
      dragActivated = false;
      screenDragOnly = false;
    };

    const healStalePointerState = () => {
      if (pointerId === null) {
        pressedPointers.clear();
      }
    };

    const activateGrab = (controls: OrbitControlsImpl) => {
      if (pointerId === null || dragActivated) return;
      dragActivated = true;
      pendingGrab = false;
      lastClientX = startClientX;
      lastClientY = startClientY;
      trySetPointerCapture(el, pointerId);
      controls.autoRotate = false;
      onGrabStart?.();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const controls = controlsRef.current;
      if (!controls) return;
      controls.enabled = true;

      const camera = controls.object;
      if (!(camera instanceof THREE.PerspectiveCamera)) return;

      if (pendingGrab) {
        const travel =
          Math.abs(event.clientX - startClientX) + Math.abs(event.clientY - startClientY);
        if (travel < GLOBE_TAP_TRAVEL_THRESHOLD) return;
        activateGrab(controls);
      }

      const deltaX = event.clientX - lastClientX;
      const deltaY = event.clientY - lastClientY;
      lastClientX = event.clientX;
      lastClientY = event.clientY;

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
        deltaX,
        deltaY,
      );
      controls.update();
      invalidate();
    };

    const onPointerUp = (event: PointerEvent) => {
      pressedPointers.delete(event.pointerId);
      if (pointerId === null || event.pointerId !== pointerId) return;

      if (!dragActivated) {
        onTap?.(event.clientX, event.clientY);
      }
      resetPointerSession();
    };

    const pointerHitsUfo = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return raycaster
        .intersectObjects(scene.children, true)
        .some((intersection) => intersection.object.userData.ufoInteractive === true);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      // A flyby can sit in front of the planet. Let its R3F handler own the
      // tap so the globe does not also select the country behind it.
      if (pointerHitsUfo(event.clientX, event.clientY)) return;

      healStalePointerState();
      pressedPointers.add(event.pointerId);

      if (pressedPointers.size > 1) {
        resetPointerSession();
        return;
      }

      const controls = controlsRef.current;
      if (!controls) return;
      controls.enabled = true;

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

      resetPointerSession();
      pressedPointers.add(event.pointerId);

      pointerId = event.pointerId;
      pendingGrab = true;
      dragActivated = false;
      screenDragOnly = false;
      startClientX = event.clientX;
      startClientY = event.clientY;
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      lastPointerUnit.copy(grabUnit);
      attachWindowListeners();
      onPointerDownOnGlobe?.();
      invalidate();
    };

    const onLostPointerCapture = (event: PointerEvent) => {
      if (pointerId === event.pointerId) {
        resetPointerSession();
      }
    };

    const onWindowBlur = () => {
      resetPointerSession();
      pressedPointers.clear();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        resetPointerSession();
        pressedPointers.clear();
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("lostpointercapture", onLostPointerCapture);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      resetPointerSession();
      pressedPointers.clear();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("lostpointercapture", onLostPointerCapture);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [
    camera,
    controlsRef,
    gl,
    invalidate,
    onGrabStart,
    onPointerDownOnGlobe,
    onTap,
    radius,
    raycaster,
    scene,
  ]);

  return null;
}
