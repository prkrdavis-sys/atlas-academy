/**
 * Resolves a primary IANA timezone for each place (capital's zone when a
 * country spans multiple). Source: dr5hn countries-states-cities-database.
 */

export type SourceTimezone = {
  zoneName: string;
  tzName?: string;
  abbreviation?: string;
};

export type SourceCountry = {
  iso2: string;
  capital?: string;
  timezones?: SourceTimezone[];
};

/** Capitals that don't match a zone path segment cleanly. */
const COUNTRY_TIMEZONE_OVERRIDES: Record<string, string> = {
  AQ: "Antarctica/McMurdo",
  AR: "America/Argentina/Buenos_Aires",
  AU: "Australia/Sydney",
  BR: "America/Sao_Paulo",
  CA: "America/Toronto",
  CD: "Africa/Kinshasa",
  CG: "Africa/Brazzaville",
  CL: "America/Santiago",
  CN: "Asia/Shanghai",
  EC: "America/Guayaquil",
  ES: "Europe/Madrid",
  FM: "Pacific/Pohnpei",
  GL: "America/Nuuk",
  ID: "Asia/Jakarta",
  KI: "Pacific/Tarawa",
  KZ: "Asia/Almaty",
  MA: "Africa/Casablanca",
  MH: "Pacific/Majuro",
  MN: "Asia/Ulaanbaatar",
  MX: "America/Mexico_City",
  MY: "Asia/Kuala_Lumpur",
  NZ: "Pacific/Auckland",
  PF: "Pacific/Tahiti",
  PG: "Pacific/Port_Moresby",
  PS: "Asia/Hebron",
  PT: "Europe/Lisbon",
  RU: "Europe/Moscow",
  UM: "Pacific/Wake",
  US: "America/New_York",
};

/** US state capital timezones (postal code → IANA). */
export const STATE_TIMEZONES: Record<string, string> = {
  AL: "America/Chicago",
  AK: "America/Juneau",
  AZ: "America/Phoenix",
  AR: "America/Chicago",
  CA: "America/Los_Angeles",
  CO: "America/Denver",
  CT: "America/New_York",
  DE: "America/New_York",
  FL: "America/New_York",
  GA: "America/New_York",
  HI: "Pacific/Honolulu",
  ID: "America/Boise",
  IL: "America/Chicago",
  IN: "America/Indiana/Indianapolis",
  IA: "America/Chicago",
  KS: "America/Chicago",
  KY: "America/New_York",
  LA: "America/Chicago",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MI: "America/Detroit",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  MT: "America/Denver",
  NE: "America/Chicago",
  NV: "America/Los_Angeles",
  NH: "America/New_York",
  NJ: "America/New_York",
  NM: "America/Denver",
  NY: "America/New_York",
  NC: "America/New_York",
  ND: "America/Chicago",
  OH: "America/New_York",
  OK: "America/Chicago",
  OR: "America/Los_Angeles",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  SD: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  UT: "America/Denver",
  VT: "America/New_York",
  VA: "America/New_York",
  WA: "America/Los_Angeles",
  WV: "America/New_York",
  WI: "America/Chicago",
  WY: "America/Denver",
};

function normalizePlaceToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function zoneCityToken(zoneName: string): string {
  return normalizePlaceToken(zoneName.split("/").slice(1).join(""));
}

/** Pick the capital's IANA zone, with overrides for awkward multi-zone cases. */
export function pickPrimaryTimezone(country: SourceCountry): string | undefined {
  const code = country.iso2.toUpperCase();
  const override = COUNTRY_TIMEZONE_OVERRIDES[code];
  if (override) return override;

  const zones = (country.timezones ?? []).map((zone) => zone.zoneName).filter(Boolean);
  if (zones.length === 0) return undefined;
  if (zones.length === 1) return zones[0];

  const capital = normalizePlaceToken(country.capital ?? "");
  if (capital) {
    const match = zones.find((zone) => {
      const city = zoneCityToken(zone);
      return city.includes(capital) || capital.includes(city);
    });
    if (match) return match;
  }

  return zones[0];
}

export async function fetchSourceCountries(): Promise<SourceCountry[]> {
  const response = await fetch(
    "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries.json",
  );
  if (!response.ok) {
    throw new Error("Failed to fetch timezone source countries.json");
  }
  return (await response.json()) as SourceCountry[];
}
