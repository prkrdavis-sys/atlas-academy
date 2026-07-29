"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  DistantSun,
  EarthshineLight,
  EarthSunLight,
  GLOBE_ROTATION_SPEED,
  GLOBE_TAP_TRAVEL_THRESHOLD,
  getGlobeCanvasGlSettings,
  getGlobeSphereSegments,
  getGlobeStarCount,
  GlobeAtmosphere,
  GlobeContextRecovery,
  GlobeFillLights,
  globeFillDistance,
  GlobeInitialInvalidate,
  GlobeRecoveryReset,
  GlobeSurfaceMaterial,
  SyncDayNightZoomStrength,
  useGlobeCanvasKey,
  useGlobeFrameloop,
  useGlobeSceneEnvironment,
  useGlobeTexture,
} from "@/components/globe/globe-scene";
import { GlobeCloseupLayer } from "@/components/globe/GlobeCloseupLayer";
import { GlobeDetailOverlays } from "@/components/globe/GlobeDetailOverlays";
import { GlobeGrabOrbit } from "@/components/globe/GlobeGrabOrbit";
import { SpaceBackdrop, StaticStarfield } from "@/components/globe/SpaceBackdrop";
import { MapScrollDownButton } from "@/components/MapScrollDownButton";
import { MapZoomControls } from "@/components/MapZoomControls";
import { ProgressMapContainer } from "@/components/ProgressMapOverlays";
import { MapProgressFillLegend } from "@/components/PlaceMapProgressPanel";
import { pickGlobePlaceAtUv } from "@/lib/globe-picking";
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
/** Camera-distance multiplier for one zoom button press. */
const ZOOM_BUTTON_FACTOR = 0.75;
/** Unit sphere radius for the map globe mesh. */
const GLOBE_RADIUS = 1;

/** Extra zoom-out required before shooting stars return (avoids edge flicker). */
const SPACE_VISIBLE_HYSTERESIS = 1.06;

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
  enabled,
  cancelled,
  onComplete,
  onActivity,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  enabled: boolean;
  cancelled: boolean;
  onComplete: () => void;
  onActivity?: () => void;
}) {
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const offsetRef = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (finishedRef.current) return;
    if (cancelled) {
      finishedRef.current = true;
      onComplete();
      return;
    }
    if (!enabled) {
      finishedRef.current = true;
      onComplete();
      return;
    }
    const controls = controlsRef.current;
    if (!controls) return;

    onActivity?.();
    elapsedRef.current += delta;
    const t = Math.min(1, elapsedRef.current / CINEMATIC_ZOOM_DURATION_S);
    // Ease-out cubic: quick enough to notice, soft settle at the end.
    const eased = 1 - (1 - t) ** 3;
    const distance = THREE.MathUtils.lerp(
      INITIAL_CAMERA_DISTANCE,
      CINEMATIC_REST_DISTANCE,
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
  const offsetRef = useRef(new THREE.Vector3());
  const sphericalRef = useRef(new THREE.Spherical());

  useFrame((_, delta) => {
    if (finishedRef.current) return;
    const controls = controlsRef.current;
    if (!controls) return;

    if (cancelled) {
      controls.enabled = true;
      return;
    }

    onActivity?.();

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
        INITIAL_CAMERA_DISTANCE,
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

type TapState = { pointerId: number; lastX: number; lastY: number; traveled: number };

type GlobeSceneProps = {
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  usMode: GlobeUsMode;
  isDark: boolean;
  dayNight: boolean;
  selectedCode: string | null;
  perfTier: GlobePerfTier;
  /** Prefetch / force detail overlays during library place-focus fly-to. */
  forceDetailOverlays?: boolean;
  /** 0..1 day/night lighting strength (fades out when zoomed in). */
  dayNightStrengthRef: RefObject<number>;
  spinGroupRef: RefObject<THREE.Group | null>;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  onPickPlace: (code: string | null) => void;
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
  forceDetailOverlays = false,
  dayNightStrengthRef,
  spinGroupRef,
  controlsRef,
  onPickPlace,
}: GlobeSceneProps) {
  const { map, metalnessMap, roughnessMap } = useGlobeTexture(profile, {
    difficulty,
    usMode,
    isDark,
    selectedCode,
    perfTier,
  });
  const tapRef = useRef<TapState | null>(null);
  const segments = getGlobeSphereSegments(perfTier);

  // No declarative rotation on the spin group — R3F prop updates fight place-focus.
  // Seed the default Atlantic-facing yaw once the group exists.
  useLayoutEffect(() => {
    const group = spinGroupRef.current;
    if (group) group.rotation.set(0, GLOBE_MESH_Y_ROTATION, 0);
  }, [spinGroupRef]);

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    tapRef.current = {
      pointerId: event.pointerId,
      lastX: event.nativeEvent.clientX,
      lastY: event.nativeEvent.clientY,
      traveled: 0,
    };
  };

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    const tap = tapRef.current;
    if (!tap || tap.pointerId !== event.pointerId) return;
    tap.traveled +=
      Math.abs(event.nativeEvent.clientX - tap.lastX) +
      Math.abs(event.nativeEvent.clientY - tap.lastY);
    tap.lastX = event.nativeEvent.clientX;
    tap.lastY = event.nativeEvent.clientY;
  };

  const onPointerUp = (event: ThreeEvent<PointerEvent>) => {
    const tap = tapRef.current;
    if (!tap || tap.pointerId !== event.pointerId) return;
    tapRef.current = null;
    if (tap.traveled >= GLOBE_TAP_TRAVEL_THRESHOLD || !event.uv) return;
    onPickPlace(pickGlobePlaceAtUv(event.uv.x, event.uv.y, usMode));
  };

  return (
    <group ref={spinGroupRef}>
      <mesh
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          tapRef.current = null;
        }}
      >
        <sphereGeometry args={[1, segments, segments]} />
        <GlobeSurfaceMaterial
          map={map}
          metalnessMap={metalnessMap}
          roughnessMap={roughnessMap}
          dayNight={dayNight}
          isDark={isDark}
          perfTier={perfTier}
          dayNightStrengthRef={dayNightStrengthRef}
        />
        <DistantSun isDark={isDark} perfTier={perfTier} />
        <EarthSunLight
          isDark={isDark}
          dayNight={dayNight}
          dayNightStrengthRef={dayNightStrengthRef}
        />
        <EarthshineLight
          isDark={isDark}
          dayNight={dayNight}
          dayNightStrengthRef={dayNightStrengthRef}
        />
      </mesh>
      <GlobeCloseupLayer
        profile={profile}
        difficulty={difficulty}
        usMode={usMode}
        isDark={isDark}
        selectedCode={selectedCode}
        forceActive={forceDetailOverlays}
        perfTier={perfTier}
        controlsRef={controlsRef}
        spinGroupRef={spinGroupRef}
      />
      <GlobeDetailOverlays
        profile={profile}
        difficulty={difficulty}
        isDark={isDark}
        selectedCode={selectedCode}
        forceActive={forceDetailOverlays}
        perfTier={perfTier}
        controlsRef={controlsRef}
        spinGroupRef={spinGroupRef}
      />
      <GlobeAtmosphere isDark={isDark} perfTier={perfTier} />
    </group>
  );
}

