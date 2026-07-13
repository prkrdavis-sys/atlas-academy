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
import { countries, getCountryByCode } from "../lib/countries";
import { CONTINENTS, type GameMode, type Question } from "../lib/types";

let failures = 0;
function fail(message: string) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

// Asset checks
for (const c of countries) {
  if (c.hasFlag && !existsSync(join("public", "flags", `${c.code.toLowerCase()}.svg`))) {
    fail(`${c.name}: hasFlag but flag file missing`);
  }
  if (c.hasShape && !existsSync(join("public", "shapes", `${c.code3.toLowerCase()}.svg`))) {
    fail(`${c.name}: hasShape but shape file missing`);
  }
  if (c.shapeQuizEligible && !c.hasShape) fail(`${c.name}: shapeQuizEligible without shape`);
}

const MODES: GameMode[] = [
  "flag-to-country",
  "capital-to-country",
  "country-to-capital",
  "shape-to-country",
  "country-to-flag",
  "neighbor-quiz",
  "population-showdown",
];

const RUNS = 200;
let questionsChecked = 0;

for (const mode of MODES) {
  for (const difficulty of ["easy", "medium"] as const) {
    for (let run = 0; run < RUNS; run += 1) {
      const engine = new GameEngine(mode, [...CONTINENTS], difficulty, undefined, run, undefined, "all", [...CONTINENTS]);
      let q: Question | null;
      while ((q = engine.nextQuestion())) {
        questionsChecked += 1;
        const { options, optionCodes, correctCode, countryCode } = q;
        if (!options || !optionCodes) {
          fail(`${mode}: question missing options`);
          continue;
        }
        if (options.length !== optionCodes.length) fail(`${mode}: options/codes length mismatch`);
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

// Type-in (hard mode) checks on name-answer modes
const nameEngine = new GameEngine("flag-to-country", [...CONTINENTS], "hard", undefined, 1, undefined, "all", [...CONTINENTS]);
for (const c of countries.filter((x) => x.hasFlag)) {
  const q: Question = {
    id: "t",
    mode: "flag-to-country",
    countryCode: c.code,
    prompt: "",
    correctAnswer: c.name,
    correctCode: c.code,
  };
  if (!nameEngine.checkAnswer(q, c.name)) fail(`type-in: "${c.name}" rejected for itself`);
  for (const other of countries) {
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
