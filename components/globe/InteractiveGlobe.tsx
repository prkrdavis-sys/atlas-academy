"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  GLOBE_IDLE_RESET_MS,
  GLOBE_ROTATION_SPEED,
  getGlobeCanvasGlSettings,
  getGlobeStarCount,
  GlobeAssetPreloader,
  GlobeContextRecovery,
  GlobeFillLights,
  globeFillDistance,
  GlobeInitialInvalidate,
  GlobeMetalReflection,
  GlobePlanet,
  GlobeRecoveryReset,
  useGlobeCanvasKey,
  useGlobeFrameloop,
  useGlobeSceneEnvironment,
} from "@/components/globe/globe-scene";
import { GlobeCloseupLayer } from "@/components/globe/GlobeCloseupLayer";
import { GlobeGrabOrbit } from "@/components/globe/GlobeGrabOrbit";
import { SpaceBackdrop, StaticStarfield } from "@/components/globe/SpaceBackdrop";
import { SpaceFlybys } from "@/components/globe/SpaceFlybys";
import { ProgressMapContainer } from "@/components/ProgressMapOverlays";
import { orbitCameraByScreenDelta } from "@/lib/globe-grab";
import { pickGlobePlaceAtClient } from "@/lib/globe-picking";
import {
  GLOBE_DEFAULT_POLAR,
  GLOBE_MESH_Y_ROTATION,
  PLACE_FOCUS_MAX_DISTANCE,
  PLACE_FOCUS_MIN_DISTANCE,
  getGlobeFocusTarget,
  lerpAngle,
  type GlobeFocusTarget,
} from "@/lib/globe-focus";
import type { GlobeUsMode } from "@/lib/globe-texture";
import type { GlobePerfTier } from "@/lib/globe-performance";
import { isStateCode } from "@/lib/scope";
import type { MapProgressDifficulty, Profile } from "@/lib/types";
import { useGlobeDayNight } from "@/lib/use-globe-day-night";
import { useIsDark } from "@/lib/use-is-dark";
import { useShowMapProgress } from "@/lib/use-show-map-progress";
import { cn } from "@/lib/utils";

/** Floor matches place-focus so microstate zooms aren't yanked back out. */
const MIN_CAMERA_DISTANCE = PLACE_FOCUS_MIN_DISTANCE;
const MAX_CAMERA_DISTANCE = PLACE_FOCUS_MAX_DISTANCE;
/** Start fully zoomed out so the whole planet + atmosphere fit with margin. */
const INITIAL_CAMERA_DISTANCE = MAX_CAMERA_DISTANCE;
/**
 * Subtle resting distance after the map-tab intro zoom. Close enough to read as
 * a gentle push-in, far enough that the whole planet still feels spacious.
 */
const CINEMATIC_REST_DISTANCE = 3.25;
/** Seconds for the open-tab camera ease from {@link INITIAL_CAMERA_DISTANCE}. */
const CINEMATIC_ZOOM_DURATION_S = 3.2;
/** Seconds to spin and zoom toward a linked place from the library. */
const PLACE_FOCUS_DURATION_S = 2.8;
/** Seconds to ease the camera home after the reset button. */
const RESET_HOME_DURATION_S = 1.8;
/** Damping for idle polar-angle leveling before auto-spin resumes. */
const IDLE_POLAR_RETURN_DAMP = 2.4;
/**
 * Altitude multiplier for one zoom button press. Applied to height above the
 * unit sphere (not center-distance) so close-in steps stay readable.
 */
const ZOOM_BUTTON_FACTOR = 0.75;
/** Unit sphere radius for the map globe mesh. */
const GLOBE_RADIUS = 1;
/**
 * OrbitControls base zoomSpeed — interpreted as the per-notch altitude scale
 * (`0.95 ** speed`), then remapped onto center-distance so near-surface zoom
 * does not slam into the min-distance floor.
 */
const BASE_ZOOM_SPEED = 0.7;
/** Typical mouse-wheel notch → OrbitControls normalizedDelta (|deltaY| * 0.01). */
const WHEEL_NOTCH_NORMALIZED_DELTA = 1;

/** Extra zoom-out required before shooting stars return (avoids edge flicker). */
const SPACE_VISIBLE_HYSTERESIS = 1.06;
/** Float slack when deciding the orbit camera is already at a zoom stop. */
const ZOOM_LIMIT_EPSILON = 1e-3;

/** Hard ceiling for the responsive rest distance on very narrow viewports. */
const ABSOLUTE_MAX_CAMERA_DISTANCE = 8;
/** Fraction of the vertical FOV the resting globe may fill. */
const GLOBE_FIT_VERTICAL = 0.72;
/** Fraction of the horizontal FOV the resting globe may fill (phones). */
const GLOBE_FIT_HORIZONTAL = 0.78;
/**
 * Compositional raise above the center of the *visible* band below the app
 * header (fraction of canvas height). Constant across home/map modes so mode
 * changes never move the planet. The canvas is full-bleed under the header, so
 * {@link GlobeFraming} subtracts half the header height before applying this.
 */
