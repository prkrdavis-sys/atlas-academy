"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export type UseIsDarkResult = {
  isDark: boolean;
  /** True once the client theme has resolved and theme-dependent colors are safe to render. */
  ready: boolean;
};

export function useIsDark(): UseIsDarkResult {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydrate after mount so theme-dependent inline colors never mismatch SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const ready = mounted && resolvedTheme !== undefined;

  return {
    ready,
    isDark: resolvedTheme === "dark",
  };
}
