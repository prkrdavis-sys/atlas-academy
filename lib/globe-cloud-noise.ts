/**
 * Shared tiling value-noise texture for the globe's cloud puffs. One canvas is
 * painted per size and reused by every puff material — the shader samples it
 * twice at different scales and drift rates, so a single texture is enough to
 * make each cloud evolve its own shape.
 */

import * as THREE from "three";

/** Deterministic hash so the same lattice is painted on every reload. */
function latticeValue(seed: number, x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

function smootherstep(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Bilinear value noise on a `cells` x `cells` lattice that wraps at the edges. */
function valueNoise(seed: number, cells: number, u: number, v: number): number {
  const x = u * cells;
  const y = v * cells;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smootherstep(x - x0);
  const fy = smootherstep(y - y0);
  const xa = ((x0 % cells) + cells) % cells;
  const ya = ((y0 % cells) + cells) % cells;
  const xb = (xa + 1) % cells;
  const yb = (ya + 1) % cells;

  const v00 = latticeValue(seed, xa, ya);
  const v10 = latticeValue(seed, xb, ya);
  const v01 = latticeValue(seed, xa, yb);
  const v11 = latticeValue(seed, xb, yb);

  const top = v00 + (v10 - v00) * fx;
  const bottom = v01 + (v11 - v01) * fx;
  return top + (bottom - top) * fy;
}

const noiseTextureCache = new Map<number, THREE.CanvasTexture>();

/**
 * Seamlessly tiling fractal noise in the red channel. Cached per size so the
 * cost is paid once per session no matter how many clouds mount.
 */
export function getCloudNoiseTexture(size: number): THREE.CanvasTexture {
  const cached = noiseTextureCache.get(size);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create cloud noise canvas");

  const image = ctx.createImageData(size, size);
  const octaves = [
    { cells: 4, amplitude: 0.5 },
    { cells: 8, amplitude: 0.26 },
    { cells: 16, amplitude: 0.15 },
    { cells: 32, amplitude: 0.09 },
  ];
  const total = octaves.reduce((sum, octave) => sum + octave.amplitude, 0);

  for (let y = 0; y < size; y += 1) {
    const v = y / size;
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      let value = 0;
      for (let i = 0; i < octaves.length; i += 1) {
        const octave = octaves[i];
        value += valueNoise(i + 1, octave.cells, u, v) * octave.amplitude;
      }
      const level = Math.round((value / total) * 255);
      const offset = (y * size + x) * 4;
      image.data[offset] = level;
      image.data[offset + 1] = level;
      image.data[offset + 2] = level;
      image.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  noiseTextureCache.set(size, texture);
  return texture;
}
