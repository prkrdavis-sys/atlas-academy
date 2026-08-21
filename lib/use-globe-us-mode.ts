"use client";

import type { GlobeUsMode } from "@/lib/globe-texture";
import {
  readStoredPreference,
  useStoredPreference,
  type StoredPreferenceOptions,
} from "@/lib/stored-preference";

const DEFAULT_US_MODE: GlobeUsMode = "states";

const PREF = {
  key: "atlas-academy-globe-us-mode",
  changeEvent: "atlas-academy-globe-us-mode-change",
  defaultValue: DEFAULT_US_MODE,
  parse: (value: string | null): GlobeUsMode =>
    value === "country" ? "country" : DEFAULT_US_MODE,
  serialize: (value: GlobeUsMode) => value,
  persistDefault: true,
} as const satisfies StoredPreferenceOptions<GlobeUsMode>;

export function getStoredGlobeUsMode(): GlobeUsMode {
  return readStoredPreference(PREF);
}

/**
 * Device-wide preference for rendering the USA on the 3D globes as one
 * country or as 50 individual states. Persisted in localStorage and synced
 * across components (and tabs) so the home and map globes always agree.
 */
export function useGlobeUsMode(): {
  usMode: GlobeUsMode;
  setUsMode: (mode: GlobeUsMode) => void;
} {
  const { value: usMode, setValue: setUsMode } = useStoredPreference(PREF);
  return { usMode, setUsMode };
}
