/**
 * Integrity harness: for every country and question type, build the question
 * and assert that (a) the correct multiple-choice pick is accepted, (b) every
 * wrong pick is rejected, (c) typing the correct name/capital is accepted,
 * and (d) typing every other country's name is rejected (except legitimately
 * ambiguous cases like shared borders). Also validates flag/shape assets.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { GameEngine } from "../lib/game-engine";
import { normalizeAnswerText } from "../lib/answer-matcher";
import { countries, getCountryByCode, usStates } from "../lib/countries";
import { CONTEXT_MAP_TEMPLATES } from "../lib/context-maps";
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
  if (c.hasCapitalImage && !existsSync(join("public", "capitals", `${c.code.toLowerCase()}.jpg`))) {
    fail(`${c.name}: hasCapitalImage but capital image missing`);
  }
  if (c.shapeQuizEligible && !c.hasShape) fail(`${c.name}: shapeQuizEligible without shape`);
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
  "shape-to-country",
  "capital-to-country",
  "country-to-capital",
  "country-to-flag",
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
  const difficulties: ("easy" | "medium" | "hard")[] =
    mode === "country-to-flag" ? ["easy", "medium", "hard"] : ["easy", "medium"];
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

        if (mode === "country-to-flag" && difficulty === "hard" && options.length !== 6) {
          fail(`${mode}: hard mode must offer 6 flag choices (got ${options.length})`);
        }
        if (mode === "country-to-flag" && difficulty !== "hard" && options.length !== 4) {
          fail(`${mode}: easy/medium must offer 4 flag choices (got ${options.length})`);
        }

        if (questionMode === "country-to-capital") {
          if (optionCodes) {
            fail(`${mode}: capital MC must use label selection, not optionCodes`);
            continue;
          }
          const correctIdx = options.findIndex(
            (option) => normalizeAnswerText(option) === normalizeAnswerText(correctAnswer),
          );
          if (correctIdx === -1) {
            fail(`${mode}: correct capital not among options (${correctAnswer})`);
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
}

console.log(`Checked ${questionsChecked} generated questions across ${MODES.length} modes.`);
console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
