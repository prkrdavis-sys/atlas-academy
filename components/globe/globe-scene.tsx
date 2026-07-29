"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, useTexture } from "@react-three/drei";
import * as THREE from "three";
import {
  createGlobeTexturePaint,
  getGlobePalette,
  MASTERY_FX_STATIC_PHASE,
  resolveGlobeTextureSize,
  type GlobeUsMode,
} from "@/lib/globe-texture";
import {
  loadMasteryGoldColorImage,
  loadMasteryGoldRoughnessImage,
} from "@/lib/mastery-gold-texture";
import { masteryFxPhaseFromTime } from "@/lib/map-mastery-fx";
import {
  getGlobePerfTier,
  GLOBE_ATMOSPHERE_SEGMENTS_BY_TIER,
  GLOBE_DPR_CAP_BY_TIER,
  GLOBE_FRAMELOOP_IDLE_MS,
  GLOBE_MASTERY4_FRAME_MS_BY_TIER,
  GLOBE_SPHERE_SEGMENTS_BY_TIER,
  GLOBE_STAR_COUNT_BY_TIER,
  isGlobeFxConstrained,
  type GlobePerfTier,
} from "@/lib/globe-performance";
import { subsolarDirection } from "@/lib/sun-position";
import { supportsWebGL } from "@/lib/webgl";
import type { MapProgressDifficulty, Profile } from "@/lib/types";

export const GLOBE_ROTATION_SPEED = 0.045;
/** Pointer travel (px) below which a release counts as a tap, not a drag. */
export const GLOBE_TAP_TRAVEL_THRESHOLD = 8;
/** Radians of spin per pixel of pointer drag. */
export const GLOBE_DRAG_SPIN_FACTOR = 0.006;
/** Max mesh tilt (radians) from vertical drag before clamping. */
export const GLOBE_MAX_TILT = Math.PI * 0.45;
/** Idle time after a drag before the globe eases back onto its default axis. */
export const GLOBE_IDLE_RETURN_DELAY_MS = 2000;
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
    antialias: tier !== "phone",
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

/** Resets context-loss recovery once the renderer has mounted. */
export function GlobeRecoveryReset({ onStable }: { onStable: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(onStable);
    return () => cancelAnimationFrame(id);
  }, [onStable]);

  return null;
}

export type GlobeTextureConfig = {
  difficulty: MapProgressDifficulty;
  usMode: GlobeUsMode;
  isDark: boolean;
  /** Place currently selected on the interactive map globe. */
  selectedCode?: string | null;
  perfTier?: GlobePerfTier;
};

export type GlobeSurfaceMaps = {
  map: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture | null;
  roughnessMap: THREE.CanvasTexture | null;
};

/**
 * Builds the progress-painted planet texture at the highest resolution the
 * device's GPU comfortably supports, rebuilding when inputs change. Hard
 * mastery-4 places get a gentle holographic drift; Normal gold uses a brushed
 * metal albedo plus metalness/roughness maps so sunlight catches those places.
 * Selection highlight updates without rebuilding the base layer.
 */
