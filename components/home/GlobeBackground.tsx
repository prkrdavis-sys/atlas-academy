"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import {
  DistantSun,
  EarthshineLight,
  EarthSunLight,
  GLOBE_DRAG_SPIN_FACTOR,
  GLOBE_IDLE_RETURN_DELAY_MS,
  GLOBE_MAX_TILT,
  GLOBE_ROTATION_SPEED,
  GLOBE_TAP_TRAVEL_THRESHOLD,
  GLOBE_TILT_RETURN_DAMP,
  getGlobeCanvasGlSettings,
  getGlobeSphereSegments,
  getGlobeStarCount,
  GlobeAtmosphere,
  GlobeAssetPreloader,
  GlobeContextRecovery,
  GlobeFillLights,
  GlobeInitialInvalidate,
  GlobeRecoveryReset,
  GlobeSurfaceMaterial,
  tryReleasePointerCapture,
  trySetPointerCapture,
  useGlobeCanvasKey,
  useGlobeFrameloop,
  useGlobeSceneEnvironment,
  useGlobeTexture,
} from "@/components/globe/globe-scene";
import { SpaceBackdrop, StaticStarfield } from "@/components/globe/SpaceBackdrop";
import type { GlobePerfTier } from "@/lib/globe-performance";
import type { Profile } from "@/lib/types";
import { useGlobeDayNight } from "@/lib/use-globe-day-night";
import { useGlobeUsMode } from "@/lib/use-globe-us-mode";
import { useIsDark } from "@/lib/use-is-dark";

/**
 * Imperative controls so overlaid page content (which sits above the canvas
 * and would otherwise swallow pointer events) can spin the planet by dragging.
 */
export type GlobeHandle = {
  /** Spin the globe by a pointer movement in pixels (any direction). */
  spinByPixels: (deltaX: number, deltaY?: number) => void;
  /** Pause/resume auto-spin while an external drag is in progress. */
  setDragging: (dragging: boolean) => void;
};

type GlobeProps = {
  profile: Profile | null;
  reducedMotion: boolean;
  isDark: boolean;
  usMode: "country" | "states";
  dayNight: boolean;
  perfTier: GlobePerfTier;
  onActivity: () => void;
  handleRef?: React.RefObject<GlobeHandle | null>;
};

type DragState = { pointerId: number; lastX: number; lastY: number; traveled: number };

function applyGlobeSpin(mesh: THREE.Mesh, deltaX: number, deltaY: number) {
  mesh.rotation.y += deltaX * GLOBE_DRAG_SPIN_FACTOR;
  mesh.rotation.x = THREE.MathUtils.clamp(
    mesh.rotation.x + deltaY * GLOBE_DRAG_SPIN_FACTOR,
    -GLOBE_MAX_TILT,
    GLOBE_MAX_TILT,
  );
}

