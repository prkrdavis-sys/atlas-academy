import {
  countAllTerritories,
  countSovereignCountriesByContinents,
} from "@/lib/countries";
import { SCOPE_INFO } from "@/lib/scope";
import type { GameScope, Region } from "@/lib/types";

export function getRegionFilterSummary(
  selected: Region[],
  includeTerritories: boolean,
  scope: GameScope,
): string {
  const isUsa = scope === "usa";
  const noun = SCOPE_INFO[scope].noun;
  const nounPlural = SCOPE_INFO[scope].nounPlural;
  const groupNoun = isUsa ? "region" : "continent";
  const placeCount = countSovereignCountriesByContinents(selected, scope);
  const territoryCount = countAllTerritories();

  if (selected.length === 0 && (isUsa || !includeTerritories)) {
    return `Select at least one ${groupNoun}${isUsa ? "" : " or territories"}.`;
  }
  if (!isUsa && selected.length > 0 && includeTerritories) {
    return `${placeCount} countr${placeCount === 1 ? "y" : "ies"} and ${territoryCount} territor${territoryCount === 1 ? "y" : "ies"}.`;
  }
  if (!isUsa && includeTerritories && selected.length === 0) {
    return `${territoryCount} territor${territoryCount === 1 ? "y" : "ies"}.`;
  }
  return `${placeCount} ${placeCount === 1 ? noun : nounPlural} across ${selected.length} ${groupNoun}${selected.length === 1 ? "" : "s"}.`;
}
