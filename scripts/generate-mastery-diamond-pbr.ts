/**
 * Procedurally generates the Hard mastery-4 diamond PBR tile set:
 *
 *   public/textures/mastery-diamond-color.jpg      (albedo, sRGB)
 *   public/textures/mastery-diamond-roughness.jpg  (linear, gray)
 *   public/textures/mastery-diamond-normal.webp    (OpenGL tangent-space)
 *
 * Modeled on classic Call of Duty diamond camo (BO2 / Cold War / BO6): a
 * seamless grid of princess-cut square gems set in gold channels. Each gem
 * is four triangular facets meeting at a bright table, with a baked studio
 * key light so the 2D map reads as jeweled even without a shader. Normals
 * come from the same height field so the globe's sun glints off real facet
 * planes. Everything wraps toroidally.
 *
 * Run: npm run generate-diamond-pbr
 */

import path from "node:path";
import sharp from "sharp";
import { createNoise4D } from "simplex-noise";

const SIZE = 1024;
const GEMS = 8;
const GEM = SIZE / GEMS;
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

const noise4D = createNoise4D(mulberry32(0xd1a0));

function tileNoise(u: number, v: number, freq: number): number {
  const r = freq / (2 * Math.PI);
  const au = 2 * Math.PI * u;
  const av = 2 * Math.PI * v;
  return noise4D(r * Math.cos(au), r * Math.sin(au), r * Math.cos(av), r * Math.sin(av));
}

const wrap = (i: number) => ((i % SIZE) + SIZE) % SIZE;
const idx = (x: number, y: number) => wrap(y) * SIZE + wrap(x);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

function cellRng(cx: number, cy: number): () => number {
  const x = ((cx % GEMS) + GEMS) % GEMS;
  const y = ((cy % GEMS) + GEMS) % GEMS;
  return mulberry32((0xd1a007 ^ Math.imul(x + 1, 0x9e3779b9) ^ Math.imul(y + 3, 0x85ebca6b)) >>> 0);
}

type GemVars = {
  light: [number, number, number];
  hero: number;
  flash: number;
  groutW: number;
  warmth: number;
};

function gemVars(rng: () => number): GemVars {
  const angle = rng() * Math.PI * 2;
  const elev = 0.48 + rng() * 0.28;
  const horiz = Math.sqrt(Math.max(0, 1 - elev * elev));
  return {
    light: [Math.cos(angle) * horiz, Math.sin(angle) * horiz, elev],
    hero: Math.floor(rng() * 8),
    flash: rng() * 0.35,
    groutW: 0.07 + rng() * 0.025,
    warmth: (rng() - 0.5) * 14,
  };
}

type GemShade = {
  height: number;
  albedo: [number, number, number];
  roughness: number;
};

/**
 * Princess-cut square gem in a gold bezel. Eight kite facets + a table give
 * the classic COD diamond-camo envelope, with a unique light per stone so
 * neighbors flash different faces instead of repeating as a stamp.
 */
