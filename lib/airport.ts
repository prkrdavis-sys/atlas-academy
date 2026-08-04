import airportShortNames from "@/data/airport-short-names.json";

const SHORT_NAMES = airportShortNames as Record<string, string>;

/**
 * Library detail chip value: "IAD - Dulles", "LHR - Heathrow".
 * Falls back to the bare IATA code when no short name is known.
 */
export function formatAirportChip(iata: string): string {
  const shortName = SHORT_NAMES[iata];
  return shortName ? `${iata} - ${shortName}` : iata;
}