const GLOBE_RAISE_VIEWPORT_FRACTION = 0.02;

/** Fallback when `--app-header-offset` cannot be measured (matches globals.css). */
const APP_HEADER_OFFSET_FALLBACK_PX = 56;

/** Resolved `--app-header-offset` in CSS pixels (canvas is fixed under the header). */
function readAppHeaderOffsetPx(): number {
  if (typeof document === "undefined") return APP_HEADER_OFFSET_FALLBACK_PX;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;height:var(--app-header-offset)";
  document.documentElement.appendChild(probe);
  const px = probe.offsetHeight;
  probe.remove();
  return px > 0 ? px : APP_HEADER_OFFSET_FALLBACK_PX;
}

/**
 * Resting camera distance that fits the globe within the viewport on any
 * aspect ratio. Home and map share this framing so the planet stays perfectly
 * still while the page UI slides between the two modes.
 */
function getGlobeRestDistance(aspect: number, fovDeg: number): number {
  const verticalHalf = THREE.MathUtils.degToRad(fovDeg / 2);
  const horizontalHalf = Math.atan(Math.tan(verticalHalf) * Math.max(aspect, 0.05));
  const maxAngularRadius = Math.min(
    GLOBE_FIT_VERTICAL * verticalHalf,
    GLOBE_FIT_HORIZONTAL * horizontalHalf,
  );
  const distance =
    GLOBE_RADIUS / Math.sin(THREE.MathUtils.clamp(maxAngularRadius, 0.01, Math.PI / 2 - 0.01));
  return THREE.MathUtils.clamp(distance, CINEMATIC_REST_DISTANCE, ABSOLUTE_MAX_CAMERA_DISTANCE);
}

/**
 * Keeps the shared framing in sync with the viewport: responsive rest
 * distance, a raised projection offset, and (once, before the first frame) a
 * start distance for the intro zoom that always eases inward.
 */
function GlobeFraming({
  restDistanceRef,
  onMaxDistanceChange,
}: {
  restDistanceRef: RefObject<number>;
  onMaxDistanceChange: (maxDistance: number) => void;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const initializedRef = useRef(false);

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const rest = getGlobeRestDistance(size.width / Math.max(size.height, 1), camera.fov);
    restDistanceRef.current = rest;
    onMaxDistanceChange(Math.max(MAX_CAMERA_DISTANCE, rest));

    if (!initializedRef.current) {
      initializedRef.current = true;
      // Start the intro slightly beyond rest so the open always zooms in.
      const start = Math.min(Math.max(INITIAL_CAMERA_DISTANCE, rest * 1.25), ABSOLUTE_MAX_CAMERA_DISTANCE);
      if (camera.position.lengthSq() > 1e-6) camera.position.setLength(start);
    }

    // Positive offsetY raises the planet. Bias down by half the header so the
    // sphere + atmosphere sit in the visible band instead of under the chrome.
    const offsetY =
      size.height * GLOBE_RAISE_VIEWPORT_FRACTION - readAppHeaderOffsetPx() * 0.5;
    camera.setViewOffset(size.width, size.height, 0, offsetY, size.width, size.height);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size, restDistanceRef, onMaxDistanceChange, invalidate]);

  return null;
}

/**
 * Remap OrbitControls.zoomSpeed so each wheel/pinch step multiplies *altitude*
 * (distance above the unit sphere) instead of distance from the globe center.
 */
function altitudeAwareZoomSpeed(
  distance: number,
  baseZoomSpeed = BASE_ZOOM_SPEED,
): number {
  const altitude = Math.max(distance - GLOBE_RADIUS, 1e-6);
  const altitudeFactor = Math.pow(
    0.95,
    baseZoomSpeed * WHEEL_NOTCH_NORMALIZED_DELTA,
  );
  const distanceFactor =
    (GLOBE_RADIUS + altitude * altitudeFactor) / Math.max(distance, 1e-6);
  // Float noise near the surface can push the factor to ~1; treat as no zoom.
  if (distanceFactor >= 1 - 1e-9) return 0;
  return (
    Math.log(distanceFactor) /
    (Math.log(0.95) * WHEEL_NOTCH_NORMALIZED_DELTA)
  );
}

/** Zoom by scaling height above the globe surface, then clamp to orbit limits. */
function zoomDistanceByAltitudeFactor(
  distance: number,
  factor: number,
  maxDistance = MAX_CAMERA_DISTANCE,
): number {
  const minAltitude = MIN_CAMERA_DISTANCE - GLOBE_RADIUS;
  const altitude = Math.max(distance - GLOBE_RADIUS, minAltitude);
  return THREE.MathUtils.clamp(
    GLOBE_RADIUS + altitude * factor,
    MIN_CAMERA_DISTANCE,
    maxDistance,
  );
}

