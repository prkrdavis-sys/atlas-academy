"use client";

import { useCallback, useEffect, useState } from "react";
import type { GlobeUsMode } from "@/lib/globe-texture";

const STORAGE_KEY = "atlas-academy-globe-us-mode";
/** Custom event so every mounted globe updates when the main-menu toggle flips. */
const CHANGE_EVENT = "atlas-academy-globe-us-mode-change";

const DEFAULT_US_MODE: GlobeUsMode = "states";

function normalizeUsMode(value: string | null): GlobeUsMode {
  return value === "country" ? "country" : DEFAULT_US_MODE;
}

export function getStoredGlobeUsMode(): GlobeUsMode {
  if (typeof window === "undefined") return DEFAULT_US_MODE;
  return normalizeUsMode(localStorage.getItem(STORAGE_KEY));
}

/**
 * Device-wide preference for rendering the USA on the 3D globes as one
 * country or as 50 individual states. Persisted in localStorage and synced
 * across components (and tabs) so the home and map globes always agree.
 */
export function useGlobeUsMode(): {
  usMode: GlobeUsMode;
  setUsMode: (mode: GlobeUsMode) => void;
  ready: boolean;
} {
  const [usMode, setUsModeState] = useState<GlobeUsMode>(DEFAULT_US_MODE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsModeState(getStoredGlobeUsMode());
    setReady(true);

    const onChange = () => setUsModeState(getStoredGlobeUsMode());
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

  const setUsMode = useCallback((mode: GlobeUsMode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    setUsModeState(mode);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { usMode, setUsMode, ready };
}
