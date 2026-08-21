"use client";

import { useCallback, useEffect, useState } from "react";

export type StoredPreferenceOptions<T> = {
  key: string;
  changeEvent: string;
  defaultValue: T;
  parse: (raw: string | null) => T;
  serialize: (value: T) => string;
  /** Write the default into localStorage the first time the key is missing. */
  persistDefault?: boolean;
  /** Skip write + broadcast when the serialized value is already stored. */
  skipIfUnchanged?: boolean;
};

export function parseBooleanFlag(value: string | null, defaultValue: boolean): boolean {
  if (value === "0" || value === "false") return false;
  if (value === "1" || value === "true") return true;
  return defaultValue;
}

export function serializeBooleanFlag(value: boolean): string {
  return value ? "1" : "0";
}

export function readStoredPreference<T>(options: StoredPreferenceOptions<T>): T {
  if (typeof window === "undefined") return options.defaultValue;
  const stored = localStorage.getItem(options.key);
  if (stored === null && options.persistDefault) {
    localStorage.setItem(options.key, options.serialize(options.defaultValue));
    return options.defaultValue;
  }
  return options.parse(stored);
}

export function writeStoredPreference<T>(
  options: StoredPreferenceOptions<T>,
  value: T,
): void {
  if (typeof window === "undefined") return;
  const serialized = options.serialize(value);
  if (options.skipIfUnchanged && localStorage.getItem(options.key) === serialized) {
    return;
  }
  localStorage.setItem(options.key, serialized);
  window.dispatchEvent(new Event(options.changeEvent));
}

export function useStoredPreference<T>(options: StoredPreferenceOptions<T>): {
  value: T;
  setValue: (value: T) => void;
  ready: boolean;
} {
  const [value, setValueState] = useState(options.defaultValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValueState(readStoredPreference(options));
    setReady(true);

    const onChange = () => setValueState(readStoredPreference(options));
    const onStorage = (event: StorageEvent) => {
      if (event.key === options.key) onChange();
    };
    window.addEventListener(options.changeEvent, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(options.changeEvent, onChange);
      window.removeEventListener("storage", onStorage);
    };
    // Module-level option objects are stable for the life of the tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setValue = useCallback((next: T) => {
    writeStoredPreference(options, next);
    setValueState(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { value, setValue, ready };
}
