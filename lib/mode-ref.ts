import type { GameMode } from "@/lib/types";

export const MODE_REF_PATTERN = /\{\{mode:([a-z-]+)\}\}/g;

/** Embeds a game mode token for rich rendering in hero taglines. */
export function modeRef(mode: GameMode): string {
  return `{{mode:${mode}}}`;
}
