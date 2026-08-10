/**
 * Low-precision geocentric lunar ephemeris.
 *
 * The orbital elements and perturbation terms follow the compact
 * Paul Schlyter / Astronomical Almanac approximation. It is accurate to
 * roughly a degree, which is appropriate for a decorative real-time globe.
 */
export type MoonPosition = {
  /** Earth-fixed geographic subpoint of the Moon. */
  latitude: number;
  longitude: number;
  /** Earth radii from Earth's centre. */
  distance: number;
};

const RAD = Math.PI / 180;
const J2000 = 2_451_545;
const MOON_POSITION_CACHE_MS = 1000;

let cachedAt = 0;
let cachedPosition: MoonPosition | null = null;

function normalizeDegrees(value: number): number {
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function normalizeLongitude(value: number): number {
  return normalizeDegrees(value + 180) - 180;
}

function daysSinceJ2000(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5 - J2000;
}

function sinDegrees(value: number): number {
  return Math.sin(value * RAD);
}

/**
 * Geocentric Moon position in the globe's local frame:
 * longitude 0° points at +X and longitude 90°E points at -Z.
 */
export function getMoonPosition(date: Date = new Date()): MoonPosition {
  const timestamp = date.getTime();
  if (cachedPosition && Math.abs(timestamp - cachedAt) < MOON_POSITION_CACHE_MS) {
    return cachedPosition;
  }

  const d = daysSinceJ2000(date);
  const node = 125.1228 - 0.0529538083 * d;
  const inclination = 5.1454;
  const argumentOfPerigee = 318.0634 + 0.1643573223 * d;
  const semiMajorAxis = 60.2666;
  const eccentricity = 0.0549;
  const meanAnomaly = normalizeDegrees(115.3654 + 13.0649929509 * d);

  // Solve Kepler's equation with a few Newton iterations.
  let eccentricAnomaly = (meanAnomaly + eccentricity / RAD * sinDegrees(meanAnomaly)) * RAD;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    eccentricAnomaly -=
      (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly * RAD) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
  }

  const xv = semiMajorAxis * (Math.cos(eccentricAnomaly) - eccentricity);
  const yv =
    semiMajorAxis *
    Math.sqrt(1 - eccentricity * eccentricity) *
    Math.sin(eccentricAnomaly);
  const trueAnomaly = Math.atan2(yv, xv) / RAD;
  const radius = Math.hypot(xv, yv);
  const longitudeOfOrbit = (trueAnomaly + argumentOfPerigee) * RAD;
  const nodeRad = node * RAD;
  const inclinationRad = inclination * RAD;

  let eclipticLongitude = Math.atan2(
    Math.sin(longitudeOfOrbit) * Math.cos(inclinationRad) * Math.sin(nodeRad) +
      Math.cos(longitudeOfOrbit) * Math.cos(nodeRad),
    Math.sin(longitudeOfOrbit) * Math.cos(inclinationRad) * Math.cos(nodeRad) -
      Math.cos(longitudeOfOrbit) * Math.sin(nodeRad),
  ) / RAD;
  let eclipticLatitude =
    (Math.asin(Math.sin(longitudeOfOrbit) * Math.sin(inclinationRad)) / RAD);

  // Main evection, variation, and latitude terms.
  const sunMeanAnomaly = normalizeDegrees(356.0470 + 0.9856002585 * d);
  const sunMeanLongitude = normalizeDegrees(280.460 + 0.98564736 * d);
  const moonMeanLongitude = normalizeDegrees(node + argumentOfPerigee + meanAnomaly);
  const elongation = moonMeanLongitude - sunMeanLongitude;
  const argumentOfLatitude = moonMeanLongitude - node;

  eclipticLongitude +=
    -1.274 * sinDegrees(meanAnomaly - 2 * elongation) +
    0.658 * sinDegrees(2 * elongation) -
    0.186 * sinDegrees(sunMeanAnomaly) -
    0.059 * sinDegrees(2 * meanAnomaly - 2 * elongation) -
    0.057 * sinDegrees(meanAnomaly - 2 * elongation + sunMeanAnomaly) +
    0.053 * sinDegrees(meanAnomaly + 2 * elongation) +
    0.046 * sinDegrees(2 * elongation - sunMeanAnomaly) +
    0.041 * sinDegrees(meanAnomaly - sunMeanAnomaly) -
    0.035 * sinDegrees(elongation) -
    0.031 * sinDegrees(meanAnomaly + sunMeanAnomaly) -
    0.015 * sinDegrees(2 * argumentOfLatitude - 2 * elongation) +
    0.011 * sinDegrees(meanAnomaly - 4 * elongation);
  eclipticLatitude +=
    -0.173 * sinDegrees(argumentOfLatitude - 2 * elongation) -
    0.055 * sinDegrees(meanAnomaly - argumentOfLatitude - 2 * elongation) -
    0.046 * sinDegrees(meanAnomaly + argumentOfLatitude - 2 * elongation) +
    0.033 * sinDegrees(argumentOfLatitude + 2 * elongation) +
    0.017 * sinDegrees(2 * meanAnomaly + argumentOfLatitude);

  const obliquity = (23.439 - 0.0000004 * d) * RAD;
  const lambda = eclipticLongitude * RAD;
  const beta = eclipticLatitude * RAD;
  const rightAscension =
    Math.atan2(
      Math.sin(lambda) * Math.cos(obliquity) - Math.tan(beta) * Math.sin(obliquity),
      Math.cos(lambda),
    ) / RAD;
  const declination =
    Math.asin(
      Math.sin(beta) * Math.cos(obliquity) +
        Math.cos(beta) * Math.sin(obliquity) * Math.sin(lambda),
    ) / RAD;
  const greenwichSiderealTime =
    normalizeDegrees(280.46061837 + 360.98564736629 * d);

  cachedPosition = {
    latitude: declination,
    longitude: normalizeLongitude(rightAscension - greenwichSiderealTime),
    distance: radius,
  };
  cachedAt = timestamp;
  return cachedPosition;
}

export function moonDirection(date: Date = new Date()): {
  x: number;
  y: number;
  z: number;
} {
  const { latitude, longitude } = getMoonPosition(date);
  const lat = latitude * RAD;
  const lon = longitude * RAD;
  const cosLat = Math.cos(lat);
  return {
    x: Math.cos(lon) * cosLat,
    y: Math.sin(lat),
    z: -Math.sin(lon) * cosLat,
  };
}
