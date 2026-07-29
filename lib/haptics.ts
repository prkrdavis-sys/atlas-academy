import type { Profile } from "@/lib/types";
import { STREAK_SNUFF_MIN } from "@/lib/streak-tier";

/**
 * Kind-based haptic feedback for answer grading.
 *
 * Web backend uses navigator.vibrate (Android Chrome/Firefox/Edge). iOS Safari
 * does not support the Vibration API — when wrapping in Capacitor/Expo later,
 * replace the body of triggerHaptic with platform Impact/Notification haptics
 * without changing call sites.
 */
export type HapticKind = "correct" | "incorrect";

export type TriggerHapticOptions = {
  /** Prior streak length when a miss ends a run — uses a stronger fail pattern. */
  lostStreak?: number;
};

/** Vibration pattern: on-ms, off-ms, on-ms, … */
const PATTERNS: Record<HapticKind, number[]> = {
  correct: [10, 40, 14],
  incorrect: [28],
};

const INCORRECT_LOST_STREAK_PATTERN = [35, 60, 45];

function getPattern(kind: HapticKind, options?: TriggerHapticOptions): number[] {
  if (
    kind === "incorrect" &&
    options?.lostStreak !== undefined &&
    options.lostStreak >= STREAK_SNUFF_MIN
  ) {
    return INCORRECT_LOST_STREAK_PATTERN;
  }
  return PATTERNS[kind];
}

export function isHapticsEnabled(profile: Profile | null | undefined): boolean {
  return profile?.settings?.hapticsEnabled !== false;
}

/**
 * Fire a short haptic pulse for the given feedback kind.
 * Pass the profile so the player's vibration preference is respected.
 * No-ops when unsupported or disabled.
 */
export function triggerHaptic(
  kind: HapticKind,
  profile?: Profile | null,
  options?: TriggerHapticOptions,
): void {
  if (profile !== undefined && !isHapticsEnabled(profile)) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  try {
    navigator.vibrate(getPattern(kind, options));
  } catch {
    // Some browsers throw if vibration is blocked; ignore so grading never fails.
  }
}
