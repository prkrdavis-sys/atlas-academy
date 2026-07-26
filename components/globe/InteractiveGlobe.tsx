"use client";

import { useCallback, useRef, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  EarthSunLight,
  GLOBE_ROTATION_SPEED,
  GLOBE_TAP_TRAVEL_THRESHOLD,
  GlobeAtmosphere,
  useGlobeSceneEnvironment,
  useGlobeTexture,
} from "@/components/globe/globe-scene";
import { SpaceBackdrop, StaticStarfield } from "@/components/globe/SpaceBackdrop";
import { MapZoomControls } from "@/components/MapZoomControls";
import { ProgressMapContainer } from "@/components/ProgressMapOverlays";
import { MapProgressFillLegend } from "@/components/PlaceMapProgressPanel";
import { pickGlobePlaceAtUv } from "@/lib/globe-picking";
import type { GlobeUsMode } from "@/lib/globe-texture";
import { isStateCode } from "@/lib/scope";
import type { MapProgressDifficulty, Profile } from "@/lib/types";
import { useIsDark } from "@/lib/use-is-dark";
import { cn } from "@/lib/utils";

const MIN_CAMERA_DISTANCE = 1.3;
const MAX_CAMERA_DISTANCE = 4;
/** Far enough that the atmosphere halo has a little space margin above/below. */
const INITIAL_CAMERA_DISTANCE = 2.9;
/** Camera-distance multiplier for one zoom button press. */
const ZOOM_BUTTON_FACTOR = 0.75;

type TapState = { pointerId: number; lastX: number; lastY: number; traveled: number };

type GlobeSceneProps = {
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  usMode: GlobeUsMode;
  isDark: boolean;
  onPickPlace: (code: string | null) => void;
};

/** The planet mesh with tap-to-select picking via texture UVs. */
function PickableGlobe({ profile, difficulty, usMode, isDark, onPickPlace }: GlobeSceneProps) {
  const texture = useGlobeTexture(profile, { difficulty, usMode, isDark });
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
        // Start on the Atlantic so land is visible right away.
        rotation={[0, -1.1, 0]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          tapRef.current = null;
        }}
      >
        <sphereGeometry args={[1, 96, 96]} />
        <meshStandardMaterial map={texture} roughness={0.9} metalness={0} />
        <EarthSunLight />
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
  onSelectPlace: (code: string | null) => void;
  className?: string;
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
  onSelectPlace,
  className,
}: InteractiveGlobeProps) {
  const { webglOk, reducedMotion, pageVisible } = useGlobeSceneEnvironment();
  const { isDark, ready } = useIsDark();
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [autoSpin, setAutoSpin] = useState(true);

  const stopAutoSpin = useCallback(() => setAutoSpin(false), []);

  const zoomBy = useCallback((factor: number) => {
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
    controlsRef.current?.reset();
  }, []);

  const panelScope = selectedCode && isStateCode(selectedCode) ? "usa" : "world";

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
        selectedCode={selectedCode}
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
            {/* High fill keeps mastery colors legible; sun only adds a soft terminator. */}
            <ambientLight intensity={isDark ? 0.95 : 1.05} />
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
              onPickPlace={onSelectPlace}
            />
            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.45}
              zoomSpeed={0.7}
              minDistance={MIN_CAMERA_DISTANCE}
              maxDistance={MAX_CAMERA_DISTANCE}
              autoRotate={autoSpin && !reducedMotion}
              // OrbitControls speed 1.0 ≈ 0.1 rad/s; match the home globe's gentle spin.
              autoRotateSpeed={GLOBE_ROTATION_SPEED * 10}
              onStart={stopAutoSpin}
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
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-4">
            <div className="rounded-xl border border-slate-200/60 bg-white/85 px-3 py-2 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/75">
              <MapProgressFillLegend isDark={isDark} difficulty={difficulty} />
            </div>
          </div>
        ) : null}
      </ProgressMapContainer>
    </SpaceBackdrop>
  );
}
