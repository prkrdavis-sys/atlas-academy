/**
 * Shared GEBCO depth → globe-palette blue lookup. Used by the spinning globe
 * (runtime canvas tint) and by the Learn/Library map bake so both surfaces
 * paint from the same ramp.
 *
 * `t` is normalized depth: 0 = shallow (source gray 255), 1 = deepest (gray 0).
 * The mid stop sits near the flat globe ocean (#2a6aad dark / #2e6096 light).
 */

export type OceanRgb = [number, number, number];

export type OceanRampStop = { t: number; color: OceanRgb };

export const DARK_OCEAN_RAMP: OceanRampStop[] = [
  { t: 0.0, color: [0x4a, 0x84, 0xc0] }, // shelf / coastal shallows
  { t: 0.35, color: [0x35, 0x6c, 0xa8] },
  { t: 0.62, color: [0x2a, 0x6a, 0xad] }, // ≈ flat ocean
  { t: 1.0, color: [0x18, 0x45, 0x7a] }, // abyssal / trench
];

export const LIGHT_OCEAN_RAMP: OceanRampStop[] = [
  { t: 0.0, color: [0x4c, 0x83, 0xba] },
  { t: 0.35, color: [0x39, 0x6c, 0xa4] },
  { t: 0.62, color: [0x2e, 0x60, 0x96] }, // ≈ old flat ocean
  { t: 1.0, color: [0x1e, 0x45, 0x74] },
];

const FLAT_OCEAN_STOP_T = 0.62;

/** Source gray that maps to the mid (flat ocean) ramp stop. */
export const OCEAN_FALLBACK_DEPTH_GRAY = Math.round((1 - FLAT_OCEAN_STOP_T) * 255);

export function getOceanRamp(isDark: boolean): OceanRampStop[] {
  return isDark ? DARK_OCEAN_RAMP : LIGHT_OCEAN_RAMP;
}

export function getOceanFallbackRgb(isDark: boolean): OceanRgb {
  const ramp = getOceanRamp(isDark);
  const mid = ramp.find((stop) => stop.t === FLAT_OCEAN_STOP_T);
  return mid?.color ?? ramp[Math.floor(ramp.length / 2)].color;
}

export function oceanRgbToHex(rgb: OceanRgb): string {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function getOceanFallbackHex(isDark: boolean): string {
  return oceanRgbToHex(getOceanFallbackRgb(isDark));
}

/** 256 RGB entries indexed by source gray (0 = deepest .. 255 = shallowest). */
export function buildOceanDepthLut(isDark: boolean): Uint8ClampedArray {
  const ramp = getOceanRamp(isDark);
  const lut = new Uint8ClampedArray(256 * 3);
  for (let gray = 0; gray < 256; gray += 1) {
    const t = 1 - gray / 255;
    let lo = ramp[0];
    let hi = ramp[ramp.length - 1];
    for (let i = 0; i < ramp.length - 1; i += 1) {
      if (t >= ramp[i].t && t <= ramp[i + 1].t) {
        lo = ramp[i];
        hi = ramp[i + 1];
        break;
      }
    }
    const span = Math.max(hi.t - lo.t, 1e-6);
    const f = Math.min(1, Math.max(0, (t - lo.t) / span));
    lut[gray * 3] = lo.color[0] + (hi.color[0] - lo.color[0]) * f;
    lut[gray * 3 + 1] = lo.color[1] + (hi.color[1] - lo.color[1]) * f;
    lut[gray * 3 + 2] = lo.color[2] + (hi.color[2] - lo.color[2]) * f;
  }
  return lut;
}