export function useGlobeTexture(
  profile: Profile | null,
  {
    difficulty,
    usMode,
    isDark,
    selectedCode = null,
    perfTier = getGlobePerfTier(),
  }: GlobeTextureConfig,
): GlobeSurfaceMaps {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const fxConstrained = isGlobeFxConstrained(perfTier);
  const size = useMemo(
    () => resolveGlobeTextureSize(gl.capabilities.maxTextureSize, perfTier),
    [gl.capabilities.maxTextureSize, perfTier],
  );

  const [goldMaps, setGoldMaps] = useState<{
    color: HTMLImageElement | null;
    roughness: HTMLImageElement | null;
  }>({ color: null, roughness: null });

  useEffect(() => {
    if (difficulty !== "medium") {
      setGoldMaps({ color: null, roughness: null });
      return;
    }
    let cancelled = false;
    Promise.all([loadMasteryGoldColorImage(), loadMasteryGoldRoughnessImage()])
      .then(([color, roughness]) => {
        if (!cancelled) setGoldMaps({ color, roughness });
      })
      .catch(() => {
        if (!cancelled) setGoldMaps({ color: null, roughness: null });
      });
    return () => {
      cancelled = true;
    };
  }, [difficulty]);

  const paint = useMemo(
    () =>
      createGlobeTexturePaint(profile, {
        difficulty,
        usMode,
        isDark,
        size,
        selectedCode: null,
        phase: MASTERY_FX_STATIC_PHASE,
        allowCanvasGlow: !fxConstrained,
        allowMastery4Animation: !fxConstrained,
        goldColorImage: goldMaps.color,
        goldRoughnessImage: goldMaps.roughness,
      }),
    [profile, difficulty, usMode, isDark, size, fxConstrained, goldMaps],
  );

  const maps = useMemo(() => {
    const anisotropy = Math.min(
      fxConstrained ? 2 : 8,
      gl.capabilities.getMaxAnisotropy(),
    );

    const map = new THREE.CanvasTexture(paint.canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = anisotropy;

    const metalnessMap = paint.metalnessCanvas
      ? new THREE.CanvasTexture(paint.metalnessCanvas)
      : null;
    if (metalnessMap) {
      metalnessMap.colorSpace = THREE.NoColorSpace;
      metalnessMap.anisotropy = anisotropy;
    }

    const roughnessMap = paint.roughnessCanvas
      ? new THREE.CanvasTexture(paint.roughnessCanvas)
      : null;
    if (roughnessMap) {
      roughnessMap.colorSpace = THREE.NoColorSpace;
      roughnessMap.anisotropy = anisotropy;
    }

    return { map, metalnessMap, roughnessMap };
  }, [paint, gl, fxConstrained]);

  useEffect(
    () => () => {
      maps.map.dispose();
      maps.metalnessMap?.dispose();
      maps.roughnessMap?.dispose();
    },
    [maps],
  );

  // Selection is an overlay layer — update without rebuilding the base canvas.
  useEffect(() => {
    paint.setSelectedCode(selectedCode);
    if (!paint.animateMastery4) {
      paint.paintFrame(MASTERY_FX_STATIC_PHASE);
    } else {
      paint.paintFrame(masteryFxPhaseFromTime(performance.now(), 5500));
    }
    maps.map.needsUpdate = true;
    invalidate();
  }, [paint, selectedCode, maps, invalidate]);

  useEffect(() => {
    if (!paint.animateMastery4) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let lastPaint = 0;
    const frameIntervalMs = GLOBE_MASTERY4_FRAME_MS_BY_TIER[perfTier];

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const tick = (now: number) => {
      if (now - lastPaint >= frameIntervalMs) {
        lastPaint = now;
        paint.paintFrame(masteryFxPhaseFromTime(now, 5500));
        maps.map.needsUpdate = true;
        invalidate();
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    };

    const syncMotion = () => {
      if (motionQuery.matches) {
        stop();
        paint.paintFrame(MASTERY_FX_STATIC_PHASE);
        maps.map.needsUpdate = true;
        invalidate();
        return;
      }
      start();
    };

    syncMotion();
    motionQuery.addEventListener("change", syncMotion);

    return () => {
      stop();
      motionQuery.removeEventListener("change", syncMotion);
    };
  }, [paint, maps, invalidate, perfTier]);

  return maps;
}

/** Cheap additive atmosphere halo around the planet's rim. */
export function GlobeAtmosphere({
  isDark,
  perfTier = "desktop",
}: {
  isDark: boolean;
  perfTier?: GlobePerfTier;
}) {
  const segments = getGlobeAtmosphereSegments(perfTier);
  return (
    <mesh scale={1.07}>
      <sphereGeometry args={[1, segments, segments]} />
      <meshBasicMaterial
        color={isDark ? "#2dd4bf" : "#38bdf8"}
        transparent
        opacity={isDark ? 0.1 : 0.16}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Planet surface material: enough gloss for a polished 3D globe, still matte
 * enough that mastery colors and borders stay readable. Phones use Lambert
 * (no specular/emissiveMap double-sample) to cut fill-rate. When metalness /
 * roughness maps are present (Normal gold mastery), sunlight catches those
 * places more than default land — and a soft gold emissive keeps the color
 * readable even on the shaded side of the globe.
 */
export function GlobeSurfaceMaterial({
  map,
  metalnessMap = null,
  roughnessMap = null,
  dayNight,
  isDark,
  perfTier = "desktop",
}: {
  map: THREE.Texture;
  metalnessMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  dayNight: boolean;
  isDark: boolean;
  perfTier?: GlobePerfTier;
}) {
  if (perfTier === "phone") {
    return <meshLambertMaterial map={map} />;
  }

  const hasMetalMaps = Boolean(metalnessMap && roughnessMap);

  // Gold mastery: subtle fill-light so shaded countries stay gold, not neon.
  // metalnessMap is white only on gold mastery places.
  // Day/night: soft map emissive lifts the night hemisphere (stronger in dark).
  const emissiveMap = hasMetalMaps
    ? metalnessMap!
    : dayNight
      ? map
      : undefined;
  const emissive = hasMetalMaps
    ? "#c9a227"
    : dayNight
      ? "#ffffff"
      : "#000000";
  const emissiveIntensity = hasMetalMaps
    ? 0.22
    : dayNight
      ? isDark
        ? 0.2
        : 0.1
      : 0;

  return (
    <meshStandardMaterial
      map={map}
      metalnessMap={metalnessMap ?? undefined}
      roughnessMap={roughnessMap ?? undefined}
      emissiveMap={emissiveMap}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      roughness={hasMetalMaps ? 1 : dayNight ? 0.72 : 0.52}
      // Enough metal for brushed sheen; enough diffuse for gold in shadow.
      metalness={hasMetalMaps ? 0.32 : dayNight ? 0.04 : 0.08}
    />
  );
}

/**
 * Scene fill lights for the globe. Day/night on: dim ambient so the real-time
 * sun casts a clear terminator. Day/night off: bright ambient so the planet
 * stays vivid, while a weak realtime sun still adds a subtle shade.
 */
export function GlobeFillLights({
  isDark,
  dayNight,
}: {
  isDark: boolean;
  dayNight: boolean;
}) {
  if (dayNight) {
    // Raised floor so oceans and mastery stay readable on the night hemisphere.
    return <ambientLight intensity={isDark ? 0.9 : 0.72} />;
  }
  // Bright enough that the soft sun shade never swallows oceans or land.
  return <ambientLight intensity={isDark ? 2.05 : 1.6} />;
}

/**
 * Real-time sunlight for the planet mesh. Mount as a child of the earth mesh
 * so the day/night terminator stays locked to geographic longitude while the
 * globe spins or the camera orbits. Always on: strong when day/night is
 * enabled, a minimal shade when it is not.
 */
export function EarthSunLight({
  isDark,
  dayNight,
}: {
  isDark: boolean;
  dayNight: boolean;
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useLayoutEffect(() => {
    const light = lightRef.current;
    if (!light?.parent) return;
    // DirectionalLight.target is not auto-parented; keep it at the mesh origin
    // so the beam tracks the spinning earth instead of world (0,0,0).
    light.target.position.set(0, 0, 0);
    light.parent.add(light.target);
    return () => {
      light.target.removeFromParent();
    };
  }, []);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    const sun = subsolarDirection();
    light.position.set(sun.x, sun.y, sun.z).multiplyScalar(5);
  });

  // Full day/night: strong terminator. Off: just enough realtime shade to read.
  // Light-mode daylight runs hotter so the sunlit hemisphere pops.
  const intensity = dayNight
    ? isDark
      ? 2.15
      : 2.55
    : isDark
      ? 0.72
      : 0.58;

  return <directionalLight ref={lightRef} intensity={intensity} color="#fff4e0" />;
}

/**
 * Cool anti-solar fill (earthshine) for the night hemisphere. Mount as a child
 * of the earth mesh so the moonlit wash stays locked to geography.
 */
export function EarthshineLight({
  isDark,
  dayNight,
}: {
  isDark: boolean;
  dayNight: boolean;
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useLayoutEffect(() => {
    const light = lightRef.current;
    if (!light?.parent) return;
    light.target.position.set(0, 0, 0);
    light.parent.add(light.target);
    return () => {
      light.target.removeFromParent();
    };
  }, []);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    const sun = subsolarDirection();
    light.position.set(-sun.x, -sun.y, -sun.z).multiplyScalar(5);
  });

  if (!dayNight) return null;

  // Stronger fill in light mode so the night side stays legible without
  // flattening the terminator.
  const intensity = isDark ? 0.7 : 0.55;
  const color = isDark ? "#8eb4d4" : "#9ec0dc";

  return <directionalLight ref={lightRef} intensity={intensity} color={color} />;
}

/** How far the visible sun sits from Earth's center (mesh-local units). */
const DISTANT_SUN_DISTANCE = 56;

/**
 * Designed luminous plate (AIA 171 disk + soft circular corona).
 * Public domain NASA source — see public/globe/SUN_ATTRIBUTION.txt.
 * PNG alpha falls to zero before the frame edge so no square outline shows.
 */
const SUN_TEXTURE_URL = "/globe/sun.png";
/** Soft radial falloff sprite for wash / bloom (no hard circle edge). */
const SUN_GLOW_TEXTURE_URL = "/globe/sun-glow.png";

/** Preloads sun textures on the client after the Canvas mounts. */
export function GlobeAssetPreloader() {
  useEffect(() => {
    useTexture.preload(SUN_TEXTURE_URL);
    useTexture.preload(SUN_GLOW_TEXTURE_URL);
  }, []);
  return null;
}

/** Ocean-colored placeholder shown while the painted globe texture loads. */
export function GlobeLoadingSphere({
  isDark,
  perfTier = "desktop",
}: {
  isDark: boolean;
  perfTier?: GlobePerfTier;
}) {
  const ocean = getGlobePalette(isDark).ocean;
  const segments = getGlobeSphereSegments(perfTier);
  return (
    <mesh>
      <sphereGeometry args={[1, segments, segments]} />
      <meshBasicMaterial color={ocean} />
    </mesh>
  );
}

/** Forces initial draws after Canvas mount (avoids a blank first frame). */
export function GlobeInitialInvalidate() {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
    const id = requestAnimationFrame(() => invalidate());
    const id2 = requestAnimationFrame(() => invalidate());
    return () => {
      cancelAnimationFrame(id);
      cancelAnimationFrame(id2);
    };
  }, [invalidate]);
  return null;
}