function shadeGem(localX: number, localY: number, vars: GemVars): GemShade {
  const px = localX * 2 - 1;
  const py = localY * 2 - 1;
  const edge = 1 - Math.max(Math.abs(px), Math.abs(py));
  const groutT = clamp01(edge / vars.groutW);

  if (groutT < 1) {
    const cavity = 1 - groutT;
    const height = 0.07 + groutT * 0.2;
    const deep: [number, number, number] = [158, 104, 32];
    const mid: [number, number, number] = [222, 170, 64];
    const hi: [number, number, number] = [255, 220, 124];
    const t = smoothstep(clamp01(0.32 + groutT * 0.55 - cavity * 0.22));
    const albedo: [number, number, number] =
      t < 0.5
        ? [
            lerp(deep[0], mid[0], t / 0.5),
            lerp(deep[1], mid[1], t / 0.5),
            lerp(deep[2], mid[2], t / 0.5),
          ]
        : [
            lerp(mid[0], hi[0], (t - 0.5) / 0.5),
            lerp(mid[1], hi[1], (t - 0.5) / 0.5),
            lerp(mid[2], hi[2], (t - 0.5) / 0.5),
          ];
    return {
      height,
      albedo,
      roughness: 0.3 + cavity * 0.14,
    };
  }

  const innerX = px / (1 - vars.groutW);
  const innerY = py / (1 - vars.groutW);
  const rCheb = Math.max(Math.abs(innerX), Math.abs(innerY));
  const rRad = Math.hypot(innerX, innerY);
  const angle = Math.atan2(innerY, innerX);
  const facetCount = 8;
  const facetU = ((angle + Math.PI) / (2 * Math.PI)) * facetCount;
  const facet = Math.floor(facetU) % facetCount;
  const facetFrac = facetU - Math.floor(facetU);

  const tableR = 0.18;
  const inTable = rRad < tableR;
  // Dark hairline between kite facets.
  const groove = Math.exp(-((Math.min(facetFrac, 1 - facetFrac) * 22) ** 2));

  const tilt = inTable ? 0.1 : 0.68;
  const facetAngle = ((facet + 0.5) / facetCount) * Math.PI * 2 - Math.PI;
  const nx = Math.cos(facetAngle) * tilt;
  const ny = Math.sin(facetAngle) * tilt;
  const nz = Math.sqrt(Math.max(0.04, 1 - nx * nx - ny * ny));
  const [lx, ly, lz] = vars.light;
  const nDotL = Math.max(0, nx * lx + ny * ly + nz * lz);
  const hx = lx;
  const hy = ly;
  const hz = lz + 1;
  const invH = 1 / Math.hypot(hx, hy, hz);
  const spec = Math.pow(Math.max(0, nx * hx * invH + ny * hy * invH + nz * hz * invH), inTable ? 90 : 42);

  const diag = Math.abs(Math.abs(innerX) - Math.abs(innerY));
  const ridge = Math.exp(-((diag * 16) ** 2));
  const heroBoost = facet === vars.hero ? 0.28 : 0;
  const shade = clamp01(
    0.1 + nDotL * 0.7 + spec * 0.95 + ridge * 0.22 + heroBoost + vars.flash - groove * 0.18,
  );

  const shadow: [number, number, number] = [62, 102, 136];
  const midIce: [number, number, number] = [176, 210, 230];
  const bright: [number, number, number] = [250, 253, 255];
  let albedo: [number, number, number];
  if (shade < 0.42) {
    const k = shade / 0.42;
    albedo = [
      lerp(shadow[0], midIce[0], k),
      lerp(shadow[1], midIce[1], k),
      lerp(shadow[2], midIce[2], k),
    ];
  } else {
    const k = (shade - 0.42) / 0.58;
    albedo = [
      lerp(midIce[0], bright[0], k),
      lerp(midIce[1], bright[1], k),
      lerp(midIce[2], bright[2], k),
    ];
  }

  albedo[0] += vars.warmth * 0.35;
  albedo[2] -= vars.warmth * 0.2;

  if (spec > 0.28) {
    const fire = (spec - 0.28) * 55;
    albedo[0] = Math.min(255, albedo[0] + fire * (facet % 2 === 0 ? 0.2 : 0.45));
    albedo[1] = Math.min(255, albedo[1] + fire * 0.15);
    albedo[2] = Math.min(255, albedo[2] + fire * (facet % 2 === 0 ? 0.5 : 0.12));
  }

  const height = inTable ? 0.88 : 0.88 - (rCheb - tableR) * 0.58;

  return {
    height: clamp01(height + ridge * 0.035 - groove * 0.05),
    albedo: [
      clamp01(albedo[0] / 255) * 255,
      clamp01(albedo[1] / 255) * 255,
      clamp01(albedo[2] / 255) * 255,
    ],
    roughness: inTable ? 0.05 : 0.08 + (1 - shade) * 0.1 + groove * 0.12,
  };
}

