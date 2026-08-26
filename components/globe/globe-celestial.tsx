"use client";

import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { getGlobeSphereSegments } from "@/components/globe/globe-runtime";
import {
  globeEarthshineIntensity,
  globeSunIntensity,
} from "@/components/globe/globe-materials";
import { loadHurricaneTexture } from "@/lib/globe-hurricane-texture";
import type { GlobePerfTier } from "@/lib/globe-performance";
import { moonDirection, getMoonPosition } from "@/lib/moon-position";
import { subsolarDirection } from "@/lib/sun-position";

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
      color="#ffffff"
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
 * After the atmosphere shells (default transparent pass) so the limb glow cannot
 * dye the lunar disk; before the distant sun (50).
 */
const MOON_RENDER_ORDER = 40;

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
        renderOrder={MOON_RENDER_ORDER}
      >
        <sphereGeometry args={[1, segments, segments]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={MOON_VERTEX_SHADER}
          fragmentShader={MOON_FRAGMENT_SHADER}
          // Transparent pass + late renderOrder: redraw over atmosphere so the
          // grey albedo isn't washed cyan where the Moon crosses the limb.
          transparent
          depthWrite
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
