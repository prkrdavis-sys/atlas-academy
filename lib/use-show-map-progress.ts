"use client";

import {
  parseBooleanFlag,
  readStoredPreference,
  serializeBooleanFlag,
  useStoredPreference,
  type StoredPreferenceOptions,
} from "@/lib/stored-preference";

const PREF = {
  key: "atlas-academy-show-map-progress",
  changeEvent: "atlas-academy-show-map-progress-change",
  defaultValue: true,
  parse: (value: string | null) => parseBooleanFlag(value, true),
  serialize: serializeBooleanFlag,
} as const satisfies StoredPreferenceOptions<boolean>;

export function getStoredShowMapProgress(): boolean {
  return readStoredPreference(PREF);
}

/**
 * Device-wide preference for painting mastery progress on the globe and 2D
 * maps. When off, land shows natural texture only. Persisted in localStorage
 * and synced across components (and tabs).
 */
export function useShowMapProgress(): {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  ready: boolean;
} {
  const { value: enabled, setValue: setEnabled, ready } = useStoredPreference(PREF);
  return { enabled, setEnabled, ready };
}