type InteractiveGlobeProps = {
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  usMode: GlobeUsMode;
  selectedCode: string | null;
  /** Place code from ?place= — highlights immediately and triggers fly-to. */
  initialPlaceCode?: string | null;
  onSelectPlace: (code: string | null) => void;
  className?: string;
  /** When set, shows a scroll-down control beside the fill legend. */
  statsScrollTargetId?: string;
};

/**
 * The map page's full-bleed 3D globe: outer-space scenery in the foreground
 * with orbit + zoom camera controls, tap-to-select countries and states, a
 * mastery legend, and zoom buttons. Auto-spins gently until the player first
 * grabs it.
 */
export default function InteractiveGlobe({
  profile,
  difficulty,
  usMode,
  selectedCode,
  initialPlaceCode = null,
  onSelectPlace,
  className,
  statsScrollTargetId,
}: InteractiveGlobeProps) {
  const { webglOk, reducedMotion, pageVisible, perfTier } = useGlobeSceneEnvironment();
  const { canvasKey, remountCanvas, resetRecoveryAttempts } = useGlobeCanvasKey();
  const { isDark, ready } = useIsDark();
  const { enabled: dayNight } = useGlobeDayNight();
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const spinGroupRef = useRef<THREE.Group | null>(null);
  const dayNightStrengthRef = useRef(1);
  const [autoSpin, setAutoSpin] = useState(true);
  const [introCancelled, setIntroCancelled] = useState(false);
  const [focusIntroComplete, setFocusIntroComplete] = useState(false);
  const [cinematicIntroComplete, setCinematicIntroComplete] = useState(false);
  /** False once the globe fills the viewport — gates CSS shooting stars. */
  const [outerSpaceVisible, setOuterSpaceVisible] = useState(true);
  const placeFocusTarget = initialPlaceCode ? getGlobeFocusTarget(initialPlaceCode) : null;
  const usePlaceFocus = placeFocusTarget !== null;
  const highlightedCode = selectedCode ?? initialPlaceCode;
  const introRunning = usePlaceFocus
    ? !introCancelled && !focusIntroComplete
    : !introCancelled && !cinematicIntroComplete;
  const { frameloop, bumpActivity } = useGlobeFrameloop(pageVisible, {
    forceAlways: (autoSpin && !reducedMotion && !usePlaceFocus) || introRunning,
  });
  const canvasGl = getGlobeCanvasGlSettings(perfTier);
  const starCount = getGlobeStarCount(perfTier);

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
    bumpActivity();
  }, [initialPlaceCode, bumpActivity]);

  const onOrbitStart = useCallback(() => {
    setIntroCancelled(true);
    setAutoSpin(false);
    bumpActivity();
  }, [bumpActivity]);

  const zoomBy = useCallback(
    (factor: number) => {
      setIntroCancelled(true);
      bumpActivity();
      const controls = controlsRef.current;
      if (!controls) return;
      const camera = controls.object;
      const offset = camera.position.clone().sub(controls.target);
      const distance = THREE.MathUtils.clamp(
        offset.length() * factor,
        MIN_CAMERA_DISTANCE,
        MAX_CAMERA_DISTANCE,
      );
      offset.setLength(distance);
      camera.position.copy(controls.target).add(offset);
      controls.update();
    },
    [bumpActivity],
  );

  const resetView = useCallback(() => {
    setIntroCancelled(true);
    bumpActivity();
    onSelectPlace(null);
    if (spinGroupRef.current) {
      spinGroupRef.current.rotation.set(0, GLOBE_MESH_Y_ROTATION, 0);
    }
    controlsRef.current?.reset();
  }, [onSelectPlace, bumpActivity]);

  const panelScope = highlightedCode && isStateCode(highlightedCode) ? "usa" : "world";

  const globeBottomPanelClass =
    "flex items-center rounded-xl border border-slate-200/60 bg-white/85 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/75";

  return (
    <SpaceBackdrop
      isDark={isDark}
      reducedMotion={reducedMotion}
      shootingStars={outerSpaceVisible}
      className={cn("relative", className)}
    >
      <ProgressMapContainer
        containerRef={containerRef}
        wrapperClassName="absolute inset-0"
        className="relative h-full w-full touch-none"
        hoverLabel={null}
        selectedCode={highlightedCode}
        profile={profile}
        difficulty={difficulty}
        scope={panelScope}
        inlinePanelClassName="absolute inset-x-4 bottom-16 z-10 sm:hidden"
      >
        {webglOk && ready ? (
          <Canvas
            key={canvasKey}
            camera={{
              position: [0, 0, INITIAL_CAMERA_DISTANCE],
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
            <GlobeInitialInvalidate />
            <SyncDayNightZoomStrength
              controlsRef={controlsRef}
              enabled={dayNight}
              strengthRef={dayNightStrengthRef}
            />
            <GlobeFillLights
              isDark={isDark}
              dayNight={dayNight}
              dayNightStrengthRef={dayNightStrengthRef}
            />
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
              profile={profile}
              difficulty={difficulty}
              usMode={usMode}
              isDark={isDark}
              dayNight={dayNight}
              selectedCode={highlightedCode}
              perfTier={perfTier}
              forceDetailOverlays={usePlaceFocus}
              dayNightStrengthRef={dayNightStrengthRef}
              spinGroupRef={spinGroupRef}
              controlsRef={controlsRef}
              onPickPlace={(code) => {
                bumpActivity();
                onSelectPlace(code);
              }}
            />
            <GlobeGrabOrbit
              controlsRef={controlsRef}
              radius={GLOBE_RADIUS}
              onGrabStart={onOrbitStart}
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
              enableDamping={!(usePlaceFocus && !focusIntroComplete && !introCancelled)}
              dampingFactor={0.08}
              zoomSpeed={0.7}
              minDistance={MIN_CAMERA_DISTANCE}
              maxDistance={MAX_CAMERA_DISTANCE}
              autoRotate={autoSpin && !reducedMotion && !usePlaceFocus}
              // OrbitControls speed 1.0 ≈ 0.1 rad/s; match the home globe's gentle spin.
              autoRotateSpeed={GLOBE_ROTATION_SPEED * 10}
              onStart={onOrbitStart}
              onChange={bumpActivity}
            />
            {usePlaceFocus && placeFocusTarget ? (
              <PlaceFocusIntro
                key={initialPlaceCode ?? "none"}
                controlsRef={controlsRef}
                spinGroupRef={spinGroupRef}
                focusTarget={placeFocusTarget}
                enabled={!reducedMotion}
                cancelled={introCancelled}
                onComplete={() => setFocusIntroComplete(true)}
                onActivity={bumpActivity}
              />
            ) : (
              <CinematicIntroZoom
                controlsRef={controlsRef}
                enabled={!reducedMotion}
                cancelled={introCancelled}
                onComplete={() => setCinematicIntroComplete(true)}
                onActivity={bumpActivity}
              />
            )}
          </Canvas>
        ) : webglOk === false && isDark ? (
          <StaticStarfield isDark />
        ) : null}

        <MapZoomControls
          variant="overlay"
          className="absolute right-3 top-3 z-10"
          onZoomIn={() => zoomBy(ZOOM_BUTTON_FACTOR)}
          onZoomOut={() => zoomBy(1 / ZOOM_BUTTON_FACTOR)}
          onReset={resetView}
        />

        {ready ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex items-stretch justify-center gap-2 px-4">
            <div className={cn(globeBottomPanelClass, "px-3 py-2")}>
              <MapProgressFillLegend isDark={isDark} difficulty={difficulty} />
            </div>
            {statsScrollTargetId ? (
              <div className={cn(globeBottomPanelClass, "pointer-events-auto p-0")}>
                <MapScrollDownButton
                  targetId={statsScrollTargetId}
                  reducedMotion={reducedMotion}
                  className="h-full w-10 rounded-xl"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </ProgressMapContainer>
    </SpaceBackdrop>
  );
}
