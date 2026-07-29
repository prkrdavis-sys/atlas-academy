"use client";

import { useCallback, useEffect, useState } from "react";
import type { MapProgressDifficulty } from "@/lib/types";

const STORAGE_KEY = "atlas-academy-map-progress-difficulty";
/** Custom event so home, map, and stats stay in sync when the toggle flips. */
const CHANGE_EVENT = "atlas-academy-map-progress-difficulty-change";

const DEFAULT_DIFFICULTY: MapProgressDifficulty = "medium";

function normalizeDifficulty(value: string | null): MapProgressDifficulty {
  return value === "hard" ? "hard" : DEFAULT_DIFFICULTY;
}

export function getStoredMapProgressDifficulty(): MapProgressDifficulty {
  if (typeof window === "undefined") return DEFAULT_DIFFICULTY;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    localStorage.setItem(STORAGE_KEY, DEFAULT_DIFFICULTY);
    return DEFAULT_DIFFICULTY;
  }
  return normalizeDifficulty(stored);
}

/**
 * Device-wide preference for which map-progress track (Normal vs Hard) to show
 * on the home globe, map page, and stats. Persisted in localStorage and synced
 * across components (and tabs) so every surface agrees.
 */
export function useMapProgressDifficulty(): {
  mapDifficulty: MapProgressDifficulty;
  setMapDifficulty: (difficulty: MapProgressDifficulty) => void;
} {
  const [mapDifficulty, setMapDifficultyState] =
    useState<MapProgressDifficulty>(DEFAULT_DIFFICULTY);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMapDifficultyState(getStoredMapProgressDifficulty());

    const onChange = () => setMapDifficultyState(getStoredMapProgressDifficulty());
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

  const setMapDifficulty = useCallback((difficulty: MapProgressDifficulty) => {
    localStorage.setItem(STORAGE_KEY, difficulty);
    setMapDifficultyState(difficulty);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { mapDifficulty, setMapDifficulty };
}
