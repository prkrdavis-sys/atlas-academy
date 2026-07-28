"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  DistantSun,
  EarthshineLight,
  EarthSunLight,
  GLOBE_ROTATION_SPEED,
  GLOBE_TAP_TRAVEL_THRESHOLD,
  GlobeAtmosphere,
  GlobeFillLights,
  GlobeSurfaceMaterial,
  useGlobeSceneEnvironment,
  useGlobeTexture,
} from "@/components/globe/globe-scene";
import { SpaceBackdrop, StaticStarfield } from "@/components/globe/SpaceBackdrop";
import { MapScrollDownButton } from "@/components/MapScrollDownButton";
import { MapZoomControls } from "@/components/MapZoomControls";
import { ProgressMapContainer } from "@/components/ProgressMapOverlays";
import { MapProgressFillLegend } from "@/components/PlaceMapProgressPanel";
import { pickGlobePlaceAtUv } from "@/lib/globe-picking";
import {
  GLOBE_DEFAULT_POLAR,
  GLOBE_MESH_Y_ROTATION,
  getGlobeFocusTarget,
  lerpAngle,
  type GlobeFocusTarget,
} from "@/lib/globe-focus";
import type { GlobeUsMode } from "@/lib/globe-texture";
import { isStateCode } from "@/lib/scope";
import type { MapProgressDifficulty, Profile } from "@/lib/types";
import { useGlobeDayNight } from "@/lib/use-globe-day-night";
import { useIsDark } from "@/lib/use-is-dark";
import { cn } from "@/lib/utils";

const MIN_CAMERA_DISTANCE = 1.3;
const MAX_CAMERA_DISTANCE = 4;
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
/** Camera distance after framing a linked country or state. */
const PLACE_FOCUS_DISTANCE = 2.3;
/** Camera-distance multiplier for one zoom button press. */
const ZOOM_BUTTON_FACTOR = 0.75;
/** Orbit drag speed at {@link INITIAL_CAMERA_DISTANCE}; scaled by zoom so close-ups stay controllable. */
const BASE_ROTATE_SPEED = 0.45;

/**
 * Keep drag/spin sensitivity proportional to camera distance so a finger swipe
 * moves the surface at a similar screen-space rate whether zoomed in or out.
 */
function SyncOrbitRotateSpeed({
  controlsRef,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.rotateSpeed =
      BASE_ROTATE_SPEED * (controls.getDistance() / INITIAL_CAMERA_DISTANCE);
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
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  enabled: boolean;
  cancelled: boolean;
}) {
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const offsetRef = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!enabled || cancelled || finishedRef.current) return;
    const controls = controlsRef.current;
    if (!controls) return;

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
    }
  });

  return null;
}

/**
 * Spins the globe toward a linked place, tilts for latitude, and zooms in.
 * Mesh yaw is driven through React state (not imperative mesh.rotation) so the
 * declarative rotation prop keeps the first paint visible.
 */
