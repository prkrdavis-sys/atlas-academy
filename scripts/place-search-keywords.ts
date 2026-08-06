import {
  getCountryFacts,
  getStateFacts,
  type PlaceFactPair,
} from "./place-facts";

const PHRASE_CONNECTORS = new Set([
  "and",
  "at",
  "by",
  "de",
  "for",
  "from",
  "in",
  "of",
  "on",
  "the",
  "to",
  "with",
]);

const GENERIC_TITLE_WORDS = new Set([
  "A",
  "About",
  "After",
  "All",
  "An",
  "As",
  "At",
  "Before",
  "Beaches",
  "During",
  "Each",
  "Even",
  "First",
  "From",
  "Holds",
  "In",
  "It",
  "Its",
  "Locals",
  "Many",
  "More",
  "Most",
  "No",
  "Nearly",
  "One",
  "On",
  "Only",
  "Once",
  "Over",
  "Since",
  "Sits",
  "Some",
  "That",
  "The",
  "These",
  "They",
  "This",
  "There",
  "Those",
  "Two",
  "When",
  "Which",
  "With",
  "Without",
]);

/**
 * Small, intentionally curated additions for terms that are useful search
 * synonyms but do not appear verbatim in the corresponding fact.
 */
const TRIVIA_SEARCH_OVERRIDES: Record<string, string[]> = {
  ARG: ["tango"],
  ATA: ["Antarctica", "ice"],
  BRA: ["Amazon", "Christ the Redeemer", "Jesus", "Redeemer"],
  LIE: ["doubly landlocked", "landlocked"],
  MUS: ["dodo", "Seven Colored Earths"],
  MDV: ["bioluminescent plankton", "blue beaches"],
  TLS: ["independence", "tais"],
};

function isTitleWord(word: string): boolean {
  return /^\p{Lu}/u.test(word);
}

function cleanKeyword(keyword: string): string {
  return keyword
    .replace(/[’']s$/u, "")
    .replace(/^[^\p{L}\p{N}]+/gu, "")
    .replace(/[^\p{L}\p{N}]+$/gu, "")
    .trim();
}

function hasPhraseBoundary(token: string): boolean {
  return /[.,;:!?]$/u.test(token) || /[’']s$/u.test(token);
}

function addKeyword(
  keywords: Map<string, string>,
  keyword: string,
): void {
  const cleaned = cleanKeyword(keyword);
  const normalized = cleaned.toLocaleLowerCase();
  if (cleaned.length < 3 || !normalized || keywords.has(normalized)) return;
  keywords.set(normalized, cleaned);
}

function extractNamedKeywords(facts: PlaceFactPair): string[] {
  const keywords = new Map<string, string>();

  for (const { fact } of facts) {
    const tokens =
      fact.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) ?? [];

    for (let index = 0; index < tokens.length; index += 1) {
      const token = cleanKeyword(tokens[index]);
      if (
        !isTitleWord(token) ||
        GENERIC_TITLE_WORDS.has(token) ||
        token.length < 3
      ) {
        continue;
      }

      const phrase = [token];
      let nextIndex = index + 1;

      while (nextIndex < tokens.length) {
        const connector = tokens[nextIndex].toLocaleLowerCase();
        if (PHRASE_CONNECTORS.has(connector)) {
          const following = cleanKeyword(tokens[nextIndex + 1] ?? "");
          if (!isTitleWord(following)) break;
          phrase.push(tokens[nextIndex], following);
          nextIndex += 2;
          if (hasPhraseBoundary(tokens[nextIndex - 1])) break;
          continue;
        }

        const rawFollowing = tokens[nextIndex];
        const following = cleanKeyword(rawFollowing);
        if (!isTitleWord(following)) break;
        phrase.push(following);
        nextIndex += 1;
        if (hasPhraseBoundary(rawFollowing)) break;
      }

      addKeyword(keywords, phrase.join(" "));
      index = Math.max(index, nextIndex - 1);
    }
  }

  return [...keywords.values()];
}

function getSearchKeywords(
  code: string,
  facts: PlaceFactPair | undefined,
): string[] {
  const keywords = new Map<string, string>();

  for (const keyword of TRIVIA_SEARCH_OVERRIDES[code.toUpperCase()] ?? []) {
    addKeyword(keywords, keyword);
  }

  if (facts) {
    for (const keyword of extractNamedKeywords(facts)) {
      addKeyword(keywords, keyword);
    }
  }

  return [...keywords.values()];
}

export function getCountrySearchKeywords(code3: string): string[] {
  return getSearchKeywords(code3, getCountryFacts(code3));
}

export function getStateSearchKeywords(code: string): string[] {
  return getSearchKeywords(code, getStateFacts(code));
}
