/**
 * In-progress rounds must survive a tab crash or reload: validate snapshots
 * and matching so a remount resumes instead of starting a new game.
 */
import {
  buildGameResumePlayHref,
  isResumeSnapshot,
  snapshotMatchesResume,
  type GameResumeSnapshot,
} from "../lib/game-resume";
import type { Question } from "../lib/types";

let failures = 0;
function fail(message: string) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function expect(condition: boolean, message: string) {
  if (!condition) fail(message);
}

const question: Question = {
  id: "q-fr-flag",
  mode: "flag-to-country",
  countryCode: "FR",
  prompt: "Which country is this?",
  correctAnswer: "France",
  displayType: "flag",
};

const snapshot: GameResumeSnapshot = {
  version: 1,
  playHref: buildGameResumePlayHref("mixed", "world"),
  createdAt: Date.now(),
  profileId: "profile-1",
  mode: "mixed",
  challengeModifier: "none",
  continents: ["Europe"],
  scope: "world",
  includeTerritories: false,
  difficulty: "medium",
  timed: false,
  stopOnWrong: false,
  countStats: true,
  questionIndex: 4,
  roundCountryCodes: ["FR", "DE", "IT", "ES"],
  question,
  showLearnCard: true,
  streak: 12,
  endedStreak: 0,
  lastCorrect: true,
  lastSelectedAnswer: "France",
  lastSelectedCode: "FR",
  disabled: true,
  hiddenOptions: [],
  usedFiftyFifty: false,
  usedSkip: false,
  questionCount: 4,
  correctAnswers: 4,
  skippedAnswers: 0,
  hintsUsed: 0,
  timeLeft: 60,
  gameOver: false,
  sessionComplete: false,
};

expect(isResumeSnapshot(snapshot), "a full in-progress snapshot should validate");
expect(
  isResumeSnapshot(JSON.parse(JSON.stringify({ ...snapshot, showLearnCard: undefined }))),
  "learn-card-era snapshots without showLearnCard should still validate",
);
expect(
  !isResumeSnapshot({ ...snapshot, question: { prompt: "nope" } } as unknown),
  "a snapshot without a real question should be rejected",
);

expect(
  snapshotMatchesResume(snapshot, {
    mode: "mixed",
    scope: "world",
    profileId: "profile-1",
  }),
  "matching mode, scope, and profile should resume",
);
expect(
  !snapshotMatchesResume(snapshot, { mode: "flag-to-country", scope: "world" }),
  "a different mode must not steal the in-progress round",
);
expect(
  !snapshotMatchesResume(snapshot, { mode: "mixed", scope: "usa" }),
  "a different scope must not steal the in-progress round",
);
expect(
  !snapshotMatchesResume(snapshot, {
    mode: "mixed",
    scope: "world",
    profileId: "someone-else",
  }),
  "another profile must not resume this round",
);
expect(
  snapshotMatchesResume({ ...snapshot, profileId: undefined }, {
    mode: "mixed",
    scope: "world",
    profileId: "profile-1",
  }),
  "legacy snapshots without profileId should still resume for this device",
);

const stale: GameResumeSnapshot = {
  ...snapshot,
  createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
};
expect(
  !snapshotMatchesResume(stale, { mode: "mixed", scope: "world" }),
  "snapshots older than a week should not auto-resume",
);

const daily: GameResumeSnapshot = {
  ...snapshot,
  mode: "daily-challenge",
  playHref: buildGameResumePlayHref("daily-challenge", "world", "2026-08-17"),
  dailyDateKey: "2026-08-17",
};
expect(
  snapshotMatchesResume(daily, {
    mode: "daily-challenge",
    scope: "world",
    dailyDateKey: "2026-08-17",
  }),
  "today's daily challenge should resume",
);
expect(
  !snapshotMatchesResume(daily, {
    mode: "daily-challenge",
    scope: "world",
    dailyDateKey: "2026-08-16",
  }),
  "a different daily date must not resume",
);

if (failures > 0) {
  console.error(`verify-game-resume: ${failures} failure(s)`);
  process.exit(1);
}

console.log("verify-game-resume: ok");
