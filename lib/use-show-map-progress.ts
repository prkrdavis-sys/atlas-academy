"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "atlas-academy-show-map-progress";
/** Custom event so every mounted map/globe updates when the main-menu toggle flips. */
const CHANGE_EVENT = "atlas-academy-show-map-progress-change";

const DEFAULT_ENABLED = true;

function normalizeEnabled(value: string | null): boolean {
  if (value === "0" || value === "false") return false;
  if (value === "1" || value === "true") return true;
  return DEFAULT_ENABLED;
}

export function getStoredShowMapProgress(): boolean {
  if (typeof window === "undefined") return DEFAULT_ENABLED;
  return normalizeEnabled(localStorage.getItem(STORAGE_KEY));
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
  const [enabled, setEnabledState] = useState(DEFAULT_ENABLED);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabledState(getStoredShowMapProgress());
    setReady(true);

    const onChange = () => setEnabledState(getStoredShowMapProgress());
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
