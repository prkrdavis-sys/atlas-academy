/**
 * Shared clocks for head-to-head rounds. Both clients derive every deadline
 * from these constants plus a database timestamp, so they stay in lockstep
 * without one client having to drive the other.
 */

/** How long the slower player has once their opponent locks in a selection. */
export const ANSWER_LOCK_MS = 3000;

/** How long the learn card stays up before the next question. */
export const REVEAL_MS = 5000;

/** How long an opponent may be missing before the match is forfeited. */
export const DISCONNECT_GRACE_MS = 15000;

/** How often presence heartbeats refresh while a match is running. */
export const MATCH_PRESENCE_INTERVAL_MS = 3000;

export function secondsRemaining(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
