"use client";

import {
  parseBooleanFlag,
  readStoredPreference,
  serializeBooleanFlag,
  useStoredPreference,
  type StoredPreferenceOptions,
} from "@/lib/stored-preference";

const PREF = {
  key: "atlas-academy-globe-day-night",
  changeEvent: "atlas-academy-globe-day-night-change",
  defaultValue: false,
  parse: (value: string | null) => parseBooleanFlag(value, false),
  serialize: serializeBooleanFlag,
} as const satisfies StoredPreferenceOptions<boolean>;

export function getStoredGlobeDayNight(): boolean {
  return readStoredPreference(PREF);
}

/**
 * Device-wide preference for real-time day/night sunlight on the 3D globes.
 * Persisted in localStorage and synced across components (and tabs) so the
 * home and map globes always agree.
 */
export function useGlobeDayNight(): {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  ready: boolean;
} {
  const { value: enabled, setValue: setEnabled, ready } = useStoredPreference(PREF);
  return { enabled, setEnabled, ready };
}
