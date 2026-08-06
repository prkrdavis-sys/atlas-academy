"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getCloudNoiseTexture } from "@/lib/globe-cloud-noise";
import {
  GLOBE_CLOUD_COUNT_BY_TIER,
  GLOBE_CLOUD_NOISE_SIZE_BY_TIER,
  type GlobePerfTier,
} from "@/lib/globe-performance";
import { subsolarDirection } from "@/lib/sun-position";

/** Skip picking so clouds never steal globe taps. */
function ignoreRaycast() {}

/** Cloud deck altitude range, in planet radii — the low atmosphere only. */
const CLOUD_RADIUS_MIN = 1.008;
const CLOUD_RADIUS_MAX = 1.032;

const PUFFS_PER_CLUSTER_MIN = 2;
const PUFFS_PER_CLUSTER_MAX = 4;

const PUFF_SIZE_MIN = 0.06;
const PUFF_SIZE_MAX = 0.15;

/** Clouds stay translucent and patchy — never a solid white cap. */
const PUFF_ALPHA_MIN = 0.22;
const PUFF_ALPHA_MAX = 0.5;

/** Prevailing longitudinal drift (rad/s) before the latitude weighting. */
const WIND_SPEED_MIN = 0.004;
const WIND_SPEED_MAX = 0.013;

/** Frozen shader time under reduced motion, picked so puffs look formed. */
const STATIC_TIME = 12;

/** Draw above the city lights shell so clouds read as the topmost surface layer. */
const CLOUD_RENDER_ORDER = 7;

const CLOUD_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Two noise lookups at different scales, drifting in opposite directions with
 * one of them slowly rotating, multiplied together and thresholded. The product
 * of two moving fields is what makes the silhouette churn and reform instead of
 * merely sliding, and it leaves the interior naturally uneven in opacity.
 */
const CLOUD_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uNoise;
  uniform vec3 uLitColor;
  uniform vec3 uShadowColor;
  uniform float uTime;
  uniform float uSeed;
  uniform float uAlpha;
  uniform float uLight;
  varying vec2 vUv;

  void main() {
    vec2 centered = vUv - 0.5;
    float radius = length(centered) * 2.0;
    // Soft round envelope so a puff never ends on the quad's edge.
    float envelope = 1.0 - smoothstep(0.3, 1.0, radius);
    if (envelope <= 0.001) discard;

    float angle = uTime * 0.035 + uSeed * 6.2831853;
    float ca = cos(angle);
    float sa = sin(angle);
    mat2 swirl = mat2(ca, -sa, sa, ca);

    vec2 offset = vec2(uSeed, uSeed * 1.73);
    float low = texture2D(
      uNoise,
      vUv * 0.85 + offset + vec2(uTime * 0.010, uTime * -0.006)
    ).r;
    float high = texture2D(
      uNoise,
      (swirl * centered) * 2.1 + offset * 3.1 + vec2(uTime * -0.018, uTime * 0.013)
    ).r;

    float field = low * high * 2.2 + 0.1 * sin(uTime * 0.27 + uSeed * 21.0);
    float density = smoothstep(0.16, 0.64, field) * envelope;

    vec3 color = mix(uShadowColor, uLitColor, clamp(uLight, 0.0, 1.0));
    gl_FragColor = vec4(color, density * uAlpha);
  }
