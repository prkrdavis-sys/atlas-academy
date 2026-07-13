import {
  getCountryByCode,
  getCountryName,
  getEligibleCoreQuestionTypes,
  getPlayablePool,
} from "@/lib/countries";
import { isSameCountry, normalizeAnswerText, validateAnswer } from "@/lib/answer-matcher";
import {
  DAILY_CHALLENGE_QUESTION_COUNT,
  DEFAULT_ROUND_QUESTION_COUNT,
  resolveRoundQuestionLimit,
  type Continent,
  SPEED_ROUND_ALL_TYPES,
  type Country,
  type Difficulty,
  type GameMode,
  type Question,
  type RoundQuestionSetting,
  type SpeedRoundQuestionType,
} from "@/lib/types";
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

function buildMcOptions(
  correct: Country,
  pool: Country[],
  difficulty: Difficulty,
  field: "name" | "capital" = "name",
  promptCapital?: string,
): { options: string[]; optionCodes: string[] } {
  const getValue = (c: Country) => (field === "capital" ? c.capital : c.name);
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
  for (const c of shuffle(distractorPool)) {
    if (distractors.length >= 3) break;
    if (distractors.some((d) => normalizeAnswerText(d.label) === normalizeAnswerText(getValue(c)))) continue;
    distractors.push({ label: getValue(c), code: c.code });
  }

  while (distractors.length < 3) {
    const extra = pickRandom(
      pool.filter(
        (c) =>
          isValidDistractor(c) &&
          !distractors.some(
            (d) =>
              d.code === c.code ||
              normalizeAnswerText(d.label) === normalizeAnswerText(getValue(c)),
          ),
      ),
    );
    if (!extra) break;
    distractors.push({ label: getValue(extra), code: extra.code });
  }

  const combined = shuffle([{ label: getValue(correct), code: correct.code }, ...distractors]);
  return {
    options: combined.map((c) => c.label),
    optionCodes: combined.map((c) => c.code),
  };
}

export class GameEngine {
  private pool: Country[];
  private random: () => number;
  private questionIndex = 0;
  private dailyQuestions: Question[] = [];
  private roundCountries: Country[] = [];

  constructor(
    private mode: GameMode,
    continents: Continent[],
    private difficulty: Difficulty,
    weakSpotCodes?: string[],
    seed?: number,
    private questionType?: SpeedRoundQuestionType,
    private questionLimit: RoundQuestionSetting = DEFAULT_ROUND_QUESTION_COUNT,
    includeTerritories = false,
  ) {
    this.pool = getPlayablePool({
      continents,
      includeTerritories,
      mode,
      questionType,
      weakSpotCodes,
    });
    this.random = seed !== undefined ? seededRandom(seed) : Math.random;

    if (this.mode === "daily-challenge") {
      this.dailyQuestions = this.buildDailyQuestions();
    } else {
      this.roundCountries = this.buildShuffledRoundCountries();
    }
  }

  getRoundQuestionLimit(): number {
    if (this.mode === "daily-challenge") {
      return Math.min(DAILY_CHALLENGE_QUESTION_COUNT, this.pool.length);
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
    if (!country) return null;
    this.questionIndex += 1;

    let questionMode: GameMode;
    if (
      this.mode === "mixed" ||
      (this.mode === "speed-round" && this.questionType === SPEED_ROUND_ALL_TYPES)
    ) {
      const eligibleTypes = getEligibleCoreQuestionTypes(country);
      questionMode =
        eligibleTypes.length > 0
          ? pickFromPool(eligibleTypes, this.random)
          : "flag-to-country";
    } else if (
      this.mode === "speed-round" &&
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
            ? buildMcOptions(country, this.pool, this.difficulty, "name")
            : undefined;
        return {
          id,
          mode: mode === "marathon" || mode === "weak-spots" ? mode : "flag-to-country",
          countryCode: country.code,
          prompt: "Which country does this flag belong to?",
          correctAnswer: country.name,
          correctCode: country.code,
          displayType: "flag",
          ...mc,
        };
      }
      case "capital-to-country": {
        const mc =
          this.difficulty !== "hard"
            ? buildMcOptions(country, this.pool, this.difficulty, "name", country.capital)
            : undefined;
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: `What country has ${country.capital} as its capital?`,
          correctAnswer: country.name,
          correctCode: country.code,
          displayType: "text",
          ...mc,
        };
      }
      case "country-to-capital": {
        const mc =
          this.difficulty !== "hard"
            ? buildMcOptions(country, this.pool, this.difficulty, "capital")
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
            ? buildMcOptions(country, this.pool, this.difficulty, "name")
            : undefined;
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: "Which country matches this shape?",
          correctAnswer: country.name,
          correctCode: country.code,
          displayType: "shape",
          ...mc,
        };
      }
      case "country-to-flag": {
        const mc = buildMcOptions(country, this.pool, this.difficulty, "name");
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
        const mc = buildMcOptions(
          neighbor ?? country,
          this.pool,
          this.difficulty,
          "name",
        );
        return {
          id,
          mode,
          countryCode: country.code,
          prompt: `Which country borders ${country.name}?`,
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
          prompt: "Which country has more people?",
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

export function getDailySeed(date = new Date()): number {
  const [year, month, day] = getDailyDateKey(date).split("-").map(Number);
  return year * 10000 + month * 100 + day;
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
  date = new Date(),
): boolean {
  return (playedDates ?? []).includes(getDailyDateKey(date));
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
