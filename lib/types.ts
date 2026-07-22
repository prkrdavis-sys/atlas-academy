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
  | "shape-to-country"
  | "capital-to-country"
  | "country-to-capital";

export const CORE_QUESTION_TYPES: CoreQuestionType[] = [
  "flag-to-country",
  "shape-to-country",
  "capital-to-country",
  "country-to-capital",
];

export const MIXED_QUESTION_TYPES = [
  ...CORE_QUESTION_TYPES,
  "country-to-flag",
] as const;

export type MixedQuestionType = CoreQuestionType | "country-to-flag";

export const DAILY_CHALLENGE_QUESTION_TYPES = [
  "flag-to-country",
  "country-to-flag",
  "shape-to-country",
  "country-to-capital",
] as const satisfies readonly MixedQuestionType[];

export type DailyChallengeQuestionType = (typeof DAILY_CHALLENGE_QUESTION_TYPES)[number];

export const SPEED_ROUND_ALL_TYPES = "all-types" as const;
export type SpeedRoundQuestionType = CoreQuestionType | typeof SPEED_ROUND_ALL_TYPES;

export type GameMode =
  | "flag-to-country"
  | "shape-to-country"
  | "capital-to-country"
  | "country-to-capital"
  | "country-to-flag"
  | "neighbor-quiz"
  | "population-showdown"
  | "fact-to-country"
  | "daily-challenge"
  | "marathon"
  | "speed-round"
  | "weak-spots"
  | "mixed";

export const PLAY_MODES: GameMode[] = [
  ...CORE_QUESTION_TYPES,
  "mixed",
];

export const CHALLENGE_MODES: GameMode[] = ["daily-challenge", "speed-round", "marathon"];

export const MAX_RECENT_MODES = 4;

export const DEFAULT_SELECTED_MODE: GameMode = "mixed";

const TYPE_IN_HARD_MODES: GameMode[] = [
  "flag-to-country",
  "shape-to-country",
  "capital-to-country",
  "country-to-capital",
  "neighbor-quiz",
  "fact-to-country",
  "weak-spots",
  "mixed",
];

export function getDifficultyHint(mode: GameMode, level: Difficulty): string {
  switch (level) {
    case "easy":
      return " - multiple choice + boosts";
    case "medium":
      return " - multiple choice";
    case "hard":
      if (mode === "country-to-flag") return " - pick from 6 flags";
      if (TYPE_IN_HARD_MODES.includes(mode)) return " - type your answer";
      return " - multiple choice";
  }
}

