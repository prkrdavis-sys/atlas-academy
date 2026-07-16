export const WELCOME_SEEN_KEY = "atlas-academy-welcome-seen";

export function hasSeenWelcome(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(WELCOME_SEEN_KEY) === "1";
}

export function markWelcomeSeen(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WELCOME_SEEN_KEY, "1");
}
