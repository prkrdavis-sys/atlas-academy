import { isExploreRoute, isMapRoute } from "@/lib/navigation";

export const COACH_MARKS_STORAGE_KEY = "atlas-academy-coach-marks";

export const COACH_MARK_IDS = [
  "map-nav",
  "globe-tap",
  "play-button",
  "change-setup",
  "library-nav",
  "daily-badge",
  "profile-menu",
  "friends",
  "streak-chip",
  "map-place",
  "library-search",
  "learn-card-library",
] as const;

export type CoachMarkId = (typeof COACH_MARK_IDS)[number];

export type CoachScreen = "home" | "map" | "library" | "learn-card";

export type CoachSpotlight = "full" | "center";

export type CoachMarkCopy = {
  id: CoachMarkId;
  screen: CoachScreen;
  title: string;
  body: string;
  spotlight: CoachSpotlight;
};

export const COACH_MARKS: Record<CoachMarkId, CoachMarkCopy> = {
  "map-nav": {
    id: "map-nav",
    screen: "home",
    title: "Progress map",
    body: "Your progress map lives here. Open it anytime to see what you’ve mastered.",
    spotlight: "full",
  },
  "globe-tap": {
    id: "globe-tap",
    screen: "home",
    title: "Tap the globe",
    body: "Drag to spin the planet — tap it to jump into your progress map.",
    spotlight: "center",
  },
  "play-button": {
    id: "play-button",
    screen: "home",
    title: "Play",
    body: "Start a round with your current setup.",
    spotlight: "full",
  },
  "change-setup": {
    id: "change-setup",
    screen: "home",
    title: "Change",
    body: "Change mode, difficulty, and region before you play.",
    spotlight: "full",
  },
  "library-nav": {
    id: "library-nav",
    screen: "home",
    title: "Library",
    body: "Browse every country and state — flags, facts, and more.",
    spotlight: "full",
  },
  "daily-badge": {
    id: "daily-badge",
    screen: "home",
    title: "Daily Challenge",
    body: "A new Daily Challenge every day. Tap to play today’s round.",
    spotlight: "full",
  },
  "profile-menu": {
    id: "profile-menu",
    screen: "home",
    title: "Your menu",
    body: "Stats, settings, and profile switching live here.",
    spotlight: "full",
  },
  friends: {
    id: "friends",
    screen: "home",
    title: "Friends",
    body: "Add friends and see how you stack up.",
    spotlight: "full",
  },
  "streak-chip": {
    id: "streak-chip",
    screen: "home",
    title: "Login streak",
    body: "Your login streak. Tap for this week’s calendar.",
    spotlight: "full",
  },
  "map-place": {
    id: "map-place",
    screen: "map",
    title: "Tap a place",
    body: "Tap a country or state to see your mastery and open it in Library.",
    spotlight: "center",
  },
  "library-search": {
    id: "library-search",
    screen: "library",
    title: "Search Library",
    body: "Search any country or state by name.",
    spotlight: "full",
  },
  "learn-card-library": {
    id: "learn-card-library",
    screen: "learn-card",
    title: "Keep studying",
    body: "Open this place in Library to keep studying.",
    spotlight: "full",
  },
};

/** Highest-priority unseen tip wins within a screen. */
export const COACH_MARKS_BY_SCREEN: Record<CoachScreen, readonly CoachMarkId[]> = {
  home: [
    "map-nav",
    "globe-tap",
    "play-button",
    "change-setup",
    "library-nav",
    "daily-badge",
    "profile-menu",
    "friends",
    "streak-chip",
  ],
  map: ["map-place"],
  library: ["library-search"],
  "learn-card": ["learn-card-library"],
};

const COACH_MARK_ID_SET = new Set<string>(COACH_MARK_IDS);

export function isCoachMarkId(value: string): value is CoachMarkId {
  return COACH_MARK_ID_SET.has(value);
}

export function getCoachScreen(pathname: string): CoachScreen | null {
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/profiles") ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/dev/")
  ) {
    return null;
  }

  if (pathname.startsWith("/play/setup")) return null;

  if (pathname.startsWith("/play/")) return "learn-card";

  if (isMapRoute(pathname)) return "map";

  if (isExploreRoute(pathname)) {
    return pathname === "/library" ? "library" : null;
  }

  if (pathname === "/") return "home";

  return null;
}

export function pickCoachMark(
  screen: CoachScreen,
  seen: ReadonlySet<CoachMarkId>,
  visible: ReadonlySet<CoachMarkId>,
): CoachMarkId | null {
  for (const id of COACH_MARKS_BY_SCREEN[screen]) {
    if (!seen.has(id) && visible.has(id)) return id;
  }
  return null;
}

type StoredCoachMarks = {
  seen: string[];
};

function readStoredSeen(): Set<CoachMarkId> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(COACH_MARKS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as StoredCoachMarks;
    if (!parsed || !Array.isArray(parsed.seen)) return new Set();
    return new Set(parsed.seen.filter(isCoachMarkId));
  } catch {
    return new Set();
  }
}

export function getSeenCoachMarks(): Set<CoachMarkId> {
  return readStoredSeen();
}

export function hasSeenCoachMark(id: CoachMarkId): boolean {
  return readStoredSeen().has(id);
}

export function markCoachMarkSeen(id: CoachMarkId): void {
  if (typeof window === "undefined") return;
  const seen = readStoredSeen();
  seen.add(id);
  window.localStorage.setItem(
    COACH_MARKS_STORAGE_KEY,
    JSON.stringify({ seen: [...seen] } satisfies StoredCoachMarks),
  );
}
