import { normalizeAnswerText } from "@/lib/answer-matcher";
import { getFlagLore, type FlagLore } from "@/lib/flag-lore";
import { uniqueLabeledValues } from "@/lib/search-labels";

export type FlagSearchCategory = "flag color" | "flag";

export type FlagSearchTerm = {
  label: string;
  values: string[];
  category: FlagSearchCategory;
};

type ColorFamily = {
  extraSearch: string[];
};

/** More-specific flag colors also match their everyday name (navy → blue). */
const COLOR_FAMILIES: Record<string, ColorFamily> = {
  red: { extraSearch: [] },
  crimson: { extraSearch: ["red"] },
  maroon: { extraSearch: ["red"] },
  scarlet: { extraSearch: ["red"] },
  carmine: { extraSearch: ["red"] },
  blue: { extraSearch: [] },
  navy: { extraSearch: ["blue"] },
  "navy blue": { extraSearch: ["blue", "navy"] },
  azure: { extraSearch: ["blue"] },
  cerulean: { extraSearch: ["blue"] },
  ultramarine: { extraSearch: ["blue"] },
  "sky blue": { extraSearch: ["blue", "light blue"] },
  "light blue": { extraSearch: ["blue", "sky blue"] },
  "dark blue": { extraSearch: ["blue", "navy"] },
  green: { extraSearch: [] },
  yellow: { extraSearch: ["gold", "golden"] },
  gold: { extraSearch: ["yellow", "golden"] },
  golden: { extraSearch: ["gold", "yellow"] },
  saffron: { extraSearch: ["orange"] },
  orange: { extraSearch: [] },
  white: { extraSearch: [] },
  silver: { extraSearch: ["white"] },
  black: { extraSearch: [] },
  purple: { extraSearch: [] },
  brown: { extraSearch: [] },
  copper: { extraSearch: ["brown"] },
  buff: { extraSearch: ["brown", "tan", "beige"] },
  gray: { extraSearch: ["grey"] },
  grey: { extraSearch: ["gray"] },
  turquoise: { extraSearch: ["teal", "aquamarine"] },
  aquamarine: { extraSearch: ["turquoise", "teal"] },
  teal: { extraSearch: ["turquoise"] },
  pink: { extraSearch: [] },
};

type FeatureGroup = {
  label: string;
  aliases?: string[];
  /** Terms that detect the feature in lore and may become search chips. */
  detect: string[];
  /** Detector-only aliases — match the visual, never become their own chip. */
  detectOnly?: string[];
};

const BIRD_TERMS = [
  "bird",
  "birds",
  "eagle",
  "eagles",
  "falcon",
  "hawk",
  "osprey",
  "parrot",
  "sisserou",
  "frigatebird",
  "bosunbird",
  "wirebird",
  "bird-of-paradise",
  "bird of paradise",
  "quetzal",
  "condor",
  "crane",
  "dove",
  "pelican",
  "rooster",
  "cock",
  "phoenix",
  "kiwi",
  "emu",
  "ibis",
  "swan",
  "owl",
  "raven",
  "harpy",
  "vulture",
  "albatross",
  "plover",
  "zimbabwe bird",
  "american eagle",
];

const COAT_OF_ARMS_DETECT_ONLY = ["us coat of arms"];

const OTHER_ANIMAL_TERMS = [
  "lion",
  "lions",
  "leopard",
  "leopards",
  "tiger",
  "bear",
  "grizzly",
  "bull",
  "ox",
  "horse",
  "ram",
  "sheep",
  "goat",
  "wolf",
  "dragon",
  "druk",
  "serpent",
  "snake",
  "dolphin",
  "dolphins",
  "fish",
  "turtle",
  "tortoise",
  "kangaroo",
  "alpaca",
  "moose",
  "elk",
  "aurochs",
  "unicorn",
  "bison",
  "buffalo",
  "beaver",
  "steer",
  "cattle",
];

/**
 * Identifiable charges and patterns. Detection uses whole words/phrases in the
 * depicted design (not coat-of-arms notes about emblems omitted from the flag).
 */
