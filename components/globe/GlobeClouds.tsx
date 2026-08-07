"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getCloudNoiseTexture } from "@/lib/globe-cloud-noise";
import { loadCumulusGeometries } from "@/lib/globe-cloud-meshes";
import { loadHurricaneTexture } from "@/lib/globe-hurricane-texture";
import {
  GLOBE_CLOUD_COUNT_BY_TIER,
  GLOBE_CLOUD_NOISE_SIZE_BY_TIER,
  type GlobePerfTier,
} from "@/lib/globe-performance";
import { subsolarDirection } from "@/lib/sun-position";

/** Skip picking so clouds never steal globe taps. */
function ignoreRaycast() {}

/**
 * Real cloud altitudes vanish at globe scale — the entire troposphere is about
 * 0.2% of Earth's radius. Vertical heights are therefore authored in kilometres
 * and multiplied by one exaggeration factor, which keeps the WMO layer ordering
 * physically correct while making the stratification legible. Horizontal sizes
 * use the true scale: weather systems really are thousands of kilometres wide.
 */
const EARTH_RADIUS_KM = 6371;
const KM = 1 / EARTH_RADIUS_KM;
const ALTITUDE_EXAGGERATION = 26;
const ALTITUDE_KM = KM * ALTITUDE_EXAGGERATION;

/** Cloud bases sit just clear of the ground-hugging haze shell at 1.012. */
const CLOUD_DECK_RADIUS = 1.015;

/**
 * WMO levels: low cloud 0–2 km, middle 2–7 km, high 5–18 km. Cumulonimbus is
 * based in the low level and towers up to an anvil at the tropopause, while
 * cirrus sits several kilometres above every convective top so the thick and
 * the wispy layers never occupy the same altitude.
 */
const LOW_BASE_MIN_KM = 0.6;
const LOW_BASE_MAX_KM = 1.8;
const TOWER_BASE_KM = 2.6;
const TOWER_TOP_KM = 9;
const ANVIL_KM = 10.5;
const CIRRUS_MIN_KM = 14;
const CIRRUS_MAX_KM = 17.5;

/** Clouds stay translucent and patchy — never a solid white cap. */
const BASE_ALPHA_MIN = 0.3;
const BASE_ALPHA_MAX = 0.52;
const TOWER_ALPHA_MIN = 0.38;
const TOWER_ALPHA_MAX = 0.62;
const ANVIL_ALPHA_MIN = 0.24;
const ANVIL_ALPHA_MAX = 0.42;
const CIRRUS_ALPHA_MIN = 0.1;
const CIRRUS_ALPHA_MAX = 0.2;

/** Global circulation: one revolution relative to the planet every ~6.5 min. */
const CLOUD_ROTATION_SPEED = 0.016;

/** Frozen shader time under reduced motion, picked so puffs look formed. */
const STATIC_TIME = 12;

/** Draw above the city lights shell so clouds read as the topmost surface layer. */
const CLOUD_RENDER_ORDER = 7;

/** One storm event per mounted globe at most, with a long quiet lead-in. */
const HURRICANE_EVENT_MIN_DELAY_MS = 5_000;
const HURRICANE_EVENT_MAX_DELAY_MS = 5_000;
const HURRICANE_EVENT_CHANCE = 1;
const HURRICANE_EVENT_VISIBLE_MS = 24_000;
/** Slight independent spin: NH counterclockwise, SH clockwise (local outward axis). */
const HURRICANE_SPIN_SPEED = 0.14;
const HURRICANE_RADIUS = CLOUD_DECK_RADIUS;

type TropicalCycloneRegion = {
  /** Degrees. Longitude matches the planet texture (east positive). */
  latitude: number;
  longitude: number;
  latitudeSpread: number;
  longitudeSpread: number;
  weight: number;
};

/**
 * Spawn only inside real tropical-cyclone basins — Atlantic hurricanes, eastern
 * Pacific storms, western Pacific typhoons, Indian Ocean cyclones, and the
 * southern-hemisphere belts. Weights bias toward the busiest basins without
 * excluding quieter ones.
 */
const TROPICAL_CYCLONE_REGIONS: TropicalCycloneRegion[] = [
  { latitude: 18, longitude: -72, latitudeSpread: 8, longitudeSpread: 18, weight: 1.1 },
  { latitude: 14, longitude: -55, latitudeSpread: 6, longitudeSpread: 12, weight: 1 },
  { latitude: 24, longitude: -88, latitudeSpread: 5, longitudeSpread: 10, weight: 0.9 },
  { latitude: 14, longitude: -125, latitudeSpread: 6, longitudeSpread: 15, weight: 1 },
  { latitude: 10, longitude: -145, latitudeSpread: 5, longitudeSpread: 12, weight: 0.85 },
  { latitude: 16, longitude: 128, latitudeSpread: 8, longitudeSpread: 22, weight: 1.2 },
  { latitude: 12, longitude: 142, latitudeSpread: 6, longitudeSpread: 18, weight: 1.1 },
  { latitude: 22, longitude: 118, latitudeSpread: 5, longitudeSpread: 14, weight: 0.95 },
  { latitude: 14, longitude: 86, latitudeSpread: 5, longitudeSpread: 10, weight: 0.9 },
  { latitude: 12, longitude: 64, latitudeSpread: 5, longitudeSpread: 12, weight: 0.75 },
  { latitude: -16, longitude: 148, latitudeSpread: 6, longitudeSpread: 14, weight: 0.95 },
  { latitude: -18, longitude: 118, latitudeSpread: 6, longitudeSpread: 16, weight: 0.9 },
  { latitude: -22, longitude: 55, latitudeSpread: 5, longitudeSpread: 14, weight: 0.8 },
  { latitude: -18, longitude: -35, latitudeSpread: 5, longitudeSpread: 20, weight: 0.7 },
];

