import { CONTINENTS, US_REGIONS, type Region } from "@/lib/types";

/** Filename stem for each region's thumbnail silhouette. */
export const REGION_SHAPE_KEYS: Record<Region, string> = {
  Africa: "africa",
  Antarctica: "antarctica",
  Asia: "asia",
  Europe: "europe",
  "North America": "north-america",
  Oceania: "oceania",
  "South America": "south-america",
  Midwest: "us-midwest",
  Northeast: "us-northeast",
  South: "us-south",
  West: "us-west",
};

export const REGION_SHAPE_REGIONS: Region[] = [...CONTINENTS, ...US_REGIONS];

export function getRegionShapePath(region: Region): string {
  return `/shapes/continents/${REGION_SHAPE_KEYS[region]}.svg`;
}
