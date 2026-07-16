import {
  getCountryByCode,
  getCountryName,
  getEligibleCoreQuestionTypes,
  getEligibleMixedQuestionTypes,
  getPlayablePool,
} from "@/lib/countries";
import { isSameCountry, normalizeAnswerText, validateAnswer } from "@/lib/answer-matcher";
import {
  DAILY_CHALLENGE_QUESTION_COUNT,
  DEFAULT_ROUND_QUESTION_COUNT,
  resolveRoundQuestionLimit,
  SPEED_ROUND_ALL_TYPES,
  type Country,
  type Difficulty,
  type GameMode,
  type GameScope,
  type Region,
  type Question,
  type RoundQuestionSetting,
  type SpeedRoundQuestionType,
} from "@/lib/types";
import { filterDailyDatesByScope, scopeText } from "@/lib/scope";
import { getCapitalCityDistractors } from "@/lib/city-distractors";
import { pickRandom, shuffle, uniqueBy } from "@/lib/utils";

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function pickFromPool<T>(pool: T[], random: () => number): T {
  return pool[Math.floor(random() * pool.length)];
}

const NON_ISLAND_AND_COUNTRIES = new Set(["Bosnia and Herzegovina"]);

function isIslandCountry(country: Country): boolean {
  if (NON_ISLAND_AND_COUNTRIES.has(country.name)) return false;
  if (/\bIslands?\b/i.test(country.name)) return true;
  if (/\band\b/i.test(country.name) && country.borders.length === 0) return true;
  // Sovereign island nations have no land borders; skip US states where border data is incomplete.
  if (!country.code.startsWith("US-") && country.borders.length === 0) return true;
  return false;
}

function buildNameMcOptions(
  correct: Country,
  pool: Country[],
  difficulty: Difficulty,
  promptCapital?: string,
): { options: string[]; optionCodes: string[] } {
  const getValue = (c: Country) => c.name;
  const correctLabel = normalizeAnswerText(getValue(correct));
  const normalizedPromptCapital = promptCapital ? normalizeAnswerText(promptCapital) : "";

  // A distractor is ambiguous if its label reads the same as the correct
  // answer (e.g. two countries whose capital is "Kingston"), or — for
  // capital prompts — if it shares the prompt capital and is therefore also
  // a right answer.
  const isValidDistractor = (c: Country) =>
    c.code !== correct.code &&
    normalizeAnswerText(getValue(c)) !== correctLabel &&
    (!normalizedPromptCapital || normalizeAnswerText(c.capital) !== normalizedPromptCapital);

  const distractorPool =
    difficulty === "easy"
      ? pool.filter(isValidDistractor)
      : pool.filter((c) => isValidDistractor(c) && c.continent === correct.continent);

  const distractors: { label: string; code: string }[] = [];
  const usedCodes = new Set<string>();
  const usedLabels = new Set<string>();

  const tryAddCountryDistractor = (candidate: Country) => {
    if (distractors.length >= 3) return;
    if (usedCodes.has(candidate.code)) return;
    const label = getValue(candidate);
    const normalizedLabel = normalizeAnswerText(label);
    if (usedLabels.has(normalizedLabel)) return;
    usedCodes.add(candidate.code);
    usedLabels.add(normalizedLabel);
    distractors.push({ label, code: candidate.code });
  };

  const fillFromPool = (source: Country[]) => {
    for (const candidate of shuffle(source)) {
      if (distractors.length >= 3) break;
      tryAddCountryDistractor(candidate);
    }
  };

  if (isIslandCountry(correct)) {
    fillFromPool(distractorPool.filter(isIslandCountry));
  }
  fillFromPool(distractorPool);

  while (distractors.length < 3) {
    const extra = pickRandom(
      pool.filter(
        (c) =>
          isValidDistractor(c) &&
          !usedCodes.has(c.code) &&
          !usedLabels.has(normalizeAnswerText(getValue(c))),
      ),
    );
    if (!extra) break;
    tryAddCountryDistractor(extra);
  }

  const combined = shuffle([{ label: getValue(correct), code: correct.code }, ...distractors]);
  return {
    options: combined.map((c) => c.label),
    optionCodes: combined.map((c) => c.code),
  };
}