export type Country = {
  code: string;
  code3: string;
  name: string;
  officialName: string;
  /** Endonym when it differs from the English common name (e.g. 日本, Deutschland). */
  nativeName?: string;
  /** Official language(s), e.g. "Japanese" or "German · French · Dutch". */
  languages?: string;
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
  hasCapitalImage: boolean;
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

export type GlobalStreaksByDifficulty = Record<Difficulty, GlobalStreakSnapshot>;

export type ModeStatsByScope = Record<GameMode, ModeStatsByDifficulty>;

export type ScopedByGameScope<T> = Record<GameScope, T>;

export type Profile = {
  id: string;
  name: string;
  avatarColor: string;
  createdAt: string;
  globalStreaks: ScopedByGameScope<GlobalStreaksByDifficulty>;
  stats: ScopedByGameScope<ModeStatsByScope>;
  settings: {
    difficulty: Difficulty;
    lastContinentFilter: Continent[];
    lastRegionFilter?: UsRegion[];
    includeTerritories: boolean;
    speedRoundQuestionType: SpeedRoundQuestionType;
    marathonQuestionType: SpeedRoundQuestionType;
    roundQuestionCount: RoundQuestionSetting;
    lastSelectedMode: GameMode;
    recentModes?: GameMode[];
  };
  achievements: string[];
  countryProgress?: Record<string, { correct: number; total: number }>;
  /** EST date keys (YYYY-MM-DD) when the daily challenge was first played with stats */
  dailyChallengePlayedDates?: string[];
  /** EST date keys (YYYY-MM-DD) when the daily challenge was fully completed */
  dailyChallengeCompletions?: string[];
  /** Highest global streak reached today, per scope and difficulty (resets each EST day) */
  todayBestStreaks?: Partial<
    Record<GameScope, Partial<Record<Difficulty, { dateKey: string; value: number }>>>
  >;
  /** Active pool of place codes the player commonly misses, per scope */
  commonlyMissedCountries?: Partial<Record<GameScope, string[]>>;
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
  displayType?: "flag" | "shape" | "capital" | "text" | "flags-grid" | "population";
  secondaryCountryCode?: string;
};

export type AnswerResult = {
  correct: boolean;
  correctAnswer: string;
  userAnswer: string;
  skipped?: boolean;
};

/** Personalized review mode on the game setup page. */
export const PRACTICE_MODES: GameMode[] = ["weak-spots"];

/** Phase-2 quiz modes shown on the game setup page (not core Play, Challenges, or Practice). */
export const EXTRA_QUIZ_MODES: GameMode[] = [
  "country-to-flag",
  "neighbor-quiz",
  "population-showdown",
  "fact-to-country",
];

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
    id: "shape-to-country",
    title: "Countries from shapes",
    description: "Identify each country by its silhouette",
    icon: "🗺️",
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
    id: "country-to-flag",
    title: "Flags from countries",
    description: "See a country name, pick its flag — Hard adds two more choices",
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
    id: "fact-to-country",
    title: "Countries from facts",
    description: "Read a library fact — which country is it about?",
    icon: "💡",
    phase: 2,
  },
  {
    id: "daily-challenge",
    title: "Daily Challenge",
    description: "10 mixed questions — resets at midnight Eastern",
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
    description: "Review places you commonly miss",
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

export const PROFILE_EMOJI = "👨🏽‍🎓";

export const ACHIEVEMENTS = [
  { id: "first-steps", title: "First Steps", description: "Answer your first question" },
  { id: "mode-curious", title: "Mode Curious", description: "Try 4 different game modes" },
  { id: "around-the-map", title: "Around the Map", description: "Play 10+ questions in both World and USA" },
  { id: "daily-devotee", title: "Daily Devotee", description: "Complete your first daily challenge" },
  { id: "played-50", title: "Warming Up", description: "Play 50 questions total" },
  { id: "played-250", title: "Dedicated Learner", description: "Play 250 questions total" },
  { id: "played-750", title: "Map Marathoner", description: "Play 750 questions total" },
  { id: "played-2000", title: "Lifetime Explorer", description: "Play 2,000 questions total" },
  { id: "correct-25", title: "Quick Learner", description: "Answer 25 questions correctly" },
  { id: "correct-150", title: "Rising Scholar", description: "Answer 150 questions correctly" },
  { id: "correct-500", title: "Geography Scholar", description: "Answer 500 questions correctly" },
  { id: "correct-1500", title: "Atlas Expert", description: "Answer 1,500 questions correctly" },
  { id: "peak-15", title: "Finding Rhythm", description: "Reach a best streak of 15" },
  { id: "peak-30", title: "Peak Performer", description: "Reach a best streak of 30" },
  { id: "peak-50", title: "Geography Legend", description: "Reach a best streak of 50" },
  { id: "peak-75", title: "Globe Runner", description: "Reach a best streak of 75" },
  { id: "peak-100", title: "World Dominator", description: "Reach a best streak of 100" },
  { id: "daily-regular", title: "Daily Regular", description: "Complete 7 daily challenges" },
  { id: "daily-veteran", title: "Daily Veteran", description: "Complete 30 daily challenges" },
  { id: "hot-day", title: "Hot Day", description: "Reach a 20+ streak in a single day" },
  { id: "perfect-session", title: "Flawless Run", description: "Finish a 10+ question session with 100% accuracy" },
  { id: "flag-rookie", title: "Flag Rookie", description: "Answer 15 flags-to-countries questions correctly" },
  { id: "capital-hunter", title: "Capital Hunter", description: "Answer 15 capitals-to-countries questions correctly" },
  { id: "capital-namer", title: "Capital Namer", description: "Answer 15 countries-to-capitals questions correctly" },
  { id: "shape-spotter", title: "Shape Spotter", description: "Answer 15 shapes-to-countries questions correctly" },
  { id: "mixed-starter", title: "Mixed Starter", description: "Answer 15 mixed mode questions correctly" },
  { id: "flag-picker", title: "Flag Picker", description: "Answer 15 flags-from-countries questions correctly" },
  { id: "flag-fanatic", title: "Flag Fanatic", description: "Answer 75 flags-to-countries questions correctly" },
  { id: "capital-sage", title: "Capital Sage", description: "Answer 75 capitals-to-countries questions correctly" },
  { id: "capital-legend", title: "Capital Legend", description: "Answer 75 countries-to-capitals questions correctly" },
  { id: "shape-master", title: "Shape Master", description: "Answer 75 shapes-to-countries questions correctly" },
  { id: "mixed-veteran", title: "Mixed Veteran", description: "Answer 75 mixed mode questions correctly" },
  { id: "border-boss", title: "Border Boss", description: "Answer 50 neighbor quiz questions correctly" },
  { id: "population-prophet", title: "Population Prophet", description: "Answer 50 population showdown questions correctly" },
  { id: "fact-finder", title: "Fact Finder", description: "Answer 50 fact quiz questions correctly" },
  { id: "marathon-25", title: "Endurance", description: "Reach a best marathon run of 25" },
  { id: "marathon-45", title: "Long Distance", description: "Reach a best marathon run of 45" },
  { id: "marathon-65", title: "Ultra Mapper", description: "Reach a best marathon run of 65" },
  { id: "speed-demon", title: "Speed Demon", description: "Get 15 correct in one speed round" },
  { id: "speed-frenzy", title: "Speed Frenzy", description: "Get 25 correct in one speed round" },
  { id: "weak-spots-warrior", title: "Weak Spots Warrior", description: "Answer 50 weak spots questions correctly" },
  { id: "mode-explorer", title: "Mode Explorer", description: "Try every game mode at least once" },
  { id: "mode-specialist", title: "Mode Specialist", description: "Get 50+ correct in 8 different game modes" },
  { id: "accuracy-sharp", title: "Sharp Shooter", description: "Maintain 80%+ accuracy over 100+ questions" },
  { id: "hard-earned", title: "Hard Earned", description: "Answer 50 questions correctly on Hard difficulty" },
  { id: "africa-master", title: "Africa Master", description: "90% accuracy across 20+ African countries" },
  { id: "asia-master", title: "Asia Master", description: "90% accuracy across 20+ Asian countries" },
  { id: "europe-master", title: "Europe Master", description: "90% accuracy across 20+ European countries" },
  { id: "coast-to-coast", title: "Coast to Coast", description: "90% accuracy across 5+ states in each US region" },
  { id: "state-collector", title: "State Collector", description: "Answer questions about 35 different states" },
  { id: "country-collector", title: "Country Collector", description: "Answer questions about 100 different countries" },
] as const;
