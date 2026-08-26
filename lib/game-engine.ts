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
  type QuestionKind,
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
import { isIslandCountry } from "@/lib/place-geography";
import { isSessionPolicyMode } from "@/lib/mode-registry";
import {
  getDailySeedForDateKey,
} from "@/lib/daily-calendar";

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

export type GameEngineConfig = {
  mode: GameMode;
  continents: Region[];
  difficulty: Difficulty;
  weakSpotCodes?: string[];
  seed?: number;
  questionLimit?: RoundQuestionSetting;
  includeTerritories?: boolean;
  scope?: GameScope;
  challengeModifier?: ChallengeModifier;
  dailyQuestionSnapshot?: Question[];
};

export class GameEngine {
  private pool: Country[];
  private random: () => number;
  private questionIndex = 0;
  private dailyQuestions: Question[] = [];
  private roundCountries: Country[] = [];
  private mode: GameMode;
  private difficulty: Difficulty;
  private questionLimit: RoundQuestionSetting;
  private scope: GameScope;
  private challengeModifier: ChallengeModifier;

  constructor({
    mode,
    continents,
    difficulty,
    weakSpotCodes,
    seed,
    questionLimit = DEFAULT_ROUND_QUESTION_COUNT,
    includeTerritories = false,
    scope = "world",
    challengeModifier = "none",
    dailyQuestionSnapshot,
  }: GameEngineConfig) {
    this.mode = mode;
    this.difficulty = difficulty;
    this.questionLimit = questionLimit;
    this.scope = scope;
    this.challengeModifier = challengeModifier;
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

  private resolveQuestionKind(country: Country): QuestionKind {
    if (this.mode === "mixed") {
      const eligibleTypes = getEligibleMixedQuestionTypes(country);
      if (eligibleTypes.length === 0) {
        throw new Error(`Mixed pool admitted ${country.code} with no eligible question kinds`);
      }
      return pickFromPool(eligibleTypes, this.random);
    }
    if (this.mode === "daily-challenge") {
      throw new Error("Daily challenge questions must use a concrete question type");
    }
    if (isSessionPolicyMode(this.mode)) {
      return "flag-to-country";
    }
    return this.mode;
  }

  private buildNextQuestionForCountry(country: Country): Question {
    return this.buildQuestion(country, this.resolveQuestionKind(country));
  }

  private buildQuestion(country: Country, mode: QuestionKind, stableIndex?: number): Question {
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
      case "inverted-flag-to-country": {
        const mc =
          this.difficulty !== "hard"
            ? buildNameMcOptions(country, this.pool, this.difficulty, undefined, 4, this.random)
            : undefined;
        const isFlagCrop =
          mode === "flag-crop-to-country" || mode === "inverted-flag-crop-to-country";
        return {
          id,
          mode,
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
          throw new Error(`Language pool admitted ${country.code} without a primary language`);
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
        const correctNeighbor = neighbor ?? country;
        // Borders are often stored as alpha-3 (CIV, TGO) while MC option codes
        // are alpha-2 (CI, TG). Resolve to canonical codes so other real
        // neighbors are excluded — otherwise more than one option is correct.
        const blockedDistractorCodes = new Set<string>([country.code]);
        for (const borderCode of country.borders) {
          const border = getCountryByCode(borderCode);
          const canonical = border?.code ?? borderCode;
          if (canonical !== correctNeighbor.code) {
            blockedDistractorCodes.add(canonical);
          }
        }
        const distractorPool = this.pool.filter((c) => !blockedDistractorCodes.has(c.code));
        const mc = buildNameMcOptions(
          correctNeighbor,
          distractorPool,
          this.difficulty,
          undefined,
          4,
          this.random,
        );
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: buildNeighborPrompt(country, neighbor, displayScope),
          correctAnswer: neighbor?.name ?? "",
          correctCode: neighbor?.code ?? neighborCode,
          displayType: "text",
          ...mc,
        };
      }
      case "population-showdown": {
        const opponents = this.pool.filter(
          (c) => c.code !== country.code && c.population !== country.population,
        );
        if (opponents.length === 0) {
          throw new Error(`Population pool admitted ${country.code} without a comparable opponent`);
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
      case "globe-hunt":
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: `Find ${country.name} on the map.`,
          correctAnswer: country.name,
          correctCode: country.code,
          displayType: "globe",
        };
      case "atlasle": {
        const targets = getAtlasleTargets(country);
        if (targets.length === 0) {
          throw new Error(`Atlasle pool admitted ${country.code} without a guess target`);
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
  const engine = new GameEngine({
    mode: "daily-challenge",
    continents: [],
    difficulty: "medium",
    seed: getDailySeedForDateKey(dateKey),
    questionLimit: DAILY_CHALLENGE_QUESTION_COUNT,
    includeTerritories: false,
    scope: "world",
  });
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