/** Skip picking so the sun never steals globe taps. */
function ignoreRaycast() {}

const sunAdditive = {
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
} as const;

function DistantSunVisual({
  isDark,
  perfTier = "desktop",
}: {
  isDark: boolean;
  perfTier?: GlobePerfTier;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Group>(null);
  const [plateMap, glowMap] = useTexture([SUN_TEXTURE_URL, SUN_GLOW_TEXTURE_URL]);
  const simplified = perfTier === "phone";

  useLayoutEffect(() => {
    for (const texture of [plateMap, glowMap]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(simplified ? 1 : 8, texture.anisotropy || 1);
      texture.premultiplyAlpha = true;
    }
  }, [plateMap, glowMap, simplified]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const sun = subsolarDirection();
    group.position.set(sun.x, sun.y, sun.z).multiplyScalar(DISTANT_SUN_DISTANCE);

    const pulse = pulseRef.current;
    if (pulse && !simplified) {
      const breathe = 1 + Math.sin(clock.elapsedTime * 0.55) * 0.03;
      pulse.scale.setScalar(breathe);
    }
  });

  // Soft radial sprites — glow map alpha dies before the quad edge, so nothing
  // reads as a square or hard ring in additive space. The NASA plate is dark-
  // limb imagery: skip it in light mode or its near-opaque brown pixels
  // darken the pale CSS sky into a black ring through the transparent canvas.
  const wash = isDark ? 0.55 : 0.78;
  const bloom = isDark ? 0.65 : 0.92;
  const plate = 0.92;
  const core = isDark ? 0.55 : 0.85;

  return (
    <group ref={groupRef} frustumCulled={false}>
      <Billboard follow>
        <group ref={pulseRef}>
          {!simplified ? (
            <>
              <mesh scale={14} raycast={ignoreRaycast} frustumCulled={false}>
                <planeGeometry args={[2, 2]} />
                <meshBasicMaterial
                  map={glowMap}
                  color="#fff1c2"
                  opacity={wash * 0.35}
                  {...sunAdditive}
                />
              </mesh>
              <mesh scale={9} raycast={ignoreRaycast} frustumCulled={false}>
                <planeGeometry args={[2, 2]} />
                <meshBasicMaterial
                  map={glowMap}
                  color="#ffc15a"
                  opacity={bloom * 0.45}
                  {...sunAdditive}
                />
              </mesh>
            </>
          ) : null}
          <mesh scale={simplified ? 7 : 5.6} raycast={ignoreRaycast} frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial
              map={glowMap}
              color="#ffe08a"
              opacity={bloom * (simplified ? 0.4 : 0.55)}
              {...sunAdditive}
            />
          </mesh>

          {/* Textured disk + baked corona — dark space only (see note above). */}
          {isDark ? (
            <mesh scale={simplified ? 4.2 : 5.4} raycast={ignoreRaycast} frustumCulled={false}>
              <planeGeometry args={[2, 2]} />
              <meshBasicMaterial map={plateMap} opacity={plate} {...sunAdditive} />
            </mesh>
          ) : null}

          {/* Soft white-hot core (same glow sprite, small). */}
          {!simplified ? (
            <>
              <mesh scale={2.1} raycast={ignoreRaycast} frustumCulled={false}>
                <planeGeometry args={[2, 2]} />
                <meshBasicMaterial
                  map={glowMap}
                  color="#fffaf0"
                  opacity={core * 0.55}
                  {...sunAdditive}
                />
              </mesh>
              <mesh scale={0.95} raycast={ignoreRaycast} frustumCulled={false}>
                <planeGeometry args={[2, 2]} />
                <meshBasicMaterial
                  map={glowMap}
                  color="#ffffff"
                  opacity={core * 0.75}
                  {...sunAdditive}
                />
              </mesh>
            </>
          ) : null}
          {/* Phone light mode has no plate — keep a small hot core so the sun
              still reads as a disk against the pale sky. */}
          {simplified && !isDark ? (
            <mesh scale={1.35} raycast={ignoreRaycast} frustumCulled={false}>
              <planeGeometry args={[2, 2]} />
              <meshBasicMaterial
                map={glowMap}
                color="#ffffff"
                opacity={core * 0.7}
                {...sunAdditive}
              />
            </mesh>
          ) : null}
        </group>
      </Billboard>
    </group>
  );
}

