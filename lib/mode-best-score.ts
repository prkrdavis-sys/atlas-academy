import { getPlayablePoolSize } from "@/lib/countries";
import {
  CONTINENTS,
  US_REGIONS,
  type Difficulty,
  type GameMode,
  type GameScope,
  type Profile,
} from "@/lib/types";

const MAIN_WORLD_CONTINENTS = CONTINENTS.filter((continent) => continent !== "Antarctica");
const DEFAULT_DIFFICULTY: Difficulty = "medium";
const eligiblePoolSizeCache = new Map<string, number>();

export type ModeBestScore = {
  correct: number;
  total: number;
};

export function getModeBestScore(
  profile: Profile | null | undefined,
  mode: GameMode,
  scope: GameScope,
  difficulty: Difficulty = profile?.settings.difficulty ?? DEFAULT_DIFFICULTY,
): ModeBestScore | null {
  if (mode === "weak-spots") return null;

  const continents = scope === "usa" ? [...US_REGIONS] : [...MAIN_WORLD_CONTINENTS];
  const cacheKey = `${scope}:${mode}`;
  let total = eligiblePoolSizeCache.get(cacheKey);
  if (total === undefined) {
    total = getPlayablePoolSize({
      continents,
      includeTerritories: false,
      mode,
      scope,
    });
    eligiblePoolSizeCache.set(cacheKey, total);
  }
  const correct = profile?.stats?.[scope]?.[mode]?.[difficulty]?.bestGameCorrect ?? 0;

  return { correct, total };
}
