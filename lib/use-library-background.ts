"use client";

import {
  parseBooleanFlag,
  serializeBooleanFlag,
  useStoredPreference,
  type StoredPreferenceOptions,
} from "@/lib/stored-preference";

const PREF = {
  key: "atlas-academy-library-opaque",
  changeEvent: "atlas-academy-library-opaque-change",
  defaultValue: false,
  parse: (value: string | null) => parseBooleanFlag(value, false),
  serialize: serializeBooleanFlag,
} as const satisfies StoredPreferenceOptions<boolean>;

/**
 * Device-wide preference for showing the Library pane with an opaque backing.
 */
export function useLibraryBackground(): {
  opaque: boolean;
  setOpaque: (opaque: boolean) => void;
  ready: boolean;
} {
  const { value: opaque, setValue: setOpaque, ready } = useStoredPreference(PREF);
  return { opaque, setOpaque, ready };
}
