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
  DAILY_CHALLENGE_QUESTION_TYPES,
  DEFAULT_ROUND_QUESTION_COUNT,
  resolveRoundQuestionLimit,
  SPEED_ROUND_ALL_TYPES,
  type Country,
  type DailyChallengeQuestionType,
  type Difficulty,
  type GameMode,
  type GameScope,
  type Region,
  type Question,
  type RoundQuestionSetting,
  type SpeedRoundQuestionType,
} from "@/lib/types";
import {
  buildCapitalPrompt,
  buildFlagFromPlacePrompt,
  buildNeighborPrompt,
  filterDailyDatesByScope,
  placeText,
} from "@/lib/scope";
import { getCapitalCityDistractors } from "@/lib/city-distractors";
import { uniqueBy } from "@/lib/utils";

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function shuffleWith<T>(array: T[], random: () => number): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandomWith<T>(array: T[], random: () => number): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(random() * array.length)];
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
  optionCount = 4,
  random: () => number = Math.random,
): { options: string[]; optionCodes: string[] } {
  const getValue = (c: Country) => c.name;
  const correctLabel = normalizeAnswerText(getValue(correct));
  const normalizedPromptCapital = promptCapital ? normalizeAnswerText(promptCapital) : "";
  const targetDistractors = Math.max(1, optionCount - 1);

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
    if (distractors.length >= targetDistractors) return;
    if (usedCodes.has(candidate.code)) return;
    const label = getValue(candidate);
    const normalizedLabel = normalizeAnswerText(label);
    if (usedLabels.has(normalizedLabel)) return;
    usedCodes.add(candidate.code);
    usedLabels.add(normalizedLabel);
    distractors.push({ label, code: candidate.code });
  };

  const fillFromPool = (source: Country[]) => {
    for (const candidate of shuffleWith(source, random)) {
      if (distractors.length >= targetDistractors) break;
      tryAddCountryDistractor(candidate);
    }
  };

  if (isIslandCountry(correct)) {
    fillFromPool(distractorPool.filter(isIslandCountry));
  }
  fillFromPool(distractorPool);

  while (distractors.length < targetDistractors) {
    const extra = pickRandomWith(
      pool.filter(
        (c) =>
          isValidDistractor(c) &&
          !usedCodes.has(c.code) &&
          !usedLabels.has(normalizeAnswerText(getValue(c))),
      ),
      random,
    );
    if (!extra) break;
    tryAddCountryDistractor(extra);
  }

  const combined = shuffleWith(
    [{ label: getValue(correct), code: correct.code }, ...distractors],
    random,
  );
  return {
    options: combined.map((c) => c.label),
    optionCodes: combined.map((c) => c.code),
  };
}