/**
 * Keeps OrbitControls.zoomSpeed matched to current altitude so close-in wheel
 * and pinch zoom stay proportional to what is on screen.
 */
function AltitudeAwareZoomSpeed({
  controlsRef,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.zoomSpeed = altitudeAwareZoomSpeed(controls.getDistance());
  });

  return null;
}

/**
 * On desktop, once wheel-zoom hits min/max distance, stop OrbitControls from
 * swallowing the event so the page can scroll instead of trapping the user.
 */
function WheelZoomPageScrollHandoff({
  controlsRef,
  minDistance,
  maxDistance,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  minDistance: number;
  maxDistance: number;
}) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    const finePointer = window.matchMedia("(pointer: fine)");

    const onWheel = (event: WheelEvent) => {
      if (!finePointer.matches || event.deltaY === 0) return;

      const controls = controlsRef.current;
      if (!controls?.enabled || !controls.enableZoom) return;

      const distance = controls.getDistance();
      const atMaxOut = distance >= maxDistance - ZOOM_LIMIT_EPSILON;
      const atMaxIn = distance <= minDistance + ZOOM_LIMIT_EPSILON;
      // OrbitControls: positive deltaY dollies out (zoom out).
      const wantsOut = event.deltaY > 0;
      const wantsIn = event.deltaY < 0;

      if ((wantsOut && atMaxOut) || (wantsIn && atMaxIn)) {
        // Block OrbitControls' wheel handler so it can't preventDefault.
        event.stopImmediatePropagation();
      }
    };

    el.addEventListener("wheel", onWheel, { capture: true, passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [gl, controlsRef, minDistance, maxDistance]);

  return null;
}

/**
 * Reports when the orbit camera is still far enough that outer space shows in
 * the viewport corners. Used to gate CSS shooting stars over the canvas.
 */
function SyncOuterSpaceVisible({
  controlsRef,
  onChange,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  onChange: (visible: boolean) => void;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const visibleRef = useRef(true);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls || !(camera instanceof THREE.PerspectiveCamera)) return;

    const fillAt = globeFillDistance(
      camera.fov,
      size.width / Math.max(size.height, 1),
      GLOBE_RADIUS,
    );
    const distance = controls.getDistance();
    const next = visibleRef.current
      ? distance > fillAt
      : distance > fillAt * SPACE_VISIBLE_HYSTERESIS;

    if (next === visibleRef.current) return;
    visibleRef.current = next;
    onChange(next);
  });

  return null;
}

/**
 * On map-tab open: ease the camera in from the default wide framing to a
 * slightly closer rest distance. Skipped for reduced motion; cancelled as soon
 * as the player orbits or zooms so it never fights their input.
 */
function CinematicIntroZoom({
  controlsRef,
  restDistanceRef,
  enabled,
  cancelled,
  onComplete,
  onActivity,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  restDistanceRef: RefObject<number>;
  enabled: boolean;
  cancelled: boolean;
  onComplete: () => void;
  onActivity?: () => void;
}) {
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const startDistanceRef = useRef<number | null>(null);
  const offsetRef = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (finishedRef.current) return;
    if (cancelled) {
      finishedRef.current = true;
      onComplete();
      return;
    }
    const controls = controlsRef.current;
    if (!controls) return;

    if (!enabled) {
      // Reduced motion: land on the rest framing immediately.
      const camera = controls.object;
      const offset = offsetRef.current;
      offset.copy(camera.position).sub(controls.target);
      offset.setLength(restDistanceRef.current);
      camera.position.copy(controls.target).add(offset);
      controls.saveState();
      finishedRef.current = true;
      onComplete();
      return;
    }

    onActivity?.();
    elapsedRef.current += delta;
    if (startDistanceRef.current === null) {
      startDistanceRef.current = controls.getDistance();
    }
    const t = Math.min(1, elapsedRef.current / CINEMATIC_ZOOM_DURATION_S);
    // Ease-out cubic: quick enough to notice, soft settle at the end.
    const eased = 1 - (1 - t) ** 3;
    const distance = THREE.MathUtils.lerp(
      startDistanceRef.current,
      restDistanceRef.current,
      eased,
    );

    const camera = controls.object;
    const offset = offsetRef.current;
    offset.copy(camera.position).sub(controls.target);
    offset.setLength(distance);
    camera.position.copy(controls.target).add(offset);

    if (t >= 1) {
      finishedRef.current = true;
      // Reset view lands on the cinematic rest framing, not the wide start.
      controls.saveState();
      onComplete();
    }
  });

  return null;
}

/**
 * Spins the globe toward a linked place, tilts for latitude, and zooms in.
 *
 * Yaw is written on a parent spin group (not the mesh). Mounted after
 * OrbitControls so this default-priority frame runs after controls.update().
 */
