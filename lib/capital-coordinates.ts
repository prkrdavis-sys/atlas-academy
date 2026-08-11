import capitalCoordinatesData from "@/data/capital-coordinates.json";

/** Capital location as [latitude, longitude] in WGS84 degrees. */
export type CapitalLatLng = readonly [lat: number, lng: number];

const capitalCoordinates = capitalCoordinatesData as unknown as Record<string, CapitalLatLng>;

export function getCapitalLatLng(code: string): CapitalLatLng | undefined {
  return capitalCoordinates[code.toUpperCase()];
}
