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

/**
 * Blocking head script so the OS status bar matches theme before first paint.
 *
 * `viewport.themeColor` in the root layout makes Next render the theme-color
 * meta as a React-owned element. Removing it here (or anywhere) would leave
 * React holding a detached node and crash the next commit with
 * "Cannot read properties of null (reading 'removeChild')", so this only ever
 * rewrites the `content` attribute in place.
 */
export const THEME_COLOR_INLINE_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var d=${JSON.stringify(THEME_BACKGROUND.dark)};var l=${JSON.stringify(THEME_BACKGROUND.light)};var dark=${resolveThemeIsDark.toString()};var isDark=dark(localStorage.getItem(k));var c=isDark?d:l;var t=document.querySelectorAll('meta[name="theme-color"]');if(t.length){t.forEach(function(m){m.setAttribute("content",c)})}else{var m=document.createElement("meta");m.setAttribute("name","theme-color");m.setAttribute("content",c);document.head.appendChild(m)}var a=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');if(a)a.setAttribute("content",isDark?"black-translucent":"default")}catch(e){}})();`;