function PlaceFocusIntro({
  controlsRef,
  spinGroupRef,
  focusTarget,
  enabled,
  cancelled,
  onComplete,
  onActivity,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  spinGroupRef: RefObject<THREE.Group | null>;
  focusTarget: GlobeFocusTarget;
  enabled: boolean;
  cancelled: boolean;
  onComplete: () => void;
  onActivity?: () => void;
}) {
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const startDistanceRef = useRef<number | null>(null);
  const offsetRef = useRef(new THREE.Vector3());
  const sphericalRef = useRef(new THREE.Spherical());

  useEffect(() => {
    return () => {
      const controls = controlsRef.current;
      if (controls) controls.enabled = true;
    };
  }, [controlsRef]);

  useFrame((_, delta) => {
    if (finishedRef.current) return;
    const controls = controlsRef.current;
    if (!controls) return;

    if (cancelled) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        controls.enabled = true;
        onComplete();
      }
      return;
    }

    onActivity?.();

    if (startDistanceRef.current === null) {
      startDistanceRef.current = controls.getDistance();
    }
    const startDistance = startDistanceRef.current;

    const applyFocus = (progress: number) => {
      const rotationY = lerpAngle(
        GLOBE_MESH_Y_ROTATION,
        focusTarget.meshRotationY,
        progress,
      );
      const spinGroup = spinGroupRef.current;
      if (spinGroup) spinGroup.rotation.set(0, rotationY, 0);

      const offset = offsetRef.current;
      const spherical = sphericalRef.current;
      offset.copy(controls.object.position).sub(controls.target);
      spherical.setFromVector3(offset);
      // Keep the camera on the +Z meridian; the spin group brings the place forward.
      spherical.theta = 0;
      spherical.phi = THREE.MathUtils.lerp(
        GLOBE_DEFAULT_POLAR,
        focusTarget.polarAngle,
        progress,
      );
      spherical.radius = THREE.MathUtils.lerp(
        startDistance,
        focusTarget.cameraDistance,
        progress,
      );
      spherical.makeSafe();
      offset.setFromSpherical(spherical);
      controls.object.position.copy(controls.target).add(offset);
      controls.object.lookAt(controls.target);
    };

    if (!enabled) {
      applyFocus(1);
      finishedRef.current = true;
      controls.enabled = true;
      controls.saveState();
      onComplete();
      return;
    }

    controls.enabled = false;

    elapsedRef.current += delta;
    const t = Math.min(1, elapsedRef.current / PLACE_FOCUS_DURATION_S);
    const eased = 1 - (1 - t) ** 3;
    applyFocus(eased);

    if (t >= 1) {
      finishedRef.current = true;
      controls.enabled = true;
      controls.saveState();
      onComplete();
    }
  });

  return null;
}

type ViewSettleMode = "idle" | "home";

/**
 * Idle: levels the camera polar angle (vertical tilt) in place, then resumes
 * auto-spin from the current longitude / zoom.
 * Home: eases yaw, tilt, zoom, and mesh spin back to the Europe-facing rest pose.
 */