const FLAG_FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: "bird",
    aliases: ["birds"],
    detect: BIRD_TERMS,
    detectOnly: COAT_OF_ARMS_DETECT_ONLY,
  },
  {
    label: "animal",
    aliases: ["animals"],
    detect: [...BIRD_TERMS, ...OTHER_ANIMAL_TERMS],
    detectOnly: COAT_OF_ARMS_DETECT_ONLY,
  },
  {
    label: "plant",
    aliases: ["plants"],
    detect: [
      "maple",
      "cedar",
      "palm",
      "pine",
      "cactus",
      "olive",
      "wheat",
      "vine",
      "grape",
      "grapevines",
      "flower",
      "lotus",
      "bauhinia",
      "nutmeg",
      "laurel",
      "tree",
      "fern",
      "sunflower",
      "goldenrod",
    ],
  },
  {
    label: "star",
    aliases: ["stars"],
    detect: ["star", "stars", "southern cross", "star of david", "pentagram"],
  },
  {
    label: "sun",
    aliases: ["sunburst", "sunshine"],
    detect: ["sun", "sunburst", "sun of may", "hinomaru", "sun disc"],
  },
  {
    label: "crescent",
    aliases: ["moon"],
    detect: ["crescent", "moon"],
  },
  {
    label: "cross",
    aliases: ["nordic cross", "saltire"],
    detect: ["nordic cross", "saltire", "st george", "st. george", "george's cross"],
  },
  {
    label: "union jack",
    aliases: ["unionjack", "british flag"],
    detect: ["union jack"],
  },
  {
    label: "maple leaf",
    aliases: ["maple", "leaf"],
    detect: ["maple leaf", "maple"],
  },
  {
    label: "dragon",
    detect: ["dragon", "druk"],
  },
  {
    label: "lion",
    detect: ["lion", "lions", "leopard", "leopards"],
  },
  {
    label: "eagle",
    detect: ["eagle", "eagles", "american eagle"],
    detectOnly: COAT_OF_ARMS_DETECT_ONLY,
  },
  {
    label: "serpent",
    aliases: ["snake"],
    detect: ["serpent", "snake"],
  },
  {
    label: "ship",
    aliases: ["boat", "sailboat"],
    detect: ["ship", "boat", "canoe", "proa", "steamship", "steamer", "frigate"],
  },
  {
    label: "crown",
    detect: ["crown", "crowned"],
  },
  {
    label: "shield",
    detect: ["shield"],
  },
  {
    label: "sword",
    aliases: ["spear", "weapon"],
    detect: ["sword", "swords", "spear", "spears", "machete", "rifle", "rifles"],
  },
  {
    label: "temple",
    aliases: ["building", "mosque"],
    detect: ["temple", "angkor", "mosque", "castle"],
  },
  {
    label: "map",
    aliases: ["outline", "silhouette"],
    detect: ["map", "map of", "silhouette of"],
  },
  {
    label: "trident",
    detect: ["trident"],
  },
  {
    label: "wheel",
    aliases: ["chakra"],
    detect: ["chakra", "ashoka", "wheel"],
  },
  {
    label: "triangle",
    aliases: ["triangles"],
    detect: ["triangle", "triangles"],
  },
  {
    label: "diamond",
    aliases: ["rhombus"],
    detect: ["diamond", "rhombus"],
  },
  {
    label: "disc",
    aliases: ["circle", "disk"],
    detect: ["disc", "disk", "circle"],
  },
  {
    label: "wreath",
    detect: ["wreath"],
  },
  {
    label: "key",
    detect: ["key"],
  },
  {
    label: "anchor",
    detect: ["anchor"],
  },
  {
    label: "harp",
    detect: ["harp"],
  },
  {
    label: "gear",
    aliases: ["cog", "cogwheel"],
    detect: ["gear", "cog", "cogwheel"],
  },
];

/**
 * Places whose shown flag includes the coat of arms / seal. Civil-plain flags
 * (Poland, Austria, the US, …) stay off this list so lore about omitted arms
 * cannot invent a charge the player cannot see.
 */
const FLAG_CODES_SHOWING_ARMS = new Set([
  "AD",
  "AI",
  "BZ",
  "BM",
  "IO",
  "KY",
  "HR",
  "DO",
  "EC",
  "GQ",
  "FK",
  "GU",
  "GT",
  "HT",
  "JE",
  "YT",
  "MX",
  "MD",
  "ME",
  "MS",
  "NI",
  "PN",
  "BL",
  "SH",
  "RS",
  "SX",
  "SK",
  "SI",
  "GS",
  "ES",
  "TC",
  "VI",
  "US-DE",
  "US-FL",
  "US-GA",
  "US-ID",
  "US-IL",
  "US-KS",
  "US-KY",
  "US-ME",
  "US-MA",
  "US-MI",
  "US-MO",
  "US-MT",
  "US-NE",
  "US-NH",
  "US-NJ",
  "US-NY",
  "US-ND",
  "US-OR",
  "US-PA",
  "US-SD",
  "US-VT",
  "US-VA",
  "US-WA",
  "US-WV",
  "US-WI",
]);

