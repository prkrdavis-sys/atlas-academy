const GUEST_MODE_KEY = "atlas-academy-guest";

export function isGuestModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(GUEST_MODE_KEY) === "1";
}

export function setGuestModeEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) {
    window.localStorage.setItem(GUEST_MODE_KEY, "1");
  } else {
    window.localStorage.removeItem(GUEST_MODE_KEY);
  }
}