type TropicalCycloneSpawn = {
  latitudeRad: number;
  longitudeRad: number;
  /** +1 northern hemisphere (counterclockwise), -1 southern (clockwise). */
  spinSign: number;
};

function pickTropicalCycloneSpawn(random: () => number): TropicalCycloneSpawn {
  const totalWeight = TROPICAL_CYCLONE_REGIONS.reduce((sum, region) => sum + region.weight, 0);
  let roll = random() * totalWeight;
  let region = TROPICAL_CYCLONE_REGIONS[0];
  for (const candidate of TROPICAL_CYCLONE_REGIONS) {
    roll -= candidate.weight;
    if (roll <= 0) {
      region = candidate;
      break;
    }
  }

  const latDeg = region.latitude + (random() - 0.5) * 2 * region.latitudeSpread;
  const lonDeg = region.longitude + (random() - 0.5) * 2 * region.longitudeSpread;
  const latitudeRad = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(latDeg, -35, 35));
  const longitudeRad = THREE.MathUtils.degToRad(lonDeg);
  const spinSign = latitudeRad >= 0 ? 1 : -1;

  return { latitudeRad, longitudeRad, spinSign };
}

/**
 * Soft white volume shading for the cumulus meshes. Fresnel falloff keeps the
 * silhouette airy so the low-poly blobs read as cloud rather than styrofoam.
 */
const CUMULUS_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const CUMULUS_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uLitColor;
  uniform vec3 uShadowColor;
  uniform float uAlpha;
  uniform float uLight;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vWorldNormal), normalize(vViewDir))), 1.35);
    float light = clamp(uLight, 0.0, 1.0);
    vec3 color = mix(uShadowColor, uLitColor, light);
    color = mix(color, uLitColor, (1.0 - fresnel) * 0.18 * light);
    float alpha = uAlpha * mix(0.92, 0.38, fresnel) * mix(0.72, 1.0, light);
    if (alpha <= 0.01) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Cloud puff meshes are already bent onto their spherical shell in cluster-local
 * space (see createShellPatchGeometry), so the vertex stage is a straight pass.
 * Used for high cirrus sheets only — thick weather uses solid cumulus meshes.
 */
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
      vUv * 1.3 + offset + vec2(uTime * 0.010, uTime * -0.006)
    ).r;
    float high = texture2D(
      uNoise,
      (swirl * centered) * 3.0 + offset * 3.1 + vec2(uTime * -0.018, uTime * 0.013)
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

const HURRICANE_VERTEX_SHADER = /* glsl */ `
  uniform sampler2D uStormMap;
  uniform float uDepth;
  uniform float uTime;
  uniform float uSeed;
  uniform float uClusterRadius;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;
    float density = texture2D(uStormMap, uv).r;
    float edge = smoothstep(0.03, 0.24, density);
    // Geometry is already on the spherical shell; lift dense eye-wall regions
    // along the local radial (cluster +Z) and keep them on a larger shell.
    vec3 local = position;
    local.z += density * uDepth;
    local.x += sin(uTime * 0.16 + uv.y * 8.0 + uSeed * 12.0) * 0.003 * edge;
    local.y += cos(uTime * 0.13 + uv.x * 7.0 + uSeed * 9.0) * 0.002 * edge;

    vec3 fromCenter = vec3(local.x, local.y, local.z + uClusterRadius);
    float shellR = uClusterRadius + local.z;
    fromCenter *= shellR / max(length(fromCenter), 1e-6);
    vec3 bent = fromCenter - vec3(0.0, 0.0, uClusterRadius);

    vDepth = density;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(bent, 1.0);
  }
`;

const HURRICANE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uStormMap;
  uniform sampler2D uNoise;
  uniform vec3 uLitColor;
  uniform vec3 uShadowColor;
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;
  uniform float uLight;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    float density = texture2D(uStormMap, vUv).r;
    if (density <= 0.012) discard;

    vec2 drift = vec2(uTime * 0.004, uTime * -0.002) + uSeed;
    float breakup = texture2D(uNoise, vUv * 2.6 + drift).r;
    float detail = smoothstep(0.12, 0.78, breakup);
    float edgeFade = smoothstep(0.018, 0.12, density);
    float alpha = density * mix(0.58, 0.94, detail) * edgeFade;
    if (alpha <= 0.006) discard;

    float light = clamp(uLight, 0.0, 1.0);
    vec3 color = mix(uShadowColor, uLitColor, light);
    color = mix(color, uLitColor, smoothstep(0.48, 0.92, vDepth) * 0.2 * light);
    gl_FragColor = vec4(color, alpha * uOpacity);
  }
