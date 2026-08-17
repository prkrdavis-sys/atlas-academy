/** Page background fills — keep in sync with `--background` in globals.css. */
export const THEME_BACKGROUND = {
  light: "#f2f8f4",
  dark: "#0f172a",
} as const;

export const THEME_STORAGE_KEY = "atlas-academy-theme";

export function resolveThemeIsDark(storedTheme: string | null): boolean {
  if (storedTheme === "dark") return true;
  if (storedTheme === "light") return false;
  if (storedTheme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  // Matches ThemeProvider defaultTheme="dark".
  return true;
}

/** Blocking head script so the OS status bar matches theme before first paint. */
export const THEME_COLOR_INLINE_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var d=${JSON.stringify(THEME_BACKGROUND.dark)};var l=${JSON.stringify(THEME_BACKGROUND.light)};var dark=${resolveThemeIsDark.toString()};var isDark=dark(localStorage.getItem(k));var c=isDark?d:l;document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.remove()});var m=document.createElement("meta");m.name="theme-color";m.content=c;document.head.appendChild(m);var a=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');if(a)a.content=isDark?"black-translucent":"default"}catch(e){}})();`;
