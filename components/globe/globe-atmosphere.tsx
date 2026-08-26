"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { getGlobeAtmosphereSegments } from "@/components/globe/globe-runtime";
import { globeFillDistance } from "@/components/globe/globe-planet";
import type { GlobePerfTier } from "@/lib/globe-performance";
import { subsolarDirection } from "@/lib/sun-position";

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

/** Bright sky-blue limb — visible aura without washing the painted surface. */
const DARK_ATMOSPHERE_PALETTE: AtmospherePalette = {
  troposphere: "#7dd3fc",
  stratosphere: "#38bdf8",
  mesosphere: "#60a5fa",
  exosphere: "#3b82f6",
  opacity: 0.4,
  hazeColor: "#7dd3fc",
  hazeOpacity: 0.07,
};

/**
 * Cool sky rim in light mode too. Warm peach/orange haze used to flood the
 * whole disk whenever the near-surface shell Z-fought, reading as a red tint
 * over the ocean; the sunset backdrop already supplies warmth behind the globe.
 */
const LIGHT_ATMOSPHERE_PALETTE: AtmospherePalette = {
  troposphere: "#bae6fd",
  stratosphere: "#7dd3fc",
  mesosphere: "#38bdf8",
  exosphere: "#60a5fa",
  opacity: 0.36,
  hazeColor: "#bae6fd",
  hazeOpacity: 0.07,
};

function ignoreRaycast() {}

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
