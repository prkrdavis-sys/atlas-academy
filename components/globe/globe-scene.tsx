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
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { Billboard, Environment, useTexture } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  createGlobeTexturePaint,
  getGlobePalette,
  MASTERY_FX_STATIC_PHASE,
  resolveGlobeTextureSize,
  type GlobeUsMode,
} from "@/lib/globe-texture";
import { loadOceanDepthImage } from "@/lib/globe-ocean-depth";
import { loadLandColorImage } from "@/lib/globe-land-color";
import {
  loadMasteryGoldPbrImages,
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

export const GLOBE_ROTATION_SPEED = 0.055;
/** Pointer travel (px) below which a release counts as a tap, not a drag. */
export const GLOBE_TAP_TRAVEL_THRESHOLD = 8;
/** Radians of spin per pixel of pointer drag. */
export const GLOBE_DRAG_SPIN_FACTOR = 0.006;
/** Max mesh tilt (radians) from vertical drag before clamping. */
export const GLOBE_MAX_TILT = Math.PI * 0.45;
/** Idle time after a drag before the globe eases back onto its default axis. */
export const GLOBE_IDLE_RETURN_DELAY_MS = 2000;
/** Idle time after map-globe interaction before leveling tilt and resuming auto-spin. */
export const GLOBE_IDLE_RESET_MS = 7000;
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
  normalMap: THREE.CanvasTexture | null;
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
    normal: HTMLImageElement | null;
  }>({ color: null, roughness: null, normal: null });

  const [oceanDepthImage, setOceanDepthImage] = useState<HTMLImageElement | null>(null);
  const [landColorImage, setLandColorImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadOceanDepthImage()
      .then((image) => {
        if (!cancelled) setOceanDepthImage(image);
      })
      .catch(() => {
        // Flat ocean fill remains the fallback.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLandColorImage()
      .then((image) => {
        if (!cancelled) setLandColorImage(image);
      })
      .catch(() => {
        // Flat land fill remains the fallback.
        if (!cancelled) setLandColorImage(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (difficulty !== "medium") {
      setGoldMaps({ color: null, roughness: null, normal: null });
      return;
    }
    let cancelled = false;
    loadMasteryGoldPbrImages()
      .then((images) => {
        if (!cancelled) setGoldMaps(images);
      })
      .catch(() => {
        if (!cancelled) setGoldMaps({ color: null, roughness: null, normal: null });
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
        oceanDepthImage,
        landColorImage,
        goldColorImage: goldMaps.color,
        goldRoughnessImage: goldMaps.roughness,
        goldNormalImage: goldMaps.normal,
      }),
    [profile, difficulty, usMode, isDark, size, fxConstrained, goldMaps, oceanDepthImage, landColorImage],
  );

  const maps = useMemo(() => {
    const anisotropy = Math.min(
      fxConstrained ? 2 : 8,
      gl.capabilities.getMaxAnisotropy(),
    );

    const configureCanvasTexture = (texture: THREE.CanvasTexture) => {
      // CanvasTexture mipmaps flicker/band when the canvas is repainted (selection,
      // mastery FX). Linear filtering keeps borders and fills stable.
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = anisotropy;
    };

    const map = new THREE.CanvasTexture(paint.canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    configureCanvasTexture(map);

    const metalnessMap = paint.metalnessCanvas
      ? new THREE.CanvasTexture(paint.metalnessCanvas)
      : null;
    if (metalnessMap) {
      metalnessMap.colorSpace = THREE.NoColorSpace;
      configureCanvasTexture(metalnessMap);
    }

    const roughnessMap = paint.roughnessCanvas
      ? new THREE.CanvasTexture(paint.roughnessCanvas)
      : null;
    if (roughnessMap) {
      roughnessMap.colorSpace = THREE.NoColorSpace;
      configureCanvasTexture(roughnessMap);
    }

    const normalMap = paint.normalCanvas
      ? new THREE.CanvasTexture(paint.normalCanvas)
      : null;
    if (normalMap) {
      normalMap.colorSpace = THREE.NoColorSpace;
      configureCanvasTexture(normalMap);
    }

    return { map, metalnessMap, roughnessMap, normalMap };
  }, [paint, gl, fxConstrained]);

  useEffect(
    () => () => {
      maps.map.dispose();
      maps.metalnessMap?.dispose();
      maps.roughnessMap?.dispose();
      maps.normalMap?.dispose();
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

/**
 * Additive atmosphere halo around the planet's rim. When `controlsRef` is set
 * (map explorer), opacity fades out as the globe fills the viewport so the
 * low-poly shell cannot wash the ocean in rectangular bands.
 */
export function GlobeAtmosphere({
  isDark,
  perfTier = "desktop",
  controlsRef,
}: {
  isDark: boolean;
  perfTier?: GlobePerfTier;
  controlsRef?: RefObject<OrbitControlsImpl | null>;
}) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const segments = getGlobeAtmosphereSegments(perfTier);
  const baseOpacity = isDark ? 0.1 : 0.16;

  useFrame(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const controls = controlsRef?.current;
    if (!controls || !(camera instanceof THREE.PerspectiveCamera)) {
      mat.opacity = baseOpacity;
      return;
    }
    const fillAt = globeFillDistance(
      camera.fov,
      size.width / Math.max(size.height, 1),
    );
    const distance = controls.getDistance();
    const fadeStart = fillAt * 1.35;
    const fadeEnd = fillAt * 0.95;
    let strength = 1;
    if (distance <= fadeEnd) strength = 0;
    else if (distance < fadeStart) {
      const t = (distance - fadeEnd) / (fadeStart - fadeEnd);
      strength = t * t * (3 - 2 * t);
    }
    mat.opacity = baseOpacity * strength;
  });

  return (
    <mesh scale={1.07} raycast={ignoreRaycast}>
      <sphereGeometry args={[1, segments, segments]} />
      <meshBasicMaterial
        ref={materialRef}
        // Teal aura in dark space; a warm haze against the light-mode sunset sky.
        color={isDark ? "#2dd4bf" : "#ffb27d"}
        transparent
        opacity={baseOpacity}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * One lighting rig for every globe surface and zoom level.
 *
 * Day/night OFF: bright, even "studio" lighting — a readable base with a soft
 * key light for surface relief, stable at every camera distance.
 * Day/night ON: low ambient so the real-time sun casts a deep night shadow and
 * a sharp terminator; a thin earthshine wash keeps land faintly readable.
 */
function globeAmbientIntensity(isDark: boolean, dayNight: boolean): number {
  if (dayNight) return isDark ? 0.28 : 0.24;
  return isDark ? 1.12 : 1.02;
}

function globeHemisphereIntensity(dayNight: boolean): number {
  return dayNight ? 0.12 : 0.52;
}

function globeSunIntensity(dayNight: boolean): number {
  return dayNight ? 1.55 : 0.5;
}

function globeEarthshineIntensity(): number {
  return 0.22;
}

/**
 * Camera distance at which a unit globe's limb reaches the viewport corners
 * (outer space no longer visible). Matches the SpaceFlybys cutoff.
 */
export function globeFillDistance(
  fovDeg: number,
  aspect: number,
  radius = 1,
): number {
  const halfV = THREE.MathUtils.degToRad(fovDeg / 2);
  const halfH = Math.atan(Math.tan(halfV) * Math.max(aspect, 1e-6));
  const halfCorner = Math.atan(Math.hypot(Math.tan(halfH), Math.tan(halfV)));
  const sinCorner = Math.sin(halfCorner);
  if (sinCorner <= 1e-6) return radius;
  return radius / sinCorner;
}

/**
 * Worked-gold normal intensity — the map is baked from a real height field
 * (hammered dents + scratches), so slopes are already physical; this just
 * compensates for mip softening at globe scale so sun glints stay crisp.
 */
const GOLD_NORMAL_SCALE = new THREE.Vector2(2.4, 2.4);

/** PBR tuning for Normal mastery-4 gold vs the matte globe surface. */
export const GLOBE_GOLD_METALNESS = 0.96;
export const GLOBE_GOLD_ROUGHNESS = 1;
export const GLOBE_GOLD_EMISSIVE = "#c4921a";
export const GLOBE_GOLD_EMISSIVE_INTENSITY = 0.07;
export const GLOBE_GOLD_ENV_MAP_INTENSITY = 1.35;
export const GLOBE_MATTE_METALNESS = 0.04;
export const GLOBE_MATTE_ROUGHNESS = 0.72;
export const GLOBE_MATTE_ENV_MAP_INTENSITY = 0.15;

/** Shared StandardMaterial props for gold PBR on the globe and close-up patch. */
export function globeGoldSurfaceProps(hasMetalMaps: boolean) {
  return {
    metalness: hasMetalMaps ? GLOBE_GOLD_METALNESS : GLOBE_MATTE_METALNESS,
    roughness: hasMetalMaps ? GLOBE_GOLD_ROUGHNESS : GLOBE_MATTE_ROUGHNESS,
    emissive: hasMetalMaps ? GLOBE_GOLD_EMISSIVE : "#000000",
    emissiveIntensity: hasMetalMaps ? GLOBE_GOLD_EMISSIVE_INTENSITY : 0,
    envMapIntensity: hasMetalMaps ? GLOBE_GOLD_ENV_MAP_INTENSITY : GLOBE_MATTE_ENV_MAP_INTENSITY,
    normalScale: hasMetalMaps ? GOLD_NORMAL_SCALE : undefined,
  } as const;
}

/**
 * Subtle image-based lighting so mastered gold picks up environment reflections
 * while matte land stays diffuse-dominant (metalness map masks the response).
 */
export function GlobeMetalReflection({ perfTier = "desktop" }: { perfTier?: GlobePerfTier }) {
  if (perfTier === "phone") return null;
  return <Environment preset="city" environmentIntensity={0.35} />;
}

/**
 * Planet surface material: enough gloss for a polished 3D globe, still matte
 * enough that mastery colors and borders stay readable. Phones use Lambert
 * (no specular) unless Normal gold maps need brushed sheen. When metalness /
 * roughness maps are present (Normal gold mastery), sunlight catches those
 * places more than default land — and a soft gold emissive keeps the color
 * readable even on the shaded side of the globe.
 *
 * Day/night does NOT use the color map as emissiveMap — that turned borders and
 * selection glow into a globe-wide lit grid whenever the texture updated.
 * Night stays dark via low ambient; a thin earthshine wash keeps land faintly
 * readable without washing out the terminator.
 */
export function GlobeSurfaceMaterial({
  map,
  metalnessMap = null,
  roughnessMap = null,
  normalMap = null,
  perfTier = "desktop",
}: {
  map: THREE.Texture;
  metalnessMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  perfTier?: GlobePerfTier;
}) {
  const hasMetalMaps = Boolean(metalnessMap && roughnessMap);
  const goldProps = globeGoldSurfaceProps(hasMetalMaps);

  // Lambert avoids specular hotspots on constrained GPUs. Keep Standard when
  // gold metal maps need a sheen / brushed normals.
  if (perfTier === "phone" && !hasMetalMaps) {
    return <meshLambertMaterial map={map} />;
  }

  // Gold mastery: tiny emissive fill so shaded foil stays readable; specular +
  // normal maps carry the brushed-metal shine.
  const emissiveMap = hasMetalMaps ? metalnessMap! : undefined;

  return (
    <meshStandardMaterial
      map={map}
      metalnessMap={metalnessMap ?? undefined}
      roughnessMap={roughnessMap ?? undefined}
      normalMap={normalMap ?? undefined}
      normalScale={goldProps.normalScale}
      emissiveMap={emissiveMap}
      emissive={goldProps.emissive}
      emissiveIntensity={goldProps.emissiveIntensity}
      envMapIntensity={goldProps.envMapIntensity}
      roughness={goldProps.roughness}
      metalness={goldProps.metalness}
    />
  );
}

/**
 * Scene fill lights for the globe: an ambient base plus a soft hemisphere
 * bounce so the sphere always reads as a lit object. Day/night on: low fill
 * so the night hemisphere stays clearly in shadow. One rig for every surface
 * and zoom level.
 */
export function GlobeFillLights({
  isDark,
  dayNight,
}: {
  isDark: boolean;
  dayNight: boolean;
}) {
  return (
    <>
      <ambientLight intensity={globeAmbientIntensity(isDark, dayNight)} />
      <hemisphereLight
        color="#fffdf7"
        groundColor="#b9c6d8"
        intensity={globeHemisphereIntensity(dayNight)}
      />
    </>
  );
}

/**
 * Real-time sunlight for the planet mesh. Mount as a child of the earth mesh
 * so the day/night terminator stays locked to geographic longitude while the
 * globe spins or the camera orbits. With day/night off it stays a soft key
 * light that gives the surface relief without a visible terminator.
 */
export function EarthSunLight({ dayNight }: { dayNight: boolean }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const intensity = globeSunIntensity(dayNight);

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
    light.intensity = intensity;
  });

  return (
    <directionalLight
      ref={lightRef}
      intensity={intensity}
      color="#fff4e0"
    />
  );
}

/**
 * Cool anti-solar fill (earthshine / moonlight) for the night hemisphere.
 * Mount as a child of the earth mesh so the moonlit wash stays locked to
 * geography. Only active while day/night lighting is on.
 */
export function EarthshineLight({
  isDark,
  dayNight,
}: {
  isDark: boolean;
  dayNight: boolean;
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const baseIntensity = globeEarthshineIntensity();
  const color = isDark ? "#8eb4d4" : "#9ec0dc";
  const active = dayNight;

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
    light.intensity = active ? baseIntensity : 0;
  });

  if (!active) return null;

  return (
    <directionalLight ref={lightRef} intensity={baseIntensity} color={color} />
  );
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
/**
 * NASA Black Marble composite (public domain) — real city lights, so glow
 * appears only where people actually live. See public/globe/SUN_ATTRIBUTION.txt.
 */
const NIGHT_LIGHTS_TEXTURE_URL = "/globe/night-lights.jpg";

/** Preloads sun textures on the client after the Canvas mounts. */
export function GlobeAssetPreloader() {
  useEffect(() => {
    useTexture.preload(SUN_TEXTURE_URL);
    useTexture.preload(SUN_GLOW_TEXTURE_URL);
    useTexture.preload(NIGHT_LIGHTS_TEXTURE_URL);
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

/**
 * Light mode: additive RGB so the NASA plate's dark limb never rings the sunset
 * sky, plus accumulated alpha so the disk composites over transparent canvas
 * pixels (not just where the globe/atmosphere already wrote alpha).
 */
const sunLightBlend = {
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendEquationAlpha: THREE.AddEquation,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneFactor,
  toneMapped: false,
} as const;

/** Draw the dark-mode sun after the atmosphere so open-sky pixels get alpha. */
const SUN_RENDER_ORDER = 50;

function DistantSunVisual({
  isDark,
  anchorRef,
}: {
  isDark: boolean;
  perfTier?: GlobePerfTier;
  anchorRef?: RefObject<THREE.Mesh | null>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Group>(null);
  const [plateMap, glowMap] = useTexture([SUN_TEXTURE_URL, SUN_GLOW_TEXTURE_URL]);
  const sunOffset = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    for (const texture of [plateMap, glowMap]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 1;
      texture.premultiplyAlpha = true;
    }
  }, [plateMap, glowMap]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const sun = subsolarDirection();
    sunOffset.set(sun.x, sun.y, sun.z).multiplyScalar(DISTANT_SUN_DISTANCE);

    const anchor = anchorRef?.current;
    if (anchor) {
      anchor.updateWorldMatrix(true, false);
      sunOffset.applyMatrix4(anchor.matrixWorld);
      group.position.copy(sunOffset);
    } else {
      group.position.copy(sunOffset);
    }

    const pulse = pulseRef.current;
    if (pulse) {
      const breathe = 1 + Math.sin(clock.elapsedTime * 0.55) * 0.03;
      pulse.scale.setScalar(breathe);
    }
  });

  const bloom = isDark ? 0.65 : 0.85;
  const plate = isDark ? 0.92 : 1;
  const core = isDark ? 0.55 : 0.7;
  const renderAfterAtmosphere = isDark && anchorRef != null;

  if (isDark) {
    return (
      <group
        ref={groupRef}
        frustumCulled={false}
        renderOrder={renderAfterAtmosphere ? SUN_RENDER_ORDER : undefined}
      >
        <Billboard follow>
          <group ref={pulseRef}>
            <mesh scale={7} raycast={ignoreRaycast} frustumCulled={false}>
              <planeGeometry args={[2, 2]} />
              <meshBasicMaterial
                map={glowMap}
                color="#ffe08a"
                opacity={bloom * 0.4}
                {...sunLightBlend}
              />
            </mesh>
            <mesh scale={4.2} raycast={ignoreRaycast} frustumCulled={false}>
              <planeGeometry args={[2, 2]} />
              <meshBasicMaterial map={plateMap} opacity={plate} {...sunLightBlend} />
            </mesh>
            <mesh scale={1.1} raycast={ignoreRaycast} frustumCulled={false}>
              <planeGeometry args={[2, 2]} />
              <meshBasicMaterial
                map={glowMap}
                color="#ffffff"
                opacity={core * 0.72}
                {...sunLightBlend}
              />
            </mesh>
          </group>
        </Billboard>
      </group>
    );
  }

  // Light mode: glow-only stack — the NASA plate's dark limb rings the sunset sky.
  const wash = 0.72;

  return (
    <group ref={groupRef} frustumCulled={false}>
      <Billboard follow>
        <group ref={pulseRef}>
          <mesh scale={14} raycast={ignoreRaycast} frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial
              map={glowMap}
              color="#fff8e7"
              opacity={wash * 0.55}
              {...sunLightBlend}
            />
          </mesh>
          <mesh scale={8.5} raycast={ignoreRaycast} frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial
              map={glowMap}
              color="#ffe08a"
              opacity={bloom * 0.75}
              {...sunLightBlend}
            />
          </mesh>
          <mesh scale={4.8} raycast={ignoreRaycast} frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial map={glowMap} color="#fff4d0" opacity={0.95} {...sunLightBlend} />
          </mesh>
          <mesh scale={1.2} raycast={ignoreRaycast} frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial
              map={glowMap}
              color="#ffffff"
              opacity={core * 0.9}
              {...sunLightBlend}
            />
          </mesh>
        </group>
      </Billboard>
    </group>
  );
}

/**
 * Bright distant sun in outer space, locked to the real subsolar direction.
 * Dark mode uses the NASA plate plus glow; light mode is glow-only so the
 * plate's dark limb never rings the CSS sunset sky.
 */
export function DistantSun({
  isDark,
  perfTier = "desktop",
  anchorRef,
}: {
  isDark: boolean;
  perfTier?: GlobePerfTier;
  anchorRef?: RefObject<THREE.Mesh | null>;
}) {
  return (
    <Suspense fallback={null}>
      <DistantSunVisual isDark={isDark} perfTier={perfTier} anchorRef={anchorRef} />
    </Suspense>
  );
}

/** Sits above the close-up patch shell (1.001) so lights stay visible zoomed in. */
const CITY_LIGHTS_RADIUS = 1.004;

const CITY_LIGHTS_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vObjNormal;
  void main() {
    vUv = uv;
    vObjNormal = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CITY_LIGHTS_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uNightMap;
  uniform vec3 uSunDir;
  uniform float uIntensity;
  varying vec2 vUv;
  varying vec3 vObjNormal;
  void main() {
    // Fade lights in across the terminator; fully lit only in deep night.
    float night = 1.0 - smoothstep(-0.18, 0.12, dot(normalize(vObjNormal), uSunDir));
    vec3 texel = texture2D(uNightMap, vUv).rgb;
    float lum = dot(texel, vec3(0.299, 0.587, 0.114));
    // Cut faint airglow/terrain noise so empty deserts and oceans stay dark.
    lum = smoothstep(0.1, 0.82, lum);
    vec3 warm = mix(vec3(1.0, 0.62, 0.28), vec3(1.0, 0.88, 0.58), lum);
    gl_FragColor = vec4(warm * lum * uIntensity * night, 0.0);
  }
`;

function configureNightMap(texture: THREE.Texture | THREE.Texture[]) {
  for (const map of Array.isArray(texture) ? texture : [texture]) {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 1;
  }
}

function GlobeCityLightsVisual({ perfTier }: { perfTier: GlobePerfTier }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const nightMap = useTexture(NIGHT_LIGHTS_TEXTURE_URL, configureNightMap);
  const segments = getGlobeSphereSegments(perfTier);

  const uniforms = useMemo(
    () => ({
      uNightMap: { value: nightMap },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uIntensity: { value: 1.15 },
    }),
    [nightMap],
  );

  useFrame(() => {
    const material = materialRef.current;
    if (!material) return;
    const sun = subsolarDirection();
    (material.uniforms.uSunDir.value as THREE.Vector3).set(sun.x, sun.y, sun.z);
  });

  return (
    <mesh
      scale={CITY_LIGHTS_RADIUS}
      raycast={ignoreRaycast}
      renderOrder={6}
    >
      <sphereGeometry args={[1, segments, segments]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={CITY_LIGHTS_VERTEX_SHADER}
        fragmentShader={CITY_LIGHTS_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.CustomBlending}
        blendEquation={THREE.AddEquation}
        blendSrc={THREE.OneFactor}
        blendDst={THREE.OneFactor}
        blendEquationAlpha={THREE.AddEquation}
        blendSrcAlpha={THREE.ZeroFactor}
        blendDstAlpha={THREE.OneFactor}
      />
    </mesh>
  );
}

/**
 * Real city lights (NASA Black Marble) that fade in on the night hemisphere
 * while day/night lighting is on. Mount as a child of the earth mesh so the
 * lights stay locked to geography. Additive with destination alpha preserved,
 * so it can only brighten the surface beneath.
 */
export function GlobeCityLights({
  dayNight,
  perfTier = "desktop",
}: {
  dayNight: boolean;
  perfTier?: GlobePerfTier;
}) {
  if (!dayNight) return null;
  return (
    <Suspense fallback={null}>
      <GlobeCityLightsVisual perfTier={perfTier} />
    </Suspense>
  );
}

type GlobeMeshProps = Omit<ThreeElements["mesh"], "ref" | "children">;

export type GlobePlanetProps = {
  profile: Profile | null;
  difficulty: MapProgressDifficulty;
  usMode: GlobeUsMode;
  isDark: boolean;
  dayNight: boolean;
  selectedCode?: string | null;
  perfTier: GlobePerfTier;
  /** Orbit controls (map explorer) — lets the atmosphere fade with distance. */
  controlsRef?: RefObject<OrbitControlsImpl | null>;
  meshRef?: RefObject<THREE.Mesh | null>;
  /** Pointer handlers / initial rotation for the planet mesh. */
  meshProps?: GlobeMeshProps;
};

/**
 * The shared planet unit: progress-painted sphere, sun + earthshine lights,
 * distant sun visual, night-side city lights, and the atmosphere rim — one
 * component so the home globe and the map explorer are always the same globe.
 * Interactivity stays with the caller via `meshProps` / `meshRef`.
 */
export function GlobePlanet({
  profile,
  difficulty,
  usMode,
  isDark,
  dayNight,
  selectedCode = null,
  perfTier,
  controlsRef,
  meshRef,
  meshProps,
}: GlobePlanetProps) {
  const internalMeshRef = useRef<THREE.Mesh>(null);
  const planetMeshRef = meshRef ?? internalMeshRef;
  const { map, metalnessMap, roughnessMap, normalMap } = useGlobeTexture(profile, {
    difficulty,
    usMode,
    isDark,
    selectedCode,
    perfTier,
  });
  const segments = getGlobeSphereSegments(perfTier);

  return (
    <>
      <mesh ref={planetMeshRef} {...meshProps}>
        <sphereGeometry args={[1, segments, segments]} />
        <GlobeSurfaceMaterial
          map={map}
          metalnessMap={metalnessMap}
          roughnessMap={roughnessMap}
          normalMap={normalMap}
          perfTier={perfTier}
        />
        <GlobeCityLights dayNight={dayNight} perfTier={perfTier} />
        {!isDark ? <DistantSun isDark={isDark} perfTier={perfTier} /> : null}
        <EarthSunLight dayNight={dayNight} />
        <EarthshineLight isDark={isDark} dayNight={dayNight} />
      </mesh>
      <GlobeAtmosphere isDark={isDark} perfTier={perfTier} controlsRef={controlsRef} />
      {isDark ? (
        <DistantSun isDark={isDark} perfTier={perfTier} anchorRef={planetMeshRef} />
      ) : null}
    </>
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
