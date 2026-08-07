"use client";

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

/**
 * Cloud bases float above the ground-hugging haze shell (1.012), leaving a
 * visible pocket of atmosphere between the planet and the first cloud layer.
 * The anvil and cirrus centers stay below the atmosphere shell's 1.16 outer
 * edge while still reading as separate high-altitude layers.
 */
const CLOUD_BASE_RADIUS_MIN = 1.026;
const CLOUD_BASE_RADIUS_MAX = 1.042;
const CLOUD_TOWER_START_HEIGHT = 0.014;
const CLOUD_TOWER_HEIGHT = 0.04;
const CLOUD_ANVIL_HEIGHT = 0.07;
const CLOUD_CIRRUS_HEIGHT = 0.105;

const BASE_PUFFS_MIN = 3;
const BASE_PUFFS_MAX = 5;
const TOWER_LEVELS_MIN = 2;
const TOWER_LEVELS_MAX = 3;
const ANVIL_PUFFS_MIN = 3;
const ANVIL_PUFFS_MAX = 5;
const CIRRUS_PUFFS_MIN = 1;
const CIRRUS_PUFFS_MAX = 3;

/** Clouds stay translucent and patchy — never a solid white cap. */
const BASE_ALPHA_MIN = 0.24;
const BASE_ALPHA_MAX = 0.42;
const TOWER_ALPHA_MIN = 0.3;
const TOWER_ALPHA_MAX = 0.52;
const ANVIL_ALPHA_MIN = 0.2;
const ANVIL_ALPHA_MAX = 0.38;
const CIRRUS_ALPHA_MIN = 0.1;
const CIRRUS_ALPHA_MAX = 0.2;

/** Slow global circulation in addition to each storm cell's local wind. */
const CLOUD_ROTATION_SPEED = 0.0035;

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
  uniform float uLayer;
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

    // Each layer has a different vertical falloff: soft cloud bases, dense
    // towers, and a flatter anvil with a deliberately airy upper edge.
    float baseProfile =
      smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.78, 1.0, vUv.y));
    float towerProfile =
      smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.84, 1.0, vUv.y));
    float anvilProfile =
      smoothstep(0.0, 0.14, vUv.y) * (1.0 - smoothstep(0.58, 1.0, vUv.y));
    float cirrusProfile =
      smoothstep(0.0, 0.28, vUv.y) * (1.0 - smoothstep(0.42, 0.92, vUv.y));
    float isTower = step(0.5, uLayer) * (1.0 - step(1.5, uLayer));
    float isAnvil = step(1.5, uLayer) * (1.0 - step(2.5, uLayer));
    float isCirrus = step(2.5, uLayer);
    float layerProfile = mix(baseProfile, towerProfile, isTower);
    layerProfile = mix(layerProfile, anvilProfile, isAnvil);
    layerProfile = mix(layerProfile, cirrusProfile, isCirrus);

    float threshold = mix(0.16, 0.3, clamp(uLayer / 3.0, 0.0, 1.0));
    float density = smoothstep(threshold, 0.64, field) * envelope * layerProfile;

    vec3 color = mix(uShadowColor, uLitColor, clamp(uLight, 0.0, 1.0));
    float core = smoothstep(0.52, 0.84, field);
    color = mix(color, uLitColor, core * 0.16 * clamp(uLight, 0.0, 1.0));
    float lightDensity = mix(0.72, 1.0, clamp(uLight, 0.0, 1.0));
    gl_FragColor = vec4(color, density * uAlpha * lightDensity);
  }