function buildCapitalMcOptions(
  correct: Country,
  scope: GameScope,
): { options: string[] } {
  const usedLabels = new Set<string>([normalizeAnswerText(correct.capital)]);
  const distractors: string[] = [];

  const tryAddCity = (city: string) => {
    if (distractors.length >= 3) return;
    const normalized = normalizeAnswerText(city);
    if (usedLabels.has(normalized)) return;
    usedLabels.add(normalized);
    distractors.push(city);
  };

  for (const city of shuffle(getCapitalCityDistractors(correct, scope))) {
    if (distractors.length >= 3) break;
    tryAddCity(city);
  }

  return { options: shuffle([correct.capital, ...distractors]) };
}

export class GameEngine {
  private pool: Country[];
  private random: () => number;
  private questionIndex = 0;
  private dailyQuestions: Question[] = [];
  private roundCountries: Country[] = [];

  constructor(
    private mode: GameMode,
    continents: Region[],
    private difficulty: Difficulty,
    weakSpotCodes?: string[],
    seed?: number,
    private questionType?: SpeedRoundQuestionType,
    private questionLimit: RoundQuestionSetting = DEFAULT_ROUND_QUESTION_COUNT,
    includeTerritories = false,
    private scope: GameScope = "world",
  ) {
    this.pool = getPlayablePool({
      continents,
      includeTerritories,
      mode,
      questionType,
      weakSpotCodes,
      scope,
    });
    this.random = seed !== undefined ? seededRandom(seed) : Math.random;

    if (this.mode === "daily-challenge") {
      this.dailyQuestions = this.buildDailyQuestions();
    } else {
      this.roundCountries = this.buildShuffledRoundCountries();
    }
  }

  getRoundQuestionLimit(): number | undefined {
    if (this.mode === "daily-challenge") {
      return Math.min(DAILY_CHALLENGE_QUESTION_COUNT, this.pool.length);
    }
    if (this.mode === "marathon" || this.mode === "speed-round") {
      return undefined;
    }
    return resolveRoundQuestionLimit(this.questionLimit, this.pool.length);
  }

  getPoolSize(): number {
    return this.pool.length;
  }

  private buildDailyQuestions(): Question[] {
    const questions: Question[] = [];
    const used = new Set<string>();
    for (let i = 0; i < DAILY_CHALLENGE_QUESTION_COUNT && i < this.pool.length; i += 1) {
      let country = pickFromPool(this.pool, this.random);
      let attempts = 0;
      while (used.has(country.code) && attempts < 20) {
        country = pickFromPool(this.pool, this.random);
        attempts += 1;
      }
      used.add(country.code);
      questions.push(this.buildQuestion(country, "flag-to-country"));
    }
    return questions;
  }

  private buildShuffledRoundCountries(): Country[] {
    if (this.mode === "marathon" || this.mode === "speed-round") {
      return shuffle(this.pool);
    }
    const limit = resolveRoundQuestionLimit(this.questionLimit, this.pool.length);
    return shuffle(this.pool).slice(0, limit);
  }

  nextQuestion(): Question | null {
    if (this.pool.length === 0) return null;

    if (this.mode === "daily-challenge") {
      const q = this.dailyQuestions[this.questionIndex];
      this.questionIndex += 1;
      return q ?? null;
    }

    const country = this.roundCountries[this.questionIndex];
    if (!country) {
      if (this.mode === "marathon" || this.mode === "speed-round") {
        const recycled = pickFromPool(this.pool, this.random);
        this.questionIndex += 1;
        return this.buildNextQuestionForCountry(recycled);
      }
      return null;
    }
    this.questionIndex += 1;

    return this.buildNextQuestionForCountry(country);
  }

