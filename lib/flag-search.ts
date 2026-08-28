import { normalizeAnswerText } from "@/lib/answer-matcher";
import { getFlagLore, type FlagLore } from "@/lib/flag-lore";

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
  terms: string[];
};

/**
 * Identifiable charges and patterns. Detection uses whole words/phrases in the
 * depicted design (not coat-of-arms notes about emblems omitted from the flag).
 */
const FLAG_FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: "bird",
    aliases: ["birds"],
    terms: [
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
      "us coat of arms",
      "american eagle",
    ],
  },
  {
    label: "animal",
    aliases: ["animals"],
    terms: [
      "bird",
      "birds",
      "eagle",
      "eagles",
      "parrot",
      "frigatebird",
      "bosunbird",
      "wirebird",
      "quetzal",
      "condor",
      "crane",
      "dove",
      "pelican",
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
    ],
  },
  {
    label: "plant",
    aliases: ["plants"],
    terms: [
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
    terms: ["star", "stars", "southern cross", "star of david", "pentagram"],
  },
  {
    label: "sun",
    aliases: ["sunburst", "sunshine"],
    terms: ["sun", "sunburst", "sun of may", "hinomaru", "sun disc"],
  },
  {
    label: "crescent",
    aliases: ["moon"],
    terms: ["crescent", "moon"],
  },
  {
    label: "cross",
    aliases: ["nordic cross", "saltire"],
    terms: ["nordic cross", "saltire", "st george", "st. george", "george's cross"],
  },
  {
    label: "union jack",
    aliases: ["unionjack", "british flag"],
    terms: ["union jack"],
  },
  {
    label: "maple leaf",
    aliases: ["maple", "leaf"],
    terms: ["maple leaf", "maple"],
  },
  {
    label: "dragon",
    terms: ["dragon", "druk"],
  },
  {
    label: "lion",
    terms: ["lion", "lions", "leopard", "leopards"],
  },
  {
    label: "eagle",
    terms: ["eagle", "eagles", "us coat of arms", "american eagle"],
  },
  {
    label: "serpent",
    aliases: ["snake"],
    terms: ["serpent", "snake"],
  },
  {
    label: "ship",
    aliases: ["boat", "sailboat"],
    terms: ["ship", "boat", "canoe", "proa", "steamship", "steamer", "frigate"],
  },
  {
    label: "crown",
    terms: ["crown", "crowned"],
  },
  {
    label: "shield",
    terms: ["shield"],
  },
  {
    label: "sword",
    aliases: ["spear", "weapon"],
    terms: ["sword", "swords", "spear", "spears", "machete", "rifle", "rifles"],
  },
  {
    label: "temple",
    aliases: ["building", "mosque"],
    terms: ["temple", "angkor", "mosque", "castle"],
  },
  {
    label: "map",
    aliases: ["outline", "silhouette"],
    terms: ["map", "map of", "silhouette of"],
  },
  {
    label: "trident",
    terms: ["trident"],
  },
  {
    label: "wheel",
    aliases: ["chakra"],
    terms: ["chakra", "ashoka", "wheel"],
  },
  {
    label: "triangle",
    aliases: ["triangles"],
    terms: ["triangle", "triangles"],
  },
  {
    label: "diamond",
    aliases: ["rhombus"],
    terms: ["diamond", "rhombus"],
  },
  {
    label: "disc",
    aliases: ["circle", "disk"],
    terms: ["disc", "disk", "circle"],
  },
  {
    label: "wreath",
    terms: ["wreath"],
  },
  {
    label: "key",
    terms: ["key"],
  },
  {
    label: "anchor",
    terms: ["anchor"],
  },
  {
    label: "harp",
    terms: ["harp"],
  },
  {
    label: "gear",
    aliases: ["cog", "cogwheel"],
    terms: ["gear", "cog", "cogwheel"],
  },
];

const DESIGN_SHOWS_ARMS =
  /\bcoat of arms\b|\bstate seal\b|\bterritorial seal\b|\bseal\b|\bbadge\b|\bshield of\b/i;

const DESIGN_ARMS_ARE_STATE_ONLY = /\bstate flag (places|adds|includes|uses)\b/i;

const ARMS_OMITTED_FROM_SHOWN_FLAG =
  /\bnot on the (flag|everyday|civil)\b|\bcivil flag\b|\bshown (here|in this app) is the (plain|civil)\b|\bmay omit the arms\b|\bwithout that oval\b/i;

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

function getFlagVisualText(lore: FlagLore): string {
  const parts = [lore.design, lore.emblem];
  if (
    lore.coatOfArms &&
    DESIGN_SHOWS_ARMS.test(lore.design) &&
    !DESIGN_ARMS_ARE_STATE_ONLY.test(lore.design) &&
    !ARMS_OMITTED_FROM_SHOWN_FLAG.test(lore.coatOfArms)
  ) {
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
  const trimmedLabel = label.trim();
  if (!trimmedLabel) return;
  const key = `${category}:${normalizeAnswerText(trimmedLabel)}`;
  if (seen.has(key)) return;
  seen.add(key);
  terms.push({
    label: trimmedLabel,
    values: [...new Set([trimmedLabel, ...values])],
    category,
  });
}

function buildFlagSearchTerms(lore: FlagLore): FlagSearchTerm[] {
  const terms: FlagSearchTerm[] = [];
  const seen = new Set<string>();
  const visualText = getFlagVisualText(lore);
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
    const matchedTerms = group.terms.filter((term) =>
      visualHasTerm(normalizedVisual, term),
    );
    if (matchedTerms.length === 0) continue;
    addTerm(terms, seen, titleCaseLabel(group.label), "flag", group.aliases ?? []);
    for (const term of matchedTerms) {
      if (normalizeAnswerText(term) === normalizeAnswerText(group.label)) continue;
      if (term === "us coat of arms") continue;
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
  const terms = lore ? buildFlagSearchTerms(lore) : [];
  flagSearchCache.set(code, terms);
  return terms;
}
