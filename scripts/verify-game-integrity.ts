/**
 * Integrity harness: for every country and question type, build the question
 * and assert that (a) the correct multiple-choice pick is accepted, (b) every
 * wrong pick is rejected, (c) typing the correct name/capital is accepted,
 * and (d) typing every other country's name is rejected (except legitimately
 * ambiguous cases like shared borders). Also validates flag/shape assets.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GameEngine } from "../lib/game-engine";
import { searchLibraryPlaces } from "../lib/library";
import {
  modeCountsTowardMapProgress,
  resolveMapProgressCategory,
  wouldCountTowardMapProgress,
} from "../lib/map-progress";
import { normalizeAnswerText } from "../lib/answer-matcher";
import { countries, getCountryByCode, usStates } from "../lib/countries";
import { PROFILE_AVATARS } from "../lib/profile-avatars";
import { CONTEXT_MAP_TEMPLATES } from "../lib/context-maps";
import { REGION_SHAPE_REGIONS, getRegionShapePath } from "../lib/continent-shapes";
import flagCropData from "../data/flag-crops.json";
import { getFlagLore } from "../lib/flag-lore";
import { MIN_SHAPE_VIEWBOX, shapeViewBoxTooSmall } from "./map-path-utils";
import {
  CONTINENTS,
  FEATURED_SETUP_MODE,
  FLAG_CROP_ORIENTATIONS,
  MODE_FAMILIES,
  SETUP_MODES,
  US_REGIONS,
  type GameMode,
  type GameScope,
  type Question,
  type Region,
} from "../lib/types";

let failures = 0;
function fail(message: string) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function readWebpDimensions(asset: Buffer): { width: number; height: number } | null {
  if (
    asset.length < 30 ||
    asset.toString("ascii", 0, 4) !== "RIFF" ||
    asset.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const chunkType = asset.toString("ascii", 12, 16);
  const payloadOffset = 20;
  if (chunkType === "VP8 " && asset.toString("hex", payloadOffset + 3, payloadOffset + 6) === "9d012a") {
    return {
      width: asset.readUInt16LE(payloadOffset + 6) & 0x3fff,
      height: asset.readUInt16LE(payloadOffset + 8) & 0x3fff,
    };
  }
  if (chunkType === "VP8X") {
    return {
      width:
        1 +
        asset[payloadOffset + 4] +
        (asset[payloadOffset + 5] << 8) +
        (asset[payloadOffset + 6] << 16),
      height:
        1 +
        asset[payloadOffset + 7] +
        (asset[payloadOffset + 8] << 8) +
        (asset[payloadOffset + 9] << 16),
    };
  }
  if (chunkType === "VP8L" && asset[payloadOffset] === 0x2f) {
    const bits = asset.readUInt32LE(payloadOffset + 1);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >>> 14) & 0x3fff),
    };
  }
  return null;
}

// Asset checks
for (const c of [...countries, ...usStates]) {
  if (c.hasFlag && !existsSync(join("public", "flags", `${c.code.toLowerCase()}.svg`))) {
    fail(`${c.name}: hasFlag but flag file missing`);
  }
  if (c.hasShape && !existsSync(join("public", "shapes", `${c.code3.toLowerCase()}.svg`))) {
    fail(`${c.name}: hasShape but shape file missing`);
  }
  if (c.hasShape) {
    const shapeSvg = readFileSync(join("public", "shapes", `${c.code3.toLowerCase()}.svg`), "utf8");
    if (shapeSvg.includes("potrace")) {
      fail(`${c.name}: shape still uses outdated mapsicon asset`);
    }
    if (shapeViewBoxTooSmall(shapeSvg)) {
      fail(`${c.name}: shape viewBox too small to render (min edge ${MIN_SHAPE_VIEWBOX})`);
    }
  }
  if (c.hasCapitalImage && !existsSync(join("public", "capitals", `${c.code.toLowerCase()}.jpg`))) {
    fail(`${c.name}: hasCapitalImage but capital image missing`);
  }
  if (c.shapeQuizEligible && !c.hasShape) fail(`${c.name}: shapeQuizEligible without shape`);
  if (c.hasFlag) {
    const crop = flagCropData.records[c.code as keyof typeof flagCropData.records];
    if (!crop) {
      fail(`${c.name}: missing reviewed flag crop`);
    } else {
      if (crop.colors < 2) fail(`${c.name}: flag crop has fewer than two substantial colors`);
      if (!crop.reviewed) fail(`${c.name}: flag crop has not been reviewed`);
      if (crop.zoom < 2.6) fail(`${c.name}: flag crop is not challenging enough`);
    }
    const lore = getFlagLore(c.code);
    if (!lore) {
      fail(`${c.name}: missing flag lore`);
    } else if (!lore.design.trim() || !lore.meaning.trim() || lore.colors.length === 0) {
      fail(`${c.name}: incomplete flag lore`);
    }
  }
}

const avatarIds = new Set<string>();
const avatarSources = new Set<string>();
if (PROFILE_AVATARS.length !== 20) {
  fail(`Expected exactly 20 profile portraits, found ${PROFILE_AVATARS.length}`);
}
for (const avatar of PROFILE_AVATARS) {
  if (avatarIds.has(avatar.id)) fail(`Duplicate profile portrait ID: ${avatar.id}`);
  avatarIds.add(avatar.id);
  if (avatarSources.has(avatar.src)) fail(`Duplicate profile portrait asset: ${avatar.src}`);
  avatarSources.add(avatar.src);
  if (!getCountryByCode(avatar.flagCode)) {
    fail(`${avatar.id}: unknown primary flag code ${avatar.flagCode}`);
  }
  if (!existsSync(join("public", "flags", `${avatar.flagCode.toLowerCase()}.svg`))) {
    fail(`${avatar.id}: primary flag asset missing for ${avatar.flagCode}`);
  }

  const assetPath = join("public", avatar.src.replace(/^\//, ""));
  if (!existsSync(assetPath)) {
    fail(`${avatar.id}: profile portrait file missing (${assetPath})`);
    continue;
  }
  const asset = readFileSync(assetPath);
  const dimensions = readWebpDimensions(asset);
  if (!dimensions) {
    fail(`${avatar.id}: profile portrait is not a readable WebP`);
    continue;
  }
  const { width, height } = dimensions;
  if (width !== height || width < 128 || height < 128) {
    fail(`${avatar.id}: profile portrait must be square and at least 128px (${width}x${height})`);
  }
}

const excludedFlagCropCodes = new Set(flagCropData.excludedCodes);
for (const duplicateGroup of flagCropData.duplicateGroups) {
  const eligibleCodes = duplicateGroup.filter((code) => !excludedFlagCropCodes.has(code));
  if (eligibleCodes.length !== 1) {
    fail(`Duplicate flag group must keep exactly one crop: ${duplicateGroup.join(", ")}`);
  }
}

for (const template of CONTEXT_MAP_TEMPLATES) {
  if (!existsSync(join("public", "maps", `${template}.svg`))) {
    fail(`Missing context map template: public/maps/${template}.svg`);
  }
}

if (!existsSync(join("public", "maps", "bounds.json"))) {
  fail("Missing context map bounds manifest: public/maps/bounds.json");
}

for (const region of REGION_SHAPE_REGIONS) {
  const shapePath = getRegionShapePath(region);
  if (!existsSync(join("public", shapePath))) {
    fail(`Missing region silhouette for ${region}: public${shapePath}`);
  }
}

// The mode picker renders MODE_FAMILIES, so a setup mode missing from it would
// be unreachable, and a duplicate would render twice.
const familyModes = MODE_FAMILIES.flatMap((family) => [...family.primary, ...family.twists]);
for (const mode of SETUP_MODES) {
  if (mode === FEATURED_SETUP_MODE) continue;
  const appearances = familyModes.filter((candidate) => candidate === mode).length;
  if (appearances !== 1) {
    fail(`Setup mode ${mode} appears ${appearances} times in MODE_FAMILIES, expected exactly 1`);
  }
}
for (const mode of familyModes) {
  if (!SETUP_MODES.includes(mode)) {
    fail(`MODE_FAMILIES lists ${mode}, which is not a setup mode`);
  }
}

const MODES: GameMode[] = [
  "flag-to-country",
  "flag-crop-to-country",
  "inverted-flag-crop-to-country",
  "shape-to-country",
  "capital-to-country",
  "country-to-capital",
  "country-to-flag",
  "inverted-flag-to-country",
  "inverted-country-to-flag",
  "country-to-language",
  "neighbor-quiz",
  "population-showdown",
  "fact-to-country",
  "globe-hunt",
];

const RUNS = 200;
let questionsChecked = 0;

const SCOPE_SETUPS: { scope: GameScope; regions: Region[] }[] = [
  { scope: "world", regions: [...CONTINENTS] },
  { scope: "usa", regions: [...US_REGIONS] },
];

const TRIVIA_LEAK_STOP_WORDS = new Set([
  "the",
  "of",
  "and",
  "republic",
  "democratic",
  "people",
  "peoples",
  "kingdom",
  "state",
  "states",
  "united",
  "federation",
  "federal",
  "islamic",
  "arab",
  "emirates",
  "islands",
  "island",
  "territory",
  "territories",
  "saint",
  "south",
  "north",
  "east",
  "west",
  "central",
  "new",
  "northern",
  "southern",
  "eastern",
  "western",
  "great",
  "city",
  "independent",
  "principality",
  "commonwealth",
  "union",
  "province",
  "america",
  "american",
  "africa",
  "african",
  "asia",
  "asian",
  "europe",
  "european",
  "ocean",
  "indian",
  "lands",
  "coast",
  "ivory",
  "cape",
  "holy",
  "see",
]);

const GENERIC_TRIVIA_ALIAS_NEEDLES = new Set(["america", "usa", "u.s.", "u.s.a.", "uk", "u.k.", "drc"]);

function normalizeTriviaText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['’]/g, "")
    .toLowerCase();
}

function triviaTextHasPhrase(haystack: string, needle: string): boolean {
  if (needle.length < 4) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}

function triviaLeakNeedles(place: (typeof countries)[number]): string[] {
  const needles = new Set<string>();
  const add = (raw: string | undefined) => {
    if (!raw) return;
    const normalized = normalizeTriviaText(raw).trim();
    if (normalized.length >= 4 && !GENERIC_TRIVIA_ALIAS_NEEDLES.has(normalized)) {
      needles.add(normalized);
    }
  };

  add(place.name);
  add(place.officialName);
  add(place.capital);
  for (const alias of place.aliases ?? []) {
    add(alias);
  }
  for (const token of normalizeTriviaText(place.name).split(/[^a-z0-9]+/)) {
    if (token.length >= 5 && !TRIVIA_LEAK_STOP_WORDS.has(token)) {
      needles.add(token);
    }
  }

  return [...needles];
}

const allPlaces = [...countries, ...usStates];
for (const place of allPlaces) {
  const keywords = place.searchKeywords ?? [];
  if (keywords.length === 0) {
    fail(`${place.name}: missing library trivia search keywords`);
  }
  const normalizedKeywords = keywords.map(normalizeAnswerText);
  if (new Set(normalizedKeywords).size !== normalizedKeywords.length) {
    fail(`${place.name}: duplicate library trivia search keywords`);
  }

  const leakNeedles = triviaLeakNeedles(place);
  for (const [label, question] of [
    ["factQuestion", place.factQuestion],
    ["factQuestion2", place.factQuestion2],
  ] as const) {
    const haystack = normalizeTriviaText(question);
    const hits = leakNeedles.filter((needle) => triviaTextHasPhrase(haystack, needle));
    if (hits.length > 0) {
      fail(
        `${place.name}: ${label} names the place or its capital (${hits.join(", ")}): ${question}`,
      );
    }
  }
}

function expectLibrarySearchMatch(
  scope: GameScope,
  query: string,
  code: string,
  keyword: string,
  category: string,
): void {
  const match = searchLibraryPlaces(scope, query).find((candidate) => candidate.place.code === code);
  if (!match) {
    fail(`Library search "${query}" should return ${code}`);
    return;
  }
  if (match.keyword !== keyword || match.category !== category) {
    fail(
      `Library search "${query}" should label ${code} as ${keyword} · ${category}, got ${
        match.keyword ?? "no keyword"
      } · ${match.category ?? "no category"}`,
    );
  }
}

expectLibrarySearchMatch("world", "Havana", "CU", "Havana", "capital");
expectLibrarySearchMatch("world", "Amazon", "BR", "Amazon", "trivia");
expectLibrarySearchMatch("world", "Jesus", "BR", "Jesus", "trivia");
expectLibrarySearchMatch("world", "Redeemer", "BR", "Redeemer", "trivia");
expectLibrarySearchMatch("world", "GRU", "BR", "GRU - Guarulhos", "airport");
expectLibrarySearchMatch("world", "Guarulhos", "BR", "GRU - Guarulhos", "airport");
expectLibrarySearchMatch("world", "BRL", "BR", "BRL", "currency");
expectLibrarySearchMatch("world", "Brazilian real", "BR", "Brazilian real", "currency");
expectLibrarySearchMatch("world", "America Sao Paulo", "BR", "America/Sao_Paulo", "time zone");
expectLibrarySearchMatch("world", "red", "MX", "Red", "flag color");
expectLibrarySearchMatch("world", "bird", "MX", "Bird", "flag");
expectLibrarySearchMatch("world", "bird", "KI", "Bird", "flag");
expectLibrarySearchMatch("world", "eagle", "MX", "Eagle", "flag");
expectLibrarySearchMatch("usa", "red", "US-CA", "Red", "flag color");
expectLibrarySearchMatch("usa", "bear", "US-CA", "Bear", "flag");

const birdMatches = searchLibraryPlaces("world", "bird");
if (!birdMatches.some(({ place }) => place.code === "MX")) {
  fail('Library search "bird" should return Mexico');
}
if (!birdMatches.some(({ place }) => place.code === "KI")) {
  fail('Library search "bird" should return Kiribati');
}
if (birdMatches.some(({ place }) => place.code === "PL")) {
  fail('Library search "bird" must not return Poland’s plain civil flag');
}
if (birdMatches.some(({ place }) => place.code === "AT")) {
  fail('Library search "bird" must not return Austria’s plain civil flag');
}

const redMatches = searchLibraryPlaces("world", "red");
if (!redMatches.some(({ place }) => place.code === "MX")) {
  fail('Library search "red" should return Mexico');
}
if (redMatches.some(({ place }) => place.code === "BR")) {
  fail('Library search "red" must not return Brazil via Redeemer trivia');
}
if (redMatches.length < 50) {
  fail(`Library search "red" should return many red flags, got ${redMatches.length}`);
}

const worldGeorgia = searchLibraryPlaces("world", "Georgia");
const usaGeorgia = searchLibraryPlaces("usa", "Georgia");
if (worldGeorgia.some(({ place }) => place.code.startsWith("US-"))) {
  fail('World library search must not return US states for "Georgia"');
}
if (!worldGeorgia.some(({ place }) => place.code === "GE")) {
  fail('World library search should return Georgia for "Georgia"');
}
if (usaGeorgia.some(({ place }) => place.code === "GE")) {
  fail('USA library search must not return the country Georgia for "Georgia"');
}
if (!usaGeorgia.some(({ place }) => place.code === "US-GA")) {
  fail('USA library search should return Georgia for "Georgia"');
}
for (const query of ["Havana", "Amazon", "Jesus", "Redeemer", "GRU", "BRL", "Georgia"]) {
  for (const scope of ["world", "usa"] as const) {
    const results = searchLibraryPlaces(scope, query);
    if (new Set(results.map(({ place }) => place.code)).size !== results.length) {
      fail(`Library search "${query}" returned duplicate place codes in ${scope} scope`);
    }
  }
}

for (const { scope, regions } of SCOPE_SETUPS) {
for (const mode of MODES) {
  const isFlagPickMode = mode === "country-to-flag" || mode === "inverted-country-to-flag";
  const difficulties: ("easy" | "medium" | "hard")[] =
    isFlagPickMode || mode === "globe-hunt" ? ["easy", "medium", "hard"] : ["easy", "medium"];
  for (const difficulty of difficulties) {
    for (let run = 0; run < RUNS; run += 1) {
      const engine = new GameEngine({
        mode,
        continents: regions,
        difficulty,
        seed: run,
        questionLimit: "all",
        includeTerritories: true,
        scope,
      });
      let q: Question | null;
      while ((q = engine.nextQuestion())) {
        questionsChecked += 1;
        if (
          (mode === "flag-crop-to-country" ||
            mode === "inverted-flag-crop-to-country") &&
          (!q.flagCropOrientation ||
            !FLAG_CROP_ORIENTATIONS.includes(q.flagCropOrientation))
        ) {
          fail(`${mode}: question missing a valid randomized orientation`);
        }
        const { options, optionCodes, correctCode, countryCode, correctAnswer, mode: questionMode } = q;
        if (questionMode === "globe-hunt") {
          const place = getCountryByCode(countryCode);
          if (!place) {
            fail(`${mode}: globe-hunt target is not a known place (${countryCode})`);
          } else if (scope === "world" && place.isTerritory) {
            fail(`${mode}: globe-hunt world target cannot be a territory (${countryCode})`);
          } else if (scope === "usa" && !countryCode.startsWith("US-")) {
            fail(`${mode}: globe-hunt USA target must be a state (${countryCode})`);
          }
          if (options || optionCodes) {
            fail(`${mode}: globe-hunt questions must not include answer options`);
          }
          if (!correctCode || !engine.checkAnswer(q, correctCode, true)) {
            fail(`${mode}: globe-hunt correct code rejected for ${countryCode}`);
          }
          continue;
        }
        if (!options) {
          fail(`${mode}: question missing options`);
          continue;
        }

        if (isFlagPickMode && difficulty === "hard" && options.length !== 6) {
          fail(`${mode}: hard mode must offer 6 flag choices (got ${options.length})`);
        }
        if (isFlagPickMode && difficulty !== "hard" && options.length !== 4) {
          fail(`${mode}: easy/medium must offer 4 flag choices (got ${options.length})`);
        }

        if (questionMode === "country-to-capital" || questionMode === "country-to-language") {
          const labelKind = questionMode === "country-to-capital" ? "capital" : "language";
          if (optionCodes) {
            fail(`${mode}: ${labelKind} MC must use label selection, not optionCodes`);
            continue;
          }
          const correctIdx = options.findIndex(
            (option) => normalizeAnswerText(option) === normalizeAnswerText(correctAnswer),
          );
          if (correctIdx === -1) {
            fail(`${mode}: correct ${labelKind} not among options (${correctAnswer})`);
            continue;
          }
          const labels = options.map((option) => option.toLowerCase());
          if (new Set(labels).size !== labels.length) {
            fail(`${mode}: duplicate option labels ${options.join(" | ")}`);
          }
          for (let i = 0; i < options.length; i += 1) {
            const accepted = engine.checkAnswer(q, options[i], false);
            if (i === correctIdx && !accepted) {
              fail(`${mode}: correct pick "${options[i]}" rejected for ${countryCode}`);
            }
            if (i !== correctIdx && accepted) {
              fail(`${mode}: wrong pick "${options[i]}" accepted for ${countryCode} (${q.prompt})`);
            }
          }
          continue;
        }

        if (!optionCodes) {
          fail(`${mode}: question missing optionCodes`);
          continue;
        }
        if (options.length !== optionCodes.length) fail(`${mode}: options/codes length mismatch`);
        for (const code of optionCodes) {
          if (!getCountryByCode(code)) {
            fail(`${mode}: optionCodes must be country codes (${code})`);
          }
        }
        const target = correctCode ?? countryCode;
        const correctIdx = optionCodes.findIndex((code) => {
          const a = getCountryByCode(code);
          const b = getCountryByCode(target);
          return a && b && a.code === b.code;
        });
        if (correctIdx === -1) {
          fail(`${mode}: correct answer not among options (${target}: ${optionCodes.join(",")})`);
          continue;
        }
        if (questionMode === "neighbor-quiz") {
          const subject = getCountryByCode(countryCode);
          const borderSet = new Set(
            (subject?.borders ?? [])
              .map((code) => getCountryByCode(code)?.code)
              .filter((code): code is string => Boolean(code)),
          );
          const borderingOptions = optionCodes.filter((code) => borderSet.has(code));
          if (borderingOptions.length !== 1) {
            fail(
              `${mode}: expected exactly one bordering option for ${countryCode}, got ${
                borderingOptions.join(",") || "(none)"
              }`,
            );
          }
        }
        // duplicate-label ambiguity
        const labels = options.map((o) => o.toLowerCase());
        if (new Set(labels).size !== labels.length) {
          fail(`${mode}: duplicate option labels ${options.join(" | ")}`);
        }
        for (let i = 0; i < optionCodes.length; i += 1) {
          const accepted = engine.checkAnswer(q, optionCodes[i], true);
          if (i === correctIdx && !accepted) {
            fail(`${mode}: correct pick ${optionCodes[i]} rejected for ${target}`);
          }
          if (i !== correctIdx && accepted) {
            fail(`${mode}: wrong pick ${optionCodes[i]} accepted for ${target} (${q.prompt})`);
          }
        }
      }
    }
  }
}
}

// Type-in (hard mode) checks on name-answer modes
const nameEngine = new GameEngine({
  mode: "flag-to-country",
  continents: [...CONTINENTS],
  difficulty: "hard",
  seed: 1,
  questionLimit: "all",
  includeTerritories: true,
});
for (const c of [...countries, ...usStates].filter((x) => x.hasFlag)) {
  const q: Question = {
    id: "t",
    mode: "flag-to-country",
    countryCode: c.code,
    prompt: "",
    correctAnswer: c.name,
    correctCode: c.code,
  };
  if (!nameEngine.checkAnswer(q, c.name)) fail(`type-in: "${c.name}" rejected for itself`);
  const sameScopePool = c.code.startsWith("US-") ? usStates : countries;
  for (const other of sameScopePool) {
    if (other.code === c.code) continue;
    // Skip names that are genuine aliases of the correct country (e.g. "Taiwan")
    if (c.aliases.includes(other.name.toLowerCase())) continue;
    if (nameEngine.checkAnswer(q, other.name)) {
      fail(`type-in: "${other.name}" accepted as answer for ${c.name}`);
    }
  }
  if (c.capital) {
    const qc: Question = {
      id: "t2",
      mode: "country-to-capital",
      countryCode: c.code,
      prompt: "",
      correctAnswer: c.capital,
      correctCode: c.code,
    };
    if (!nameEngine.checkAnswer(qc, c.capital)) fail(`type-in capital: "${c.capital}" rejected for ${c.name}`);
  }
  if (c.languages?.trim()) {
    const languages = c.languages.split(" · ").map((language) => language.trim()).filter(Boolean);
    const ql: Question = {
      id: "t3",
      mode: "country-to-language",
      countryCode: c.code,
      prompt: "",
      correctAnswer: languages[0] ?? c.languages,
      correctCode: c.code,
    };
    for (const language of languages) {
      if (!nameEngine.checkAnswer(ql, language)) {
        fail(`type-in language: "${language}" rejected for ${c.name}`);
      }
    }
  }
}

// Map progress category resolution
const flagToCountryQuestion: Question = {
  id: "flag-to-country",
  mode: "flag-to-country",
  countryCode: "FR",
  prompt: "",
  correctAnswer: "France",
  correctCode: "FR",
  displayType: "flag",
};
const countryToFlagQuestion: Question = {
  id: "country-to-flag",
  mode: "country-to-flag",
  countryCode: "FR",
  prompt: "",
  correctAnswer: "FR",
  correctCode: "FR",
  displayType: "flags-grid",
};
const countryToLanguageQuestion: Question = {
  id: "country-to-language",
  mode: "country-to-language",
  countryCode: "FR",
  prompt: "",
  correctAnswer: "French",
  correctCode: "FR",
  displayType: "flag",
};

const invertedFlagToCountryQuestion: Question = {
  id: "inverted-flag-to-country",
  mode: "inverted-flag-to-country",
  countryCode: "FR",
  prompt: "",
  correctAnswer: "France",
  correctCode: "FR",
  displayType: "flag",
};

const invertedFlagCropToCountryQuestion: Question = {
  id: "inverted-flag-crop-to-country",
  mode: "inverted-flag-crop-to-country",
  countryCode: "FR",
  prompt: "",
  correctAnswer: "France",
  correctCode: "FR",
  displayType: "flag-crop",
  flagCropOrientation: "mirrored",
};

if (resolveMapProgressCategory(flagToCountryQuestion) !== "flag") {
  fail("Countries from flags should count toward Flag map progress");
}
if (resolveMapProgressCategory(countryToFlagQuestion) !== "flag") {
  fail("Flags from countries should count toward Flag map progress");
}
if (resolveMapProgressCategory(countryToFlagQuestion, "country-to-flag") !== "flag") {
  fail("Flags from countries stats mode should count toward Flag map progress");
}
if (resolveMapProgressCategory(invertedFlagToCountryQuestion) !== "flag") {
  fail("Countries from inverted flags should count toward Flag map progress");
}
if (resolveMapProgressCategory(invertedFlagCropToCountryQuestion) !== "flag") {
  fail("Inverted Flag Close-Up should count toward Flag map progress");
}
if (resolveMapProgressCategory(countryToLanguageQuestion) !== null) {
  fail("Languages from countries should not count toward map progress");
}
if (modeCountsTowardMapProgress("country-to-language")) {
  fail("Languages from countries should not show a Mastery chip");
}

if (
  !wouldCountTowardMapProgress({
    question: flagToCountryQuestion,
    statsMode: "flag-to-country",
    difficulty: "medium",
    correct: true,
  })
) {
  fail("Correct Normal answers with a map category should count toward map progress");
}
if (
  wouldCountTowardMapProgress({
    question: flagToCountryQuestion,
    statsMode: "flag-to-country",
    difficulty: "easy",
    correct: true,
  })
) {
  fail("Easy difficulty should not count toward map progress");
}
if (
  wouldCountTowardMapProgress({
    question: flagToCountryQuestion,
    statsMode: "flag-to-country",
    difficulty: "medium",
    correct: true,
    isPracticeMode: true,
  })
) {
  fail("Practice mode should not count toward map progress");
}
if (!modeCountsTowardMapProgress("mixed") || !modeCountsTowardMapProgress("flag-to-country")) {
  fail("Mixed and category modes should show as counting toward map mastery");
}
if (
  modeCountsTowardMapProgress("weak-spots") ||
  modeCountsTowardMapProgress("atlasle") ||
  modeCountsTowardMapProgress("globe-hunt")
) {
  fail("Practice and non-category modes should not show as counting toward map mastery");
}
const globeHuntQuestion: Question = {
  id: "globe-hunt-integrity",
  mode: "globe-hunt",
  countryCode: "FR",
  prompt: "Find France on the map.",
  correctAnswer: "France",
  correctCode: "FR",
  displayType: "globe",
};
if (resolveMapProgressCategory(globeHuntQuestion) !== null) {
  fail("Globe Hunt should not resolve to a map mastery category");
}
if (
  wouldCountTowardMapProgress({
    question: globeHuntQuestion,
    statsMode: "globe-hunt",
    difficulty: "hard",
    correct: true,
  })
) {
  fail("Globe Hunt answers should not count toward map progress");
}

console.log(`Checked ${questionsChecked} generated questions across ${MODES.length} modes.`);
console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
