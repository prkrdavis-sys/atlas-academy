/**
 * Procedurally generates the Normal mastery-4 gold PBR tile set:
 *
 *   public/textures/mastery-gold-color.jpg      (albedo, sRGB)
 *   public/textures/mastery-gold-roughness.jpg  (linear, gray)
 *   public/textures/mastery-gold-normal.webp    (OpenGL tangent-space)
 *
 * Instead of remapping a downloaded photo scan, this builds a synthetic
 * height field of worked gold — hammered planish facets, small dents, fine
 * scratches, and polish waviness — then derives the normal map from the
 * actual height gradients so directional light (the globe's sun) physically
 * glints off the relief. Roughness and albedo are derived from the same
 * field: scratches scatter light, dent bowls dull slightly, peaks polish
 * bright. Everything wraps toroidally, so the tile is seamless.
 *
 * Run: npm run generate-gold-pbr
 */

import path from "node:path";
import sharp from "sharp";
import { createNoise4D } from "simplex-noise";

const SIZE = 1024;
const OUT_DIR = path.join(process.cwd(), "public", "textures");

/** Deterministic PRNG (mulberry32) so regeneration is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(0x601d);

const noise4D = createNoise4D(mulberry32(1379));

/**
 * Seamless 2D noise: sample 4D simplex on a torus. Any frequency stays
 * tileable because both circles close after one tile.
 */
function tileNoise(u: number, v: number, freq: number): number {
  const r = freq / (2 * Math.PI);
  const au = 2 * Math.PI * u;
  const av = 2 * Math.PI * v;
  return noise4D(r * Math.cos(au), r * Math.sin(au), r * Math.cos(av), r * Math.sin(av));
}

function fbm(u: number, v: number, octaves: { freq: number; amp: number }[]): number {
  let sum = 0;
  for (const { freq, amp } of octaves) sum += amp * tileNoise(u, v, freq);
  return sum;
}

const wrap = (i: number) => ((i % SIZE) + SIZE) % SIZE;
const idx = (x: number, y: number) => wrap(y) * SIZE + wrap(x);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

