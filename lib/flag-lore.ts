/** Library flag-wiki copy: design, color meaning, and coat-of-arms notes. */
import flagLoreData from "@/data/flag-lore.json";

export type FlagColorMeaning = {
  name: string;
  meaning: string;
};

export type FlagLore = {
  /** Year or short date the current design was adopted. */
  adopted?: string;
  /** What the flag looks like. */
  design: string;
  /** Caption-style lore: why the flag looks this way. */
  meaning: string;
  colors: FlagColorMeaning[];
  /** Central charge, diamonds, seal, or other emblem on the flag. */
  emblem?: string;
  /** How the coat of arms relates to the flag, when that story matters. */
  coatOfArms?: string;
};

const loreByCode = new Map(
  Object.entries(flagLoreData as Record<string, FlagLore>).map(([code, lore]) => [
    code.toUpperCase(),
    lore,
  ]),
);

export function getFlagLore(code: string): FlagLore | undefined {
  return loreByCode.get(code.toUpperCase());
}
