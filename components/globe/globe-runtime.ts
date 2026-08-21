"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import {
  getGlobePerfTier,
  GLOBE_ATMOSPHERE_SEGMENTS_BY_TIER,
  GLOBE_DPR_CAP_BY_TIER,
  GLOBE_FRAMELOOP_IDLE_MS,
  GLOBE_SPHERE_SEGMENTS_BY_TIER,
  GLOBE_STAR_COUNT_BY_TIER,
  type GlobePerfTier,
} from "@/lib/globe-performance";
import { supportsWebGL } from "@/lib/webgl";

export const GLOBE_ROTATION_SPEED = 0.055;
/** Pointer travel (px) below which a release counts as a tap, not a drag. */
export const GLOBE_TAP_TRAVEL_THRESHOLD = 8;
/** Radians of spin per pixel of pointer drag. */
export const GLOBE_DRAG_SPIN_FACTOR = 0.006;
/** Max mesh tilt (radians) from vertical drag before clamping. */
export const GLOBE_MAX_TILT = Math.PI * 0.45;
/** Idle time after a drag before the globe eases back onto its default axis. */
export const GLOBE_IDLE_RETURN_DELAY_MS = 2000;
/** Idle time before the globe starts auto-spinning from its current perspective. */
export const GLOBE_IDLE_AUTO_SPIN_MS = 8000;
/** Damping factor for easing tilt back to the default axis (higher = snappier). */
export const GLOBE_TILT_RETURN_DAMP = 2.4;

export type GlobeSceneEnvironment = {
  /** null until detection runs on the client. */
  webglOk: boolean | null;
  reducedMotion: boolean;
  pageVisible: boolean;
  perfTier: GlobePerfTier;
};

/** Client-side WebGL support, reduced-motion preference, and tab visibility. */
export function useGlobeSceneEnvironment(): GlobeSceneEnvironment {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [perfTier, setPerfTier] = useState<GlobePerfTier>("desktop");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglOk(supportsWebGL());
    setPerfTier(getGlobePerfTier());
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

  return { webglOk, reducedMotion, pageVisible, perfTier };
}

/**
 * Keeps the R3F canvas in `always` while interacting / animating, then drops
 * to `demand` after idle so phones aren't burning GPU when the globe sits still.
 */
export function useGlobeFrameloop(
  pageVisible: boolean,
  { forceAlways = false }: { forceAlways?: boolean } = {},
): {
  frameloop: "always" | "demand" | "never";
  bumpActivity: () => void;
} {
  const [active, setActive] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpActivity = useCallback(() => {
    setActive(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setActive(false);
      idleTimerRef.current = null;
    }, GLOBE_FRAMELOOP_IDLE_MS);
  }, []);

  useEffect(() => {
    // Kick the idle timer so a freshly mounted globe isn't stuck in `always`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    bumpActivity();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [bumpActivity]);

  if (!pageVisible) return { frameloop: "never", bumpActivity };
  if (forceAlways || active) return { frameloop: "always", bumpActivity };
  return { frameloop: "demand", bumpActivity };
}

/** DPR range and antialias settings for the current performance tier. */
export function getGlobeCanvasGlSettings(tier: GlobePerfTier) {
  const dprCap = GLOBE_DPR_CAP_BY_TIER[tier];
  return {
    dpr: [1, dprCap] as [number, number],
    // MSAA resolve drops sun alpha on transparent canvas pixels (desktop dark space).
    antialias: false,
    powerPreference: "high-performance" as const,
  };
}

export function getGlobeSphereSegments(tier: GlobePerfTier): number {
  return GLOBE_SPHERE_SEGMENTS_BY_TIER[tier];
}

export function getGlobeAtmosphereSegments(tier: GlobePerfTier): number {
  return GLOBE_ATMOSPHERE_SEGMENTS_BY_TIER[tier];
}

export function getGlobeStarCount(tier: GlobePerfTier): number {
  return GLOBE_STAR_COUNT_BY_TIER[tier];
}

const MAX_CANVAS_RECOVERY_ATTEMPTS = 5;
/**
 * How long a freshly mounted renderer must survive before its recovery budget
 * is refilled. Resetting on mount alone would refill the budget on every
 * recovery attempt, so a device that keeps dropping the context would remount
 * the canvas forever — each remount replaying the intro zoom.
 */
const CANVAS_RECOVERY_STABLE_MS = 10_000;

/** Remount key for a globe Canvas after WebGL context loss. */
export function useGlobeCanvasKey() {
  const [canvasKey, setCanvasKey] = useState(0);
  const attemptsRef = useRef(0);

  const remountCanvas = useCallback(() => {
    if (attemptsRef.current >= MAX_CANVAS_RECOVERY_ATTEMPTS) return;
    attemptsRef.current += 1;
    requestAnimationFrame(() => {
      setCanvasKey((key) => key + 1);
    });
  }, []);

  const resetRecoveryAttempts = useCallback(() => {
    attemptsRef.current = 0;
  }, []);

  return { canvasKey, remountCanvas, resetRecoveryAttempts };
}

/** Detects a lost WebGL context and triggers a Canvas remount. */
export function GlobeContextRecovery({ onContextLost }: { onContextLost: () => void }) {
  const gl = useThree((state) => state.gl);
  const reportedRef = useRef(false);

  useEffect(() => {
    reportedRef.current = false;
    const canvas = gl.domElement;

    const handleLost = (event: Event) => {
      event.preventDefault();
      if (reportedRef.current) return;
      reportedRef.current = true;
      onContextLost();
    };

    canvas.addEventListener("webglcontextlost", handleLost);
    return () => canvas.removeEventListener("webglcontextlost", handleLost);
  }, [gl, onContextLost]);

  return null;
}

/** Refills the context-loss recovery budget once the renderer has held up. */
export function GlobeRecoveryReset({ onStable }: { onStable: () => void }) {
  useEffect(() => {
    const id = setTimeout(onStable, CANVAS_RECOVERY_STABLE_MS);
    return () => clearTimeout(id);
  }, [onStable]);

  return null;
}

/** Pointer capture can throw for already-released or synthetic pointers. */
export function trySetPointerCapture(target: Element, pointerId: number) {
  try {
    target.setPointerCapture?.(pointerId);
  } catch {
    // Dragging still works without capture; moves just stop at the globe edge.
  }
}

export function tryReleasePointerCapture(target: Element, pointerId: number) {
  try {
    target.releasePointerCapture?.(pointerId);
  } catch {
    // Already released.
  }
}
