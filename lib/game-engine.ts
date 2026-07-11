import { filterCountries, getCountryByCode, getCountryName } from "@/lib/countries";
import { validateAnswer } from "@/lib/answer-matcher";
import {
  DAILY_CHALLENGE_QUESTION_COUNT,
  DEFAULT_ROUND_QUESTION_COUNT,
  resolveRoundQuestionLimit,
  type Continent,
  type CoreQuestionType,
  type Country,
  type Difficulty,
  type GameMode,
  type Question,
  type RoundQuestionSetting,
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
): { options: string[]; optionCodes: string[] } {
  const getValue = (c: Country) => (field === "capital" ? c.capital : c.name);
  const distractorPool =
    difficulty === "easy"
      ? pool.filter((c) => c.code !== correct.code)
      : pool.filter((c) => c.code !== correct.code && c.continent === correct.continent);

  const distractors = shuffle(distractorPool)
    .slice(0, 3)
    .map((c) => ({ label: getValue(c), code: c.code }));

  while (distractors.length < 3) {
    const extra = pickRandom(pool.filter((c) => c.code !== correct.code && !distractors.some((d) => d.code === c.code)));
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
    private questionType?: CoreQuestionType,
    private questionLimit: RoundQuestionSetting = DEFAULT_ROUND_QUESTION_COUNT,
  ) {
    const filterMode = mode === "speed-round" && questionType ? questionType : mode;
    this.pool = filterCountries({ continents, mode: filterMode, weakSpotCodes });
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

    const questionMode =
      this.mode === "speed-round" && this.questionType ? this.questionType : this.mode;
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
            ? buildMcOptions(country, this.pool, this.difficulty, "name")
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
        let other = pickFromPool(this.pool.filter((c) => c.code !== country.code), this.random);
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

  checkAnswer(question: Question, answer: string): boolean {
    if (question.mode === "country-to-capital") {
      return validateAnswer(answer, question.countryCode, "capital");
    }
    if (question.mode === "country-to-flag" || question.mode === "population-showdown") {
      return answer === question.correctCode;
    }
    if (question.correctCode) {
      const country = getCountryByCode(question.correctCode);
      if (country && validateAnswer(answer, question.correctCode, "name")) return true;
      return answer === question.correctAnswer || answer === question.correctCode;
    }
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
