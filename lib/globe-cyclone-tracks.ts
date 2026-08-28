import * as THREE from "three";

export type CycloneTrackPoint = {
  lat: number;
  lon: number;
};

/**
 * Curated tropical-cyclone tracks: spawn over warm water, recurvature where
 * climatology expects it, then inland fade. Progress 0 is the offshore spawn;
 * fadeStartProgress marks where the center crosses onto the mainland.
 */
export type TropicalCycloneTrack = {
  weight: number;
  points: CycloneTrackPoint[];
  /** Unit path progress (0–1) where the storm begins fading over land. */
  fadeStartProgress: number;
  /** Seconds to traverse the full track while the storm is active. */
  travelDurationSec: number;
};

export const TROPICAL_CYCLONE_TRACKS: TropicalCycloneTrack[] = [
  {
    weight: 1.2,
    points: [
      { lat: 12, lon: -52 },
      { lat: 18, lon: -62 },
      { lat: 26, lon: -74 },
      { lat: 33, lon: -79 },
    ],
    fadeStartProgress: 0.62,
    travelDurationSec: 38,
  },
  {
    weight: 1.1,
    points: [
      { lat: 15, lon: -66 },
      { lat: 22, lon: -74 },
      { lat: 28, lon: -80 },
      { lat: 32, lon: -83 },
    ],
    fadeStartProgress: 0.58,
    travelDurationSec: 36,
  },
  {
    weight: 1,
    points: [
      { lat: 14, lon: -84 },
      { lat: 22, lon: -88 },
      { lat: 28, lon: -92 },
      { lat: 31, lon: -95 },
    ],
    fadeStartProgress: 0.56,
    travelDurationSec: 34,
  },
  {
    weight: 1,
    points: [
      { lat: 12, lon: -108 },
      { lat: 18, lon: -106 },
      { lat: 24, lon: -104 },
      { lat: 28, lon: -102 },
    ],
    fadeStartProgress: 0.55,
    travelDurationSec: 34,
  },
  {
    weight: 0.9,
    points: [
      { lat: 14, lon: -118 },
      { lat: 20, lon: -114 },
      { lat: 26, lon: -112 },
      { lat: 30, lon: -116 },
    ],
    fadeStartProgress: 0.58,
    travelDurationSec: 36,
  },
  {
    weight: 1.2,
    points: [
      { lat: 10, lon: 132 },
      { lat: 16, lon: 126 },
      { lat: 20, lon: 122 },
      { lat: 22, lon: 120 },
    ],
    fadeStartProgress: 0.54,
    travelDurationSec: 36,
  },
  {
    weight: 1.1,
    points: [
      { lat: 14, lon: 142 },
      { lat: 22, lon: 136 },
      { lat: 30, lon: 132 },
      { lat: 35, lon: 136 },
    ],
    fadeStartProgress: 0.58,
    travelDurationSec: 38,
  },
  {
    weight: 1,
    points: [
      { lat: 12, lon: 148 },
      { lat: 20, lon: 128 },
      { lat: 26, lon: 118 },
      { lat: 28, lon: 114 },
    ],
    fadeStartProgress: 0.6,
    travelDurationSec: 40,
  },
  {
    weight: 0.95,
    points: [
      { lat: 12, lon: 86 },
      { lat: 18, lon: 88 },
      { lat: 22, lon: 87 },
      { lat: 26, lon: 86 },
    ],
    fadeStartProgress: 0.55,
    travelDurationSec: 34,
  },
  {
    weight: 0.85,
    points: [
      { lat: 10, lon: 68 },
      { lat: 16, lon: 72 },
      { lat: 20, lon: 73 },
      { lat: 24, lon: 74 },
    ],
    fadeStartProgress: 0.54,
    travelDurationSec: 34,
  },
  {
    weight: 0.95,
    points: [
      { lat: -14, lon: 158 },
      { lat: -18, lon: 153 },
      { lat: -22, lon: 149 },
      { lat: -26, lon: 147 },
    ],
    fadeStartProgress: 0.57,
    travelDurationSec: 36,
  },
  {
    weight: 0.9,
    points: [
      { lat: -16, lon: 172 },
      { lat: -22, lon: 175 },
      { lat: -28, lon: 178 },
      { lat: -32, lon: 175 },
    ],
    fadeStartProgress: 0.58,
    travelDurationSec: 38,
  },
  {
    weight: 0.8,
    points: [
      { lat: -18, lon: 58 },
      { lat: -22, lon: 52 },
      { lat: -26, lon: 48 },
      { lat: -28, lon: 45 },
    ],
    fadeStartProgress: 0.55,
    travelDurationSec: 34,
  },
];

export type TropicalCycloneSpawn = {
  track: TropicalCycloneTrack;
  /**
   * Local mesh Z spin (viewed from outside the globe). Positive = counterclockwise.
   */
  spinSign: number;
  /** Horizontal mirror so spiral arms trail the spin direction. */
  mirrorTexture: boolean;
};

export function pickTropicalCycloneSpawn(random: () => number): TropicalCycloneSpawn {
  const totalWeight = TROPICAL_CYCLONE_TRACKS.reduce((sum, track) => sum + track.weight, 0);
  let roll = random() * totalWeight;
  let track = TROPICAL_CYCLONE_TRACKS[0];
  for (const candidate of TROPICAL_CYCLONE_TRACKS) {
    roll -= candidate.weight;
    if (roll <= 0) {
      track = candidate;
      break;
    }
  }

  /**
   * Florence density curls counterclockwise. All storms use the raw art and
   * spin counterclockwise (positive local Z) so the arms trail the rotation.
   */
  return { track, spinSign: 1, mirrorTexture: false };
}

export function sampleCycloneTrack(
  track: TropicalCycloneTrack,
  progress: number,
): { latitudeRad: number; longitudeRad: number } {
  const points = track.points;

  if (points.length === 0) {
    return { latitudeRad: 0, longitudeRad: 0 };
  }

  if (points.length === 1) {
    const point = points[0];
    return {
      latitudeRad: THREE.MathUtils.degToRad(point.lat),
      longitudeRad: THREE.MathUtils.degToRad(point.lon),
    };
  }

  const segmentCount = points.length - 1;

  if (progress >= 1) {
    const end = points[points.length - 1];
    const prev = points[points.length - 2];
    const overshoot = progress - 1;
    const lat = end.lat + (end.lat - prev.lat) * overshoot;
    const lon = end.lon + (end.lon - prev.lon) * overshoot;
    return {
      latitudeRad: THREE.MathUtils.degToRad(lat),
      longitudeRad: THREE.MathUtils.degToRad(lon),
    };
  }

  const scaled = progress * segmentCount;
  const segmentIndex = Math.min(Math.floor(scaled), segmentCount - 1);
  const localT = scaled - segmentIndex;
  const start = points[segmentIndex];
  const end = points[segmentIndex + 1];
  const lat = start.lat + (end.lat - start.lat) * localT;
  const lon = start.lon + (end.lon - start.lon) * localT;

  return {
    latitudeRad: THREE.MathUtils.degToRad(lat),
    longitudeRad: THREE.MathUtils.degToRad(lon),
  };
}
