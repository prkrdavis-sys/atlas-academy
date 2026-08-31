/**
 * Mastery-4 as a GPU material feature instead of a painted canvas.
 *
 * The only geography-dependent part of the finish is *where* it is — a mask.
 * Grain, roughness, and normal relief are tiling textures sampled in global
 * equirectangular UV space, so they stay welded to the planet no matter how
 * the camera moves and no canvas ever has to be repainted for them.
 *
 * Two tiling frequencies are cross-faded by camera distance so the grain stays
 * crisp when zoomed in without over-tiling at globe scale.
 *
 * Shader uniforms keep the historical `uGold*` names; the TypeScript contract
 * is a mastery finish, not gold-only.
 */

import * as THREE from "three";
import { GLOBE_BASE_TEXTURE_SIZE } from "@/lib/globe-texture";
import type { MasteryFinish, MasteryFinishId } from "@/lib/mastery-finish";

export type MasteryDetailTextures = {
  color: THREE.Texture;
  roughness: THREE.Texture;
  normal: THREE.Texture;
};

/** Fine tier for close-up zoom. Power of two so both tiers stay mip-aligned. */
const FINE_TILE_MULTIPLIER = 4;

/**
 * Tile repeats across a full equirectangular wrap. X uses the canvas tile
 * size; Y is halved because the map is twice as wide as it is tall, which
 * keeps tiles square on the sphere.
 */
function tileRepeats(tileBasePx: number): { coarse: THREE.Vector2; fine: THREE.Vector2 } {
  const x = GLOBE_BASE_TEXTURE_SIZE / tileBasePx;
  const coarse = new THREE.Vector2(x, x / 2);
  return { coarse, fine: coarse.clone().multiplyScalar(FINE_TILE_MULTIPLIER) };
}

/** Camera distance at which the coarse tier is used on its own. */
const DETAIL_BLEND_FAR_DISTANCE = 2.6;
/** Camera distance at which the fine tier has fully taken over. */
const DETAIL_BLEND_NEAR_DISTANCE = 1.15;

/** Full-globe window: sphere UVs already are global equirectangular UVs. */
export const MASTERY_FULL_GLOBE_UV_WINDOW = new THREE.Vector4(0, 0, 1, 1);

function loadTexture(src: string, colorSpace: THREE.ColorSpace): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      src,
      (texture) => {
        texture.colorSpace = colorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        // Mipmaps are what stop the grain from sparkling when minified — these
        // are static image tiles, never repainted, so they are always safe here.
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      () => reject(new Error(`Failed to load mastery detail texture: ${src}`)),
    );
  });
}

const detailPromises = new Map<MasteryFinishId, Promise<MasteryDetailTextures>>();

function loadDetailSet(finish: MasteryFinish): Promise<MasteryDetailTextures> {
  return Promise.all([
    loadTexture(finish.colorPath, THREE.SRGBColorSpace),
    loadTexture(finish.roughnessPath, THREE.NoColorSpace),
    loadTexture(finish.normalPath, THREE.NoColorSpace),
  ]).then(([color, roughness, normal]) => ({ color, roughness, normal }));
}

/** Loads the tiling PBR set for a finish once per session (browser only). */
export function loadMasteryDetailTextures(finish: MasteryFinish): Promise<MasteryDetailTextures> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Mastery detail textures require a browser environment"));
  }
  const cached = detailPromises.get(finish.id);
  if (cached) return cached;
  const promise = loadDetailSet(finish);
  detailPromises.set(finish.id, promise);
  return promise;
}

/** Raises anisotropy on the shared tiles to the renderer's supported maximum. */
export function applyMasteryDetailAnisotropy(
  textures: MasteryDetailTextures,
  gl: THREE.WebGLRenderer,
  cap: number,
): void {
  const anisotropy = Math.min(cap, gl.capabilities.getMaxAnisotropy());
  for (const texture of [textures.color, textures.roughness, textures.normal]) {
    if (texture.anisotropy === anisotropy) continue;
    texture.anisotropy = anisotropy;
    texture.needsUpdate = true;
  }
}

