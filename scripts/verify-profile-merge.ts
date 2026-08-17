/**
 * Cross-device profile merge: mastery, stats, and daily progress must union
 * instead of last-write-wins, so a stale computer cannot clobber a phone.
 */
import { createProfile } from "../lib/storage";
import {
  cloudProfilesNeedSave,
  mergeProfileLists,
  mergeProfileProgress,
  progressFingerprint,
} from "../lib/profile-merge";
import { emptyModeStats } from "../lib/stats-helpers";
import type { Profile } from "../lib/types";

let failures = 0;
function fail(message: string) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function expect(condition: boolean, message: string) {
  if (!condition) fail(message);
}

function profileNamed(name: string): Profile {
  return createProfile(name, { type: "color", color: "#2563eb" });
}

const phone = profileNamed("Parker");
phone.placeMapProgress = {
  FR: { medium: { flag: true } },
};
phone.stats.world["flag-to-country"].medium = {
  ...emptyModeStats(),
  totalPlayed: 12,
  totalCorrect: 10,
  bestStreak: 6,
  currentStreak: 4,
  bestGameCorrect: 8,
};
phone.achievements = ["first-correct"];
phone.dailyChallengeCompletions = ["2026-08-16"];
phone.settings.soundEnabled = false;

const computer = profileNamed("Parker");
computer.id = phone.id;
computer.placeMapProgress = {
  FR: { medium: { capital: true } },
  DE: { medium: { flag: true } },
};
computer.stats.world["flag-to-country"].medium = {
  ...emptyModeStats(),
  totalPlayed: 5,
  totalCorrect: 4,
  bestStreak: 3,
  currentStreak: 3,
  bestGameCorrect: 4,
};
computer.achievements = ["streak-5"];
computer.dailyChallengeCompletions = ["2026-08-15"];
computer.settings.soundEnabled = true;

const mergedFromComputer = mergeProfileProgress(computer, phone);

expect(
  mergedFromComputer.placeMapProgress?.FR?.medium?.flag === true &&
    mergedFromComputer.placeMapProgress?.FR?.medium?.capital === true &&
    mergedFromComputer.placeMapProgress?.DE?.medium?.flag === true,
  "place mastery should OR together across devices",
);
expect(
  mergedFromComputer.stats.world["flag-to-country"].medium.totalPlayed === 12 &&
    mergedFromComputer.stats.world["flag-to-country"].medium.totalCorrect === 10 &&
    mergedFromComputer.stats.world["flag-to-country"].medium.bestStreak === 6 &&
    mergedFromComputer.stats.world["flag-to-country"].medium.bestGameCorrect === 8,
  "stats should keep the higher cumulative totals",
);
expect(
  mergedFromComputer.stats.world["flag-to-country"].medium.currentStreak === 4,
  "current streak should come from the copy with more plays",
);
expect(
  mergedFromComputer.achievements.includes("first-correct") &&
    mergedFromComputer.achievements.includes("streak-5"),
  "achievements should union",
);
expect(
  Boolean(
    mergedFromComputer.dailyChallengeCompletions?.includes("2026-08-16") &&
      mergedFromComputer.dailyChallengeCompletions?.includes("2026-08-15"),
  ),
  "daily challenge completions should union",
);
expect(
  mergedFromComputer.settings.soundEnabled === true,
  "settings should stay on the preferred (this-device) copy",
);

const lists = mergeProfileLists([computer], [phone]);
expect(lists.length === 1 && lists[0]?.id === phone.id, "same profile id should merge into one row");
expect(
  !cloudProfilesNeedSave([phone], [structuredClone(phone)]),
  "identical cloud rows should not need another save",
);
expect(
  cloudProfilesNeedSave([mergedFromComputer], [phone]),
  "merged extras from the other device should upload",
);

const otherDeviceProfile = profileNamed("Rey");
const withNewProfile = mergeProfileLists([phone], [otherDeviceProfile]);
expect(
  withNewProfile.length === 2 && withNewProfile.some((profile) => profile.name === "Rey"),
  "a profile created on another device should appear after pull",
);

expect(
  progressFingerprint(phone) === progressFingerprint(structuredClone(phone)),
  "progress fingerprints should be stable for clones",
);

if (failures > 0) {
  console.error(`verify-profile-merge: ${failures} failure(s)`);
  process.exit(1);
}

console.log("verify-profile-merge: ok");
