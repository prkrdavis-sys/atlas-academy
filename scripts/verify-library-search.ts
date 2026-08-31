/**
 * Library search ranking and flag-attribute queries. Trivia leak needles stay
 * in verify-game-integrity.ts; this file owns search results.
 */
import { searchLibraryPlaces } from "../lib/library";
import type { GameScope } from "../lib/types";

let failures = 0;
function fail(message: string) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function expectLibrarySearchMatch(
  scope: GameScope,
  query: string,
  code: string,
  keyword: string,
  category: string,
): void {
  const match = searchLibraryPlaces(scope, query).find((candidate) => candidate.place.code === code);
  if (!match) {
    fail(`Library search "${query}" should return ${code}`);
    return;
  }
  if (match.keyword !== keyword || match.category !== category) {
    fail(
      `Library search "${query}" should label ${code} as ${keyword} · ${category}, got ${
        match.keyword ?? "no keyword"
      } · ${match.category ?? "no category"}`,
    );
  }
}

expectLibrarySearchMatch("world", "Havana", "CU", "Havana", "capital");
expectLibrarySearchMatch("world", "Amazon", "BR", "Amazon", "trivia");
expectLibrarySearchMatch("world", "Jesus", "BR", "Jesus", "trivia");
expectLibrarySearchMatch("world", "Redeemer", "BR", "Redeemer", "trivia");
expectLibrarySearchMatch("world", "GRU", "BR", "GRU - Guarulhos", "airport");
expectLibrarySearchMatch("world", "Guarulhos", "BR", "GRU - Guarulhos", "airport");
expectLibrarySearchMatch("world", "BRL", "BR", "BRL", "currency");
expectLibrarySearchMatch("world", "Brazilian real", "BR", "Brazilian real", "currency");
expectLibrarySearchMatch("world", "America Sao Paulo", "BR", "America/Sao_Paulo", "time zone");
expectLibrarySearchMatch("world", "red", "MX", "Red", "flag color");
expectLibrarySearchMatch("world", "bird", "MX", "Bird", "flag");
expectLibrarySearchMatch("world", "bird", "KI", "Bird", "flag");
expectLibrarySearchMatch("world", "eagle", "MX", "Eagle", "flag");
expectLibrarySearchMatch("usa", "red", "US-CA", "Red", "flag color");
expectLibrarySearchMatch("usa", "bear", "US-CA", "Bear", "flag");

const birdMatches = searchLibraryPlaces("world", "bird");
if (!birdMatches.some(({ place }) => place.code === "MX")) {
  fail('Library search "bird" should return Mexico');
}
if (!birdMatches.some(({ place }) => place.code === "KI")) {
  fail('Library search "bird" should return Kiribati');
}
if (birdMatches.some(({ place }) => place.code === "PL")) {
  fail('Library search "bird" must not return Poland’s plain civil flag');
}
if (birdMatches.some(({ place }) => place.code === "AT")) {
  fail('Library search "bird" must not return Austria’s plain civil flag');
}

const redMatches = searchLibraryPlaces("world", "red");
if (!redMatches.some(({ place }) => place.code === "MX")) {
  fail('Library search "red" should return Mexico');
}
if (redMatches.some(({ place }) => place.code === "BR")) {
  fail('Library search "red" must not return Brazil via Redeemer trivia');
}
if (redMatches.length < 50) {
  fail(`Library search "red" should return many red flags, got ${redMatches.length}`);
}

const worldGeorgia = searchLibraryPlaces("world", "Georgia");
const usaGeorgia = searchLibraryPlaces("usa", "Georgia");
if (worldGeorgia.some(({ place }) => place.code.startsWith("US-"))) {
  fail('World library search must not return US states for "Georgia"');
}
if (!worldGeorgia.some(({ place }) => place.code === "GE")) {
  fail('World library search should return Georgia for "Georgia"');
}
if (usaGeorgia.some(({ place }) => place.code === "GE")) {
  fail('USA library search must not return the country Georgia for "Georgia"');
}
if (!usaGeorgia.some(({ place }) => place.code === "US-GA")) {
  fail('USA library search should return Georgia for "Georgia"');
}
for (const query of ["Havana", "Amazon", "Jesus", "Redeemer", "GRU", "BRL", "Georgia"]) {
  for (const scope of ["world", "usa"] as const) {
    const results = searchLibraryPlaces(scope, query);
    if (new Set(results.map(({ place }) => place.code)).size !== results.length) {
      fail(`Library search "${query}" returned duplicate place codes in ${scope} scope`);
    }
  }
}

console.log(failures === 0 ? "Library search checks passed." : `${failures} LIBRARY SEARCH FAILURES`);
process.exit(failures === 0 ? 0 : 1);
