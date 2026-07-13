export const CONTINENTS = [
  "Africa",
  "Antarctica",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "South America",
] as const;

export type Continent = (typeof CONTINENTS)[number];

export const US_REGIONS = ["Midwest", "Northeast", "South", "West"] as const;

export type UsRegion = (typeof US_REGIONS)[number];

/** A continent (world scope) or a US Census region (USA scope). */
export type Region = Continent | UsRegion;

/** Which geography universe a session runs against. */
export type GameScope = "world" | "usa";

export const GAME_SCOPES: GameScope[] = ["world", "usa"];

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Normal",
  hard: "Hard",
};

export const ROUND_QUESTION_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const;
export type RoundQuestionCount = (typeof ROUND_QUESTION_OPTIONS)[number];
export const DEFAULT_ROUND_QUESTION_COUNT: RoundQuestionCount = 10;
export const DAILY_CHALLENGE_QUESTION_COUNT: RoundQuestionCount = 10;
export const ROUND_ALL_QUESTIONS = "all" as const;
export type RoundQuestionSetting = RoundQuestionCount | typeof ROUND_ALL_QUESTIONS;

export function normalizeRoundQuestionSetting(
  value: RoundQuestionSetting | number | string | undefined,
): RoundQuestionSetting {
  if (value === ROUND_ALL_QUESTIONS || value === "all") return ROUND_ALL_QUESTIONS;
  if (typeof value === "number" && (ROUND_QUESTION_OPTIONS as readonly number[]).includes(value)) {
    return value as RoundQuestionCount;
  }
  return DEFAULT_ROUND_QUESTION_COUNT;
}

export function getRoundQuestionOptions(poolSize: number): RoundQuestionCount[] {
  const maxOption = Math.floor(poolSize / 5) * 5;
  return ROUND_QUESTION_OPTIONS.filter((count) => count <= maxOption);
}

export function clampRoundQuestionSetting(
  setting: RoundQuestionSetting,
  poolSize: number,
): RoundQuestionSetting {
  if (setting === ROUND_ALL_QUESTIONS) return ROUND_ALL_QUESTIONS;
  const options = getRoundQuestionOptions(poolSize);
  if (options.includes(setting)) return setting;
  const fallback = [...options].reverse().find((count) => count <= setting);
  return fallback ?? ROUND_ALL_QUESTIONS;
}

export function resolveRoundQuestionLimit(
  setting: RoundQuestionSetting | undefined,
  poolSize: number,
): number {
  const normalized = clampRoundQuestionSetting(
    normalizeRoundQuestionSetting(setting),
    poolSize,
  );
  if (normalized === ROUND_ALL_QUESTIONS) return poolSize;
  return Math.min(normalized, poolSize);
}

export type CoreQuestionType =
  | "flag-to-country"
  | "capital-to-country"
  | "country-to-capital"
  | "shape-to-country";

export const CORE_QUESTION_TYPES: CoreQuestionType[] = [
  "flag-to-country",
  "capital-to-country",
  "country-to-capital",
  "shape-to-country",
];

export const MIXED_QUESTION_TYPES = [
  ...CORE_QUESTION_TYPES,
  "country-to-flag",
] as const;

export type MixedQuestionType = CoreQuestionType | "country-to-flag";

export const SPEED_ROUND_ALL_TYPES = "all-types" as const;
export type SpeedRoundQuestionType = CoreQuestionType | typeof SPEED_ROUND_ALL_TYPES;

export type GameMode =
  | "flag-to-country"
  | "capital-to-country"
  | "country-to-capital"
  | "shape-to-country"
  | "country-to-flag"
  | "neighbor-quiz"
  | "population-showdown"
  | "daily-challenge"
  | "marathon"
  | "speed-round"
  | "weak-spots"
  | "mixed";

export type Country = {
  code: string;
  code3: string;
  name: string;
  officialName: string;
  capital: string;
  continent: Region;
  subregion: string;
  population: number;
  area: number;
  borders: string[];
  aliases: string[];
  shapeQuizEligible: boolean;
  hasFlag: boolean;
  hasShape: boolean;
  isTerritory: boolean;
  fact: string;
};

export type ModeStats = {
  currentStreak: number;
  bestStreak: number;
  totalCorrect: number;
  totalPlayed: number;
  missedCountries: string[];
};

export type ModeStatsByDifficulty = Record<Difficulty, ModeStats>;

export type GlobalStreakSnapshot = {
  currentStreak: number;
  bestStreak: number;
};

