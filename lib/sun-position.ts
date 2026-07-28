/**
 * Approximate subsolar point — the lat/lon where the Sun is directly overhead.
 * Good to ~1°, which is plenty for a visual day/night terminator on the globe.
 *
 * Formulas follow the low-precision NOAA / Astronomical Almanac approximation
 * (mean anomaly → ecliptic longitude → declination + GMST → geographic lon).
 */
export type SubsolarPoint = {
  /** Degrees north of the equator (−23.4…+23.4 over the year). */
  latitude: number;
  /** Degrees east of Greenwich (−180…180). */
  longitude: number;
};

function normalizeDegrees(value: number): number {
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** Normalize a longitude into the (−180, 180] range. */
function normalizeLongitude(degrees: number): number {
  return normalizeDegrees(degrees + 180) - 180;
}

export function getSubsolarPoint(date: Date = new Date()): SubsolarPoint {
  const rad = Math.PI / 180;
  const julianDate = date.getTime() / 86_400_000 + 2_440_587.5;
  const daysSinceJ2000 = julianDate - 2_451_545.0;

  const meanLongitude = normalizeDegrees(280.46 + 0.9856474 * daysSinceJ2000);
  const meanAnomaly = normalizeDegrees(357.528 + 0.9856003 * daysSinceJ2000) * rad;
  const eclipticLongitude =
    (meanLongitude +
      1.915 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly)) *
    rad;
  const obliquity = (23.439 - 0.0000004 * daysSinceJ2000) * rad;

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  );

  // Greenwich mean sidereal time in degrees.
  const gmst = normalizeDegrees(280.46061837 + 360.98564736629 * daysSinceJ2000) * rad;

  return {
    latitude: declination / rad,
    longitude: normalizeLongitude((rightAscension - gmst) / rad),
  };
}

/**
 * Unit direction from Earth's center toward the Sun, in the globe mesh's local
 * frame. Matches the equirectangular texture mapping used by the globe:
 * lon 0° → +X, lon 90°E → −Z, lat 90° → +Y.
 *
 * Cached for {@link SUBSOLAR_CACHE_MS} so multiple lights/sprites per frame
 * share one `Date` + trig pass.
 */
const SUBSOLAR_CACHE_MS = 1000;

let cachedSubsolarAt = 0;
let cachedSubsolar: { x: number; y: number; z: number } | null = null;

export function subsolarDirection(date: Date = new Date()): {
  x: number;
  y: number;
  z: number;
} {
  const now = date.getTime();
  if (cachedSubsolar && now - cachedSubsolarAt < SUBSOLAR_CACHE_MS) {
    return cachedSubsolar;
  }

  const { latitude, longitude } = getSubsolarPoint(date);
  const lat = latitude * (Math.PI / 180);
  const lon = longitude * (Math.PI / 180);
  const cosLat = Math.cos(lat);
  cachedSubsolar = {
    x: Math.cos(lon) * cosLat,
    y: Math.sin(lat),
    z: -Math.sin(lon) * cosLat,
  };
  cachedSubsolarAt = now;
  return cachedSubsolar;
}