/**
 * Bright distant sun in outer space, locked to the real subsolar direction.
 * Always mounted (independent of the day/night lighting toggle) as a child of
 * the earth mesh so it stays aligned with geography while the globe spins.
 * Dark mode uses a NASA SDO AIA 171 plate; light mode uses soft glow sprites
 * only so the plate's dark limb never rings against the pale sky.
 */
export function DistantSun({
  isDark,
  perfTier = "desktop",
}: {
  isDark: boolean;
  perfTier?: GlobePerfTier;
}) {
  return (
    <Suspense fallback={null}>
      <DistantSunVisual isDark={isDark} perfTier={perfTier} />
    </Suspense>
  );
}

/** Shell radius aligned with the drei Stars field so nebulas parallax the same way. */
const CELESTIAL_NEBULA_RADIUS = 68;

type CelestialNebulaSpec = {
  azimuthDeg: number;
  elevationDeg: number;
  color: string;
  scale: number;
  widthStretch: number;
  opacity: number;
};

const DARK_CELESTIAL_NEBULA_SPECS: CelestialNebulaSpec[] = [
  { azimuthDeg: -138, elevationDeg: 24, color: "#2dd4bf", scale: 44, widthStretch: 1.5, opacity: 0.2 },
  { azimuthDeg: 38, elevationDeg: 20, color: "#6366f1", scale: 40, widthStretch: 1.4, opacity: 0.18 },
  { azimuthDeg: 0, elevationDeg: -34, color: "#0e7490", scale: 50, widthStretch: 1.65, opacity: 0.24 },
];