/** Mask texture marking which texels are mastery-4. */
export function createMasteryMaskTexture(
  canvas: HTMLCanvasElement,
  gl: THREE.WebGLRenderer,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

export type MasteryDetailUniforms = {
  uGoldMask: { value: THREE.Texture };
  uGoldColorTex: { value: THREE.Texture };
  uGoldRoughTex: { value: THREE.Texture };
  uGoldDetailRepeatA: { value: THREE.Vector2 };
  uGoldDetailRepeatB: { value: THREE.Vector2 };
  uGoldDetailBlend: { value: number };
  uGoldUvWindow: { value: THREE.Vector4 };
  uGoldMetalness: { value: number };
  uMatteMetalness: { value: number };
  uMatteRoughness: { value: number };
};

export type MasteryMaterialConfig = {
  /** Painted albedo canvas texture (ocean, land, borders, flat finish fills). */
  map: THREE.Texture;
  masteryMask: THREE.Texture;
  detail: MasteryDetailTextures;
  finish: MasteryFinish;
  /**
   * Window this material's UVs cover in global equirectangular space,
   * as `(originX, originY, spanX, spanY)`. Full globe is `(0, 0, 1, 1)`.
   */
  uvWindow: THREE.Vector4;
  matteMetalness: number;
  matteRoughness: number;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  side?: THREE.Side;
};

/**
 * A `MeshStandardMaterial` whose mastery-4 response is evaluated per-pixel
 * from the tiling detail set, masked to mastered places. Matte land and ocean
 * pay only one extra mask fetch and keep their painted albedo untouched.
 */
export function createMasterySurfaceMaterial(
  config: MasteryMaterialConfig,
): THREE.MeshStandardMaterial {
  const finish = config.finish;
  const material = new THREE.MeshStandardMaterial({
    map: config.map,
    // Set so three compiles the tangent-space normal path (and its TBN); the
    // sampling itself is replaced below with the masked dual-frequency version.
    normalMap: config.detail.normal,
    normalScale: new THREE.Vector2(finish.normalScale[0], finish.normalScale[1]),
    emissive: finish.emissive,
    emissiveIntensity: finish.emissiveIntensity,
    envMapIntensity: finish.envMapIntensity,
    roughness: config.matteRoughness,
    metalness: config.matteMetalness,
    transparent: config.transparent ?? false,
    opacity: config.opacity ?? 1,
    depthWrite: config.depthWrite ?? true,
    side: config.side ?? THREE.FrontSide,
  });

  const repeats = tileRepeats(finish.tileBasePx);
  const uniforms: MasteryDetailUniforms = {
    uGoldMask: { value: config.masteryMask },
    uGoldColorTex: { value: config.detail.color },
    uGoldRoughTex: { value: config.detail.roughness },
    uGoldDetailRepeatA: { value: repeats.coarse },
    uGoldDetailRepeatB: { value: repeats.fine },
    uGoldDetailBlend: { value: 0 },
    uGoldUvWindow: { value: config.uvWindow.clone() },
    uGoldMetalness: { value: finish.metalness },
    uMatteMetalness: { value: config.matteMetalness },
    uMatteRoughness: { value: config.matteRoughness },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec2 vGoldUv;`,
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
        vGoldUv = uv;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec2 vGoldUv;
        uniform sampler2D uGoldMask;
        uniform sampler2D uGoldColorTex;
        uniform sampler2D uGoldRoughTex;
        uniform vec2 uGoldDetailRepeatA;
        uniform vec2 uGoldDetailRepeatB;
        uniform float uGoldDetailBlend;
        uniform vec4 uGoldUvWindow;
        uniform float uGoldMetalness;
        uniform float uMatteMetalness;
        uniform float uMatteRoughness;
        float gGoldMask;
        vec2 gGoldDetailUvA;
        vec2 gGoldDetailUvB;`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        gGoldMask = texture2D( uGoldMask, vGoldUv ).r;
        vec2 gGoldGlobalUv = vec2(
          uGoldUvWindow.x + vGoldUv.x * uGoldUvWindow.z,
          uGoldUvWindow.y + ( 1.0 - vGoldUv.y ) * uGoldUvWindow.w
        );
        gGoldDetailUvA = gGoldGlobalUv * uGoldDetailRepeatA;
        gGoldDetailUvB = gGoldGlobalUv * uGoldDetailRepeatB;
        if ( gGoldMask > 0.001 ) {
          vec3 goldAlbedo = mix(
            texture2D( uGoldColorTex, gGoldDetailUvA ).rgb,
            texture2D( uGoldColorTex, gGoldDetailUvB ).rgb,
            uGoldDetailBlend
          );
          diffuseColor.rgb = mix( diffuseColor.rgb, goldAlbedo, gGoldMask );
        }`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        float gGoldRoughness = mix(
          texture2D( uGoldRoughTex, gGoldDetailUvA ).g,
          texture2D( uGoldRoughTex, gGoldDetailUvB ).g,
          uGoldDetailBlend
        );
        roughnessFactor = mix( uMatteRoughness, gGoldRoughness, gGoldMask );`,
      )
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
        metalnessFactor = mix( uMatteMetalness, uGoldMetalness, gGoldMask );`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#ifdef USE_NORMALMAP_TANGENTSPACE
          vec3 gGoldMapN = mix(
            texture2D( normalMap, gGoldDetailUvA ).xyz,
            texture2D( normalMap, gGoldDetailUvB ).xyz,
            uGoldDetailBlend
          ) * 2.0 - 1.0;
          // Equirectangular latitude runs opposite the mesh's V axis (and so
          // opposite the tangent frame's bitangent), so the green channel has
          // to be flipped or the relief lights from the wrong side.
          gGoldMapN.y = -gGoldMapN.y;
          gGoldMapN.xy *= normalScale * gGoldMask;
          normal = normalize( tbn * gGoldMapN );
        #endif`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance *= gGoldMask;`,
      );
  };

  material.userData.masteryUniforms = uniforms;
  material.customProgramCacheKey = () => "globe-mastery-detail";
  return material;
}

/** Mastery-detail uniforms for a material built by {@link createMasterySurfaceMaterial}. */
export function getMasteryUniforms(
  material: THREE.Material | null | undefined,
): MasteryDetailUniforms | null {
  return (material?.userData?.masteryUniforms as MasteryDetailUniforms | undefined) ?? null;
}

/**
 * Cross-fades the coarse and fine tiling tiers by camera distance. One float
 * write per frame — no repaint, no texture upload.
 */
export function updateMasteryDetailBlend(
  material: THREE.Material | null | undefined,
  cameraDistance: number,
): void {
  const uniforms = getMasteryUniforms(material);
  if (!uniforms) return;
  const span = DETAIL_BLEND_FAR_DISTANCE - DETAIL_BLEND_NEAR_DISTANCE;
  const t = (DETAIL_BLEND_FAR_DISTANCE - cameraDistance) / span;
  const clamped = Math.min(1, Math.max(0, t));
  uniforms.uGoldDetailBlend.value = clamped * clamped * (3 - 2 * clamped);
}