function PlaceFocusIntro({
  controlsRef,
  onMeshRotationY,
  focusTarget,
  enabled,
  cancelled,
  onComplete,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  onMeshRotationY: (rotationY: number) => void;
  focusTarget: GlobeFocusTarget;
  enabled: boolean;
  cancelled: boolean;
  onComplete: () => void;
}) {
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const offsetRef = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (finishedRef.current) return;
    const controls = controlsRef.current;
    if (!controls) return;

    if (cancelled) {
      controls.enabled = true;
      return;
    }

    const applyFocus = (progress: number) => {
      onMeshRotationY(
        lerpAngle(GLOBE_MESH_Y_ROTATION, focusTarget.meshRotationY, progress),
      );

      controls.setAzimuthalAngle(0);
      controls.setPolarAngle(
        THREE.MathUtils.lerp(GLOBE_DEFAULT_POLAR, focusTarget.polarAngle, progress),
      );

      const distance = THREE.MathUtils.lerp(
        INITIAL_CAMERA_DISTANCE,
        PLACE_FOCUS_DISTANCE,
        progress,
      );
      const camera = controls.object;
      const offset = offsetRef.current;
      offset.copy(camera.position).sub(controls.target);
      offset.setLength(distance);
      camera.position.copy(controls.target).add(offset);
      controls.update();
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
  }, 1);

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
  meshRotationY: number;
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
  meshRotationY,
  onPickPlace,
}: GlobeSceneProps) {
  const texture = useGlobeTexture(profile, { difficulty, usMode, isDark, selectedCode });
  const tapRef = useRef<TapState | null>(null);

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
    <group>
      <mesh
        // Declarative Y rotation — required for first paint. Place-focus updates
        // this via React state rather than imperative mesh.rotation writes.
        rotation={[0, meshRotationY, 0]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          tapRef.current = null;
        }}
      >
        <sphereGeometry args={[1, 96, 96]} />
        <GlobeSurfaceMaterial map={texture} dayNight={dayNight} isDark={isDark} />
        <DistantSun isDark={isDark} />
        <EarthSunLight isDark={isDark} dayNight={dayNight} />
        <EarthshineLight isDark={isDark} dayNight={dayNight} />
      </mesh>
      <GlobeAtmosphere isDark={isDark} />
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
  const { webglOk, reducedMotion, pageVisible } = useGlobeSceneEnvironment();
  const { isDark, ready } = useIsDark();
  const { enabled: dayNight } = useGlobeDayNight();
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [meshRotationY, setMeshRotationY] = useState(GLOBE_MESH_Y_ROTATION);
  const [autoSpin, setAutoSpin] = useState(true);
  const [introCancelled, setIntroCancelled] = useState(false);
  const [focusIntroComplete, setFocusIntroComplete] = useState(false);
  const placeFocusTarget = initialPlaceCode ? getGlobeFocusTarget(initialPlaceCode) : null;
  const usePlaceFocus = placeFocusTarget !== null;
  const highlightedCode = selectedCode ?? initialPlaceCode;

  const onOrbitStart = useCallback(() => {
    setIntroCancelled(true);
    setAutoSpin(false);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setIntroCancelled(true);
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
  }, []);

  const resetView = useCallback(() => {
    setIntroCancelled(true);
    onSelectPlace(null);
    setMeshRotationY(GLOBE_MESH_Y_ROTATION);
    controlsRef.current?.reset();
  }, [onSelectPlace]);

  const panelScope = highlightedCode && isStateCode(highlightedCode) ? "usa" : "world";

  const globeBottomPanelClass =
    "flex items-center rounded-xl border border-slate-200/60 bg-white/85 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/75";

  return (
    <SpaceBackdrop
      isDark={isDark}
      reducedMotion={reducedMotion}
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
            camera={{ position: [0, 0, INITIAL_CAMERA_DISTANCE], fov: 45 }}
            dpr={[1, 2]}
            frameloop={pageVisible ? "always" : "never"}
            gl={{ antialias: true, alpha: true }}
            style={{ touchAction: "none" }}
            onPointerMissed={() => onSelectPlace(null)}
          >
            <GlobeFillLights isDark={isDark} dayNight={dayNight} />
            {isDark ? (
              <Stars
                radius={60}
                depth={40}
                count={1600}
                factor={3}
                saturation={0}
                fade
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
              meshRotationY={meshRotationY}
              onPickPlace={onSelectPlace}
            />
            <SyncOrbitRotateSpeed controlsRef={controlsRef} />
            {usePlaceFocus && placeFocusTarget ? (
              <PlaceFocusIntro
                controlsRef={controlsRef}
                onMeshRotationY={setMeshRotationY}
                focusTarget={placeFocusTarget}
                enabled={!reducedMotion}
                cancelled={introCancelled}
                onComplete={() => setFocusIntroComplete(true)}
              />
            ) : (
              <CinematicIntroZoom
                controlsRef={controlsRef}
                enabled={!reducedMotion}
                cancelled={introCancelled}
              />
            )}
            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              enableDamping={!(usePlaceFocus && !focusIntroComplete && !introCancelled)}
              dampingFactor={0.08}
              rotateSpeed={BASE_ROTATE_SPEED}
              zoomSpeed={0.7}
              minDistance={MIN_CAMERA_DISTANCE}
              maxDistance={MAX_CAMERA_DISTANCE}
              autoRotate={autoSpin && !reducedMotion && (!usePlaceFocus || focusIntroComplete)}
              // OrbitControls speed 1.0 ≈ 0.1 rad/s; match the home globe's gentle spin.
              autoRotateSpeed={GLOBE_ROTATION_SPEED * 10}
              onStart={onOrbitStart}
            />
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
