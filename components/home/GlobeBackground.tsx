"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import {
  EarthSunLight,
  GLOBE_DRAG_SPIN_FACTOR,
  GLOBE_ROTATION_SPEED,
  GLOBE_TAP_TRAVEL_THRESHOLD,
  GlobeAtmosphere,
  tryReleasePointerCapture,
  trySetPointerCapture,
  useGlobeSceneEnvironment,
  useGlobeTexture,
} from "@/components/globe/globe-scene";
import { SpaceBackdrop, StaticStarfield } from "@/components/globe/SpaceBackdrop";
import type { Profile } from "@/lib/types";
import { useGlobeUsMode } from "@/lib/use-globe-us-mode";
import { useIsDark } from "@/lib/use-is-dark";

/**
 * Imperative controls so overlaid page content (which sits above the canvas
 * and would otherwise swallow pointer events) can spin the planet by dragging.
 */
export type GlobeHandle = {
  /** Spin the globe by a horizontal pointer movement in pixels. */
  spinByPixels: (deltaX: number) => void;
  /** Pause/resume auto-spin while an external drag is in progress. */
  setDragging: (dragging: boolean) => void;
};

type GlobeProps = {
  profile: Profile | null;
  reducedMotion: boolean;
  isDark: boolean;
  usMode: "country" | "states";
  handleRef?: React.RefObject<GlobeHandle | null>;
};

type DragState = { pointerId: number; lastX: number; traveled: number };

function ProgressGlobe({ profile, reducedMotion, isDark, usMode, handleRef }: GlobeProps) {
  const router = useRouter();
  const globeRef = useRef<THREE.Mesh>(null);
  const dragRef = useRef<DragState | null>(null);
  const externallyDraggingRef = useRef(false);

  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      spinByPixels: (deltaX) => {
        if (globeRef.current) globeRef.current.rotation.y += deltaX * GLOBE_DRAG_SPIN_FACTOR;
      },
      setDragging: (dragging) => {
        externallyDraggingRef.current = dragging;
      },
    };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef]);
  const viewport = useThree((state) => state.viewport);
  // Keep the planet in the upper-middle of the screen and never wider than
  // ~84% of the viewport, so it fits phones and desktops alike.
  const scale = Math.min(0.62, (viewport.width * 0.84) / 2);

  // The home globe mirrors Normal map progress; the map page globe follows
  // its own difficulty toggle.
  const texture = useGlobeTexture(profile, { difficulty: "medium", usMode, isDark });

  useFrame((_, delta) => {
    // Auto-spin pauses while the player is dragging and resumes on release.
    if (reducedMotion || dragRef.current || externallyDraggingRef.current || !globeRef.current) {
      return;
    }
    globeRef.current.rotation.y += delta * GLOBE_ROTATION_SPEED;
  });

  function endDrag(event: ThreeEvent<PointerEvent>, { navigateOnTap }: { navigateOnTap: boolean }) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
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
            traveled: 0,
          };
          trySetPointerCapture(event.target as Element, event.pointerId);
          document.body.style.cursor = "grabbing";
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || !globeRef.current) return;
          const deltaX = event.nativeEvent.clientX - drag.lastX;
          drag.lastX = event.nativeEvent.clientX;
          drag.traveled += Math.abs(deltaX);
          globeRef.current.rotation.y += deltaX * GLOBE_DRAG_SPIN_FACTOR;
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
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.9} metalness={0} />
        <EarthSunLight />
      </mesh>
      <GlobeAtmosphere isDark={isDark} />
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
  const { webglOk, reducedMotion, pageVisible } = useGlobeSceneEnvironment();
  const { isDark } = useIsDark();
  const { usMode } = useGlobeUsMode();

  return (
    <SpaceBackdrop
      isDark={isDark}
      reducedMotion={reducedMotion}
      fadeBottom
      className="fixed inset-0 -z-10"
    >
      {webglOk ? (
        <Canvas
          aria-hidden
          camera={{ position: [0, 0, 2.6], fov: 45 }}
          dpr={[1, 1.75]}
          frameloop={pageVisible ? "always" : "never"}
          gl={{ antialias: true, alpha: true }}
          style={{ touchAction: "pan-y" }}
        >
          {/* Soft fill so the night side stays readable; sunlight is real-time. */}
          <ambientLight intensity={isDark ? 0.28 : 0.36} />
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
          <ProgressGlobe
            profile={profile}
            reducedMotion={reducedMotion}
            isDark={isDark}
            usMode={usMode}
            handleRef={handleRef}
          />
        </Canvas>
      ) : webglOk === false && isDark ? (
        <StaticStarfield isDark />
      ) : null}
    </SpaceBackdrop>
  );
}
