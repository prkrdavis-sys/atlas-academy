"use client";

import type { MapProgressDifficulty } from "@/lib/types";
import {
  readStoredPreference,
  useStoredPreference,
  writeStoredPreference,
  type StoredPreferenceOptions,
} from "@/lib/stored-preference";

const DEFAULT_DIFFICULTY: MapProgressDifficulty = "medium";

const PREF = {
  key: "atlas-academy-map-progress-difficulty",
  changeEvent: "atlas-academy-map-progress-difficulty-change",
  defaultValue: DEFAULT_DIFFICULTY,
  parse: (value: string | null): MapProgressDifficulty =>
    value === "hard" ? "hard" : DEFAULT_DIFFICULTY,
  serialize: (value: MapProgressDifficulty) => value,
  persistDefault: true,
  skipIfUnchanged: true,
} as const satisfies StoredPreferenceOptions<MapProgressDifficulty>;

export function getStoredMapProgressDifficulty(): MapProgressDifficulty {
  return readStoredPreference(PREF);
}

/**
 * Persist which map-progress track (Normal vs Hard) the map/globe/stats should
 * show. Also used when a Normal/Hard game starts so the last played difficulty
 * is remembered automatically. No-ops when the value is already stored.
 */
export function setStoredMapProgressDifficulty(
  difficulty: MapProgressDifficulty,
): void {
  writeStoredPreference(PREF, difficulty);
}

/**
 * Device-wide preference for which map-progress track (Normal vs Hard) to show
 * on the home globe, map page, and stats. Persisted in localStorage and synced
 * across components (and tabs) so every surface agrees. Updated manually via
 * the difficulty toggle, or automatically when the player starts a Normal/Hard
 * game.
 */
export function useMapProgressDifficulty(): {
  mapDifficulty: MapProgressDifficulty;
  setMapDifficulty: (difficulty: MapProgressDifficulty) => void;
} {
  const { value: mapDifficulty, setValue: setMapDifficulty } =
    useStoredPreference(PREF);
  return { mapDifficulty, setMapDifficulty };
}
