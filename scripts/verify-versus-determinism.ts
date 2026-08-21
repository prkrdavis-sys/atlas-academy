/**
 * Head-to-head correctness rests on one assumption: two clients that build a
 * GameEngine from the same seed and settings get byte-identical questions,
 * including multiple-choice option order. This asserts that directly.
 */
import { GameEngine } from "../lib/game-engine";
import { PLAY_MODES, normalizeRoundQuestionSetting, type GameMode } from "../lib/types";
import { getRegionsForScope } from "../lib/countries";

const QUESTION_COUNT = 10;

/**
 * `id` embeds Date.now() and is only ever used as a local React key, so it is
 * expected to differ between clients and is excluded from the comparison.
 */
function questionContent(questions: ReturnType<typeof buildRound>) {
  return JSON.stringify(
    questions.map((question) => {
      const content: Partial<Record<keyof typeof question, unknown>> = { ...question };
      delete content.id;
      return content;
    }),
  );
}

function buildRound(mode: GameMode, seed: number) {
  const engine = new GameEngine({
    mode,
    continents: [...getRegionsForScope("world")],
    difficulty: "medium",
    seed,
    questionLimit: normalizeRoundQuestionSetting(QUESTION_COUNT),
    includeTerritories: false,
    scope: "world",
    challengeModifier: "none",
  });

  const questions = [];
  for (let index = 0; index < QUESTION_COUNT; index += 1) {
    const question = engine.nextQuestion();
    if (!question) break;
    questions.push(question);
  }
  return questions;
}

let failures = 0;

for (const mode of PLAY_MODES) {
  const seed = 123456;
  const hostRound = buildRound(mode, seed);
  const guestRound = buildRound(mode, seed);

  const hostJson = questionContent(hostRound);
  const guestJson = questionContent(guestRound);

  if (hostRound.length !== QUESTION_COUNT) {
    console.error(`✗ ${mode}: expected ${QUESTION_COUNT} questions, got ${hostRound.length}`);
    failures += 1;
    continue;
  }

  if (hostJson !== guestJson) {
    console.error(`✗ ${mode}: same seed produced different rounds`);
    failures += 1;
    continue;
  }

  // A different seed must actually change the round, otherwise the "identical"
  // result above would be meaningless.
  const otherRound = questionContent(buildRound(mode, seed + 1));
  if (otherRound === hostJson) {
    console.error(`✗ ${mode}: a different seed produced an identical round`);
    failures += 1;
    continue;
  }

  const everyQuestionHasOptions = hostRound.every(
    (question) => (question.options?.length ?? 0) >= 2,
  );
  if (!everyQuestionHasOptions) {
    console.error(`✗ ${mode}: some questions had no multiple-choice options`);
    failures += 1;
    continue;
  }

  console.log(
    `✓ ${mode}: ${hostRound.length} identical questions, all multiple choice ` +
      `(first: "${hostRound[0]?.prompt}" → [${hostRound[0]?.options?.join(", ")}])`,
  );
}

if (failures > 0) {
  console.error(`\n${failures} mode(s) failed determinism checks.`);
  process.exit(1);
}

console.log("\nAll play modes are deterministic under a shared seed.");