  private buildNextQuestionForCountry(country: Country): Question {
    let questionMode: GameMode;
    if (this.mode === "mixed") {
      const eligibleTypes = getEligibleMixedQuestionTypes(country);
      questionMode =
        eligibleTypes.length > 0
          ? pickFromPool(eligibleTypes, this.random)
          : "flag-to-country";
    } else if (
      (this.mode === "speed-round" || this.mode === "marathon") &&
      this.questionType === SPEED_ROUND_ALL_TYPES
    ) {
      const eligibleTypes = getEligibleCoreQuestionTypes(country);
      questionMode =
        eligibleTypes.length > 0
          ? pickFromPool(eligibleTypes, this.random)
          : "flag-to-country";
    } else if (
      (this.mode === "speed-round" || this.mode === "marathon") &&
      this.questionType &&
      this.questionType !== SPEED_ROUND_ALL_TYPES
    ) {
      questionMode = this.questionType;
    } else {
      questionMode = this.mode;
    }
    return this.buildQuestion(country, questionMode);
  }

  private buildQuestion(country: Country, mode: GameMode): Question {
    const id = `${mode}-${country.code}-${Date.now()}-${this.questionIndex}`;

    switch (mode) {
      case "flag-to-country":
      case "marathon":
      case "weak-spots": {
        const mc =
          this.difficulty !== "hard"
            ? buildNameMcOptions(country, this.pool, this.difficulty)
            : undefined;
        return {
          id,
          mode: mode === "marathon" || mode === "weak-spots" ? mode : "flag-to-country",
          countryCode: country.code,
          prompt: scopeText("Which country does this flag belong to?", this.scope),
          correctAnswer: country.name,
          correctCode: country.code,
          displayType: "flag",
          ...mc,
        };
      }
      case "capital-to-country": {
        const mc =
          this.difficulty !== "hard"
            ? buildNameMcOptions(country, this.pool, this.difficulty, country.capital)
            : undefined;
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: scopeText(
            country.hasCapitalImage
              ? "What country has this capital?"
              : `What country has ${country.capital} as its capital?`,
            this.scope,
          ),
          correctAnswer: country.name,
          correctCode: country.code,
          displayType: country.hasCapitalImage ? "capital" : "text",
          ...mc,
        };
      }
      case "country-to-capital": {
        const mc =
          this.difficulty !== "hard"
            ? buildCapitalMcOptions(country, this.scope)
            : undefined;
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: `What is the capital of ${country.name}?`,
          correctAnswer: country.capital,
          correctCode: country.code,
          displayType: "text",
          ...mc,
        };
      }
      case "shape-to-country": {
        const mc =
          this.difficulty !== "hard"
            ? buildNameMcOptions(country, this.pool, this.difficulty)
            : undefined;
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: scopeText("Which country matches this shape?", this.scope),
          correctAnswer: country.name,
          correctCode: country.code,
          displayType: "shape",
          ...mc,
        };
      }
      case "country-to-flag": {
        const mc = buildNameMcOptions(country, this.pool, this.difficulty);
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: `Which flag belongs to ${country.name}?`,
          correctAnswer: country.code,
          correctCode: country.code,
          displayType: "flags-grid",
          options: mc.optionCodes,
          optionCodes: mc.optionCodes,
        };
      }
      case "neighbor-quiz": {
        const neighborCode = pickRandom(country.borders);
        const neighbor = getCountryByCode(neighborCode);
        const mc = buildNameMcOptions(neighbor ?? country, this.pool, this.difficulty);
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: scopeText(`Which country borders ${country.name}?`, this.scope),
          correctAnswer: neighbor?.name ?? "",
          correctCode: neighborCode,
          displayType: "text",
          ...mc,
        };
      }
      case "population-showdown": {
        const opponents = this.pool.filter(
          (c) => c.code !== country.code && c.population !== country.population,
        );
        if (opponents.length === 0) {
          return this.buildQuestion(country, "flag-to-country");
        }
        let other = pickFromPool(opponents, this.random);
        if (country.population > other.population) {
          [country, other] = [other, country];
        }
        const correct = country.population >= other.population ? country : other;
        return {
          id,
          mode,
          countryCode: correct.code,
          secondaryCountryCode: correct.code === country.code ? other.code : country.code,
          prompt: scopeText("Which country has more people?", this.scope),
          correctAnswer: correct.name,
          correctCode: correct.code,
          displayType: "population",
          options: [country.name, other.name],
          optionCodes: [country.code, other.code],
        };
      }
      case "daily-challenge":
        return this.buildQuestion(country, "flag-to-country");
      default:
        return this.buildQuestion(country, "flag-to-country");
    }
  }

  /**
   * @param isCodeSelection true when `answer` is a country code picked from
   * multiple choice / the flag grid, false when it is free-typed text.
   */
  checkAnswer(question: Question, answer: string, isCodeSelection = false): boolean {
    const correctCode = question.correctCode ?? question.countryCode;

    if (isCodeSelection) {
      return isSameCountry(answer, correctCode);
    }

    if (question.mode === "country-to-capital") {
      return validateAnswer(answer, question.countryCode, "capital");
    }

    if (question.mode === "neighbor-quiz") {
      // Any bordering country is a legitimate typed answer, not just the one
      // we happened to pick for the multiple-choice version.
      const country = getCountryByCode(question.countryCode);
      const acceptedCodes = country?.borders?.length ? country.borders : [correctCode];
      return acceptedCodes.some((code) => validateAnswer(answer, code, "name"));
    }

    if (validateAnswer(answer, correctCode, "name")) return true;
    return answer === question.correctAnswer;
  }
}