export type Profile = {
  id: string;
  name: string;
  avatarColor: string;
  createdAt: string;
  globalStreaks: Record<Difficulty, GlobalStreakSnapshot>;
  stats: Record<GameMode, ModeStatsByDifficulty>;
  settings: {
    difficulty: Difficulty;
    lastContinentFilter: Continent[];
    lastRegionFilter?: UsRegion[];
    includeTerritories: boolean;
    speedRoundQuestionType: SpeedRoundQuestionType;
    marathonQuestionType: SpeedRoundQuestionType;
    roundQuestionCount: RoundQuestionSetting;
  };
  achievements: string[];
  countryProgress?: Record<string, { correct: number; total: number }>;
  /** EST date keys (YYYY-MM-DD) when the daily challenge was first played with stats */
  dailyChallengePlayedDates?: string[];
  /** EST date keys (YYYY-MM-DD) when the daily challenge was fully completed */
  dailyChallengeCompletions?: string[];
  /** Highest global streak reached today, per difficulty (resets each EST day) */
  todayBestStreaks?: Partial<Record<Difficulty, { dateKey: string; value: number }>>;
};

export type AchievementSessionContext = {
  sessionCorrect: number;
  sessionTotal: number;
  sessionEnded?: boolean;
};

export type AppState = {
  profiles: Profile[];
  activeProfileId: string | null;
};

export type Question = {
  id: string;
  mode: GameMode;
  countryCode: string;
  prompt: string;
  correctAnswer: string;
  correctCode?: string;
  options?: string[];
  optionCodes?: string[];
  displayType?: "flag" | "shape" | "text" | "flags-grid" | "population";
  secondaryCountryCode?: string;
};

export type AnswerResult = {
  correct: boolean;
  correctAnswer: string;
  userAnswer: string;
  skipped?: boolean;
};

export const GAME_MODES: {
  id: GameMode;
  title: string;
  description: string;
  icon: string;
  phase: 1 | 2;
}[] = [
  {
    id: "flag-to-country",
    title: "Countries from flags",
    description: "Identify each country by its flag",
    icon: "🏳️",
    phase: 1,
  },
  {
    id: "capital-to-country",
    title: "Countries from capitals",
    description: "Identify each country by its capital city",
    icon: "🏛️",
    phase: 1,
  },
  {
    id: "country-to-capital",
    title: "Capitals from countries",
    description: "Name the capital city for each country",
    icon: "📍",
    phase: 1,
  },
  {
    id: "shape-to-country",
    title: "Countries from shapes",
    description: "Identify each country by its silhouette",
    icon: "🗺️",
    phase: 1,
  },
  {
    id: "country-to-flag",
    title: "Flags from countries",
    description: "Pick the matching flag for each country",
    icon: "🎌",
    phase: 2,
  },
  {
    id: "neighbor-quiz",
    title: "Neighbor Quiz",
    description: "Which country borders this one?",
    icon: "🔗",
    phase: 2,
  },
  {
    id: "population-showdown",
    title: "Population Showdown",
    description: "Which country has more people?",
    icon: "👥",
    phase: 2,
  },
  {
    id: "daily-challenge",
    title: "Daily Challenge",
    description: "10 questions — resets at midnight Eastern",
    icon: "📅",
    phase: 2,
  },
  {
    id: "marathon",
    title: "Marathon",
    description: "Keep going until your first mistake",
    icon: "🏃",
    phase: 2,
  },
  {
    id: "speed-round",
    title: "Speed Round",
    description: "60 seconds — how many can you get?",
    icon: "⚡",
    phase: 2,
  },
  {
    id: "mixed",
    title: "Mixed",
    description: "Flags, capitals, shapes, and flag picking — shuffled",
    icon: "🎲",
    phase: 2,
  },
  {
    id: "weak-spots",
    title: "Practice Weak Spots",
    description: "Review countries you've missed most",
    icon: "🎯",
    phase: 2,
  },
];

export const AVATAR_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#db2777",
  "#0891b2",
  "#ea580c",
] as const;