const CROSS_PHRASE =
  /\b(nordic cross|saltire|st\.? george(?:'s)? cross|george's cross|crossland|cross bottony|white cross|red cross|gold(?:en)? cross|blue cross|black cross|yellow cross)\b/i;

const flagSearchCache = new Map<string, FlagSearchTerm[]>();

function titleCaseLabel(value: string): string {
  return value.replace(/\b[a-z]/gu, (character) => character.toUpperCase());
}

function splitColorName(name: string): string[] {
  return name
    .split(/,|\band\b/iu)
    .map((part) => part.replace(/\bstars?\b/giu, "").trim())
    .filter((part) => part.length > 0);
}

function getFlagVisualText(code: string, lore: FlagLore): string {
  const parts = [lore.design, lore.emblem];
  if (lore.coatOfArms && FLAG_CODES_SHOWING_ARMS.has(code.toUpperCase())) {
    parts.push(lore.coatOfArms);
  }
  return parts.filter(Boolean).join(" ");
}

function normalizedWords(value: string): string[] {
  return normalizeAnswerText(value).split(" ").filter(Boolean);
}

function visualHasTerm(normalizedVisual: string, term: string): boolean {
  const normalizedTerm = normalizeAnswerText(term);
  if (!normalizedTerm) return false;
  if (normalizedTerm.includes(" ")) {
    return normalizedVisual.includes(normalizedTerm);
  }
  return normalizedWords(normalizedVisual).includes(normalizedTerm);
}

function visualHasChristianOrNordicCross(visualText: string, normalizedVisual: string): boolean {
  if (CROSS_PHRASE.test(visualText)) return true;
  const withoutSouthern = normalizedVisual.replace(/\bsouthern cross\b/gu, " ");
  return normalizedWords(withoutSouthern).includes("cross")
    || normalizedWords(withoutSouthern).includes("crosses");
}

function addTerm(
  terms: FlagSearchTerm[],
  seen: Set<string>,
  label: string,
  category: FlagSearchCategory,
  values: string[] = [],
): void {
  const entry = uniqueLabeledValues(seen, label, category, values);
  if (!entry) return;
  terms.push({ ...entry, category });
}

function buildFlagSearchTerms(code: string, lore: FlagLore): FlagSearchTerm[] {
  const terms: FlagSearchTerm[] = [];
  const seen = new Set<string>();
  const visualText = getFlagVisualText(code, lore);
  const normalizedVisual = normalizeAnswerText(visualText);

  for (const color of lore.colors) {
    const parts = splitColorName(color.name);
    if (parts.length > 1) {
      addTerm(terms, seen, color.name, "flag color");
    }
    for (const part of parts) {
      const normalizedPart = normalizeAnswerText(part);
      if (!normalizedPart) continue;
      addTerm(
        terms,
        seen,
        titleCaseLabel(part),
        "flag color",
        COLOR_FAMILIES[normalizedPart]?.extraSearch ?? [],
      );
    }
  }

  for (const group of FLAG_FEATURE_GROUPS) {
    const detectOnly = new Set(group.detectOnly ?? []);
    const matchedLabels = group.detect.filter((term) =>
      visualHasTerm(normalizedVisual, term),
    );
    const matchedDetectOnly = [...detectOnly].filter((term) =>
      visualHasTerm(normalizedVisual, term),
    );
    if (matchedLabels.length === 0 && matchedDetectOnly.length === 0) continue;
    addTerm(terms, seen, titleCaseLabel(group.label), "flag", group.aliases ?? []);
    for (const term of matchedLabels) {
      if (normalizeAnswerText(term) === normalizeAnswerText(group.label)) continue;
      addTerm(terms, seen, titleCaseLabel(term), "flag");
    }
  }

  if (visualHasChristianOrNordicCross(visualText, normalizedVisual)) {
    addTerm(terms, seen, "Cross", "flag", ["nordic cross", "saltire"]);
  }

  return terms;
}

/** Searchable flag colors and visual features derived from library flag lore. */
export function getFlagSearchTerms(code: string): FlagSearchTerm[] {
  const cached = flagSearchCache.get(code);
  if (cached) return cached;

  const lore = getFlagLore(code);
  const terms = lore ? buildFlagSearchTerms(code, lore) : [];
  flagSearchCache.set(code, terms);
  return terms;
}