function main() {
  const height = new Float64Array(SIZE * SIZE);
  const rough = new Float64Array(SIZE * SIZE);
  const color = Buffer.alloc(SIZE * SIZE * 3);

  console.log("shading gems...");
  const varsByCell: GemVars[] = [];
  for (let cy = 0; cy < GEMS; cy++) {
    for (let cx = 0; cx < GEMS; cx++) {
      varsByCell[cy * GEMS + cx] = gemVars(cellRng(cx, cy));
    }
  }
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const cx = Math.floor(x / GEM);
      const cy = Math.floor(y / GEM);
      const shade = shadeGem(
        (x - cx * GEM) / GEM,
        (y - cy * GEM) / GEM,
        varsByCell[cy * GEMS + cx],
      );
      const i = y * SIZE + x;
      height[i] = shade.height;
      rough[i] = shade.roughness;
      color[i * 3] = Math.round(shade.albedo[0]);
      color[i * 3 + 1] = Math.round(shade.albedo[1]);
      color[i * 3 + 2] = Math.round(shade.albedo[2]);
    }
  }

  // Micro sparkle + gold-channel waviness so the tile doesn't look stamped.
  console.log("micro variation...");
  for (let y = 0; y < SIZE; y++) {
    const v = y / SIZE;
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;
      const i = y * SIZE + x;
      const n = tileNoise(u, v, 64) * 0.012 + tileNoise(u, v, 140) * 0.008;
      height[i] = clamp01(height[i] + n);

      const sparkle = Math.max(0, tileNoise(u, v, 220));
      if (sparkle > 0.72 && rough[i] < 0.2) {
        const pop = (sparkle - 0.72) * 40;
        color[i * 3] = Math.min(255, color[i * 3] + pop);
        color[i * 3 + 1] = Math.min(255, color[i * 3 + 1] + pop);
        color[i * 3 + 2] = Math.min(255, color[i * 3 + 2] + pop);
      }
    }
  }

  console.log("deriving normals...");
  const normal = Buffer.alloc(SIZE * SIZE * 3);
  const roughOut = Buffer.alloc(SIZE * SIZE);
  const NORMAL_AMP = 34;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const gx = (height[idx(x + 1, y)] - height[idx(x - 1, y)]) * 0.5 * NORMAL_AMP;
      const gy = (height[idx(x, y + 1)] - height[idx(x, y - 1)]) * 0.5 * NORMAL_AMP;
      const invLen = 1 / Math.hypot(gx, gy, 1);
      normal[i * 3] = Math.round((-gx * invLen * 0.5 + 0.5) * 255);
      normal[i * 3 + 1] = Math.round((gy * invLen * 0.5 + 0.5) * 255);
      normal[i * 3 + 2] = Math.round((invLen * 0.5 + 0.5) * 255);
      roughOut[i] = Math.round(clamp01(rough[i]) * 255);
    }
  }

  console.log("encoding...");
  return Promise.all([
    sharp(color, { raw: { width: SIZE, height: SIZE, channels: 3 } })
      .jpeg({ quality: 94 })
      .toFile(path.join(OUT_DIR, "mastery-diamond-color.jpg")),
    sharp(roughOut, { raw: { width: SIZE, height: SIZE, channels: 1 } })
      .jpeg({ quality: 92 })
      .toFile(path.join(OUT_DIR, "mastery-diamond-roughness.jpg")),
    sharp(normal, { raw: { width: SIZE, height: SIZE, channels: 3 } })
      .webp({ quality: 95, smartSubsample: false })
      .toFile(path.join(OUT_DIR, "mastery-diamond-normal.webp")),
  ]).then(() => {
    console.log(`wrote 3 maps to ${OUT_DIR}`);
  });
}

main();
