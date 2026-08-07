import * as THREE from "three";

export const HURRICANE_TEXTURE_URL = "/globe/hurricane-florence-density.png";

let hurricaneTexturePromise: Promise<THREE.Texture> | null = null;

function configureHurricaneTexture(texture: THREE.Texture): THREE.Texture {
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** Load the derived NOAA storm mask once and share it across globe mounts. */
export function loadHurricaneTexture(): Promise<THREE.Texture> {
  if (hurricaneTexturePromise) return hurricaneTexturePromise;

  hurricaneTexturePromise = new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      HURRICANE_TEXTURE_URL,
      (texture) => resolve(configureHurricaneTexture(texture)),
      undefined,
      reject,
    );
  });

  return hurricaneTexturePromise;
}
