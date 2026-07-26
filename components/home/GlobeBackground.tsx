"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { buildGlobeTextureCanvas } from "@/lib/globe-texture";
import type { Profile } from "@/lib/types";

const GLOBE_ROTATION_SPEED = 0.045;

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
  handleRef?: React.RefObject<GlobeHandle | null>;
};

/** Pointer travel (px) below which a release counts as a tap, not a drag. */
const TAP_TRAVEL_THRESHOLD = 8;
/** Radians of spin per pixel of horizontal drag. */
const DRAG_SPIN_FACTOR = 0.006;

type DragState = { pointerId: number; lastX: number; traveled: number };

/** Pointer capture can throw for already-released or synthetic pointers. */
function trySetPointerCapture(target: Element, pointerId: number) {
  try {
    target.setPointerCapture?.(pointerId);
  } catch {
    // Dragging still works without capture; moves just stop at the globe edge.
  }
}

function tryReleasePointerCapture(target: Element, pointerId: number) {
  try {
    target.releasePointerCapture?.(pointerId);
  } catch {
    // Already released.
  }
}

function ProgressGlobe({ profile, reducedMotion, handleRef }: GlobeProps) {
  const router = useRouter();
  const globeRef = useRef<THREE.Mesh>(null);
  const dragRef = useRef<DragState | null>(null);
  const externallyDraggingRef = useRef(false);

  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      spinByPixels: (deltaX) => {
        if (globeRef.current) globeRef.current.rotation.y += deltaX * DRAG_SPIN_FACTOR;
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

  const texture = useMemo(() => {
    const canvasTexture = new THREE.CanvasTexture(buildGlobeTextureCanvas(profile));
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    canvasTexture.anisotropy = 4;
    return canvasTexture;
  }, [profile]);

  useEffect(() => () => texture.dispose(), [texture]);

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
    if (navigateOnTap && drag.traveled < TAP_TRAVEL_THRESHOLD) {
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
          globeRef.current.rotation.y += deltaX * DRAG_SPIN_FACTOR;
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
      </mesh>
      {/* Cheap additive atmosphere halo around the planet's rim. */}
      <mesh scale={1.07}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial
          color="#2dd4bf"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Deterministic star specks for the no-WebGL fallback. */
function StaticStarfield() {
  const stars = Array.from({ length: 70 }, (_, i) => ({
    left: `${(i * 61) % 100}%`,
    top: `${(i * 37 + 11) % 100}%`,
    size: i % 5 === 0 ? 2 : 1,
    delay: `${(i % 7) * 0.6}s`,
  }));
  return (
    <div className="absolute inset-0">
      {stars.map((star, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white/80 [animation:star-twinkle_4s_ease-in-out_infinite]"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animationDelay: star.delay,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Full-screen outer-space backdrop for the home page: black space with a
 * nebula glow, star field, shooting stars, and a slowly spinning 3D globe
 * painted with the player's actual country mastery. Tapping the planet opens
 * the full progress map.
 */
export default function GlobeBackground({
  profile,
  handleRef,
}: {
  profile: Profile | null;
  handleRef?: React.RefObject<GlobeHandle | null>;
}) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglOk(supportsWebGL());
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onMotionChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", onMotionChange);

    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      query.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#020409]">
      {/* Nebula glow */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 45% at 18% 20%, rgb(45 212 191 / 0.12), transparent 65%)," +
            "radial-gradient(ellipse 55% 40% at 85% 12%, rgb(99 102 241 / 0.12), transparent 60%)," +
            "radial-gradient(ellipse 70% 55% at 50% 92%, rgb(14 116 144 / 0.16), transparent 65%)",
        }}
      />

      {webglOk ? (
        <Canvas
          aria-hidden
          camera={{ position: [0, 0, 2.6], fov: 45 }}
          dpr={[1, 1.75]}
          frameloop={pageVisible ? "always" : "never"}
          gl={{ antialias: true, alpha: true }}
          style={{ touchAction: "pan-y" }}
        >
          <ambientLight intensity={1.15} />
          <directionalLight position={[3, 2, 4]} intensity={1.7} />
          <Stars
            radius={60}
            depth={40}
            count={1600}
            factor={3}
            saturation={0}
            fade
            speed={reducedMotion ? 0 : 0.6}
          />
          <ProgressGlobe profile={profile} reducedMotion={reducedMotion} handleRef={handleRef} />
        </Canvas>
      ) : webglOk === false ? (
        <StaticStarfield />
      ) : null}

      {!reducedMotion && (
        <>
          <span aria-hidden className="shooting-star" style={{ top: "12%", right: "4%" }} />
          <span
            aria-hidden
            className="shooting-star"
            style={{ top: "32%", right: "-6%", animationDelay: "5.5s" }}
          />
        </>
      )}

      {/* Soften the lower half so foreground cards stay readable. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#020409]/85 to-transparent"
      />
    </div>
  );
}