function ViewSettleAnimation({
  controlsRef,
  spinGroupRef,
  restDistanceRef,
  mode,
  reducedMotion,
  onComplete,
  onActivity,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  spinGroupRef: RefObject<THREE.Group | null>;
  restDistanceRef: RefObject<number>;
  mode: ViewSettleMode;
  reducedMotion: boolean;
  onComplete: () => void;
  onActivity?: () => void;
}) {
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const startRef = useRef<{
    theta: number;
    phi: number;
    radius: number;
    spinY: number;
  } | null>(null);
  const offsetRef = useRef(new THREE.Vector3());
  const sphericalRef = useRef(new THREE.Spherical());

  useEffect(() => {
    return () => {
      const controls = controlsRef.current;
      if (controls) controls.enabled = true;
    };
  }, [controlsRef]);

  useFrame((_, delta) => {
    if (finishedRef.current) return;
    const controls = controlsRef.current;
    if (!controls) return;

    const offset = offsetRef.current;
    const spherical = sphericalRef.current;
    offset.copy(controls.object.position).sub(controls.target);
    spherical.setFromVector3(offset);

    if (!startRef.current) {
      startRef.current = {
        theta: spherical.theta,
        phi: spherical.phi,
        radius: spherical.radius,
        spinY: spinGroupRef.current?.rotation.y ?? GLOBE_MESH_Y_ROTATION,
      };
    }

    onActivity?.();

    const finish = () => {
      finishedRef.current = true;
      controls.enabled = true;
      if (mode === "home") controls.saveState();
      onComplete();
    };

    if (mode === "idle") {
      if (reducedMotion) {
        spherical.phi = GLOBE_DEFAULT_POLAR;
        spherical.makeSafe();
        offset.setFromSpherical(spherical);
        controls.object.position.copy(controls.target).add(offset);
        controls.object.lookAt(controls.target);
        controls.update();
        finish();
        return;
      }

      controls.enabled = false;
      spherical.phi = THREE.MathUtils.damp(
        spherical.phi,
        GLOBE_DEFAULT_POLAR,
        IDLE_POLAR_RETURN_DAMP,
        delta,
      );
      if (Math.abs(spherical.phi - GLOBE_DEFAULT_POLAR) <= 0.001) {
        spherical.phi = GLOBE_DEFAULT_POLAR;
      }
      spherical.makeSafe();
      offset.setFromSpherical(spherical);
      controls.object.position.copy(controls.target).add(offset);
      controls.object.lookAt(controls.target);
      controls.update();

      if (spherical.phi === GLOBE_DEFAULT_POLAR) finish();
      return;
    }

    // mode === "home"
    const start = startRef.current;
    const applyHome = (progress: number) => {
      const theta = lerpAngle(start.theta, 0, progress);
      const phi = THREE.MathUtils.lerp(start.phi, GLOBE_DEFAULT_POLAR, progress);
      const radius = THREE.MathUtils.lerp(start.radius, restDistanceRef.current, progress);
      const spinY = lerpAngle(start.spinY, GLOBE_MESH_Y_ROTATION, progress);

      spherical.set(radius, phi, theta);
      spherical.makeSafe();
      offset.setFromSpherical(spherical);
      controls.object.position.copy(controls.target).add(offset);
      controls.object.lookAt(controls.target);

      const spinGroup = spinGroupRef.current;
      if (spinGroup) spinGroup.rotation.set(0, spinY, 0);
    };

    if (reducedMotion) {
      applyHome(1);
      controls.update();
      finish();
      return;
    }

    controls.enabled = false;
    elapsedRef.current += delta;
    const t = Math.min(1, elapsedRef.current / RESET_HOME_DURATION_S);
    const eased = 1 - (1 - t) ** 3;
    applyHome(eased);
    controls.update();

    if (t >= 1) finish();
  });

  return null;
}

/** Keeps demand-mode frameloop alive while OrbitControls damping/autoRotate run. */
function KeepFrameloopAlive({
  controlsRef,
  autoSpin,
  onActivity,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  autoSpin: boolean;
  onActivity: () => void;
}) {
  const invalidate = useThree((state) => state.invalidate);
  useFrame(() => {
    if (autoSpin) {
      onActivity();
      invalidate();
      return;
    }
    const controls = controlsRef.current;
    if (controls?.enableDamping) {
      invalidate();
    }
  });
  return null;
}

type GlobeSceneProps = {
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  usMode: GlobeUsMode;
  isDark: boolean;
  dayNight: boolean;
  selectedCode: string | null;
  perfTier: GlobePerfTier;
  spinGroupRef: RefObject<THREE.Group | null>;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  onPickPlace: (code: string | null) => void;
  onGrabStart?: () => void;
  onPointerDownOnGlobe?: () => void;
};

/** The planet mesh with tap-to-select picking via texture UVs. */
function PickableGlobe({
  profile,
  difficulty,
  usMode,
  isDark,
  dayNight,
  selectedCode,
  perfTier,
  spinGroupRef,
  controlsRef,
  onPickPlace,
  onGrabStart,
  onPointerDownOnGlobe,
}: GlobeSceneProps) {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const globeMeshRef = useRef<THREE.Mesh | null>(null);

  // No declarative rotation on the spin group — R3F prop updates fight place-focus.
  // Seed the default Europe-facing yaw once the group exists.
  useLayoutEffect(() => {
    const group = spinGroupRef.current;
    if (group) group.rotation.set(0, GLOBE_MESH_Y_ROTATION, 0);
  }, [spinGroupRef]);

  const handleTap = useCallback(
    (clientX: number, clientY: number) => {
      const mesh = globeMeshRef.current;
      if (!mesh) return;
      const rect = gl.domElement.getBoundingClientRect();
      const code = pickGlobePlaceAtClient(
        clientX,
        clientY,
        rect,
        camera,
        mesh,
        usMode,
      );
      onPickPlace(code);
    },
    [camera, gl, onPickPlace, usMode],
  );

  return (
    <group ref={spinGroupRef}>
      <GlobePlanet
        profile={profile}
        difficulty={difficulty}
        usMode={usMode}
        isDark={isDark}
        dayNight={dayNight}
        selectedCode={selectedCode}
        perfTier={perfTier}
        controlsRef={controlsRef}
        meshRef={globeMeshRef}
        // Keep the mesh in R3F's interaction list so Canvas onPointerMissed
        // does not fire after GlobeGrabOrbit selects on pointerup (click follows).
        meshProps={{ onClick: () => {} }}
      />
      <GlobeGrabOrbit
        controlsRef={controlsRef}
        onGrabStart={onGrabStart}
        onPointerDownOnGlobe={onPointerDownOnGlobe}
        onTap={handleTap}
      />
      <GlobeCloseupLayer
        profile={profile}
        difficulty={difficulty}
        usMode={usMode}
        isDark={isDark}
        selectedCode={selectedCode}
        perfTier={perfTier}
        controlsRef={controlsRef}
        spinGroupRef={spinGroupRef}
      />
    </group>
  );
}