export const ACHIEVEMENTS = [
  { id: "first-steps", title: "First Steps", description: "Answer your first question" },
  { id: "streak-5", title: "On a Roll", description: "Reach a 5-question streak" },
  { id: "streak-10", title: "Heating Up", description: "Reach a 10-question streak" },
  { id: "streak-25", title: "Unstoppable", description: "Reach a 25-question streak" },
  { id: "streak-50", title: "Geography Legend", description: "Reach a 50-question streak" },
  { id: "streak-75", title: "Globe Runner", description: "Reach a 75-question streak" },
  { id: "streak-100", title: "World Dominator", description: "Reach a 100-question streak" },
  { id: "best-streak-20", title: "High Water Mark", description: "Reach an all-time best streak of 20" },
  { id: "best-streak-40", title: "Peak Performer", description: "Reach an all-time best streak of 40" },
  { id: "played-50", title: "Warming Up", description: "Play 50 questions total" },
  { id: "played-250", title: "Dedicated Learner", description: "Play 250 questions total" },
  { id: "correct-25", title: "Quick Learner", description: "Answer 25 questions correctly total" },
  { id: "correct-100", title: "Century Club", description: "Answer 100 questions correctly total" },
  { id: "correct-250", title: "Knowledge Builder", description: "Answer 250 questions correctly total" },
  { id: "correct-500", title: "Geography Scholar", description: "Answer 500 questions correctly total" },
  { id: "correct-1000", title: "Millennium Mapper", description: "Answer 1,000 questions correctly total" },
  { id: "flag-rookie", title: "Flag Rookie", description: "Answer 10 flag-to-country questions correctly" },
  { id: "flag-fanatic", title: "Flag Fanatic", description: "Answer 50 flag-to-country questions correctly" },
  { id: "flag-master", title: "Flag Master", description: "Answer 150 flag-to-country questions correctly" },
  { id: "capital-hunter", title: "Capital Hunter", description: "Answer 25 capital-to-country questions correctly" },
  { id: "capital-sage", title: "Capital Sage", description: "Answer 50 capital-to-country questions correctly" },
  { id: "capital-namer", title: "Capital Namer", description: "Answer 25 country-to-capital questions correctly" },
  { id: "shape-spotter", title: "Shape Spotter", description: "Answer 25 shape-to-country questions correctly" },
  { id: "shape-master", title: "Shape Master", description: "Answer 75 shape-to-country questions correctly" },
  { id: "flag-picker", title: "Flag Picker", description: "Answer 25 country-to-flag questions correctly" },
  { id: "border-boss", title: "Border Boss", description: "Answer 25 neighbor quiz questions correctly" },
  { id: "population-prophet", title: "Population Prophet", description: "Answer 25 population showdown questions correctly" },
  { id: "marathon-runner", title: "Marathon Runner", description: "Get 15 correct in a row in Marathon mode" },
  { id: "marathon-25", title: "Endurance", description: "Get 25 correct in a row in Marathon mode" },
  { id: "marathon-40", title: "Long Distance", description: "Get 40 correct in a row in Marathon mode" },
  { id: "marathon-60", title: "Ultra Mapper", description: "Get 60 correct in a row in Marathon mode" },
  { id: "speed-rookie", title: "Speed Rookie", description: "Answer 20 speed round questions correctly total" },
  { id: "speed-demon", title: "Speed Demon", description: "Get 15 correct in one speed round" },
  { id: "speed-frenzy", title: "Speed Frenzy", description: "Get 25 correct in one speed round" },
  { id: "daily-devotee", title: "Daily Devotee", description: "Complete a daily challenge" },
  { id: "daily-regular", title: "Daily Regular", description: "Complete 5 daily challenges" },
  { id: "daily-veteran", title: "Daily Veteran", description: "Complete 20 daily challenges" },
  { id: "weak-spots-warrior", title: "Weak Spots Warrior", description: "Answer 15 weak spots questions correctly" },
  { id: "accuracy-sharp", title: "Sharp Shooter", description: "Maintain 80%+ accuracy over 75+ questions" },
  { id: "perfect-session", title: "Flawless Run", description: "Finish a session of 10+ questions with 100% accuracy" },
  { id: "mode-explorer", title: "Mode Explorer", description: "Try every game mode at least once" },
  { id: "mode-master", title: "Mode Master", description: "Get 25+ correct in 5 different game modes" },
  { id: "africa-master", title: "Africa Master", description: "90% accuracy across 20+ African countries" },
  { id: "asia-master", title: "Asia Master", description: "90% accuracy across 20+ Asian countries" },
  { id: "europe-master", title: "Europe Master", description: "90% accuracy across 20+ European countries" },
  { id: "americas-master", title: "Americas Master", description: "90% accuracy across 15+ countries in the Americas" },
  { id: "oceania-master", title: "Oceania Master", description: "90% accuracy across 10+ Oceania countries" },
  { id: "antarctica-explorer", title: "Antarctica Explorer", description: "Answer questions about 3 Antarctic territories" },
  { id: "country-collector", title: "Country Collector", description: "Answer questions about 50 different countries" },
  { id: "country-completionist", title: "Country Completionist", description: "Answer questions about 100 different countries" },
] as const;