const LIGHT_CELESTIAL_NEBULA_SPECS: CelestialNebulaSpec[] = [
  { azimuthDeg: -138, elevationDeg: 24, color: "#0d9488", scale: 44, widthStretch: 1.5, opacity: 0.16 },
  { azimuthDeg: 38, elevationDeg: 20, color: "#6366f1", scale: 40, widthStretch: 1.4, opacity: 0.15 },
  { azimuthDeg: 0, elevationDeg: -34, color: "#38bdf8", scale: 50, widthStretch: 1.65, opacity: 0.2 },
];

function celestialNebulaPosition(
  radius: number,
  azimuthDeg: number,
  elevationDeg: number,
): [number, number, number] {
  const azimuth = THREE.MathUtils.degToRad(azimuthDeg);
  const elevation = THREE.MathUtils.degToRad(elevationDeg);
  const cosElevation = Math.cos(elevation);
  return [
    radius * cosElevation * Math.sin(azimuth),
    radius * Math.sin(elevation),
    radius * cosElevation * Math.cos(azimuth),
  ];
}

let nebulaGlowTexture: THREE.CanvasTexture | null = null;

function getNebulaGlowTexture(): THREE.CanvasTexture {
  if (nebulaGlowTexture) return nebulaGlowTexture;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create nebula glow canvas");

  const center = size / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  gradient.addColorStop(0.28, "rgba(255, 255, 255, 0.38)");
  gradient.addColorStop(0.58, "rgba(255, 255, 255, 0.07)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  nebulaGlowTexture = new THREE.CanvasTexture(canvas);
  nebulaGlowTexture.colorSpace = THREE.SRGBColorSpace;
  return nebulaGlowTexture;
}

const nebulaAdditive = {
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
} as const;

function CelestialNebulaPatch({
  position,
  color,
  scale,
  widthStretch,
  opacity,
  map,
}: CelestialNebulaSpec & { position: [number, number, number]; map: THREE.Texture }) {
  const groupRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    groupRef.current?.lookAt(0, 0, 0);
  }, [position]);

  return (
    <group ref={groupRef} position={position} frustumCulled={false}>
      <mesh
        scale={[scale * widthStretch, scale, 1]}
        raycast={ignoreRaycast}
        frustumCulled={false}
      >
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          map={map}
          color={color}
          opacity={opacity * 0.6}
          side={THREE.BackSide}
          {...nebulaAdditive}
        />
      </mesh>
      <mesh scale={[scale * widthStretch * 0.72, scale * 0.72, 1]} raycast={ignoreRaycast} frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          map={map}
          color={color}
          opacity={opacity}
          side={THREE.BackSide}
          {...nebulaAdditive}
        />
      </mesh>
    </group>
  );
}