/**
 * Imperative controls for page chrome that sits above the canvas (the home
 * drag zone and the map pane's floating zoom chips).
 */
export type GlobeHandle = {
  /** Spin the globe by a pointer movement in pixels (any direction). */
  spinByPixels: (deltaX: number, deltaY?: number) => void;
  /** Pause/resume auto-spin while an external drag is in progress. */
  setDragging: (dragging: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
};

export type GlobeExperienceMode = "home" | "map";

type InteractiveGlobeProps = {
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  usMode: GlobeUsMode;
  /**
   * "home": backdrop for the play hero (overlays drive it via the handle).
   * "map": full interactive progress globe with picking + zoom.
   */
  mode: GlobeExperienceMode;
  /** Hidden + frameloop parked while a 2D map view covers the page. */
  active?: boolean;
  selectedCode: string | null;
  /** Place code from ?place= — highlights immediately and triggers fly-to. */
  initialPlaceCode?: string | null;
  onSelectPlace: (code: string | null) => void;
  className?: string;
  handleRef?: RefObject<GlobeHandle | null>;
};

/**
 * The shared full-screen 3D globe behind both the home hero and the map view:
 * outer-space scenery with orbit + zoom camera controls, tap-to-select
 * countries and states (map mode), and gentle auto-spin until the player
 * interacts. It stays mounted (and perfectly still) while the page UI slides
 * between home and map so the planet never reloads or jumps.
 */
export default function InteractiveGlobe({
  profile,
  difficulty,
  usMode,
  mode,
  active = true,
  selectedCode,
  initialPlaceCode = null,
  onSelectPlace,
  className,
  handleRef,
}: InteractiveGlobeProps) {
  const { webglOk, reducedMotion, pageVisible, perfTier } = useGlobeSceneEnvironment();
  const { canvasKey, remountCanvas, resetRecoveryAttempts } = useGlobeCanvasKey();
  const { isDark, ready } = useIsDark();
  const { enabled: dayNight } = useGlobeDayNight();
  const { enabled: showMapProgress } = useShowMapProgress();
  /** Null profile → natural land texture (no mastery fills) on the planet surface. */
  const paintProfile = showMapProgress ? profile : null;
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const spinGroupRef = useRef<THREE.Group | null>(null);
  const idleResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSpin, setAutoSpin] = useState(true);
  const [introCancelled, setIntroCancelled] = useState(false);
  const [focusIntroComplete, setFocusIntroComplete] = useState(false);
  const [cinematicIntroComplete, setCinematicIntroComplete] = useState(false);
  const [settleMode, setSettleMode] = useState<ViewSettleMode | null>(null);
  const [settleKey, setSettleKey] = useState(0);
  /** False once the globe fills the viewport — gates CSS shooting stars. */
  const [outerSpaceVisible, setOuterSpaceVisible] = useState(true);
  const placeFocusTarget = initialPlaceCode ? getGlobeFocusTarget(initialPlaceCode) : null;
  const usePlaceFocus = placeFocusTarget !== null;
  // Parent owns selection (including the initial ?place= highlight). Do not fall
  // back to initialPlaceCode here or ocean/reset clears snap the highlight back.
  const highlightedCode = selectedCode;
  const introRunning = usePlaceFocus
    ? !introCancelled && !focusIntroComplete
    : !introCancelled && !cinematicIntroComplete;
  const settleRunning = settleMode !== null;
  // Park the frameloop entirely while a 2D map view covers the globe.
  const { frameloop, bumpActivity } = useGlobeFrameloop(pageVisible && active, {
    forceAlways:
      (autoSpin && !reducedMotion && !usePlaceFocus) || introRunning || settleRunning,
  });
  const canvasGl = getGlobeCanvasGlSettings(perfTier);
  const starCount = getGlobeStarCount(perfTier);
  /** Responsive rest framing shared by home and map (set by GlobeFraming). */
  const restDistanceRef = useRef(CINEMATIC_REST_DISTANCE);
  const [maxCameraDistance, setMaxCameraDistance] = useState(MAX_CAMERA_DISTANCE);

  const clearIdleResetTimer = useCallback(() => {
    if (idleResetTimerRef.current) {
      clearTimeout(idleResetTimerRef.current);
      idleResetTimerRef.current = null;
    }
  }, []);

  const beginSettle = useCallback(
    (mode: ViewSettleMode) => {
      clearIdleResetTimer();
      setIntroCancelled(true);
      setAutoSpin(false);
      bumpActivity();
      onSelectPlace(null);
      setSettleMode(mode);
      setSettleKey((key) => key + 1);
    },
    [bumpActivity, clearIdleResetTimer, onSelectPlace],
  );

  const resetView = useCallback(() => {
    beginSettle("home");
  }, [beginSettle]);

  const armIdleReset = useCallback(() => {
    clearIdleResetTimer();
    idleResetTimerRef.current = setTimeout(() => {
      idleResetTimerRef.current = null;
      beginSettle("idle");
    }, GLOBE_IDLE_RESET_MS);
  }, [clearIdleResetTimer, beginSettle]);

  const noteUserInteraction = useCallback(() => {
    setSettleMode(null);
    setIntroCancelled(true);
    setAutoSpin(false);
    bumpActivity();
    armIdleReset();
    const controls = controlsRef.current;
    if (controls) controls.enabled = true;
  }, [bumpActivity, armIdleReset]);

  const ensureControlsReady = useCallback(() => {
    setSettleMode(null);
    setIntroCancelled(true);
    const controls = controlsRef.current;
    if (controls) controls.enabled = true;
  }, []);

  useEffect(() => () => clearIdleResetTimer(), [clearIdleResetTimer]);

  useEffect(() => {
    if (!initialPlaceCode) return;
    if (spinGroupRef.current) {
      spinGroupRef.current.rotation.set(0, GLOBE_MESH_Y_ROTATION, 0);
    }
    // Keep the framed place on-screen — don't resume idle auto-spin after fly-to.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoSpin(false);
    setFocusIntroComplete(false);
    setIntroCancelled(false);
    setSettleMode(null);
    bumpActivity();
    armIdleReset();
  }, [initialPlaceCode, bumpActivity, armIdleReset]);

  const zoomBy = useCallback(
    (factor: number) => {
      noteUserInteraction();
      const controls = controlsRef.current;
      if (!controls) return;
      const camera = controls.object;
      const offset = camera.position.clone().sub(controls.target);
      const distance = zoomDistanceByAltitudeFactor(offset.length(), factor, maxCameraDistance);
      offset.setLength(distance);
      camera.position.copy(controls.target).add(offset);
      controls.update();
    },
    [noteUserInteraction, maxCameraDistance],
  );

  // Imperative controls for chrome above the canvas: the home drag zone spins
  // the planet, and the map pane's floating chips drive zoom/reset.
  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      spinByPixels: (deltaX, deltaY = 0) => {
        const controls = controlsRef.current;
        const container = containerRef.current;
        if (!controls || !container) return;
        const camera = controls.object;
        if (!(camera instanceof THREE.PerspectiveCamera)) return;
        bumpActivity();
        orbitCameraByScreenDelta(
          camera,
          controls.target,
          deltaX,
          deltaY,
          container.getBoundingClientRect(),
          controls.minPolarAngle,
          controls.maxPolarAngle,
        );
        controls.update();
      },
      setDragging: (dragging) => {
        if (dragging) {
          noteUserInteraction();
          return;
        }
        bumpActivity();
        armIdleReset();
      },
      zoomIn: () => zoomBy(ZOOM_BUTTON_FACTOR),
      zoomOut: () => zoomBy(1 / ZOOM_BUTTON_FACTOR),
      resetView,
    };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef, bumpActivity, noteUserInteraction, armIdleReset, zoomBy, resetView]);

  const panelScope = highlightedCode && isStateCode(highlightedCode) ? "usa" : "world";

  return (
    <SpaceBackdrop
      isDark={isDark}
      className={cn("relative", !active && "invisible", className)}
    >
      <ProgressMapContainer
        containerRef={containerRef}
        wrapperClassName="absolute inset-0"
        className="relative h-full w-full touch-none"
        hoverLabel={null}
        selectedCode={mode === "map" ? highlightedCode : null}
        profile={profile}
        difficulty={difficulty}
        scope={panelScope}
        inlinePanelClassName="absolute inset-x-4 bottom-[calc(8rem+env(safe-area-inset-bottom))] z-10 sm:hidden"
        // Sit below the floating Globe/World/USA toggle in GlobeExperience.
        overlayPanelClassName="left-3 top-[calc(var(--app-header-offset)+4rem)]"
        onDismissSelection={() => {
          bumpActivity();
          onSelectPlace(null);
        }}
      >
        {webglOk && ready ? (
          <Canvas
            key={canvasKey}
            camera={{
              // Match idle auto-spin tilt (slightly north of equator) from the first frame.
              position: [
                0,
                INITIAL_CAMERA_DISTANCE * Math.cos(GLOBE_DEFAULT_POLAR),
                INITIAL_CAMERA_DISTANCE * Math.sin(GLOBE_DEFAULT_POLAR),
              ],
              fov: 45,
              // Tight near plane so microstate place-focus can sit close to the surface.
              near: 0.001,
              far: 200,
            }}
            dpr={canvasGl.dpr}
            frameloop={frameloop}
            gl={{
              antialias: canvasGl.antialias,
              alpha: true,
              premultipliedAlpha: false,
              powerPreference: canvasGl.powerPreference,
            }}
            style={{ touchAction: "none" }}
            onPointerMissed={() => onSelectPlace(null)}
            onCreated={(state) => {
              state.invalidate();
            }}
          >
            <GlobeContextRecovery onContextLost={remountCanvas} />
            <GlobeRecoveryReset onStable={resetRecoveryAttempts} />
            <GlobeFraming
              restDistanceRef={restDistanceRef}
              onMaxDistanceChange={setMaxCameraDistance}
            />
            <GlobeAssetPreloader />
            <GlobeInitialInvalidate />
            <GlobeFillLights isDark={isDark} dayNight={dayNight} />
            <GlobeMetalReflection perfTier={perfTier} />
            {isDark ? (
              <Stars
                radius={60}
                depth={40}
                count={starCount}
                factor={3}
                saturation={0}
                fade={perfTier !== "phone"}
                speed={reducedMotion ? 0 : 0.6}
              />
            ) : null}
            <PickableGlobe
              profile={paintProfile}
              difficulty={difficulty}
              usMode={usMode}
              isDark={isDark}
              dayNight={dayNight}
              selectedCode={highlightedCode}
              perfTier={perfTier}
              spinGroupRef={spinGroupRef}
              controlsRef={controlsRef}
              onGrabStart={noteUserInteraction}
              onPointerDownOnGlobe={ensureControlsReady}
              onPickPlace={(code) => {
                if (code && code === highlightedCode) {
                  bumpActivity();
                  onSelectPlace(null);
                  return;
                }
                if (code) noteUserInteraction();
                else bumpActivity();
                onSelectPlace(code);
              }}
            />
            <SpaceFlybys
              enabled={!reducedMotion && outerSpaceVisible}
              isDark={isDark}
              perfTier={perfTier}
              onActivity={bumpActivity}
            />
            <SyncOuterSpaceVisible
              controlsRef={controlsRef}
              onChange={setOuterSpaceVisible}
            />
            <KeepFrameloopAlive
              controlsRef={controlsRef}
              autoSpin={autoSpin && !reducedMotion && !usePlaceFocus}
              onActivity={bumpActivity}
            />
            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              enableRotate={false}
              enableDamping={
                !(usePlaceFocus && !focusIntroComplete && !introCancelled) && !settleRunning
              }
              dampingFactor={0.08}
              zoomSpeed={BASE_ZOOM_SPEED}
              enableZoom={mode === "map"}
              minDistance={MIN_CAMERA_DISTANCE}
              maxDistance={maxCameraDistance}
              autoRotate={autoSpin && !reducedMotion && !usePlaceFocus && !settleRunning}
              // OrbitControls speed 1.0 ≈ 0.1 rad/s; match the home globe's gentle spin.
              autoRotateSpeed={GLOBE_ROTATION_SPEED * 10}
              onStart={noteUserInteraction}
              onChange={() => {
                bumpActivity();
                // Keep pushing the idle deadline out while the camera is still moving
                // from a drag, pinch, or zoom — otherwise a long gesture can auto-reset mid-move.
                if (idleResetTimerRef.current) armIdleReset();
              }}
            />
            <AltitudeAwareZoomSpeed controlsRef={controlsRef} />
            <WheelZoomPageScrollHandoff
              controlsRef={controlsRef}
              minDistance={MIN_CAMERA_DISTANCE}
              maxDistance={maxCameraDistance}
            />
            {settleMode ? (
              <ViewSettleAnimation
                key={`settle-${settleKey}`}
                controlsRef={controlsRef}
                spinGroupRef={spinGroupRef}
                restDistanceRef={restDistanceRef}
                mode={settleMode}
                reducedMotion={reducedMotion}
                onComplete={() => {
                  setSettleMode(null);
                  setAutoSpin(true);
                  bumpActivity();
                }}
                onActivity={bumpActivity}
              />
            ) : null}
            {usePlaceFocus && placeFocusTarget ? (
              <PlaceFocusIntro
                key={initialPlaceCode ?? "none"}
                controlsRef={controlsRef}
                spinGroupRef={spinGroupRef}
                focusTarget={placeFocusTarget}
                enabled={!reducedMotion}
                cancelled={introCancelled || settleRunning}
                onComplete={() => setFocusIntroComplete(true)}
                onActivity={bumpActivity}
              />
            ) : (
              <CinematicIntroZoom
                controlsRef={controlsRef}
                restDistanceRef={restDistanceRef}
                enabled={!reducedMotion}
                cancelled={introCancelled || settleRunning}
                onComplete={() => setCinematicIntroComplete(true)}
                onActivity={bumpActivity}
              />
            )}
          </Canvas>
        ) : webglOk === false && isDark ? (
          <StaticStarfield isDark />
        ) : null}
      </ProgressMapContainer>
    </SpaceBackdrop>
  );
}
