/**
 * Gold mastery as a GPU material feature instead of a painted canvas.
 *
 * The only geography-dependent part of gold is *where* it is — a mask. The
 * brushed grain, roughness, and normal relief are tiling textures sampled in
 * global equirectangular UV space, so they stay welded to the planet no matter
 * how the camera moves and no canvas ever has to be repainted for them.
 *
 * Two tiling frequencies are cross-faded by camera distance so the grain stays
 * crisp when zoomed in without over-tiling at globe scale.
 */

import * as THREE from "three";
import {
  MASTERY_DIAMOND_NORMAL_PATH,
  MASTERY_DIAMOND_ROUGHNESS_PATH,
  MASTERY_DIAMOND_TEXTURE_PATH,
} from "@/lib/mastery-diamond-texture";
import {
  MASTERY_GOLD_NORMAL_PATH,
  MASTERY_GOLD_ROUGHNESS_PATH,
  MASTERY_GOLD_TEXTURE_PATH,
  MASTERY_GOLD_TILE_BASE_PX,
} from "@/lib/mastery-gold-texture";
import { GLOBE_BASE_TEXTURE_SIZE } from "@/lib/globe-texture";

export type GoldDetailTextures = {
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
export const GOLD_FULL_GLOBE_UV_WINDOW = new THREE.Vector4(0, 0, 1, 1);

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

let goldDetailPromise: Promise<GoldDetailTextures> | null = null;
let diamondDetailPromise: Promise<GoldDetailTextures> | null = null;

function loadDetailSet(
  colorPath: string,
  roughPath: string,
  normalPath: string,
): Promise<GoldDetailTextures> {
  return Promise.all([
    loadTexture(colorPath, THREE.SRGBColorSpace),
    loadTexture(roughPath, THREE.NoColorSpace),
    loadTexture(normalPath, THREE.NoColorSpace),
  ]).then(([color, roughness, normal]) => ({ color, roughness, normal }));
}

/** Loads the shared tiling gold PBR set once per session (browser only). */
export function loadGoldDetailTextures(): Promise<GoldDetailTextures> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Gold detail textures require a browser environment"));
  }
  if (!goldDetailPromise) {
    goldDetailPromise = loadDetailSet(
      MASTERY_GOLD_TEXTURE_PATH,
      MASTERY_GOLD_ROUGHNESS_PATH,
      MASTERY_GOLD_NORMAL_PATH,
    );
  }
  return goldDetailPromise;
}

/** Loads the shared tiling diamond-camo PBR set once per session (browser only). */
export function loadDiamondDetailTextures(): Promise<GoldDetailTextures> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Diamond detail textures require a browser environment"));
  }
  if (!diamondDetailPromise) {
    diamondDetailPromise = loadDetailSet(
      MASTERY_DIAMOND_TEXTURE_PATH,
      MASTERY_DIAMOND_ROUGHNESS_PATH,
      MASTERY_DIAMOND_NORMAL_PATH,
    );
  }
  return diamondDetailPromise;
}

/** Raises anisotropy on the shared tiles to the renderer's supported maximum. */
export function applyGoldDetailAnisotropy(
  textures: GoldDetailTextures,
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

/** Mask texture marking which texels are mastered gold. */
export function createGoldMaskTexture(
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

export type GoldDetailUniforms = {
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

export type GoldMaterialConfig = {
  /** Painted albedo canvas texture (ocean, land, borders, flat gold fills). */
  map: THREE.Texture;
  goldMask: THREE.Texture;
  detail: GoldDetailTextures;
  /**
   * Window this material's UVs cover in global equirectangular space,
   * as `(originX, originY, spanX, spanY)`. Full globe is `(0, 0, 1, 1)`.
   */
  uvWindow: THREE.Vector4;
  goldMetalness: number;
  matteMetalness: number;
  matteRoughness: number;
  /** Pixel size of one detail tile at {@link GLOBE_BASE_TEXTURE_SIZE}. */
  tileBasePx?: number;
  emissive: THREE.ColorRepresentation;
  emissiveIntensity: number;
  envMapIntensity: number;
  normalScale: THREE.Vector2;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  side?: THREE.Side;
};

/**
 * A `MeshStandardMaterial` whose gold response is evaluated per-pixel from the
 * tiling detail set, masked to mastered places. Matte land and ocean pay only
 * one extra mask fetch and keep their painted albedo untouched.
 */
export function createGoldSurfaceMaterial(
  config: GoldMaterialConfig,
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    map: config.map,
    // Set so three compiles the tangent-space normal path (and its TBN); the
    // sampling itself is replaced below with the masked dual-frequency version.
    normalMap: config.detail.normal,
    normalScale: config.normalScale,
    emissive: config.emissive,
    emissiveIntensity: config.emissiveIntensity,
    envMapIntensity: config.envMapIntensity,
    roughness: config.matteRoughness,
    metalness: config.matteMetalness,
    transparent: config.transparent ?? false,
    opacity: config.opacity ?? 1,
    depthWrite: config.depthWrite ?? true,
    side: config.side ?? THREE.FrontSide,
  });

  const repeats = tileRepeats(config.tileBasePx ?? MASTERY_GOLD_TILE_BASE_PX);
  const uniforms: GoldDetailUniforms = {
    uGoldMask: { value: config.goldMask },
    uGoldColorTex: { value: config.detail.color },
    uGoldRoughTex: { value: config.detail.roughness },
    uGoldDetailRepeatA: { value: repeats.coarse },
    uGoldDetailRepeatB: { value: repeats.fine },
    uGoldDetailBlend: { value: 0 },
    uGoldUvWindow: { value: config.uvWindow.clone() },
    uGoldMetalness: { value: config.goldMetalness },
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
      // Gold albedo replaces the flat painted fill wherever the mask is set.
      // Detail UVs are global equirectangular, so a close-up patch and the
      // planet beneath it sample the exact same point of the tile.
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
      // Relief only inside gold; matte land keeps the sphere's own normal.
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
      // Emissive is a readability fill for shaded foil — never tint the ocean.
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance *= gGoldMask;`,
      );
  };

  material.userData.goldUniforms = uniforms;
  material.customProgramCacheKey = () => "globe-gold-detail";
  return material;
}

/** Gold detail uniforms for a material built by {@link createGoldSurfaceMaterial}. */
export function getGoldUniforms(
  material: THREE.Material | null | undefined,
): GoldDetailUniforms | null {
  return (material?.userData?.goldUniforms as GoldDetailUniforms | undefined) ?? null;
}

/**
 * Cross-fades the coarse and fine tiling tiers by camera distance. One float
 * write per frame — no repaint, no texture upload.
 */
export function updateGoldDetailBlend(
  material: THREE.Material | null | undefined,
  cameraDistance: number,
): void {
  const uniforms = getGoldUniforms(material);
  if (!uniforms) return;
  const span = DETAIL_BLEND_FAR_DISTANCE - DETAIL_BLEND_NEAR_DISTANCE;
  const t = (DETAIL_BLEND_FAR_DISTANCE - cameraDistance) / span;
  const clamped = Math.min(1, Math.max(0, t));
  uniforms.uGoldDetailBlend.value = clamped * clamped * (3 - 2 * clamped);
}