type CelestialNebulaeProps = {
  isDark: boolean;
  /** When set, nebulas rotate with the globe mesh (home page drag / auto-spin). */
  spinRef?: RefObject<THREE.Object3D | null>;
};

/**
 * Faint nebula washes pinned to the inner surface of the celestial sphere.
 * Camera orbit parallax matches drei Stars; optional spinRef keeps them aligned
 * when the home globe is dragged.
 */
export function CelestialNebulae({ isDark, spinRef }: CelestialNebulaeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const map = useMemo(() => getNebulaGlowTexture(), []);
  const specs = isDark ? DARK_CELESTIAL_NEBULA_SPECS : LIGHT_CELESTIAL_NEBULA_SPECS;

  useFrame(() => {
    const group = groupRef.current;
    const spin = spinRef?.current;
    if (!group || !spin) return;
    group.rotation.copy(spin.rotation);
  });

  return (
    <group ref={groupRef} frustumCulled={false}>
      {specs.map((spec) => (
        <CelestialNebulaPatch
          key={`${spec.color}-${spec.azimuthDeg}-${spec.elevationDeg}`}
          {...spec}
          map={map}
          position={celestialNebulaPosition(
            CELESTIAL_NEBULA_RADIUS,
            spec.azimuthDeg,
            spec.elevationDeg,
          )}
        />
      ))}
    </group>
  );
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
