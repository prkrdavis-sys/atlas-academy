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
  createGlobeTexturePaintAsync,
  getGlobePalette,
  MASTERY_FX_STATIC_PHASE,
  resolveGlobeTextureSize,
  type GlobeTexturePaintHandle,
  type GlobeUsMode,
} from "@/lib/globe-texture";
import { ensureOceanDepthCanvas, loadOceanDepthImage } from "@/lib/globe-ocean-depth";
import { loadHurricaneTexture } from "@/lib/globe-hurricane-texture";
import { loadLandColorImage } from "@/lib/globe-land-color";
import {
  loadMasteryGoldPbrImages,
} from "@/lib/mastery-gold-texture";
import { masteryFxPhaseFromTime } from "@/lib/map-mastery-fx";
import { moonDirection, getMoonPosition } from "@/lib/moon-position";
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
import {
  createPaintYieldGate,
  yieldToAnimationFrame,
} from "@/lib/globe-yield";
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

function configureGlobeCanvasTexture(
  texture: THREE.CanvasTexture,
  anisotropy: number,
) {
  // CanvasTexture mipmaps flicker/band when the canvas is repainted (selection,
  // mastery FX). Linear filtering keeps borders and fills stable.
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = anisotropy;
}

function mapsFromPaint(
  paint: GlobeTexturePaintHandle,
  gl: THREE.WebGLRenderer,
  fxConstrained: boolean,
): GlobeSurfaceMaps {
  const anisotropy = Math.min(
    fxConstrained ? 2 : 8,
    gl.capabilities.getMaxAnisotropy(),
  );

  const map = new THREE.CanvasTexture(paint.canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  configureGlobeCanvasTexture(map, anisotropy);

  const metalnessMap = paint.metalnessCanvas
    ? new THREE.CanvasTexture(paint.metalnessCanvas)
    : null;
  if (metalnessMap) {
    metalnessMap.colorSpace = THREE.NoColorSpace;
    configureGlobeCanvasTexture(metalnessMap, anisotropy);
  }

  const roughnessMap = paint.roughnessCanvas
    ? new THREE.CanvasTexture(paint.roughnessCanvas)
    : null;
  if (roughnessMap) {
    roughnessMap.colorSpace = THREE.NoColorSpace;
    configureGlobeCanvasTexture(roughnessMap, anisotropy);
  }

  const normalMap = paint.normalCanvas
    ? new THREE.CanvasTexture(paint.normalCanvas)
    : null;
  if (normalMap) {
    normalMap.colorSpace = THREE.NoColorSpace;
    configureGlobeCanvasTexture(normalMap, anisotropy);
  }

  return { map, metalnessMap, roughnessMap, normalMap };
}

function disposeGlobeMaps(maps: GlobeSurfaceMaps) {
  maps.map.dispose();
  maps.metalnessMap?.dispose();
  maps.roughnessMap?.dispose();
  maps.normalMap?.dispose();
}

/**
 * Builds the progress-painted planet texture at the highest resolution the
 * device's GPU comfortably supports, rebuilding when inputs change. Hard
 * mastery-4 places get a gentle holographic drift; Normal gold uses a brushed
 * metal albedo plus metalness/roughness maps so sunlight catches those places.
 * Selection highlight updates without rebuilding the base layer.
 *
 * Heavy rebuilds (land/ocean imagery arriving, theme changes) paint across
 * animation frames and keep the previous texture on-screen so auto-rotation
 * never freezes while borders upscale.
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

  const paintOptions = useMemo(
    () => ({
      difficulty,
      usMode,
      isDark,
      size,
      selectedCode: null as string | null,
      phase: MASTERY_FX_STATIC_PHASE,
      allowCanvasGlow: !fxConstrained,
      allowMastery4Animation: !fxConstrained,
      oceanDepthImage,
      landColorImage,
      goldColorImage: goldMaps.color,
      goldRoughnessImage: goldMaps.roughness,
      goldNormalImage: goldMaps.normal,
    }),
    [difficulty, usMode, isDark, size, fxConstrained, goldMaps, oceanDepthImage, landColorImage],
  );

  // First paint is a low-res preview so mount never freezes the spin; the
  // effect below upscales to full resolution across animation frames.
  const initialBundle = useMemo(() => {
    const previewSize = Math.min(1024, size);
    const paint = createGlobeTexturePaint(profile, {
      ...paintOptions,
      size: previewSize,
      oceanDepthImage: null,
      landColorImage: null,
      goldColorImage: null,
      goldRoughnessImage: null,
      goldNormalImage: null,
    });
    return { paint, maps: mapsFromPaint(paint, gl, fxConstrained) };
    // Intentionally once per mount identity — upgrades go through the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [bundle, setBundle] = useState(initialBundle);
  const bundleRef = useRef(bundle);
  bundleRef.current = bundle;
  const buildGenRef = useRef(0);

  useEffect(() => {
    const gen = ++buildGenRef.current;
    let cancelled = false;
    const shouldContinue = () => !cancelled && gen === buildGenRef.current;
    const gate = createPaintYieldGate(shouldContinue);

    void (async () => {
      // Let the current spin frame finish before any heavy canvas work.
      await yieldToAnimationFrame();
      if (!shouldContinue()) return;

      if (paintOptions.oceanDepthImage) {
        const depth = await ensureOceanDepthCanvas(
          paintOptions.oceanDepthImage,
          paintOptions.isDark,
          gate,
        );
        if (!shouldContinue() || !depth) return;
        await yieldToAnimationFrame();
        if (!shouldContinue()) return;
      }

      const paint = await createGlobeTexturePaintAsync(profile, paintOptions, gate);
      if (!paint || !shouldContinue()) return;

      const nextMaps = mapsFromPaint(paint, gl, fxConstrained);
      const prevMaps = bundleRef.current.maps;
      setBundle({ paint, maps: nextMaps });
      invalidate();
      // Dispose the previous GPU textures after a frame so the material swap
      // isn't racing a dispose mid-draw.
      if (prevMaps !== nextMaps) {
        requestAnimationFrame(() => disposeGlobeMaps(prevMaps));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, paintOptions, gl, fxConstrained, invalidate]);

  useEffect(
    () => () => {
      disposeGlobeMaps(bundleRef.current.maps);
    },
    [],
  );

  const { paint, maps } = bundle;

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

/** Outer edge of the stratified atmosphere shell, in planet radii. */
const ATMOSPHERE_SHELL_RADIUS = 1.16;
/** Ground-hugging haze shell so the horizon isn't hollow when zoomed in. */
const ATMOSPHERE_HAZE_RADIUS = 1.012;
/**
 * Slightly outside the opaque planet so limb maths never paint inside the
 * silhouette — depth precision alone is not enough for a shell at ~1.01.
 */
const ATMOSPHERE_PLANET_RADIUS = 1.002;

const ATMOSPHERE_VERTEX_SHADER = /* glsl */ `
  uniform vec3 uSunDir;
  varying vec3 vViewPos;
  varying vec3 vViewCenter;
  varying vec3 vSunView;
  void main() {
    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = viewPos.xyz;
    vViewCenter = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    // The sun vector is given in the planet's own frame; normalMatrix carries it
    // into view space so it can be compared against the limb point below.
    vSunView = normalize(normalMatrix * uSunDir);
    gl_Position = projectionMatrix * viewPos;
  }
`;

const ATMOSPHERE_HAZE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vViewPos;
  varying vec3 vViewCenter;
  void main() {
    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = viewPos.xyz;
    vViewCenter = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    gl_Position = projectionMatrix * viewPos;
  }
`;

/**
 * Altitude comes from the view ray's impact parameter (its closest approach to
 * the planet centre), not from a rim dot product — so the bands stay at fixed
 * altitudes instead of sliding around as the camera moves. Impact < planet
 * radius is discarded in-shader so a low-poly back-face shell cannot wash the
 * ocean when depth precision fails near the surface.
 */
const ATMOSPHERE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uTroposphere;
  uniform vec3 uStratosphere;
  uniform vec3 uMesosphere;
  uniform vec3 uExosphere;
  uniform float uOpacity;
  uniform float uInnerRadius;
  uniform float uOuterRadius;
  varying vec3 vViewPos;
  varying vec3 vViewCenter;
  varying vec3 vSunView;

  float layer(float h, float center, float width) {
    float d = (h - center) / width;
    return exp(-d * d);
  }

  void main() {
    // Camera sits at the view-space origin.
    vec3 dir = normalize(vViewPos);
    float along = dot(vViewCenter, dir);
    vec3 closest = dir * along - vViewCenter;
    float impact = length(closest);
    float h = (impact - uInnerRadius) / max(uOuterRadius - uInnerRadius, 1e-4);
    if (h < 0.0 || h > 1.0) discard;

    // Dense troposphere, a bright thin stratosphere line, a faint mesosphere
    // wash, then the exosphere trailing off into space.
    float tropo = 1.15 * layer(h, 0.015, 0.10);
    float strato = 0.62 * layer(h, 0.165, 0.06);
    float meso = 0.38 * layer(h, 0.36, 0.14);
    float exo = 0.18 * layer(h, 0.64, 0.24);
    float density = tropo + strato + meso + exo + 0.3 * exp(-h * 2.8);

    // Pick colour from whichever band is dominant at this altitude instead of
    // lerping hues — sequential RGB mixes between pale rim and indigo upper
    // layers were reading as grey in the middle shell.
    float tropoBand = layer(h, 0.015, 0.10);
    float stratoBand = layer(h, 0.165, 0.06);
    float mesoBand = layer(h, 0.36, 0.14);
    float exoBand = layer(h, 0.64, 0.24);
    float colorWeight = tropoBand + stratoBand + mesoBand + exoBand + 1e-4;
    vec3 color = (
      uTroposphere * tropoBand +
      uStratosphere * stratoBand +
      uMesosphere * mesoBand +
      uExosphere * exoBand
    ) / colorWeight;

    // Lit limb glows; the night limb keeps only a thin trace of airglow. The
    // sample point is where the ray grazes closest, which is the air we see.
    float lit = smoothstep(-0.45, 0.3, dot(normalize(closest), vSunView));
    density *= mix(0.2, 1.0, lit);
    // Feather the outermost edge so the shell silhouette never shows.
    density *= 1.0 - smoothstep(0.82, 1.0, h);

    gl_FragColor = vec4(color, clamp(density, 0.0, 1.0) * uOpacity);
  }
`;

/**
 * Thin near-surface haze — same impact-parameter limb gate as the outer shell
 * so Z-fighting near the planet can never flood the disk with haze colour.
 */
const ATMOSPHERE_HAZE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uInnerRadius;
  uniform float uOuterRadius;
  varying vec3 vViewPos;
  varying vec3 vViewCenter;

  void main() {
    vec3 dir = normalize(vViewPos);
    float along = dot(vViewCenter, dir);
    vec3 closest = dir * along - vViewCenter;
    float impact = length(closest);
    float h = (impact - uInnerRadius) / max(uOuterRadius - uInnerRadius, 1e-4);
    if (h < 0.0 || h > 1.0) discard;

    float density = exp(-h * h * 6.0);
    density *= 1.0 - smoothstep(0.55, 1.0, h);
    gl_FragColor = vec4(uColor, clamp(density, 0.0, 1.0) * uOpacity);
  }
`;

type AtmospherePalette = {
  troposphere: string;
  stratosphere: string;
  mesosphere: string;
  exosphere: string;
  opacity: number;
  hazeColor: string;
  hazeOpacity: number;
};

/** Sky-blue rim stepping into deeper blue — no magenta/indigo that reads as a red wash on the ocean. */
const DARK_ATMOSPHERE_PALETTE: AtmospherePalette = {
  troposphere: "#38bdf8",
  stratosphere: "#60a5fa",
  mesosphere: "#3b82f6",
  exosphere: "#2563eb",
  opacity: 0.42,
  hazeColor: "#38bdf8",
  hazeOpacity: 0.07,
};

/**
 * Cool sky rim in light mode too. Warm peach/orange haze used to flood the
 * whole disk whenever the near-surface shell Z-fought, reading as a red tint
 * over the ocean; the sunset backdrop already supplies warmth behind the globe.
 */
const LIGHT_ATMOSPHERE_PALETTE: AtmospherePalette = {
  troposphere: "#7dd3fc",
  stratosphere: "#38bdf8",
  mesosphere: "#60a5fa",
  exosphere: "#3b82f6",
  opacity: 0.36,
  hazeColor: "#7dd3fc",
  hazeOpacity: 0.07,
};

/**
 * Stratified atmosphere around the planet's rim: a shader shell whose colour
 * and density are banded by real altitude, plus a thin ground-hugging haze.
 * When `controlsRef` is set (map explorer), both fade out as the globe fills
 * the viewport so the low-poly shells cannot wash the ocean in bands.
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
  const shellRef = useRef<THREE.ShaderMaterial>(null);
  const hazeRef = useRef<THREE.ShaderMaterial>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const segments = getGlobeAtmosphereSegments(perfTier);
  const palette = isDark ? DARK_ATMOSPHERE_PALETTE : LIGHT_ATMOSPHERE_PALETTE;

  const uniforms = useMemo(
    () => ({
      uTroposphere: { value: new THREE.Color() },
      uStratosphere: { value: new THREE.Color() },
      uMesosphere: { value: new THREE.Color() },
      uExosphere: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uOpacity: { value: 0 },
      // View-space units, where the planet's radius is 1 and the shell's outer
      // edge is its scale factor.
      uInnerRadius: { value: ATMOSPHERE_PLANET_RADIUS },
      uOuterRadius: { value: ATMOSPHERE_SHELL_RADIUS },
    }),
    [],
  );

  const hazeUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color() },
      uOpacity: { value: 0 },
      uInnerRadius: { value: ATMOSPHERE_PLANET_RADIUS },
      uOuterRadius: { value: ATMOSPHERE_HAZE_RADIUS },
    }),
    [],
  );

  useLayoutEffect(() => {
    (uniforms.uTroposphere.value as THREE.Color).set(palette.troposphere);
    (uniforms.uStratosphere.value as THREE.Color).set(palette.stratosphere);
    (uniforms.uMesosphere.value as THREE.Color).set(palette.mesosphere);
    (uniforms.uExosphere.value as THREE.Color).set(palette.exosphere);
    (hazeUniforms.uColor.value as THREE.Color).set(palette.hazeColor);
  }, [uniforms, hazeUniforms, palette]);

  useFrame(() => {
    const shell = shellRef.current;
    const haze = hazeRef.current;
    if (!shell) return;

    const sun = subsolarDirection();
    (shell.uniforms.uSunDir.value as THREE.Vector3).set(sun.x, sun.y, sun.z);

    const controls = controlsRef?.current;
    let strength = 1;
    if (controls && camera instanceof THREE.PerspectiveCamera) {
      const fillAt = globeFillDistance(
        camera.fov,
        size.width / Math.max(size.height, 1),
      );
      const distance = controls.getDistance();
      const fadeStart = fillAt * 1.35;
      const fadeEnd = fillAt * 0.95;
      if (distance <= fadeEnd) strength = 0;
      else if (distance < fadeStart) {
        const t = (distance - fadeEnd) / (fadeStart - fadeEnd);
        strength = t * t * (3 - 2 * t);
      }
    }

    shell.uniforms.uOpacity.value = palette.opacity * strength;
    if (haze) haze.uniforms.uOpacity.value = palette.hazeOpacity * strength;
  });

  return (
    <>
      <mesh scale={ATMOSPHERE_SHELL_RADIUS} raycast={ignoreRaycast}>
        <sphereGeometry args={[1, segments, segments]} />
        <shaderMaterial
          ref={shellRef}
          vertexShader={ATMOSPHERE_VERTEX_SHADER}
          fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthTest
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={ATMOSPHERE_HAZE_RADIUS} raycast={ignoreRaycast}>
        <sphereGeometry args={[1, segments, segments]} />
        <shaderMaterial
          ref={hazeRef}
          vertexShader={ATMOSPHERE_HAZE_VERTEX_SHADER}
          fragmentShader={ATMOSPHERE_HAZE_FRAGMENT_SHADER}
          uniforms={hazeUniforms}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthTest
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
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
 * so the beam stays locked to geographic longitude while the globe spins or
 * the camera orbits. Direction is always the real-time subsolar angle — the
 * day/night toggle only changes intensity (strong terminator vs soft key).
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
const MOON_TEXTURE_URL = "/globe/moon-color.jpg";

function configureMoonTexture(texture: THREE.Texture | THREE.Texture[]) {
  for (const map of Array.isArray(texture) ? texture : [texture]) {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 1;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
  }
}

/** Preloads sun textures on the client after the Canvas mounts. */
export function GlobeAssetPreloader() {
  useEffect(() => {
    useTexture.preload(SUN_TEXTURE_URL);
    useTexture.preload(SUN_GLOW_TEXTURE_URL);
    useTexture.preload(NIGHT_LIGHTS_TEXTURE_URL);
    useTexture.preload(MOON_TEXTURE_URL);
    void loadHurricaneTexture().catch(() => {
      // Rare-event asset; ordinary clouds remain if this fails.
    });
  }, []);
  return null;
}

/** Presentation scale: larger than the physical angular size for discoverability,
 * while remaining substantially smaller than the distant Sun visual. */
const MOON_RADIUS = 2.2;

/**
 * Local axis of the sphere UV seam center (u = 0.5, equator) for THREE's
 * SphereGeometry. Aiming this axis at Earth tidally locks the near side toward
 * the planet, so viewers always see the real lunar face.
 */
const MOON_NEAR_FACE_AXIS = new THREE.Vector3(1, 0, 0);
const moonToEarth = new THREE.Vector3();
const moonSunLocal = new THREE.Quaternion();

const MOON_VERTEX_SHADER = /* glsl */ `
  varying vec2 vMoonUv;
  varying vec3 vMoonNormal;
  void main() {
    vMoonUv = uv;
    vMoonNormal = normalize(normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Lit only by the real subsolar direction, deliberately ignoring the scene's
 * ambient/hemisphere fill. Those fills exist to keep the Earth's landmasses
 * readable, but on the Moon they erase the terminator and flatten it into a
 * 2D disc — so the phase is computed here instead.
 */
const MOON_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMoonMap;
  uniform vec3 uSunDirection;
  uniform float uEarthshine;
  varying vec2 vMoonUv;
  varying vec3 vMoonNormal;
  void main() {
    vec3 albedo = texture2D(uMoonMap, vMoonUv).rgb;
    float lambert = dot(normalize(vMoonNormal), normalize(uSunDirection));
    // Narrow softening only: the Sun subtends ~0.5deg at the Moon, so the real
    // terminator is nearly a hard edge.
    float daylight = smoothstep(-0.05, 0.06, lambert);
    float lit = daylight * (0.14 + 0.86 * clamp(lambert, 0.0, 1.0));
    gl_FragColor = vec4(albedo * (lit * 2.1 + uEarthshine), 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Textured Moon positioned from the current geocentric lunar ephemeris.
 * The group lives in the same Earth-fixed spin frame as the globe, so it keeps
 * a fixed position relative to the planet and is depth-occluded by it when the
 * camera orbits to the far side.
 */
function DistantMoonVisual({ perfTier }: { perfTier: GlobePerfTier }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const moonMap = useTexture(MOON_TEXTURE_URL, configureMoonTexture);
  const segments = getGlobeSphereSegments(perfTier);

  const uniforms = useMemo(
    () => ({
      uMoonMap: { value: moonMap },
      uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
      uEarthshine: { value: 0.035 },
    }),
    [moonMap],
  );

  useFrame(() => {
    const group = groupRef.current;
    const mesh = meshRef.current;
    if (!group || !mesh) return;

    const direction = moonDirection();
    const distance = getMoonPosition().distance;
    group.position
      .set(direction.x, direction.y, direction.z)
      .multiplyScalar(distance);

    // Tidal lock: point the near face back at Earth's center.
    moonToEarth.copy(group.position).normalize().negate();
    mesh.quaternion.setFromUnitVectors(MOON_NEAR_FACE_AXIS, moonToEarth);

    // Sun is ~390x farther than the Moon, so Earth's subsolar direction is a
    // sub-degree approximation of the Moon's. Rotate it into mesh-local space
    // because the shader compares it against the object-space normal.
    const sun = subsolarDirection();
    uniforms.uSunDirection.value
      .set(sun.x, sun.y, sun.z)
      .applyQuaternion(moonSunLocal.copy(mesh.quaternion).invert());
  });

  return (
    <group ref={groupRef} frustumCulled={false}>
      <mesh
        ref={meshRef}
        scale={MOON_RADIUS}
        raycast={ignoreRaycast}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, segments, segments]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={MOON_VERTEX_SHADER}
          fragmentShader={MOON_FRAGMENT_SHADER}
        />
      </mesh>
    </group>
  );
}

export function DistantMoon({
  isDark,
  perfTier = "desktop",
}: {
  isDark: boolean;
  perfTier?: GlobePerfTier;
}) {
  if (!isDark) return null;
  return (
    <Suspense fallback={null}>
      <DistantMoonVisual perfTier={perfTier} />
    </Suspense>
  );
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
  /**
   * When set, the sun is a spin-group sibling of the planet (dark mode) and
   * draws after the atmosphere. Position stays mesh-local either way — never
   * write world coords into a parented local transform.
   */
  anchorRef,
}: {
  isDark: boolean;
  perfTier?: GlobePerfTier;
  anchorRef?: RefObject<THREE.Mesh | null>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Group>(null);
  const [plateMap, glowMap] = useTexture([SUN_TEXTURE_URL, SUN_GLOW_TEXTURE_URL]);

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
    // Mesh-local / spin-local subsolar — same frame as EarthSunLight, whether
    // this group is a child of the planet mesh or a sibling under the spin group.
    const sun = subsolarDirection();
    group.position.set(sun.x, sun.y, sun.z).multiplyScalar(DISTANT_SUN_DISTANCE);

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
 * Always mounted — independent of the day/night lighting toggle — so the disk
 * stays time-accurate whether the terminator is on or off. Dark mode uses the
 * NASA plate plus glow; light mode is glow-only so the plate's dark limb never
 * rings the CSS sunset sky.
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
