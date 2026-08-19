"use client";

import { useEffect } from "react";
import { THEME_BACKGROUND } from "@/lib/theme-colors";
import { useIsDark } from "@/lib/use-is-dark";

const THEME_COLOR_META = "theme-color";
const APPLE_STATUS_BAR_META = "apple-mobile-web-app-status-bar-style";

/**
 * Rewrites every matching meta in place. `viewport.themeColor` in the root
 * layout is rendered by React, so removing those nodes would leave React with a
 * detached child and crash the next commit ("Cannot read properties of null
 * (reading 'removeChild')") — which blanked the page mid-navigation.
 */
function setMetaContent(name: string, content: string) {
  const existing = document.querySelectorAll(`meta[name="${name}"]`);
  if (existing.length > 0) {
    existing.forEach((meta) => meta.setAttribute("content", content));
    return;
  }

  const meta = document.createElement("meta");
  meta.setAttribute("name", name);
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

export function ThemeColorSync() {
  const { isDark, ready } = useIsDark();

  useEffect(() => {
    if (!ready) return;

    setMetaContent(THEME_COLOR_META, isDark ? THEME_BACKGROUND.dark : THEME_BACKGROUND.light);
    setMetaContent(APPLE_STATUS_BAR_META, isDark ? "black-translucent" : "default");
  }, [isDark, ready]);

  return null;
}
