import { scopeText } from "@/lib/scope";
import type { AtlasleGuessTarget, Country, Difficulty, GameScope } from "@/lib/types";

export type AtlasleTileStatus = "correct" | "present" | "absent" | "empty";

export const ATLASLE_MIN_LETTERS = 4;
export const ATLASLE_MAX_LETTERS = 12;

function formatPopulation(population: number): string {
  return new Intl.NumberFormat("en-US").format(population);
}

/** Normalize a place name or capital into an uppercase letter/space pattern. */
export function toAtlaslePattern(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function atlasleLetterCount(pattern: string): number {
  return pattern.replace(/ /g, "").length;
}

export function atlasleLetters(pattern: string): string {
  return pattern.replace(/ /g, "");
}

export function isAtlasleLengthEligible(value: string): boolean {
  const count = atlasleLetterCount(toAtlaslePattern(value));
  return count >= ATLASLE_MIN_LETTERS && count <= ATLASLE_MAX_LETTERS;
}

export function getAtlasleTargets(country: Country): AtlasleGuessTarget[] {
  const targets: AtlasleGuessTarget[] = [];
  if (isAtlasleLengthEligible(country.name)) targets.push("name");
  if (country.capital.length > 0 && isAtlasleLengthEligible(country.capital)) {
    targets.push("capital");
  }
  return targets;
}

export function isAtlasleEligible(country: Country): boolean {
  return getAtlasleTargets(country).length > 0;
}

export function getAtlasleAnswer(country: Country, target: AtlasleGuessTarget): string {
  return target === "capital" ? country.capital : country.name;
}

export function getAtlasleMaxGuesses(difficulty: Difficulty): number {
  switch (difficulty) {
    case "easy":
      return 8;
    case "medium":
      return 6;
    case "hard":
      return 5;
    default: {
      const _exhaustive: never = difficulty;
      return _exhaustive;
    }
  }
}

function populationBand(population: number, scope: GameScope): string {
  if (scope === "usa") {
    if (population < 2_000_000) return "under 2 million people";
    if (population < 5_000_000) return "2–5 million people";
    if (population < 10_000_000) return "5–10 million people";
    if (population < 20_000_000) return "10–20 million people";
    return "over 20 million people";
  }
  if (population < 1_000_000) return "under 1 million people";
  if (population < 10_000_000) return "1–10 million people";
  if (population < 50_000_000) return "10–50 million people";
  if (population < 100_000_000) return "50–100 million people";
  return "over 100 million people";
}

function borderClue(country: Country, scope: GameScope): string {
  const count = country.borders.length;
  if (count === 0) {
    return scopeText("It has no land borders (island or isolated).", scope);
  }
  if (scope === "usa") {
    return `It borders ${count} state${count === 1 ? "" : "s"}.`;
  }
  return `It borders ${count} countr${count === 1 ? "y" : "ies"}.`;
}

/** Progressive geography hints unlocked as guesses miss. */
export function buildAtlasleClues(
  country: Country,
  target: AtlasleGuessTarget,
  scope: GameScope,
): string[] {
  const placeNoun = scope === "usa" ? "state" : "country";
  const region = country.subregion || country.continent;

  if (target === "capital") {
    return [
      `Capital of a ${placeNoun} in ${country.continent}`,
      region !== country.continent ? `In ${region}` : `Still in ${country.continent}`,
      `That ${placeNoun} has ${populationBand(country.population, scope)}`,
      borderClue(country, scope),
      `It's the capital of ${country.name}`,
    ];
  }

  return [
    `A ${placeNoun} in ${country.continent}`,
    region !== country.continent ? `In ${region}` : `Still in ${country.continent}`,
    `Population: ${populationBand(country.population, scope)} (${formatPopulation(country.population)})`,
    borderClue(country, scope),
    country.capital
      ? `Its capital is ${country.capital}`
      : `Name starts with ${toAtlaslePattern(country.name)[0] ?? "?"}`,
  ];
}

/**
 * Easy starts with one clue; medium unlocks one per miss; hard waits until
 * the second miss before the first clue appears.
 */
export function getUnlockedClueCount(
  wrongGuesses: number,
  difficulty: Difficulty,
  totalClues: number,
): number {
  let unlocked: number;
  switch (difficulty) {
    case "easy":
      unlocked = wrongGuesses + 1;
      break;
    case "medium":
      unlocked = wrongGuesses;
      break;
    case "hard":
      unlocked = Math.max(0, wrongGuesses - 1);
      break;
    default: {
      const _exhaustive: never = difficulty;
      return _exhaustive;
    }
  }
  return Math.min(totalClues, unlocked);
}

/** Classic Wordle tile scoring for equal-length letter strings (no spaces). */
export function scoreAtlasleGuess(guessLetters: string, answerLetters: string): AtlasleTileStatus[] {
  const length = answerLetters.length;
  const result: AtlasleTileStatus[] = Array.from({ length }, () => "absent");
  const remaining = answerLetters.split("");

  for (let i = 0; i < length; i += 1) {
    if (guessLetters[i] === answerLetters[i]) {
      result[i] = "correct";
      remaining[i] = "";
    }
  }

  for (let i = 0; i < length; i += 1) {
    if (result[i] === "correct") continue;
    const idx = remaining.indexOf(guessLetters[i] ?? "");
    if (idx !== -1) {
      result[i] = "present";
      remaining[idx] = "";
    }
  }

  return result;
}

/** Map letter statuses back onto a spaced display pattern. */
export function patternStatuses(
  letterStatuses: AtlasleTileStatus[],
  pattern: string,
): AtlasleTileStatus[] {
  const out: AtlasleTileStatus[] = [];
  let li = 0;
  for (const ch of pattern) {
    if (ch === " ") {
      out.push("empty");
    } else {
      out.push(letterStatuses[li] ?? "absent");
      li += 1;
    }
  }
  return out;
}

export function formatGuessIntoPattern(guessLetters: string, pattern: string): string {
  let li = 0;
  let out = "";
  for (const ch of pattern) {
    if (ch === " ") {
      out += " ";
    } else {
      out += guessLetters[li] ?? "";
      li += 1;
    }
  }
  return out;
}

export function collectAtlasleDictionary(
  places: Country[],
  target: AtlasleGuessTarget,
  letterCount: number,
): Set<string> {
  const set = new Set<string>();
  for (const place of places) {
    const value = target === "capital" ? place.capital : place.name;
    if (!value) continue;
    const pattern = toAtlaslePattern(value);
    if (atlasleLetterCount(pattern) !== letterCount) continue;
    set.add(atlasleLetters(pattern));
  }
  return set;
}
