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
import { resolveMapProgressCategory, wouldCountTowardMapProgress } from "../lib/map-progress";
import { normalizeAnswerText } from "../lib/answer-matcher";
import { countries, getCountryByCode, usStates } from "../lib/countries";
import { CONTEXT_MAP_TEMPLATES } from "../lib/context-maps";
import flagCropData from "../data/flag-crops.json";
import { MIN_SHAPE_VIEWBOX, shapeViewBoxTooSmall } from "./map-path-utils";
import {
  CONTINENTS,
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

const MODES: GameMode[] = [
  "flag-to-country",
  "flag-crop-to-country",
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
];

const RUNS = 200;
let questionsChecked = 0;

const SCOPE_SETUPS: { scope: GameScope; regions: Region[] }[] = [
  { scope: "world", regions: [...CONTINENTS] },
  { scope: "usa", regions: [...US_REGIONS] },
];

for (const { scope, regions } of SCOPE_SETUPS) {
for (const mode of MODES) {
  const isFlagPickMode = mode === "country-to-flag" || mode === "inverted-country-to-flag";
  const difficulties: ("easy" | "medium" | "hard")[] =
    isFlagPickMode ? ["easy", "medium", "hard"] : ["easy", "medium"];
  for (const difficulty of difficulties) {
    for (let run = 0; run < RUNS; run += 1) {
      const engine = new GameEngine(mode, regions, difficulty, undefined, run, "all", true, scope);
      let q: Question | null;
      while ((q = engine.nextQuestion())) {
        questionsChecked += 1;
        const { options, optionCodes, correctCode, countryCode, correctAnswer, mode: questionMode } = q;
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
const nameEngine = new GameEngine("flag-to-country", [...CONTINENTS], "hard", undefined, 1, "all", true);
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
if (resolveMapProgressCategory(countryToLanguageQuestion) !== "trivia") {
  fail("Languages from countries should count toward Trivia map progress");
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

console.log(`Checked ${questionsChecked} generated questions across ${MODES.length} modes.`);
console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
