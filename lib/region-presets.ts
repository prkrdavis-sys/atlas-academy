import { CONTINENTS, US_REGIONS, type GameScope, type Region } from "@/lib/types";

export type RegionPreset = {
  id: string;
  label: string;
  regions: Region[];
};

/**
 * Antarctica holds no sovereign countries and territories are an opt-in extra,
 * so neither belongs to a preset — they stay independent add-ons the presets
 * leave untouched.
 */
const MAIN_CONTINENTS = CONTINENTS.filter((continent) => continent !== "Antarctica");
const AMERICAS: Region[] = ["North America", "South America"];

/** One-tap shortcuts shown above the region grid, widest scope first. */
export function getRegionPresets(scope: GameScope): RegionPreset[] {
  if (scope === "usa") {
    return [
      { id: "all", label: "All 50 states", regions: [...US_REGIONS] },
      ...US_REGIONS.map((region) => ({ id: region, label: region, regions: [region] })),
    ];
  }

  return [
    { id: "world", label: "Whole world", regions: [...MAIN_CONTINENTS] },
    { id: "americas", label: "Americas", regions: AMERICAS },
    ...MAIN_CONTINENTS.map((continent) => ({
      id: continent,
      label: continent,
      regions: [continent as Region],
    })),
  ];
}

function sameRegions(a: readonly Region[], b: readonly Region[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((region) => set.has(region));
}

/** Strips the add-ons a preset does not speak to, leaving comparable regions. */
function mainRegionsOf(selected: readonly Region[]): Region[] {
  return selected.filter((region) => region !== "Antarctica");
}

export function findMatchingPreset(
  selected: readonly Region[],
  scope: GameScope,
): RegionPreset | null {
  const main = mainRegionsOf(selected);
  return getRegionPresets(scope).find((preset) => sameRegions(preset.regions, main)) ?? null;
}

/**
 * Short human name for the current selection: a preset name where one matches,
 * otherwise the region names or a count, with Antarctica and territories
 * appended as extras so they never crowd out the main label.
 */
export function getRegionSelectionLabel(
  selected: readonly Region[],
  includeTerritories: boolean,
  scope: GameScope,
): string {
  const isUsa = scope === "usa";
  const main = mainRegionsOf(selected);

  const extras: string[] = [];
  if (selected.includes("Antarctica")) extras.push("Antarctica");
  if (!isUsa && includeTerritories) extras.push("territories");

  const preset = findMatchingPreset(selected, scope);
  const base = preset
    ? preset.label
    : main.length === 0
      ? ""
      : main.length <= 2
        ? main.join(" + ")
        : `${main.length} ${isUsa ? "regions" : "continents"}`;

  const parts = [base, ...extras].filter(Boolean);
  if (parts.length === 0) return "Nothing selected";
  return parts.join(" + ");
}