function ProgressGlobe({
  profile,
  reducedMotion,
  isDark,
  usMode,
  dayNight,
  perfTier,
  onActivity,
  handleRef,
}: GlobeProps) {
  const router = useRouter();
  const invalidate = useThree((state) => state.invalidate);
  const globeRef = useRef<THREE.Mesh>(null);
  const dragRef = useRef<DragState | null>(null);
  const externallyDraggingRef = useRef(false);
  /** 0 means "never interacted" so auto-spin starts immediately on mount. */
  const lastInteractAtRef = useRef(0);
  const segments = getGlobeSphereSegments(perfTier);

  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      spinByPixels: (deltaX, deltaY = 0) => {
        if (!globeRef.current) return;
        applyGlobeSpin(globeRef.current, deltaX, deltaY);
        lastInteractAtRef.current = performance.now();
        onActivity();
        invalidate();
      },
      setDragging: (dragging) => {
        externallyDraggingRef.current = dragging;
        lastInteractAtRef.current = performance.now();
        onActivity();
      },
    };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef, onActivity, invalidate]);
  const viewport = useThree((state) => state.viewport);
  // Keep the planet in the upper-middle of the screen and never wider than
  // ~84% of the viewport, so it fits phones and desktops alike.
  const scale = Math.min(0.62, (viewport.width * 0.84) / 2);

  // The home globe mirrors Normal map progress; the map page globe follows
  // its own difficulty toggle.
  const texture = useGlobeTexture(profile, {
    difficulty: "medium",
    usMode,
    isDark,
    perfTier,
  });

  useFrame((_, delta) => {
    if (reducedMotion || !globeRef.current) return;

    const mesh = globeRef.current;
    if (dragRef.current || externallyDraggingRef.current) return;

    const lastInteractAt = lastInteractAtRef.current;
    const idleMs = lastInteractAt === 0 ? GLOBE_IDLE_RETURN_DELAY_MS : performance.now() - lastInteractAt;
    const onDefaultAxis = Math.abs(mesh.rotation.x) < 0.0005 && Math.abs(mesh.rotation.z) < 0.0005;

    // Horizontal-only spins leave the default axis, so auto-spin resumes right
    // away. A free tilt holds for a beat, then eases back before spinning.
    if (idleMs < GLOBE_IDLE_RETURN_DELAY_MS && !onDefaultAxis) return;

    if (!onDefaultAxis) {
      mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, 0, GLOBE_TILT_RETURN_DAMP, delta);
      mesh.rotation.z = THREE.MathUtils.damp(mesh.rotation.z, 0, GLOBE_TILT_RETURN_DAMP, delta);
      if (Math.abs(mesh.rotation.x) <= 0.0005) mesh.rotation.x = 0;
      if (Math.abs(mesh.rotation.z) <= 0.0005) mesh.rotation.z = 0;
      onActivity();
    }

    mesh.rotation.y += delta * GLOBE_ROTATION_SPEED;
    onActivity();
  });

  function endDrag(event: ThreeEvent<PointerEvent>, { navigateOnTap }: { navigateOnTap: boolean }) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    lastInteractAtRef.current = performance.now();
    onActivity();
    tryReleasePointerCapture(event.target as Element, event.pointerId);
    document.body.style.cursor = "grab";
    if (navigateOnTap && drag.traveled < GLOBE_TAP_TRAVEL_THRESHOLD) {
      document.body.style.cursor = "";
      router.push("/map");
    }
  }

  return (
    <group position={[0, 0.28, 0]} scale={scale} rotation={[0.25, 0, 0]}>
      <mesh
        ref={globeRef}
        // Start on the Atlantic so land is visible right away.
        rotation={[0, -1.1, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          dragRef.current = {
            pointerId: event.pointerId,
            lastX: event.nativeEvent.clientX,
            lastY: event.nativeEvent.clientY,
            traveled: 0,
          };
          lastInteractAtRef.current = performance.now();
          onActivity();
          trySetPointerCapture(event.target as Element, event.pointerId);
          document.body.style.cursor = "grabbing";
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || !globeRef.current) return;
          const deltaX = event.nativeEvent.clientX - drag.lastX;
          const deltaY = event.nativeEvent.clientY - drag.lastY;
          drag.lastX = event.nativeEvent.clientX;
          drag.lastY = event.nativeEvent.clientY;
          drag.traveled += Math.hypot(deltaX, deltaY);
          applyGlobeSpin(globeRef.current, deltaX, deltaY);
          lastInteractAtRef.current = performance.now();
          onActivity();
        }}
        onPointerUp={(event) => endDrag(event, { navigateOnTap: true })}
        onPointerCancel={(event) => endDrag(event, { navigateOnTap: false })}
        onPointerOver={() => {
          if (!dragRef.current) document.body.style.cursor = "grab";
        }}
        onPointerOut={() => {
          if (!dragRef.current) document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[1, segments, segments]} />
        <GlobeSurfaceMaterial
          map={texture}
          dayNight={dayNight}
          isDark={isDark}
          perfTier={perfTier}
        />
        <DistantSun isDark={isDark} perfTier={perfTier} />
        <EarthSunLight isDark={isDark} dayNight={dayNight} />
        <EarthshineLight isDark={isDark} dayNight={dayNight} />
      </mesh>
      <GlobeAtmosphere isDark={isDark} perfTier={perfTier} />
    </group>
  );
}

/**
 * Full-screen outer-space backdrop for the home page: space with a nebula
 * glow, star field, shooting stars, and a slowly spinning 3D globe painted
 * with the player's actual country and state mastery. Tapping the planet
 * opens the full progress map. Theme-aware: deep space in dark mode, a pale
 * daytime sky in light mode.
 */
export default function GlobeBackground({
  profile,
  handleRef,
}: {
  profile: Profile | null;
  handleRef?: React.RefObject<GlobeHandle | null>;
}) {
  const { webglOk, reducedMotion, pageVisible, perfTier } = useGlobeSceneEnvironment();
  const { canvasKey, remountCanvas, resetRecoveryAttempts } = useGlobeCanvasKey();
  const { isDark } = useIsDark();
  const { usMode } = useGlobeUsMode();
  const { enabled: dayNight } = useGlobeDayNight();
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const { frameloop, bumpActivity } = useGlobeFrameloop(pageVisible && inView, {
    forceAlways: !reducedMotion,
  });
  const canvasGl = getGlobeCanvasGlSettings(perfTier);
  const starCount = getGlobeStarCount(perfTier);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting && entry.intersectionRatio > 0.05);
      },
      { threshold: [0, 0.05, 0.2] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <SpaceBackdrop
      ref={rootRef}
      isDark={isDark}
      reducedMotion={reducedMotion}
      fadeBottom
      className="fixed inset-0 -z-10"
    >
      {webglOk ? (
        <Canvas
          key={canvasKey}
          aria-hidden
          camera={{ position: [0, 0, 2.6], fov: 45 }}
          dpr={canvasGl.dpr}
          frameloop={frameloop}
          gl={{
            antialias: canvasGl.antialias,
            alpha: true,
            powerPreference: canvasGl.powerPreference,
          }}
          style={{ touchAction: "none" }}
          onCreated={(state) => {
            state.invalidate();
          }}
        >
          <GlobeContextRecovery onContextLost={remountCanvas} />
          <GlobeRecoveryReset onStable={resetRecoveryAttempts} />
          <GlobeAssetPreloader />
          <GlobeInitialInvalidate />
          <GlobeFillLights isDark={isDark} dayNight={dayNight} />
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
          <ProgressGlobe
            profile={profile}
            reducedMotion={reducedMotion}
            isDark={isDark}
            usMode={usMode}
            dayNight={dayNight}
            perfTier={perfTier}
            onActivity={bumpActivity}
            handleRef={handleRef}
          />
        </Canvas>
      ) : webglOk === false && isDark ? (
        <StaticStarfield isDark />
      ) : null}
    </SpaceBackdrop>
  );
}
