"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "atlas-academy-globe-day-night";
/** Custom event so every mounted globe updates when the main-menu toggle flips. */
const CHANGE_EVENT = "atlas-academy-globe-day-night-change";

const DEFAULT_ENABLED = false;

function normalizeEnabled(value: string | null): boolean {
  if (value === "0" || value === "false") return false;
  if (value === "1" || value === "true") return true;
  return DEFAULT_ENABLED;
}

export function getStoredGlobeDayNight(): boolean {
  if (typeof window === "undefined") return DEFAULT_ENABLED;
  return normalizeEnabled(localStorage.getItem(STORAGE_KEY));
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
  const [enabled, setEnabledState] = useState(DEFAULT_ENABLED);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabledState(getStoredGlobeDayNight());
    setReady(true);

    const onChange = () => setEnabledState(getStoredGlobeDayNight());
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) onChange();
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    setEnabledState(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { enabled, setEnabled, ready };
}
