import cityDistractorData from "@/data/city-distractors.json";
import { normalizeAnswerText } from "@/lib/answer-matcher";
import type { Country, Region } from "@/lib/types";

function excludeCapital(cities: string[], excludeCapital?: string): string[] {
  if (!excludeCapital) return cities;
  const excluded = normalizeAnswerText(excludeCapital);
  return cities.filter((city) => normalizeAnswerText(city) !== excluded);
}

export function getStateCityDistractors(stateCode: string, capital?: string): string[] {
  const cities = cityDistractorData.usa[stateCode as keyof typeof cityDistractorData.usa] ?? [];
  return excludeCapital(cities, capital);
}

export function getRegionalCityDistractors(continent: Region, capital?: string): string[] {
  const cities = cityDistractorData.world[continent as keyof typeof cityDistractorData.world] ?? [];
  return excludeCapital(cities, capital);
}

export function getAllCityDistractorsForScope(scope: "world" | "usa", capital?: string): string[] {
  const cities =
    scope === "usa"
      ? Object.values(cityDistractorData.usa).flat()
      : Object.values(cityDistractorData.world).flat();
  return excludeCapital(cities, capital);
}

export function getCapitalCityDistractors(correct: Country, scope: "world" | "usa"): string[] {
  const primary =
    scope === "usa" && correct.code.startsWith("US-")
      ? getStateCityDistractors(correct.code, correct.capital)
      : getRegionalCityDistractors(correct.continent, correct.capital);

  if (primary.length >= 3) return primary;

  const fallback = getAllCityDistractorsForScope(scope, correct.capital);
  return [...new Set([...primary, ...fallback])];
}