`;

type CloudPalette = {
  litColor: string;
  shadowColor: string;
  alphaScale: number;
};

const DARK_CLOUD_PALETTE: CloudPalette = {
  litColor: "#ffffff",
  shadowColor: "#ffffff",
  alphaScale: 0.95,
};

const LIGHT_CLOUD_PALETTE: CloudPalette = {
  litColor: "#ffffff",
  shadowColor: "#ffffff",
  alphaScale: 1,
};

type PuffSpec = {
  /** Offset in the cluster's tangent frame (x, y tangent; z outward). */
  offset: [number, number, number];
  /** Surface-patch width and height in local tangent units. */
  scale: [number, number];
  /** Optional rotation inside the local tangent plane, used by cyclone arms. */
  rotation?: number;
  seed: number;
  alpha: number;
  layer: CloudLayer;
};

type CloudLayer = "base" | "tower" | "anvil" | "cirrus";

const CLOUD_LAYER_INDEX: Record<CloudLayer, number> = {
  base: 0,
  tower: 1,
  anvil: 2,
  cirrus: 3,
};

type ClusterSpec = {
  latitude: number;
  longitude: number;
  radius: number;
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

function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
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
    const puffs: PuffSpec[] = [];

    // Scale the whole storm cell so the cloud silhouettes stay varied while
    // each one keeps the same base → tower → anvil → cirrus construction.
    const clusterScale = lerp(0.82, 1.16, random());
    const baseSpread = lerp(0.08, 0.14, random()) * clusterScale;
    const basePuffCount = randomInt(random, BASE_PUFFS_MIN, BASE_PUFFS_MAX);
    for (let p = 0; p < basePuffCount; p += 1) {
      const width = lerp(0.09, 0.14, random()) * clusterScale;
      puffs.push({
        offset: [
          (random() - 0.5) * baseSpread,
          (random() - 0.5) * baseSpread * 0.42,
          lerp(-0.002, 0.008, random()),
        ],
        scale: [width, width * lerp(0.46, 0.64, random())],
        seed: random(),
        alpha: lerp(BASE_ALPHA_MIN, BASE_ALPHA_MAX, random()),
        layer: "base",
      });
    }

    const towerLevels = randomInt(random, TOWER_LEVELS_MIN, TOWER_LEVELS_MAX);
    for (let level = 0; level < towerLevels; level += 1) {
      const progress = towerLevels === 1 ? 0 : level / (towerLevels - 1);
      const width = lerp(0.095, 0.14, random()) * clusterScale * (1 - progress * 0.1);
      puffs.push({
        offset: [
          (random() - 0.5) * width * 0.55,
          (random() - 0.5) * width * 0.32,
          CLOUD_TOWER_START_HEIGHT + progress * CLOUD_TOWER_HEIGHT,
        ],
        scale: [width * lerp(1.02, 1.24, random()), width * lerp(0.48, 0.72, random())],
        seed: random(),
        alpha: lerp(TOWER_ALPHA_MIN, TOWER_ALPHA_MAX, random()),
        layer: "tower",
      });

      // A low side turret makes the column irregular without turning every
      // storm cell into a symmetric stack.
      if (level === 0 && random() > 0.34) {
        puffs.push({
          offset: [
            (random() > 0.5 ? 1 : -1) * width * lerp(0.42, 0.72, random()),
            (random() - 0.5) * width * 0.36,
            CLOUD_TOWER_START_HEIGHT * 0.7,
          ],
          scale: [width * 0.9, width * lerp(0.42, 0.62, random())],
          seed: random(),
          alpha: lerp(TOWER_ALPHA_MIN * 0.8, TOWER_ALPHA_MAX * 0.9, random()),
          layer: "tower",
        });
      }
    }

    const anvilSpread = lerp(0.18, 0.3, random()) * clusterScale;
    const anvilPuffCount = randomInt(random, ANVIL_PUFFS_MIN, ANVIL_PUFFS_MAX);
    for (let p = 0; p < anvilPuffCount; p += 1) {
      const width = lerp(0.11, 0.18, random()) * clusterScale;
      puffs.push({
        offset: [
          (random() - 0.5) * anvilSpread,
          (random() - 0.5) * anvilSpread * 0.28,
          CLOUD_ANVIL_HEIGHT + lerp(-0.008, 0.01, random()),
        ],
        scale: [width * lerp(1.45, 2.05, random()), width * lerp(0.28, 0.46, random())],
        seed: random(),
        alpha: lerp(ANVIL_ALPHA_MIN, ANVIL_ALPHA_MAX, random()),
        layer: "anvil",
      });
    }

    // High, thin cirrus wisps sit above the storm cell only. They are broader
    // and much less dense than the anvil so they read as a separate altitude
    // band instead of another vertical part of the cumulonimbus.
    const cirrusSpread = lerp(0.22, 0.36, random()) * clusterScale;
    const cirrusPuffCount = randomInt(random, CIRRUS_PUFFS_MIN, CIRRUS_PUFFS_MAX);
    for (let p = 0; p < cirrusPuffCount; p += 1) {
      const width = lerp(0.1, 0.17, random()) * clusterScale;
      puffs.push({
        offset: [
          (random() - 0.5) * cirrusSpread,
          (random() - 0.5) * cirrusSpread * 0.24,
          CLOUD_CIRRUS_HEIGHT + lerp(-0.008, 0.008, random()),
        ],
        scale: [width * lerp(1.4, 2.5, random()), width * lerp(0.14, 0.25, random())],
        seed: random(),
        alpha: lerp(CIRRUS_ALPHA_MIN, CIRRUS_ALPHA_MAX, random()),
        layer: "cirrus",
      });
    }

    clusters.push({
      latitude: weightedLatitude(random),
      longitude: random() * Math.PI * 2,
      radius: lerp(CLOUD_BASE_RADIUS_MIN, CLOUD_BASE_RADIUS_MAX, random()),
      puffs,
    });
  }

  return clusters;
}

/**
 * One deterministic rare-event storm in the western Pacific typhoon belt.
 * The open eye, curved eye wall, spiral arms, anvil, and cirrus veil all share
 * the same cluster transform, so the event rotates with every other cloud.
 */
function buildRareCyclone(): ClusterSpec {
  const random = createRandom(0xc710de);
  const puffs: PuffSpec[] = [];

  const eyeWallCount = 8;
  for (let i = 0; i < eyeWallCount; i += 1) {
    const angle = (i / eyeWallCount) * Math.PI * 2;
    const radius = 0.052 + (random() - 0.5) * 0.012;
    puffs.push({
      offset: [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        CLOUD_TOWER_START_HEIGHT + lerp(-0.002, 0.008, random()),
      ],
      scale: [0.06, 0.048],
      rotation: angle + Math.PI / 2,
      seed: random(),
      alpha: lerp(0.34, 0.48, random()),
      layer: "tower",
    });
  }

  const armCount = 3;
  const puffsPerArm = 8;
  for (let arm = 0; arm < armCount; arm += 1) {
    for (let step = 0; step < puffsPerArm; step += 1) {
      const progress = step / (puffsPerArm - 1);
      const angle =
        (arm / armCount) * Math.PI * 2 + progress * Math.PI * 1.55 + 0.18;
      const radius = lerp(0.075, 0.29, progress) + (random() - 0.5) * 0.018;
      const width = lerp(0.065, 0.105, 1 - progress);
      puffs.push({
        offset: [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.72,
          CLOUD_TOWER_START_HEIGHT * 0.7 + progress * 0.012,
        ],
        scale: [width * 1.55, width * lerp(0.28, 0.44, random())],
        rotation: angle + Math.PI / 2,
        seed: random(),
        alpha: lerp(0.18, 0.34, 1 - progress),
        layer: progress < 0.35 ? "tower" : "base",
      });
    }
  }

  const anvilCount = 7;
  for (let i = 0; i < anvilCount; i += 1) {
    const angle = (i / anvilCount) * Math.PI * 2 + 0.25;
    const radius = 0.08 + (random() - 0.5) * 0.06;
    puffs.push({
      offset: [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.68,
        CLOUD_ANVIL_HEIGHT + lerp(-0.006, 0.008, random()),
      ],
      scale: [0.13, 0.035],
      rotation: angle + Math.PI / 2,
      seed: random(),
      alpha: lerp(0.16, 0.27, random()),
      layer: "anvil",
    });
  }

  const cirrusCount = 4;
  for (let i = 0; i < cirrusCount; i += 1) {
    const angle = (i / cirrusCount) * Math.PI * 2;
    puffs.push({
      offset: [
        Math.cos(angle) * (0.16 + random() * 0.1),
        Math.sin(angle) * (0.16 + random() * 0.1) * 0.56,
        CLOUD_CIRRUS_HEIGHT + lerp(-0.006, 0.006, random()),
      ],
      scale: [0.18, 0.018],
      rotation: angle + Math.PI / 2,
      seed: random(),
      alpha: lerp(0.08, 0.14, random()),
      layer: "cirrus",
    });
  }

  return {
    latitude: THREE.MathUtils.degToRad(16),
    // 142°E: open ocean in the western Pacific typhoon belt.
    longitude: THREE.MathUtils.degToRad(142),
    radius: 1.032,
    puffs,
  };
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
      uLayer: { value: CLOUD_LAYER_INDEX[spec.layer] },
    }),
    [noise, palette, spec.alpha, spec.layer, spec.seed],
  );

  useFrame(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value = timeRef.current;
    material.uniforms.uLight.value = lightRef.current;
  });

  return (
    <mesh
      position={spec.offset}
      rotation={[0, 0, spec.rotation ?? 0]}
      scale={[spec.scale[0], spec.scale[1], 1]}
      raycast={ignoreRaycast}
      renderOrder={CLOUD_RENDER_ORDER}
    >
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
  );
}

const RADIAL_BASIS = new THREE.Vector3(0, 0, 1);

type CloudClusterProps = {
  spec: ClusterSpec;
  noise: THREE.Texture;
  palette: CloudPalette;
  sunRef: { current: THREE.Vector3 };
  timeRef: { current: number };
};

function CloudCluster({
  spec,
  noise,
  palette,
  sunRef,
  timeRef,
}: CloudClusterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef(1);
  const radial = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const cosLat = Math.cos(spec.latitude);
    radial.set(
      Math.cos(spec.longitude) * cosLat,
      Math.sin(spec.latitude),
      -Math.sin(spec.longitude) * cosLat,
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
 * Translucent cumulonimbus storm cells with a separated base, rising tower,
 * flattened anvil, high cirrus wisps, and one rare Pacific cyclone. Mount inside
 * the globe's spin group so every cloud shares one global circulation.
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
    () => [
      ...buildClusters(GLOBE_CLOUD_COUNT_BY_TIER[perfTier]),
      buildRareCyclone(),
    ],
    [perfTier],
  );
  const palette = isDark ? DARK_CLOUD_PALETTE : LIGHT_CLOUD_PALETTE;
  const sunRef = useRef(new THREE.Vector3(1, 0, 0));
  const timeRef = useRef(STATIC_TIME);
  const cloudsGroupRef = useRef<THREE.Group>(null);

  // Runs before the child clusters/puffs read the shared refs: R3F invokes
  // useFrame callbacks in mount order, and this parent mounts first.
  useFrame((_state, delta) => {
    const sun = subsolarDirection();
    sunRef.current.set(sun.x, sun.y, sun.z);
    if (reducedMotion) return;
    const elapsed = Math.min(delta, 0.1);
    timeRef.current += elapsed;
    if (cloudsGroupRef.current) {
      cloudsGroupRef.current.rotation.y += elapsed * CLOUD_ROTATION_SPEED;
    }
    onActivity?.();
  });

  return (
    <group ref={cloudsGroupRef}>
      {clusters.map((cluster, index) => (
        <CloudCluster
          key={index}
          spec={cluster}
          noise={noise}
          palette={palette}
          sunRef={sunRef}
          timeRef={timeRef}
        />
      ))}
    </group>
  );
}