const DAILY_TIMEZONE = "America/New_York";

export function getDailyDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DAILY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getDailySeed(scope: GameScope = "world", date = new Date()): number {
  const [year, month, day] = getDailyDateKey(date).split("-").map(Number);
  const base = year * 10000 + month * 100 + day;
  // Give each scope its own daily question sequence.
  return scope === "usa" ? base + 51 : base;
}

export function formatDailyDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function hasPlayedDailyToday(
  playedDates: string[] | undefined,
  scope: GameScope = "world",
  date = new Date(),
): boolean {
  return filterDailyDatesByScope(playedDates, scope).includes(getDailyDateKey(date));
}

export function hasCompletedDailyToday(
  completions: string[] | undefined,
  scope: GameScope = "world",
  date = new Date(),
): boolean {
  return filterDailyDatesByScope(completions, scope).includes(getDailyDateKey(date));
}

function dateKeyToEstMidday(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  for (let hour = 12; hour <= 20; hour += 1) {
    const probe = new Date(Date.UTC(year, month - 1, day, hour));
    if (getDailyDateKey(probe) === dateKey) return probe;
  }
  return new Date(Date.UTC(year, month - 1, day, 17));
}

export function offsetDailyDateKey(dateKey: string, dayOffset: number): string {
  const base = dateKeyToEstMidday(dateKey);
  base.setUTCDate(base.getUTCDate() + dayOffset);
  return getDailyDateKey(base);
}

export function getDailyChallengeRun(
  completions: string[] | undefined,
  scope: GameScope = "world",
  date = new Date(),
): number {
  const set = new Set(filterDailyDatesByScope(completions, scope));
  if (set.size === 0) return 0;

  const today = getDailyDateKey(date);
  const yesterday = offsetDailyDateKey(today, -1);

  let anchor: string | null = null;
  if (set.has(today)) {
    anchor = today;
  } else if (set.has(yesterday)) {
    anchor = yesterday;
  }
  if (!anchor) return 0;

  let count = 0;
  let current = anchor;
  while (set.has(current)) {
    count += 1;
    current = offsetDailyDateKey(current, -1);
  }
  return count;
}

export const DAILY_COUNTING_SESSION_KEY = "daily-counting-session";

export function getWeakSpotCodes(codes: string[]): string[] {
  const counts = new Map<string, number>();
  for (const code of codes) counts.set(code, (counts.get(code) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([code]) => code);
}

export function aggregateMissedCountries(missedCountryCodes: string[]): string[] {
  return getWeakSpotCodes(missedCountryCodes);
}

export function uniqueCountryNames(codes: string[]): string[] {
  return uniqueBy(
    codes.map((code) => getCountryByCode(code)).filter(Boolean) as Country[],
    (c) => c.code,
  ).map((c) => c.name);
}

export { getCountryName };