`;

type CloudPalette = {
  litColor: string;
  shadowColor: string;
  alphaScale: number;
};

const DARK_CLOUD_PALETTE: CloudPalette = {
  litColor: "#eef6ff",
  shadowColor: "#0f2033",
  alphaScale: 0.9,
};

const LIGHT_CLOUD_PALETTE: CloudPalette = {
  litColor: "#ffffff",
  shadowColor: "#4a5a73",
  alphaScale: 1,
};

type PuffSpec = {
  /** Offset in the cluster's tangent frame (x, y tangent; z outward). */
  offset: [number, number, number];
  size: number;
  seed: number;
  alpha: number;
};

type ClusterSpec = {
  latitude: number;
  longitude: number;
  radius: number;
  windSpeed: number;
  wobbleAmplitude: number;
  wobbleSpeed: number;
  wobblePhase: number;
  puffs: PuffSpec[];
};

/** Small deterministic PRNG so cloud placement is stable across reloads. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

/**
 * Latitudes weighted toward the mid-latitude storm belts and the equatorial
 * convergence zone, so a handful of clouds still reads as weather rather than
 * as points scattered at random.
 */
function weightedLatitude(random: () => number): number {
  const bands = [4, 40, -38, 12, -8, 55, -52];
  const band = bands[Math.floor(random() * bands.length)];
  return THREE.MathUtils.degToRad(band + (random() - 0.5) * 22);
}

function buildClusters(count: number): ClusterSpec[] {
  const random = createRandom(0x51c10d);
  const clusters: ClusterSpec[] = [];

  for (let i = 0; i < count; i += 1) {
    const puffCount = Math.round(
      lerp(PUFFS_PER_CLUSTER_MIN, PUFFS_PER_CLUSTER_MAX, random()),
    );
    const puffs: PuffSpec[] = [];
    for (let p = 0; p < puffCount; p += 1) {
      const size = lerp(PUFF_SIZE_MIN, PUFF_SIZE_MAX, random());
      puffs.push({
        offset: [
          (random() - 0.5) * size * 1.6,
          (random() - 0.5) * size * 1.6,
          (random() - 0.5) * size * 0.4,
        ],
        size,
        seed: random(),
        alpha: lerp(PUFF_ALPHA_MIN, PUFF_ALPHA_MAX, random()),
      });
    }

    clusters.push({
      latitude: weightedLatitude(random),
      longitude: random() * Math.PI * 2,
      radius: lerp(CLOUD_RADIUS_MIN, CLOUD_RADIUS_MAX, random()),
      windSpeed: lerp(WIND_SPEED_MIN, WIND_SPEED_MAX, random()),
      wobbleAmplitude: THREE.MathUtils.degToRad(lerp(1.5, 5, random())),
      wobbleSpeed: lerp(0.05, 0.16, random()),
      wobblePhase: random() * Math.PI * 2,
      puffs,
    });
  }

  return clusters;
}

type CloudPuffProps = {
  spec: PuffSpec;
  noise: THREE.Texture;
  palette: CloudPalette;
  /** Shared per-cluster light factor, updated by the parent each frame. */
  lightRef: { current: number };
  timeRef: { current: number };
};

function CloudPuff({ spec, noise, palette, lightRef, timeRef }: CloudPuffProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uNoise: { value: noise },
      uLitColor: { value: new THREE.Color(palette.litColor) },
      uShadowColor: { value: new THREE.Color(palette.shadowColor) },
      uTime: { value: STATIC_TIME },
      uSeed: { value: spec.seed },
      uAlpha: { value: spec.alpha * palette.alphaScale },
      uLight: { value: 1 },
    }),
    [noise, palette, spec.seed, spec.alpha],
  );

  useFrame(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value = timeRef.current;
    material.uniforms.uLight.value = lightRef.current;
  });

  return (
    <Billboard follow position={spec.offset}>
      <mesh scale={spec.size} raycast={ignoreRaycast} renderOrder={CLOUD_RENDER_ORDER}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={CLOUD_VERTEX_SHADER}
          fragmentShader={CLOUD_FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}

const RADIAL_BASIS = new THREE.Vector3(0, 0, 1);

type CloudClusterProps = {
  spec: ClusterSpec;
  noise: THREE.Texture;
  palette: CloudPalette;
  animate: boolean;
  sunRef: { current: THREE.Vector3 };
  timeRef: { current: number };
};

function CloudCluster({
  spec,
  noise,
  palette,
  animate,
  sunRef,
  timeRef,
}: CloudClusterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef(1);
  const radial = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const time = timeRef.current;
    // Wind pushes hardest near the equator and stalls toward the poles.
    const drift = animate
      ? spec.windSpeed * time * Math.cos(spec.latitude)
      : 0;
    const longitude = spec.longitude + drift;
    const latitude =
      spec.latitude +
      (animate
        ? spec.wobbleAmplitude * Math.sin(time * spec.wobbleSpeed + spec.wobblePhase)
        : 0);

    const cosLat = Math.cos(latitude);
    radial.set(
      Math.cos(longitude) * cosLat,
      Math.sin(latitude),
      -Math.sin(longitude) * cosLat,
    );

    group.position.copy(radial).multiplyScalar(spec.radius);
    group.quaternion.setFromUnitVectors(RADIAL_BASIS, radial);
    // Terminator-aware shading: the sun vector shares the planet mesh's frame.
    lightRef.current = THREE.MathUtils.smoothstep(radial.dot(sunRef.current), -0.25, 0.3);
  });

  return (
    <group ref={groupRef}>
      {spec.puffs.map((puff, index) => (
        <CloudPuff
          key={index}
          spec={puff}
          noise={noise}
          palette={palette}
          lightRef={lightRef}
          timeRef={timeRef}
        />
      ))}
    </group>
  );
}

type GlobeCloudsProps = {
  isDark: boolean;
  perfTier: GlobePerfTier;
  reducedMotion: boolean;
  /** Keeps the demand frameloop alive while the clouds are drifting. */
  onActivity?: () => void;
};

/**
 * A sparse deck of translucent clouds resting in the low atmosphere. Mount
 * inside the globe's spin group so each cloud keeps its place over the geography
 * beneath it while still drifting on its own wind.
 */
export function GlobeClouds({
  isDark,
  perfTier,
  reducedMotion,
  onActivity,
}: GlobeCloudsProps) {
  const noise = useMemo(
    () => getCloudNoiseTexture(GLOBE_CLOUD_NOISE_SIZE_BY_TIER[perfTier]),
    [perfTier],
  );
  const clusters = useMemo(
    () => buildClusters(GLOBE_CLOUD_COUNT_BY_TIER[perfTier]),
    [perfTier],
  );
  const palette = isDark ? DARK_CLOUD_PALETTE : LIGHT_CLOUD_PALETTE;
  const sunRef = useRef(new THREE.Vector3(1, 0, 0));
  const timeRef = useRef(STATIC_TIME);

  // Runs before the child clusters/puffs read the shared refs: R3F invokes
  // useFrame callbacks in mount order, and this parent mounts first.
  useFrame((_state, delta) => {
    const sun = subsolarDirection();
    sunRef.current.set(sun.x, sun.y, sun.z);
    if (reducedMotion) return;
    timeRef.current += Math.min(delta, 0.1);
    onActivity?.();
  });

  return (
    <group>
      {clusters.map((cluster, index) => (
        <CloudCluster
          key={index}
          spec={cluster}
          noise={noise}
          palette={palette}
          animate={!reducedMotion}
          sunRef={sunRef}
          timeRef={timeRef}
        />
      ))}
    </group>
  );
}
