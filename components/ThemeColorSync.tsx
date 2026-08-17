"use client";

import { useEffect } from "react";
import { THEME_BACKGROUND } from "@/lib/theme-colors";
import { useIsDark } from "@/lib/use-is-dark";

const THEME_COLOR_META = "theme-color";
const APPLE_STATUS_BAR_META = "apple-mobile-web-app-status-bar-style";

function setMetaContent(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

export function ThemeColorSync() {
  const { isDark, ready } = useIsDark();

  useEffect(() => {
    if (!ready) return;

    document
      .querySelectorAll(`meta[name="${THEME_COLOR_META}"]`)
      .forEach((meta) => meta.remove());

    setMetaContent(THEME_COLOR_META, isDark ? THEME_BACKGROUND.dark : THEME_BACKGROUND.light);
    setMetaContent(APPLE_STATUS_BAR_META, isDark ? "black-translucent" : "default");
  }, [isDark, ready]);

  return null;
}
