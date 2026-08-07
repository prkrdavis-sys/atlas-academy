"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "atlas-academy-library-opaque";
const CHANGE_EVENT = "atlas-academy-library-opaque-change";
const DEFAULT_OPAQUE = false;

function normalizeOpaque(value: string | null): boolean {
  return value === "1" || value === "true";
}

function getStoredLibraryOpaque(): boolean {
  if (typeof window === "undefined") return DEFAULT_OPAQUE;
  return normalizeOpaque(localStorage.getItem(STORAGE_KEY));
}

/** Device-wide preference for showing the Library pane with an opaque backing. */
export function useLibraryBackground(): {
  opaque: boolean;
  setOpaque: (opaque: boolean) => void;
  ready: boolean;
} {
  const [opaque, setOpaqueState] = useState(DEFAULT_OPAQUE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpaqueState(getStoredLibraryOpaque());
    setReady(true);

    const onChange = () => setOpaqueState(getStoredLibraryOpaque());
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

  const setOpaque = useCallback((next: boolean) => {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    setOpaqueState(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { opaque, setOpaque, ready };
}