`;

type HurricaneLayerSpec = {
  scale: [number, number];
  offset: [number, number, number];
  rotation: number;
  depth: number;
  opacity: number;
  seed: number;
};

/**
 * The satellite-derived mask is layered across the same altitude bands as the
 * ordinary clouds. This gives the eye wall a raised core and lets the outer
 * feeder bands sit in a thinner, high cirrus canopy instead of appearing as
 * one flat circular decal.
 */
const HURRICANE_LAYERS: HurricaneLayerSpec[] = [
  {
    scale: [0.52, 0.52],
    offset: [0, 0, altitude(1.5)],
    rotation: 0.08,
    depth: 0.028,
    opacity: 0.62,
    seed: 0.17,
  },
  {
    scale: [0.66, 0.6],
    offset: [-0.018, 0.008, altitude(TOWER_TOP_KM)],
    rotation: -0.11,
    depth: 0.018,
    opacity: 0.3,
    seed: 0.43,
  },
  {
    scale: [0.84, 0.74],
    offset: [0.024, 0.014, altitude(CIRRUS_MIN_KM)],
    rotation: 0.21,
    depth: 0.012,
    opacity: 0.14,
    seed: 0.71,
  },
];

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
  /**
   * Volume size in cluster-local units: width (tangent x), radial thickness
   * (outward), depth (tangent y). Cirrus planes use width × depth only.
   */
  scale: [number, number, number];
  /** Optional yaw inside the local tangent plane. */
  rotation?: number;
  /** Which cumulus hero mesh to instance (ignored for cirrus planes). */
  meshIndex?: number;
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

/** Horizontal extent in globe units, from a true-scale kilometre range. */
function span(random: () => number, minKm: number, maxKm: number): number {
  return lerp(minKm, maxKm, random()) * KM;
}

/** Height above the cloud deck in globe units, from a kilometre altitude. */
function altitude(km: number): number {
  return km * ALTITUDE_KM;
}

type SystemKind = "convective" | "frontal" | "marine";

type WeatherRegion = {
  /** Degrees. Longitude is geographic and matches the planet texture. */
  latitude: number;
  longitude: number;
  /** Half-extent of the scatter box around the region center, in degrees. */
  latitudeSpread: number;
  longitudeSpread: number;
  kind: SystemKind;
  /** Relative share of the cluster budget. */
  weight: number;
};

/**
 * Earth's cloud cover is anything but uniform. Deep convection piles up along
 * the intertropical convergence zone, long frontal bands ride the mid-latitude
 * storm tracks, and persistent stratocumulus sheets sit over the cold
 * eastern-boundary currents. The subtropical high belts near 20–30° are left
 * empty on purpose — that is where the world's deserts and clear skies are.
 */
const WEATHER_REGIONS: WeatherRegion[] = [
  { latitude: 6, longitude: -62, latitudeSpread: 7, longitudeSpread: 15, kind: "convective", weight: 3 },
  { latitude: 1, longitude: 20, latitudeSpread: 7, longitudeSpread: 13, kind: "convective", weight: 3 },
  { latitude: 1, longitude: 118, latitudeSpread: 8, longitudeSpread: 20, kind: "convective", weight: 3 },
  { latitude: 8, longitude: -158, latitudeSpread: 4, longitudeSpread: 28, kind: "convective", weight: 2 },
  { latitude: 7, longitude: -26, latitudeSpread: 4, longitudeSpread: 13, kind: "convective", weight: 2 },
  { latitude: 18, longitude: 85, latitudeSpread: 6, longitudeSpread: 12, kind: "convective", weight: 2 },
  { latitude: 51, longitude: -34, latitudeSpread: 8, longitudeSpread: 22, kind: "frontal", weight: 3 },
  { latitude: 46, longitude: 176, latitudeSpread: 9, longitudeSpread: 26, kind: "frontal", weight: 3 },
  { latitude: -54, longitude: 45, latitudeSpread: 7, longitudeSpread: 45, kind: "frontal", weight: 4 },
  { latitude: -51, longitude: -118, latitudeSpread: 7, longitudeSpread: 38, kind: "frontal", weight: 3 },
  { latitude: -20, longitude: -85, latitudeSpread: 6, longitudeSpread: 9, kind: "marine", weight: 2 },
  { latitude: -22, longitude: 4, latitudeSpread: 6, longitudeSpread: 8, kind: "marine", weight: 2 },
  { latitude: 26, longitude: -131, latitudeSpread: 6, longitudeSpread: 9, kind: "marine", weight: 2 },
];

/**
 * Weighted sampling without replacement, so heavier regions tend to be filled
 * first but every region is used once before any of them repeats.
 */
function pickRegions(count: number, random: () => number): WeatherRegion[] {
  const ordered = WEATHER_REGIONS.map((region) => ({
    region,
    key: random() ** (1 / region.weight),
  }))
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.region);
  return Array.from({ length: count }, (_unused, index) => ordered[index % ordered.length]);
}

/**
 * Map a weather-layer footprint onto a 3D cumulus mesh. Base/anvil stay
 * squat; towers stretch radially so the cell reads as real vertical weather.
 */
function volumeScale(
  width: number,
  layer: Exclude<CloudLayer, "cirrus">,
  random: () => number,
): [number, number, number] {
  switch (layer) {
    case "base":
      return [
        width,
        width * lerp(0.28, 0.42, random()),
        width * lerp(0.7, 0.95, random()),
      ];
    case "tower":
      return [
        width * lerp(0.9, 1.15, random()),
        width * lerp(0.75, 1.1, random()),
        width * lerp(0.65, 0.9, random()),
      ];
    case "anvil":
      return [
        width * lerp(1.25, 1.7, random()),
        width * lerp(0.16, 0.28, random()),
        width * lerp(0.85, 1.2, random()),
      ];
    default: {
      const exhaustive: never = layer;
      return exhaustive;
    }
  }
}

function pickMeshIndex(random: () => number): number {
  return Math.floor(random() * 4);
}

/**
 * Cumulonimbus: a ragged low base, a narrowing tower punching through the
 * middle level, and a broad flat anvil spreading out at the tropopause.
 */
function buildConvectiveCell(random: () => number): PuffSpec[] {
  const puffs: PuffSpec[] = [];
  const cellScale = lerp(0.85, 1.2, random());

  // The scatter is deliberately wider than the puffs themselves, so the cell
  // resolves into a ragged multi-lobed mass rather than one stacked blob.
  const baseSpread = span(random, 1100, 1900) * cellScale;
  for (let p = 0; p < randomInt(random, 5, 7); p += 1) {
    const width = span(random, 700, 1250) * cellScale;
    puffs.push({
      offset: [
        (random() - 0.5) * baseSpread,
        (random() - 0.5) * baseSpread * 0.5,
        altitude(lerp(LOW_BASE_MIN_KM, LOW_BASE_MAX_KM, random())),
      ],
      scale: volumeScale(width, "base", random),
      meshIndex: pickMeshIndex(random),
      seed: random(),
      alpha: lerp(BASE_ALPHA_MIN, BASE_ALPHA_MAX, random()),
      layer: "base",
    });
  }

  const towerLevels = randomInt(random, 2, 3);
  for (let level = 0; level < towerLevels; level += 1) {
    const progress = towerLevels === 1 ? 0 : level / (towerLevels - 1);
    // The updraft narrows with height until the anvil flares back out.
    const width = span(random, 800, 1250) * cellScale * (1 - progress * 0.18);
    puffs.push({
      offset: [
        (random() - 0.5) * width * 0.5,
        (random() - 0.5) * width * 0.3,
        altitude(lerp(TOWER_BASE_KM, TOWER_TOP_KM, progress)),
      ],
      scale: volumeScale(width, "tower", random),
      meshIndex: pickMeshIndex(random),
      seed: random(),
      alpha: lerp(TOWER_ALPHA_MIN, TOWER_ALPHA_MAX, random()),
      layer: "tower",
    });

    // A flanking turret keeps the column irregular instead of a tidy stack.
    if (level === 0 && random() > 0.34) {
      puffs.push({
        offset: [
          (random() > 0.5 ? 1 : -1) * width * lerp(0.45, 0.75, random()),
          (random() - 0.5) * width * 0.36,
          altitude(TOWER_BASE_KM * 0.8),
        ],
        scale: volumeScale(width * 0.85, "tower", random),
        meshIndex: pickMeshIndex(random),
        seed: random(),
        alpha: lerp(TOWER_ALPHA_MIN * 0.8, TOWER_ALPHA_MAX * 0.9, random()),
        layer: "tower",
      });
    }
  }

  // The anvil overhangs the base on every side, as the outflow really does.
  const anvilSpread = span(random, 1500, 2400) * cellScale;
  for (let p = 0; p < randomInt(random, 4, 6); p += 1) {
    const width = span(random, 1000, 1750) * cellScale;
    puffs.push({
      offset: [
        (random() - 0.5) * anvilSpread,
        (random() - 0.5) * anvilSpread * 0.3,
        altitude(ANVIL_KM + lerp(-1.2, 1.2, random())),
      ],
      scale: volumeScale(width, "anvil", random),
      meshIndex: pickMeshIndex(random),
      seed: random(),
      alpha: lerp(ANVIL_ALPHA_MIN, ANVIL_ALPHA_MAX, random()),
      layer: "anvil",
    });
  }

  return puffs;
}

/**
 * Mid-latitude frontal band: a very long, shallow, tilted sheet of layered
 * cloud with only shallow embedded convection — the comma-shaped swirls that
 * dominate satellite views of the storm tracks.
 */
function buildFrontalBand(random: () => number): PuffSpec[] {
  const puffs: PuffSpec[] = [];
  const tilt = lerp(-0.7, -0.25, random()) * (random() > 0.5 ? 1 : -1);
  const bandLength = span(random, 3400, 5200);

  const segments = randomInt(random, 6, 8);
  for (let s = 0; s < segments; s += 1) {
    const along = (s / (segments - 1) - 0.5) * bandLength;
    const width = span(random, 1100, 1800);
    puffs.push({
      offset: [
        along * Math.cos(tilt) + (random() - 0.5) * width * 0.2,
        along * Math.sin(tilt) + (random() - 0.5) * width * 0.2,
        altitude(lerp(LOW_BASE_MIN_KM, LOW_BASE_MAX_KM, random())),
      ],
      scale: volumeScale(width, "base", random),
      meshIndex: pickMeshIndex(random),
      rotation: tilt + lerp(-0.2, 0.2, random()),
      seed: random(),
      alpha: lerp(BASE_ALPHA_MIN, BASE_ALPHA_MAX, random()),
      layer: "base",
    });
  }

  // A couple of embedded cells lift out of the warm conveyor.
  for (let p = 0; p < randomInt(random, 1, 2); p += 1) {
    const width = span(random, 700, 1100);
    const along = lerp(-0.3, 0.3, random()) * bandLength;
    puffs.push({
      offset: [
        along * Math.cos(tilt),
        along * Math.sin(tilt),
        altitude(lerp(TOWER_BASE_KM, TOWER_TOP_KM * 0.7, random())),
      ],
      scale: volumeScale(width, "tower", random),
      meshIndex: pickMeshIndex(random),
      rotation: tilt,
      seed: random(),
      alpha: lerp(TOWER_ALPHA_MIN * 0.7, TOWER_ALPHA_MAX * 0.8, random()),
      layer: "tower",
    });
  }

  return puffs;
}

/**
 * Marine stratocumulus: a wide, flat, low sheet with no vertical development,
 * the kind that blankets the cold currents off Peru, Namibia and California.
 */
function buildStratocumulusSheet(random: () => number): PuffSpec[] {
  const puffs: PuffSpec[] = [];
  const sheetSpread = span(random, 1800, 2800);

  for (let p = 0; p < randomInt(random, 5, 7); p += 1) {
    const width = span(random, 1200, 2000);
    puffs.push({
      offset: [
        (random() - 0.5) * sheetSpread,
        (random() - 0.5) * sheetSpread * 0.6,
        altitude(lerp(LOW_BASE_MIN_KM, LOW_BASE_MIN_KM + 0.6, random())),
      ],
      scale: volumeScale(width, "base", random),
      meshIndex: pickMeshIndex(random),
      rotation: lerp(-0.5, 0.5, random()),
      seed: random(),
      alpha: lerp(BASE_ALPHA_MIN * 0.8, BASE_ALPHA_MAX * 0.85, random()),
      layer: "base",
    });
  }

  return puffs;
}

function buildSystemPuffs(kind: SystemKind, random: () => number): PuffSpec[] {
  switch (kind) {
    case "convective":
      return buildConvectiveCell(random);
    case "frontal":
      return buildFrontalBand(random);
    case "marine":
      return buildStratocumulusSheet(random);
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function buildClusters(count: number): ClusterSpec[] {
  const random = createRandom(0x51c10d);
  return pickRegions(count, random).map((region) => ({
    latitude: THREE.MathUtils.degToRad(
      region.latitude + (random() - 0.5) * 2 * region.latitudeSpread,
    ),
    longitude: THREE.MathUtils.degToRad(
      region.longitude + (random() - 0.5) * 2 * region.longitudeSpread,
    ),
    radius: CLOUD_DECK_RADIUS,
    puffs: buildSystemPuffs(region.kind, random),
  }));
}

/**
 * Cirrus follows the jet streams rather than capping individual storms, so it
 * is built as its own system in the subtropical and polar jet bands. Sitting
 * 4 km above the tallest anvil, it reads unmistakably as a separate deck.
 */
const CIRRUS_JET_LATITUDES = [30, 43, 56, -31, -45, -57];

function buildCirrusClusters(count: number): ClusterSpec[] {
  const random = createRandom(0xc17705);
  const clusters: ClusterSpec[] = [];

  for (let i = 0; i < count; i += 1) {
    const puffs: PuffSpec[] = [];
    // Streaks within one patch share a heading, the way wind shear combs real
    // cirrus into parallel fallstreaks.
    const heading = lerp(-0.45, 0.45, random());
    const patchSpread = span(random, 1800, 3000);

    for (let p = 0; p < randomInt(random, 3, 5); p += 1) {
      const length = span(random, 2600, 4400);
      puffs.push({
        offset: [
          (random() - 0.5) * patchSpread,
          (random() - 0.5) * patchSpread * 0.45,
          altitude(lerp(CIRRUS_MIN_KM, CIRRUS_MAX_KM, random())),
        ],
        scale: [length, length * 0.02, length * lerp(0.1, 0.18, random())],
        rotation: heading + lerp(-0.12, 0.12, random()),
        seed: random(),
        alpha: lerp(CIRRUS_ALPHA_MIN, CIRRUS_ALPHA_MAX, random()),
        layer: "cirrus",
      });
    }

    const band = CIRRUS_JET_LATITUDES[i % CIRRUS_JET_LATITUDES.length];
    clusters.push({
      latitude: THREE.MathUtils.degToRad(band + (random() - 0.5) * 14),
      longitude: random() * Math.PI * 2,
      radius: CLOUD_DECK_RADIUS,
      puffs,
    });
  }

  return clusters;
}

/** Wider cirrus sheets need denser tessellation or the spherical bend looks faceted. */
function cloudGridSegments(width: number, depth: number): number {
  const size = Math.max(width, depth);
  if (size > 0.45) return 48;
  if (size > 0.25) return 36;
  if (size > 0.12) return 24;
  return 16;
}

/**
 * Project a tangent offset onto the spherical shell at this altitude so wide
 * systems follow the planet instead of sitting on a flat tangent plane.
 */
function shellPosition(
  clusterRadius: number,
  offset: [number, number, number],
): [number, number, number] {
  const [x, y, z] = offset;
  let fx = x;
  let fy = y;
  let fz = z + clusterRadius;
  const shellR = clusterRadius + z;
  const len = Math.hypot(fx, fy, fz) || 1;
  const s = shellR / len;
  fx *= s;
  fy *= s;
  fz *= s;
  return [fx, fy, fz - clusterRadius];
}

/**
 * Build a plane already wrapped onto the spherical shell at this puff's
 * altitude. Used for high cirrus sheets — thick weather uses solid meshes.
 */
function createShellPatchGeometry(
  clusterRadius: number,
  offset: [number, number, number],
  scale: [number, number],
  rotation: number,
  segments: number,
): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(1, 1, segments, segments);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);

  for (let i = 0; i < position.count; i += 1) {
    const px = position.getX(i) * scale[0];
    const py = position.getY(i) * scale[1];
    const x = cosR * px - sinR * py + offset[0];
    const y = sinR * px + cosR * py + offset[1];
    const z = offset[2];

    // Cluster origin is on a sphere of radius clusterRadius, so the globe
    // center sits at (0, 0, -clusterRadius) in this frame.
    let fx = x;
    let fy = y;
    let fz = z + clusterRadius;
    const shellR = clusterRadius + z;
    const len = Math.hypot(fx, fy, fz) || 1;
    const s = shellR / len;
    fx *= s;
    fy *= s;
    fz *= s;
    position.setXYZ(i, fx, fy, fz - clusterRadius);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

type CloudPuffProps = {
  spec: PuffSpec;
  clusterRadius: number;
  geometries: THREE.BufferGeometry[];
  noise: THREE.Texture;
  palette: CloudPalette;
  /** Shared per-cluster light factor, updated by the parent each frame. */
  lightRef: { current: number };
  timeRef: { current: number };
};

/** Model +Y maps to cluster +Z (radial / "up" from the planet). */
const MESH_RADIAL_TILT = -Math.PI / 2;

function CumulusMeshPuff({
  spec,
  clusterRadius,
  geometries,
  palette,
  lightRef,
}: Omit<CloudPuffProps, "noise" | "timeRef">) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshIndex = (spec.meshIndex ?? 0) % Math.max(geometries.length, 1);
  const geometry = geometries[meshIndex] ?? geometries[0];
  const position = useMemo(
    () => shellPosition(clusterRadius, spec.offset),
    [clusterRadius, spec.offset],
  );

  const uniforms = useMemo(
    () => ({
      uLitColor: { value: new THREE.Color(palette.litColor) },
      uShadowColor: { value: new THREE.Color(palette.shadowColor) },
      uAlpha: { value: spec.alpha * palette.alphaScale },
      uLight: { value: 1 },
    }),
    [palette, spec.alpha],
  );

  useFrame(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uLight.value = lightRef.current;
  });

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={[MESH_RADIAL_TILT, 0, spec.rotation ?? 0]}
      scale={spec.scale}
      raycast={ignoreRaycast}
      renderOrder={CLOUD_RENDER_ORDER}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={CUMULUS_VERTEX_SHADER}
        fragmentShader={CUMULUS_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function CirrusPlanePuff({
  spec,
  clusterRadius,
  noise,
  palette,
  lightRef,
  timeRef,
}: Omit<CloudPuffProps, "geometries">) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const width = spec.scale[0];
  const depth = spec.scale[2];
  const segments = cloudGridSegments(width, depth);
  const geometry = useMemo(
    () =>
      createShellPatchGeometry(
        clusterRadius,
        spec.offset,
        [width, depth],
        spec.rotation ?? 0,
        segments,
      ),
    [clusterRadius, depth, segments, spec.offset, spec.rotation, width],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uNoise: { value: noise },
      uLitColor: { value: new THREE.Color(palette.litColor) },
      uShadowColor: { value: new THREE.Color(palette.shadowColor) },
      uTime: { value: STATIC_TIME },
      uSeed: { value: spec.seed },
      uAlpha: { value: spec.alpha * palette.alphaScale },
      uLight: { value: 1 },
      uLayer: { value: CLOUD_LAYER_INDEX.cirrus },
    }),
    [noise, palette, spec.alpha, spec.seed],
  );

  useFrame(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value = timeRef.current;
    material.uniforms.uLight.value = lightRef.current;
  });

  return (
    <mesh
      geometry={geometry}
      raycast={ignoreRaycast}
      renderOrder={CLOUD_RENDER_ORDER}
    >
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

function CloudPuff(props: CloudPuffProps) {
  if (props.spec.layer === "cirrus") {
    return (
      <CirrusPlanePuff
        spec={props.spec}
        clusterRadius={props.clusterRadius}
        noise={props.noise}
        palette={props.palette}
        lightRef={props.lightRef}
        timeRef={props.timeRef}
      />
    );
  }
  return (
    <CumulusMeshPuff
      spec={props.spec}
      clusterRadius={props.clusterRadius}
      geometries={props.geometries}
      palette={props.palette}
      lightRef={props.lightRef}
    />
  );
}

type HurricaneStormLayerProps = {
  spec: HurricaneLayerSpec;
  texture: THREE.Texture;
  noise: THREE.Texture;
  palette: CloudPalette;
  lightRef: { current: number };
  strengthRef: { current: number };
  timeRef: { current: number };
  active: boolean;
};

function HurricaneStormLayer({
  spec,
  texture,
  noise,
  palette,
  lightRef,
  strengthRef,
  timeRef,
  active,
}: HurricaneStormLayerProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(
    () =>
      createShellPatchGeometry(
        HURRICANE_RADIUS,
        spec.offset,
        spec.scale,
        spec.rotation,
        40,
      ),
    [spec.offset, spec.rotation, spec.scale],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uStormMap: { value: texture },
      uNoise: { value: noise },
      uLitColor: { value: new THREE.Color(palette.litColor) },
      uShadowColor: { value: new THREE.Color(palette.shadowColor) },
      uTime: { value: STATIC_TIME },
      uSeed: { value: spec.seed },
      uOpacity: { value: 0 },
      uLight: { value: 1 },
      uDepth: { value: spec.depth },
      uClusterRadius: { value: HURRICANE_RADIUS },
    }),
    [noise, palette, spec.depth, spec.seed, texture],
  );

  useEffect(() => {
    const material = materialRef.current;
    if (!material || !active) return;
    material.uniforms.uOpacity.value =
      spec.opacity * palette.alphaScale * Math.max(strengthRef.current, 1);
  }, [active, palette, spec.opacity, strengthRef]);

  useFrame(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value = timeRef.current;
    material.uniforms.uLight.value = lightRef.current;
    const strength = active
      ? Math.max(strengthRef.current, 1)
      : strengthRef.current;
    material.uniforms.uOpacity.value =
      spec.opacity * palette.alphaScale * strength;
  });

  return (
    <mesh
      geometry={geometry}
      raycast={ignoreRaycast}
      renderOrder={CLOUD_RENDER_ORDER}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={HURRICANE_VERTEX_SHADER}
        fragmentShader={HURRICANE_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

type HurricaneStormProps = {
  spawn: TropicalCycloneSpawn;
  texture: THREE.Texture;
  noise: THREE.Texture;
  palette: CloudPalette;
  reducedMotion: boolean;
  active: boolean;
  timeRef: { current: number };
  onActivity?: () => void;
};

const RADIAL_BASIS = new THREE.Vector3(0, 0, 1);

function HurricaneStorm({
  spawn,
  texture,
  noise,
  palette,
  reducedMotion,
  active,
  timeRef,
  onActivity,
}: HurricaneStormProps) {
  const groupRef = useRef<THREE.Group>(null);
  const spinGroupRef = useRef<THREE.Group>(null);
  const lightRef = useRef(1);
  const strengthRef = useRef(0);
  const spinAngleRef = useRef(0);
  const radial = useMemo(() => new THREE.Vector3(), []);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!active) {
      spinAngleRef.current = 0;
      if (spinGroupRef.current) spinGroupRef.current.rotation.z = 0;
      return;
    }
    onActivity?.();
    invalidate();
    strengthRef.current = 1;
  }, [active, invalidate, onActivity]);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const cosLat = Math.cos(spawn.latitudeRad);
    radial.set(
      Math.cos(spawn.longitudeRad) * cosLat,
      Math.sin(spawn.latitudeRad),
      -Math.sin(spawn.longitudeRad) * cosLat,
    );
    group.position.copy(radial).multiplyScalar(HURRICANE_RADIUS);
    group.quaternion.setFromUnitVectors(RADIAL_BASIS, radial);
    const sun = subsolarDirection();
    lightRef.current = THREE.MathUtils.smoothstep(radial.dot(sun), -0.25, 0.3);

    const target = active ? 1 : 0;
    const damp = reducedMotion ? 12 : 3.2;
    const elapsed = Math.min(delta, 0.1);
    strengthRef.current = THREE.MathUtils.damp(
      strengthRef.current,
      target,
      damp,
      elapsed,
    );

    if (active && !reducedMotion && strengthRef.current > 0.01) {
      spinAngleRef.current += elapsed * HURRICANE_SPIN_SPEED * spawn.spinSign;
      if (spinGroupRef.current) {
        spinGroupRef.current.rotation.z = spinAngleRef.current;
      }
    }

    if (strengthRef.current > 0.001) onActivity?.();
  });

  return (
    <group ref={groupRef}>
      <group ref={spinGroupRef}>
        {HURRICANE_LAYERS.map((spec) => (
          <HurricaneStormLayer
            key={spec.seed}
            spec={spec}
            texture={texture}
            noise={noise}
            palette={palette}
            lightRef={lightRef}
            strengthRef={strengthRef}
            timeRef={timeRef}
            active={active}
          />
        ))}
      </group>
    </group>
  );
}

type CloudClusterProps = {
  spec: ClusterSpec;
  geometries: THREE.BufferGeometry[];
  noise: THREE.Texture;
  palette: CloudPalette;
  sunRef: { current: THREE.Vector3 };
  timeRef: { current: number };
};

function CloudCluster({
  spec,
  geometries,
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
          clusterRadius={spec.radius}
          geometries={geometries}
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
 * Translucent weather systems placed in Earth's real cloud belts: convective
 * cumulonimbus (solid cumulus meshes) in the tropics, frontal bands on the
 * storm tracks, marine stratocumulus over the cold currents, jet-stream cirrus
 * far above them all, and one rare Pacific cyclone. Mount inside the globe's
 * spin group so every cloud shares one global circulation.
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
  const clusters = useMemo(() => {
    const budget = GLOBE_CLOUD_COUNT_BY_TIER[perfTier];
    return [
      ...buildClusters(budget),
      ...buildCirrusClusters(Math.max(2, Math.round(budget * 0.6))),
    ];
  }, [perfTier]);
  const palette = isDark ? DARK_CLOUD_PALETTE : LIGHT_CLOUD_PALETTE;
  const sunRef = useRef(new THREE.Vector3(1, 0, 0));
  const timeRef = useRef(STATIC_TIME);
  const cloudsGroupRef = useRef<THREE.Group>(null);
  const [cumulusGeometries, setCumulusGeometries] = useState<THREE.BufferGeometry[]>(
    [],
  );
  const [hurricaneTexture, setHurricaneTexture] = useState<THREE.Texture | null>(null);
  const [hurricaneActive, setHurricaneActive] = useState(false);
  const [hurricaneSpawn, setHurricaneSpawn] = useState<TropicalCycloneSpawn | null>(null);
  const hurricaneEventAttemptedRef = useRef(false);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    let cancelled = false;
    loadCumulusGeometries()
      .then((geometries) => {
        if (!cancelled) {
          setCumulusGeometries(geometries);
          invalidate();
        }
      })
      .catch(() => {
        // Cirrus planes still render if the volume library fails to load.
      });
    return () => {
      cancelled = true;
    };
  }, [invalidate]);

  useEffect(() => {
    let cancelled = false;
    loadHurricaneTexture()
      .then((texture) => {
        if (!cancelled) setHurricaneTexture(texture);
      })
      .catch(() => {
        // Ordinary cloud clusters remain the fallback if the event asset fails.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hurricaneEventAttemptedRef.current) return;
    hurricaneEventAttemptedRef.current = true;

    let eventTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const delay =
      HURRICANE_EVENT_MIN_DELAY_MS +
      Math.random() * (HURRICANE_EVENT_MAX_DELAY_MS - HURRICANE_EVENT_MIN_DELAY_MS);

    onActivity?.();
    invalidate();

    eventTimer = setTimeout(() => {
      if (Math.random() >= HURRICANE_EVENT_CHANCE) return;
      setHurricaneSpawn(pickTropicalCycloneSpawn(Math.random));
      setHurricaneActive(true);
      onActivity?.();
      invalidate();
      hideTimer = setTimeout(() => setHurricaneActive(false), HURRICANE_EVENT_VISIBLE_MS);
    }, delay);

    return () => {
      hurricaneEventAttemptedRef.current = false;
      if (eventTimer) clearTimeout(eventTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [invalidate, onActivity]);

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
          geometries={cumulusGeometries}
          noise={noise}
          palette={palette}
          sunRef={sunRef}
          timeRef={timeRef}
        />
      ))}
      {hurricaneTexture && hurricaneSpawn ? (
        <HurricaneStorm
          spawn={hurricaneSpawn}
          texture={hurricaneTexture}
          noise={noise}
          palette={palette}
          reducedMotion={reducedMotion}
          active={hurricaneActive}
          timeRef={timeRef}
          onActivity={onActivity}
        />
      ) : null}
    </group>
  );
}