function buildCapitalMcOptions(
  correct: Country,
  scope: GameScope,
  random: () => number = Math.random,
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

  for (const city of shuffleWith(getCapitalCityDistractors(correct, scope), random)) {
    if (distractors.length >= 3) break;
    tryAddCity(city);
  }

  return { options: shuffleWith([correct.capital, ...distractors], random) };
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

  private buildDailyQuestionTypeSequence(): DailyChallengeQuestionType[] {
    const baseTypes = [
      ...DAILY_CHALLENGE_QUESTION_TYPES,
      ...DAILY_CHALLENGE_QUESTION_TYPES,
    ];
    const extraTypes: DailyChallengeQuestionType[] = [
      pickFromPool([...DAILY_CHALLENGE_QUESTION_TYPES], this.random),
      pickFromPool([...DAILY_CHALLENGE_QUESTION_TYPES], this.random),
    ];
    return shuffleWith([...baseTypes, ...extraTypes], this.random);
  }

  private getDailyPoolForQuestionType(type: DailyChallengeQuestionType): Country[] {
    return this.pool.filter((country) => {
      switch (type) {
        case "flag-to-country":
        case "country-to-flag":
          return country.hasFlag;
        case "shape-to-country":
          return country.hasShape;
        case "country-to-capital":
          return country.capital.length > 0;
        default: {
          const _exhaustive: never = type;
          return _exhaustive;
        }
      }
    });
  }

  private buildDailyQuestions(): Question[] {
    const questionTypes = this.buildDailyQuestionTypeSequence();
    const questions: Question[] = [];
    const used = new Set<string>();

    for (const questionType of questionTypes) {
      const typePool = this.getDailyPoolForQuestionType(questionType);
      if (typePool.length === 0) continue;

      let country = pickFromPool(typePool, this.random);
      let attempts = 0;
      while (used.has(country.code) && attempts < 40) {
        country = pickFromPool(typePool, this.random);
        attempts += 1;
      }
      used.add(country.code);
      questions.push(this.buildQuestion(country, questionType));
    }

    return questions;
  }

  private buildShuffledRoundCountries(): Country[] {
    if (this.mode === "marathon" || this.mode === "speed-round") {
      return shuffleWith(this.pool, this.random);
    }
    const limit = resolveRoundQuestionLimit(this.questionLimit, this.pool.length);
    return shuffleWith(this.pool, this.random).slice(0, limit);
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
            ? buildNameMcOptions(country, this.pool, this.difficulty, undefined, 4, this.random)
            : undefined;
        return {
          id,
          mode: mode === "marathon" || mode === "weak-spots" ? mode : "flag-to-country",
          countryCode: country.code,
          prompt: placeText("Which country does this flag belong to?", this.scope, country),
          correctAnswer: country.name,
          correctCode: country.code,
          displayType: "flag",
          ...mc,
        };
      }
      case "capital-to-country": {
        const mc =
          this.difficulty !== "hard"
            ? buildNameMcOptions(country, this.pool, this.difficulty, country.capital, 4, this.random)
            : undefined;
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: placeText(
            country.hasCapitalImage
              ? "What country has this capital?"
              : `What country has ${country.capital} as its capital?`,
            this.scope,
            country,
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
            ? buildCapitalMcOptions(country, this.scope, this.random)
            : undefined;
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: buildCapitalPrompt(country, this.scope),
          correctAnswer: country.capital,
          correctCode: country.code,
          displayType: country.hasFlag ? "flag" : "text",
          ...mc,
        };
      }
      case "shape-to-country": {
        const mc =
          this.difficulty !== "hard"
            ? buildNameMcOptions(country, this.pool, this.difficulty, undefined, 4, this.random)
            : undefined;
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: placeText("Which country matches this shape?", this.scope, country),
          correctAnswer: country.name,
          correctCode: country.code,
          displayType: "shape",
          ...mc,
        };
      }
      case "country-to-flag": {
        const optionCount = this.difficulty === "hard" ? 6 : 4;
        const mc = buildNameMcOptions(country, this.pool, this.difficulty, undefined, optionCount, this.random);
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: buildFlagFromPlacePrompt(country, this.scope),
          correctAnswer: country.code,
          correctCode: country.code,
          displayType: "flags-grid",
          options: mc.optionCodes,
          optionCodes: mc.optionCodes,
        };
      }
      case "neighbor-quiz": {
        const neighborCode = pickRandomWith(country.borders, this.random);
        const neighbor = getCountryByCode(neighborCode ?? "");
        const mc = buildNameMcOptions(neighbor ?? country, this.pool, this.difficulty, undefined, 4, this.random);
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: buildNeighborPrompt(country, neighbor, this.scope),
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
          prompt: placeText("Which country has more people?", this.scope, correct),
          correctAnswer: correct.name,
          correctCode: correct.code,
          displayType: "population",
          options: [country.name, other.name],
          optionCodes: [country.code, other.code],
        };
      }
      case "fact-to-country": {
        const mc =
          this.difficulty !== "hard"
            ? buildNameMcOptions(country, this.pool, this.difficulty, undefined, 4, this.random)
            : undefined;
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: country.fact,
          correctAnswer: country.name,
          correctCode: country.code,
          displayType: "text",
          ...mc,
        };
      }
      case "daily-challenge":
        throw new Error("Daily challenge questions must use a concrete question type");
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

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getWeekdayInEastern(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  for (let hour = 12; hour <= 20; hour += 1) {
    const probe = new Date(Date.UTC(year, month - 1, day, hour));
    if (getDailyDateKey(probe) === dateKey) {
      const weekday = new Intl.DateTimeFormat("en-US", {
        timeZone: DAILY_TIMEZONE,
        weekday: "short",
      }).format(probe);
      return WEEKDAY_INDEX[weekday] ?? 0;
    }
  }
  return 0;
}

export function getDailyCalendarParts(date = new Date()) {
  const dateKey = getDailyDateKey(date);
  const [year, month, day] = dateKey.split("-").map(Number);
  const monthShort = new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_TIMEZONE,
    month: "short",
  })
    .format(date)
    .toUpperCase();

  return {
    dateKey,
    monthShort,
    day,
    daysInMonth: new Date(year, month, 0).getDate(),
    firstWeekday: getWeekdayInEastern(`${year}-${String(month).padStart(2, "0")}-01`),
  };
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

export function getMillisecondsUntilDailyReset(now = new Date()): number {
  const todayKey = getDailyDateKey(now);
  const probe = new Date(now.getTime());
  probe.setSeconds(0, 0);
  probe.setMinutes(probe.getMinutes() + 1);

  const limit = now.getTime() + 25 * 60 * 60 * 1000;
  while (probe.getTime() < limit) {
    if (getDailyDateKey(probe) !== todayKey) {
      return probe.getTime() - now.getTime();
    }
    probe.setMinutes(probe.getMinutes() + 1);
  }
  return 0;
}

export function formatDailyResetCountdown(ms: number): string {
  if (ms <= 0) return "Soon";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
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
