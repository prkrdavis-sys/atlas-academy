import {
  getAtlasleAnswer,
  getAtlasleMaxGuesses,
  getAtlasleTargets,
} from "@/lib/atlasle";
import {
  getCountryByCode,
  getCountryLanguages,
  getCountryName,
  getCombinedDailyChallengePool,
  getEligibleMixedQuestionTypes,
  getPlayablePool,
  getPrimaryLanguage,
} from "@/lib/countries";
import { isSameCountry, normalizeAnswerText, validateAnswer } from "@/lib/answer-matcher";
import {
  DAILY_CHALLENGE_QUESTION_COUNT,
  DAILY_CHALLENGE_QUESTION_TYPES,
  DEFAULT_ROUND_QUESTION_COUNT,
  FLAG_CROP_ORIENTATIONS,
  resolveRoundQuestionLimit,
  type ChallengeModifier,
  type Country,
  type DailyChallengeSnapshot,
  type DailyChallengeQuestionType,
  type Difficulty,
  type GameMode,
  type GameScope,
  type Region,
  type Question,
  type RoundQuestionSetting,
} from "@/lib/types";
import {
  buildCapitalPrompt,
  buildFlagFromPlacePrompt,
  buildLanguagePrompt,
  buildNeighborPrompt,
  placeText,
  scopeText,
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

function buildLanguageMcOptions(
  correct: Country,
  pool: Country[],
  random: () => number = Math.random,
): { options: string[] } | undefined {
  const primary = getPrimaryLanguage(correct);
  if (!primary) return undefined;

  // Block every official language for the target so a wrong MC pick can't
  // still validate as another accepted language (e.g. French for Belgium).
  const usedLabels = new Set(
    getCountryLanguages(correct).map((language) => normalizeAnswerText(language)),
  );
  const distractors: string[] = [];

  const tryAddLanguage = (language: string) => {
    if (distractors.length >= 3) return;
    const normalized = normalizeAnswerText(language);
    if (!normalized || usedLabels.has(normalized)) return;
    usedLabels.add(normalized);
    distractors.push(language);
  };

  for (const country of shuffleWith(pool, random)) {
    if (distractors.length >= 3) break;
    if (country.code === correct.code) continue;
    const language = getPrimaryLanguage(country);
    if (language) tryAddLanguage(language);
  }

  if (distractors.length < 1) return undefined;
  return { options: shuffleWith([primary, ...distractors], random) };
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
    private questionLimit: RoundQuestionSetting = DEFAULT_ROUND_QUESTION_COUNT,
    includeTerritories = false,
    private scope: GameScope = "world",
    private challengeModifier: ChallengeModifier = "none",
    dailyQuestionSnapshot?: Question[],
  ) {
    this.pool =
      mode === "daily-challenge"
        ? getCombinedDailyChallengePool()
        : getPlayablePool({
            continents,
            includeTerritories,
            mode,
            weakSpotCodes,
            scope,
          });
    this.random = seed !== undefined ? seededRandom(seed) : Math.random;

    if (this.mode === "daily-challenge") {
      this.dailyQuestions = dailyQuestionSnapshot?.length
        ? dailyQuestionSnapshot
        : this.buildDailyQuestions();
    } else {
      this.roundCountries = this.buildShuffledRoundCountries();
    }
  }

  getRoundQuestionLimit(): number | undefined {
    if (this.mode === "daily-challenge") {
      return Math.min(DAILY_CHALLENGE_QUESTION_COUNT, this.dailyQuestions.length);
    }
    if (this.challengeModifier === "marathon" || this.challengeModifier === "speed-round") {
      return undefined;
    }
    return resolveRoundQuestionLimit(this.questionLimit, this.pool.length);
  }

  getPoolSize(): number {
    return this.pool.length;
  }

  /** Cursor after the current question has been dealt (learn-card / mid-round). */
  getQuestionIndex(): number {
    return this.questionIndex;
  }

  getRoundCountryCodes(): string[] {
    return this.roundCountries.map((country) => country.code);
  }

  /**
   * Restores mid-round progress after remounting from a learn-card → library visit.
   * Daily challenge rebuilds from seed; other modes need the shuffled country order.
   */
  restoreResumeProgress(questionIndex: number, roundCountryCodes: string[] = []): void {
    this.questionIndex = Math.max(0, questionIndex);
    if (this.mode === "daily-challenge") return;
    if (roundCountryCodes.length === 0) return;
    this.roundCountries = roundCountryCodes
      .map((code) => getCountryByCode(code))
      .filter((country): country is Country => country !== undefined);
  }

  private buildDailyQuestionTypeSequence(): DailyChallengeQuestionType[] {
    const types = [...DAILY_CHALLENGE_QUESTION_TYPES];
    const baseTypes: DailyChallengeQuestionType[] = [...types, ...types];
    if (baseTypes.length >= DAILY_CHALLENGE_QUESTION_COUNT) {
      return shuffleWith(baseTypes.slice(0, DAILY_CHALLENGE_QUESTION_COUNT), this.random);
    }
    const extraTypes: DailyChallengeQuestionType[] = [];
    const extrasNeeded = DAILY_CHALLENGE_QUESTION_COUNT - baseTypes.length;
    for (let i = 0; i < extrasNeeded; i += 1) {
      extraTypes.push(pickFromPool(types, this.random));
    }
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
        case "fact-to-country":
          return (
            country.factQuestion.trim().length > 0 ||
            country.factQuestion2.trim().length > 0
          );
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
      questions.push(this.buildQuestion(country, questionType, questions.length));
    }

    return questions;
  }

  private buildShuffledRoundCountries(): Country[] {
    if (this.challengeModifier === "marathon" || this.challengeModifier === "speed-round") {
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
      if (this.challengeModifier === "marathon" || this.challengeModifier === "speed-round") {
        const recycled = pickFromPool(this.pool, this.random);
        this.questionIndex += 1;
        return this.buildNextQuestionForCountry(recycled);
      }
      return null;
    }
    this.questionIndex += 1;

    return this.buildNextQuestionForCountry(country);
  }

  /** Next place in the round without advancing — used to warm learn-card maps. */
  peekNextCountry(): Country | null {
    if (this.pool.length === 0) return null;

    if (this.mode === "daily-challenge") {
      const question = this.dailyQuestions[this.questionIndex];
      if (!question) return null;
      return getCountryByCode(question.countryCode) ?? null;
    }

    return this.roundCountries[this.questionIndex] ?? null;
  }

  private buildNextQuestionForCountry(country: Country): Question {
    let questionMode: GameMode;
    if (this.mode === "mixed") {
      const eligibleTypes = getEligibleMixedQuestionTypes(country);
      questionMode =
        eligibleTypes.length > 0
          ? pickFromPool(eligibleTypes, this.random)
          : "flag-to-country";
    } else {
      questionMode = this.mode;
    }
    return this.buildQuestion(country, questionMode);
  }

  private buildQuestion(country: Country, mode: GameMode, stableIndex?: number): Question {
    const id =
      stableIndex === undefined
        ? `${mode}-${country.code}-${Date.now()}-${this.questionIndex}`
        : `daily-${stableIndex}-${mode}-${country.code}`;
    const displayScope =
      this.mode === "daily-challenge" && country.code.startsWith("US-")
        ? "usa"
        : this.mode === "daily-challenge"
          ? "world"
          : this.scope;

    switch (mode) {
      case "flag-to-country":
      case "flag-crop-to-country":
      case "inverted-flag-crop-to-country":
      case "inverted-flag-to-country":
      case "marathon":
      case "weak-spots": {
        const mc =
          this.difficulty !== "hard"
            ? buildNameMcOptions(country, this.pool, this.difficulty, undefined, 4, this.random)
            : undefined;
        const isFlagCrop =
          mode === "flag-crop-to-country" || mode === "inverted-flag-crop-to-country";
        const resolvedMode =
          mode === "marathon" || mode === "weak-spots"
            ? mode
            : mode === "flag-crop-to-country"
              ? "flag-crop-to-country"
              : mode === "inverted-flag-crop-to-country"
                ? "inverted-flag-crop-to-country"
                : mode === "inverted-flag-to-country"
                  ? "inverted-flag-to-country"
                  : "flag-to-country";
        return {
          id,
          mode: resolvedMode,
          countryCode: country.code,
          prompt: placeText(
            mode === "inverted-flag-crop-to-country"
              ? "Which country does this inverted flag fragment belong to?"
              : mode === "flag-crop-to-country"
                ? "Which country does this flag fragment belong to?"
                : mode === "inverted-flag-to-country"
                  ? "Which country does this inverted flag belong to?"
                  : "Which country does this flag belong to?",
            displayScope,
            country,
          ),
          correctAnswer: country.name,
          correctCode: country.code,
          displayType: isFlagCrop ? "flag-crop" : "flag",
          flagCropOrientation: isFlagCrop
            ? pickFromPool([...FLAG_CROP_ORIENTATIONS], this.random)
            : undefined,
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
            displayScope,
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
            ? buildCapitalMcOptions(country, displayScope, this.random)
            : undefined;
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: buildCapitalPrompt(country, displayScope),
          correctAnswer: country.capital,
          correctCode: country.code,
          displayType: country.hasCapitalImage ? "capital" : "text",
          ...mc,
        };
      }
      case "country-to-language": {
        const primary = getPrimaryLanguage(country);
        if (!primary) {
          return this.buildQuestion(country, "flag-to-country");
        }
        const mc =
          this.difficulty !== "hard"
            ? buildLanguageMcOptions(country, this.pool, this.random)
            : undefined;
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: buildLanguagePrompt(country, displayScope),
          correctAnswer: primary,
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
          prompt: placeText("Which country matches this shape?", displayScope, country),
          correctAnswer: country.name,
          correctCode: country.code,
          displayType: "shape",
          ...mc,
        };
      }
      case "country-to-flag":
      case "inverted-country-to-flag": {
        const optionCount = this.difficulty === "hard" ? 6 : 4;
        const mc = buildNameMcOptions(country, this.pool, this.difficulty, undefined, optionCount, this.random);
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: buildFlagFromPlacePrompt(country, displayScope),
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
          prompt: buildNeighborPrompt(country, neighbor, displayScope),
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
          prompt: placeText("Which country has more people?", displayScope, correct),
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
        const triviaPrompts = [country.factQuestion, country.factQuestion2].filter(
          (prompt) => prompt.trim().length > 0,
        );
        const factQuestion = pickFromPool(triviaPrompts, this.random);
        const prompt =
          displayScope === "usa"
            ? scopeText(factQuestion, displayScope)
            : placeText(factQuestion, displayScope, country);
        return {
          id,
          mode,
          countryCode: country.code,
          prompt,
          correctAnswer: country.name,
          correctCode: country.code,
          displayType: "text",
          ...mc,
        };
      }
      case "atlasle": {
        const targets = getAtlasleTargets(country);
        if (targets.length === 0) {
          return this.buildQuestion(country, "flag-to-country");
        }
        const target = pickFromPool(targets, this.random);
        const answer = getAtlasleAnswer(country, target);
        const maxGuesses = getAtlasleMaxGuesses(this.difficulty);
        const prompt =
          target === "capital"
            ? `Guess the capital (${maxGuesses} tries)`
            : placeText(`Guess the country (${maxGuesses} tries)`, displayScope, country);
        return {
          id,
          mode,
          countryCode: country.code,
          prompt,
          correctAnswer: answer,
          correctCode: country.code,
          displayType: "atlasle",
          atlasleTarget: target,
          atlasleMaxGuesses: maxGuesses,
        };
      }
      case "daily-challenge":
        throw new Error("Daily challenge questions must use a concrete question type");
      case "speed-round":
      case "mixed":
        return this.buildQuestion(country, "flag-to-country");
      default: {
        const _exhaustive: never = mode;
        return _exhaustive;
      }
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

    if (question.mode === "country-to-capital" || question.atlasleTarget === "capital") {
      return validateAnswer(answer, question.countryCode, "capital");
    }

    if (question.mode === "country-to-language") {
      return validateAnswer(answer, question.countryCode, "language");
    }

    if (question.mode === "atlasle") {
      return validateAnswer(answer, correctCode, "name");
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

export const DAILY_CHALLENGE_CONTENT_VERSION = "2026-08-06";

export function buildDailyChallengeSnapshot(dateKey: string): DailyChallengeSnapshot {
  const engine = new GameEngine(
    "daily-challenge",
    [],
    "medium",
    undefined,
    getDailySeedForDateKey(dateKey),
    DAILY_CHALLENGE_QUESTION_COUNT,
    false,
    "world",
  );
  const questions: Question[] = [];
  for (let index = 0; index < DAILY_CHALLENGE_QUESTION_COUNT; index += 1) {
    const question = engine.nextQuestion();
    if (!question) break;
    questions.push(question);
  }
  return {
    dateKey,
    contentVersion: DAILY_CHALLENGE_CONTENT_VERSION,
    seed: getDailySeedForDateKey(dateKey),
    questions,
  };
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

function dailySeedFromDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  const base = year * 10000 + month * 100 + day;
  return base;
}

export function getDailySeed(date = new Date()): number {
  return dailySeedFromDateKey(getDailyDateKey(date));
}

export function getDailySeedForDateKey(dateKey: string): number {
  return dailySeedFromDateKey(dateKey);
}

export function isValidDailyDateKey(dateKey: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  return getDailyDateKey(new Date(Date.UTC(year, month - 1, day, 17))) === dateKey;
}

export function formatDailyDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return formatDailyDate(new Date(Date.UTC(year, month - 1, day, 17)));
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

export function getWeekdayInEastern(dateKey: string): number {
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
  _scope: GameScope = "world",
  date = new Date(),
): boolean {
  const normalized = new Set(
    (playedDates ?? []).map((stored) => stored.includes(":") ? stored.slice(stored.indexOf(":") + 1) : stored),
  );
  return normalized.has(getDailyDateKey(date));
}

export function hasCompletedDailyToday(
  completions: string[] | undefined,
  _scope: GameScope = "world",
  date = new Date(),
): boolean {
  const normalized = new Set(
    (completions ?? []).map((stored) => stored.includes(":") ? stored.slice(stored.indexOf(":") + 1) : stored),
  );
  return normalized.has(getDailyDateKey(date));
}

export function dailyDateKeyToDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  for (let hour = 12; hour <= 20; hour += 1) {
    const probe = new Date(Date.UTC(year, month - 1, day, hour));
    if (getDailyDateKey(probe) === dateKey) return probe;
  }
  return new Date(Date.UTC(year, month - 1, day, 17));
}

export function offsetDailyDateKey(dateKey: string, dayOffset: number): string {
  const base = dailyDateKeyToDate(dateKey);
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
  _scope: GameScope = "world",
  date = new Date(),
): number {
  const set = new Set(
    (completions ?? []).map((stored) => stored.includes(":") ? stored.slice(stored.indexOf(":") + 1) : stored),
  );
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