function main() {
  const height = new Float64Array(SIZE * SIZE);
  const scratch = new Float64Array(SIZE * SIZE);
  const dent = new Float64Array(SIZE * SIZE);

  // ---- 1. Polish waviness: low/mid frequency undulation -------------------
  console.log("height: waviness...");
  for (let y = 0; y < SIZE; y++) {
    const v = y / SIZE;
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;
      height[y * SIZE + x] = fbm(u, v, [
        { freq: 3, amp: 1.0 },
        { freq: 6, amp: 0.55 },
        { freq: 12, amp: 0.3 },
        { freq: 24, amp: 0.16 },
        { freq: 48, amp: 0.08 },
      ]);
    }
  }

  // ---- 2. Hammered dents ---------------------------------------------------
  console.log("height: dents...");
  type Dent = { cx: number; cy: number; r: number; depth: number; exp: number };
  const dents: Dent[] = [];
  // Broad shallow planish facets first, then small sharp dents on top.
  for (let i = 0; i < 34; i++) {
    dents.push({
      cx: rand() * SIZE,
      cy: rand() * SIZE,
      r: 52 + rand() * 66,
      depth: 0.5 + rand() * 0.7,
      exp: 1.0,
    });
  }
  for (let i = 0; i < 120; i++) {
    dents.push({
      cx: rand() * SIZE,
      cy: rand() * SIZE,
      r: 9 + rand() * 34,
      depth: 0.5 + rand() * 1.1,
      exp: 1.35,
    });
  }
  for (const d of dents) {
    const r = Math.ceil(d.r);
    const x0 = Math.floor(d.cx) - r;
    const y0 = Math.floor(d.cy) - r;
    for (let y = y0; y <= y0 + 2 * r; y++) {
      for (let x = x0; x <= x0 + 2 * r; x++) {
        const dx = x - d.cx;
        const dy = y - d.cy;
        const t = Math.hypot(dx, dy) / d.r;
        if (t >= 1) continue;
        const fall = Math.pow(0.5 + 0.5 * Math.cos(Math.PI * t), d.exp);
        const i = idx(x, y);
        height[i] -= d.depth * fall;
        dent[i] = Math.min(1, dent[i] + fall * Math.min(1, d.depth));
      }
    }
  }

  // ---- 3. Scratches ----------------------------------------------------------
  console.log("height: scratches...");
  for (let s = 0; s < 70; s++) {
    let px = rand() * SIZE;
    let py = rand() * SIZE;
    let theta = rand() * Math.PI * 2;
    const len = 30 + rand() * 250;
    const depth = 0.22 + rand() * 0.5;
    const sigma = 0.55 + rand() * 1.05;
    const kr = Math.ceil(sigma * 3);
    const steps = Math.ceil(len / 0.6);
    for (let step = 0; step < steps; step++) {
      // Gentle curvature so scratches read as real handling wear, not rules.
      theta += (rand() - 0.5) * 0.035;
      px += Math.cos(theta) * 0.6;
      py += Math.sin(theta) * 0.6;
      // Fade depth in/out along the scratch.
      const along = step / steps;
      const fade = Math.sin(Math.PI * along) ** 0.6;
      const cx = Math.round(px);
      const cy = Math.round(py);
      for (let oy = -kr; oy <= kr; oy++) {
        for (let ox = -kr; ox <= kr; ox++) {
          const dxp = cx + ox - px;
          const dyp = cy + oy - py;
          const g = Math.exp(-(dxp * dxp + dyp * dyp) / (2 * sigma * sigma));
          const val = depth * fade * g;
          const i = idx(cx + ox, cy + oy);
          if (val > scratch[i]) scratch[i] = val;
        }
      }
    }
  }
  for (let i = 0; i < height.length; i++) height[i] -= scratch[i];

  // ---- 4. Micro grain ----------------------------------------------------------
  console.log("height: micro grain...");
  for (let y = 0; y < SIZE; y++) {
    const v = y / SIZE;
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;
      height[y * SIZE + x] +=
        0.05 * tileNoise(u, v, 96) + 0.03 * tileNoise(u, v, 200);
    }
  }

  // ---- 5. Normalize height to [0, 1] -----------------------------------------
  let hMin = Infinity;
  let hMax = -Infinity;
  for (const h of height) {
    if (h < hMin) hMin = h;
    if (h > hMax) hMax = h;
  }
  const hRange = Math.max(1e-9, hMax - hMin);
  for (let i = 0; i < height.length; i++) height[i] = (height[i] - hMin) / hRange;

  // ---- 6. Wrapped box blur (for AO / cavity shading) --------------------------
  console.log("ao...");
  const blurred = boxBlurWrapped(boxBlurWrapped(height, 6), 6);

  // ---- 7. Derive maps -----------------------------------------------------------
  console.log("deriving maps...");
  const color = Buffer.alloc(SIZE * SIZE * 3);
  const rough = Buffer.alloc(SIZE * SIZE);
  const normal = Buffer.alloc(SIZE * SIZE * 3);

  // Height amplitude in "pixels" for gradient — controls baked normal strength.
  const NORMAL_AMP = 26;

  // Albedo ramp: recess grime → classic gold → bright polished peak.
  // Kept narrow — metals keep near-uniform color; relief comes from lighting.
  const deepC = [178, 126, 44];
  const midC = [228, 178, 72];
  const hiC = [255, 224, 132];

  for (let y = 0; y < SIZE; y++) {
    const v = y / SIZE;
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const u = x / SIZE;

      // Normal from wrapped central differences (OpenGL: +G = up).
      const gx = (height[idx(x + 1, y)] - height[idx(x - 1, y)]) * 0.5 * NORMAL_AMP;
      const gy = (height[idx(x, y + 1)] - height[idx(x, y - 1)]) * 0.5 * NORMAL_AMP;
      const invLen = 1 / Math.hypot(gx, gy, 1);
      normal[i * 3] = Math.round((-gx * invLen * 0.5 + 0.5) * 255);
      normal[i * 3 + 1] = Math.round((gy * invLen * 0.5 + 0.5) * 255);
      normal[i * 3 + 2] = Math.round((invLen * 0.5 + 0.5) * 255);

      // Cavity: positive in pits, negative on peaks. Gentle — dents should
      // read via the normal map, not as painted dark spots.
      const cavity = blurred[i] - height[i];
      const shade = clamp01(
        0.55 + (height[i] - 0.5) * 0.4 - cavity * 0.9 + scratch[i] * 0.3,
      );

      // Low-frequency warm/cool patina drift.
      const patina = tileNoise(u, v, 5) * 0.5 + tileNoise(u, v, 11) * 0.25;

      const t = smoothstep(shade);
      let r: number;
      let g: number;
      let b: number;
      if (t < 0.5) {
        const k = t / 0.5;
        r = lerp(deepC[0], midC[0], k);
        g = lerp(deepC[1], midC[1], k);
        b = lerp(deepC[2], midC[2], k);
      } else {
        const k = (t - 0.5) / 0.5;
        r = lerp(midC[0], hiC[0], k);
        g = lerp(midC[1], hiC[1], k);
        b = lerp(midC[2], hiC[2], k);
      }
      // Patina warms (+r) or cools (+g) very gently; scratches expose bright metal.
      r += patina * 9 + scratch[i] * 30;
      g += patina * 3 + scratch[i] * 25;
      b += -patina * 5 + scratch[i] * 12;
      color[i * 3] = Math.max(0, Math.min(255, Math.round(r)));
      color[i * 3 + 1] = Math.max(0, Math.min(255, Math.round(g)));
      color[i * 3 + 2] = Math.max(0, Math.min(255, Math.round(b)));

      // Roughness: polished base, duller dent bowls, scattering scratches.
      const polishDrift = tileNoise(u, v, 4) * 0.09;
      const micro = tileNoise(u, v, 150) * 0.035;
      const rv =
        0.24 + polishDrift + micro + dent[i] * 0.11 + Math.min(1, scratch[i]) * 0.4;
      rough[i] = Math.round(clamp01(Math.min(0.7, Math.max(0.1, rv))) * 255);
    }
  }

  // ---- 8. Encode ------------------------------------------------------------------
  console.log("encoding...");
  const jobs = [
    sharp(color, { raw: { width: SIZE, height: SIZE, channels: 3 } })
      .jpeg({ quality: 92 })
      .toFile(path.join(OUT_DIR, "mastery-gold-color.jpg")),
    sharp(rough, { raw: { width: SIZE, height: SIZE, channels: 1 } })
      .jpeg({ quality: 92 })
      .toFile(path.join(OUT_DIR, "mastery-gold-roughness.jpg")),
    // Lossy is safe here: the map is rasterized into a downscaled canvas
    // pattern before it reaches the GPU, hiding any codec noise.
    sharp(normal, { raw: { width: SIZE, height: SIZE, channels: 3 } })
      .webp({ quality: 95, smartSubsample: false })
      .toFile(path.join(OUT_DIR, "mastery-gold-normal.webp")),
  ];
  return Promise.all(jobs).then(() => {
    console.log(`wrote 3 maps to ${OUT_DIR}`);
  });
}

/** Toroidal box blur, separable single pass per axis with the given radius. */
function boxBlurWrapped(src: Float64Array, radius: number): Float64Array {
  const tmp = new Float64Array(SIZE * SIZE);
  const out = new Float64Array(SIZE * SIZE);
  const norm = 1 / (2 * radius + 1);
  // Horizontal
  for (let y = 0; y < SIZE; y++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += src[idx(k, y)];
    for (let x = 0; x < SIZE; x++) {
      tmp[y * SIZE + x] = sum * norm;
      sum += src[idx(x + radius + 1, y)] - src[idx(x - radius, y)];
    }
  }
  // Vertical
  for (let x = 0; x < SIZE; x++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += tmp[idx(x, k)];
    for (let y = 0; y < SIZE; y++) {
      out[y * SIZE + x] = sum * norm;
      sum += tmp[idx(x, y + radius + 1)] - tmp[idx(x, y - radius)];
    }
  }
  return out;
}

main();
