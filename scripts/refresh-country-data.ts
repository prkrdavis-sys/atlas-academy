import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getCountryFact } from "./place-facts";
import { isSupplementalShapeCode, isCustomShapeCode, writeCustomShape, writeSupplementalShape } from "./supplemental-shapes";

type RawCountry = {
  cca2: string;
  cca3: string;
  name: { common: string; official: string };
  capital?: string[];
  region: string;
  subregion?: string;
  area: number;
  borders?: string[];
  independent?: boolean;
  status?: string;
  landlocked?: boolean;
};

// mledoze/countries no longer ships population; World Bank omits some territories.
const POPULATION_OVERRIDES: Record<string, number> = {
  ALA: 30_000,
  AIA: 15_000,
  ATA: 1_500,
  BVT: 0,
  IOT: 3_000,
  BES: 26_000,
  CXR: 1_800,
  CCK: 600,
  COK: 17_000,
  FLK: 3_500,
  GUF: 300_000,
  ATF: 400,
  GLP: 400_000,
  GGY: 63_000,
  HMD: 0,
  JEY: 100_000,
  UNK: 1_682_668,
  MTQ: 360_000,
  MYT: 320_000,
  MSR: 5_000,
  NIU: 1_600,
  NFK: 2_000,
  PCN: 50,
  REU: 870_000,
  BLM: 10_000,
  SHN: 5_600,
  SPM: 6_000,
  SGS: 30,
  SJM: 2_500,
  TWN: 23_000_000,
  TKL: 1_400,
  UMI: 300,
  VAT: 500,
  WLF: 11_000,
  ESH: 600_000,
};

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "data");
const PUBLIC_FLAGS = join(ROOT, "public", "flags");
const PUBLIC_SHAPES = join(ROOT, "public", "shapes");
const PUBLIC_CAPITALS = join(ROOT, "public", "capitals");
const FLAG_ICONS_DIR = join(ROOT, "node_modules", "flag-icons", "flags", "4x3");

const ALIAS_MAP: Record<string, string[]> = {
  US: ["usa", "u.s.a.", "u.s.", "america", "united states of america"],
  GB: ["uk", "u.k.", "britain", "great britain", "england"],
  AE: ["uae", "u.a.e."],
  CD: ["drc", "democratic republic of congo", "dr congo"],
  CG: ["republic of congo", "congo-brazzaville"],
  CI: ["ivory coast", "cote d'ivoire", "côte d'ivoire"],
  CV: ["cape verde", "cabo verde"],
  CZ: ["czechia", "czech republic"],
  FK: ["falklands", "falkland islands"],
  KR: ["south korea", "republic of korea"],
  KP: ["north korea", "dprk"],
  LA: ["laos"],
  MK: ["north macedonia", "macedonia"],
  MM: ["burma"],
  NL: ["holland", "the netherlands"],
  PS: ["palestine"],
  RU: ["russia"],
  SZ: ["eswatini", "swaziland"],
  SY: ["syria"],
  TR: ["turkiye", "turkey"],
  TW: ["taiwan"],
  TZ: ["tanzania"],
  VA: ["vatican", "vatican city"],
  VN: ["viet nam", "vietnam"],
  XK: ["kosovo"],
};

function mapContinent(region: string, subregion?: string): string {
  if (region === "Antarctic") return "Antarctica";
  if (region === "Africa") return "Africa";
  if (region === "Asia") return "Asia";
  if (region === "Europe") return "Europe";
  if (region === "Oceania") return "Oceania";
  if (region === "Americas") {
    if (subregion === "South America") return "South America";
    return "North America";
  }
  return "Asia";
}

function buildFact(code3: string, name: string): string {
  const fact = getCountryFact(code3);
  if (!fact) {
    throw new Error(`Missing curated fact for ${name} (${code3})`);
  }
  return fact;
}

async function fetchPopulationByCode3(): Promise<Map<string, number>> {
  const population = new Map<string, number>();
  let page = 1;
  let pages = 1;

  while (page <= pages) {
    const response = await fetch(
      `https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=2023&per_page=500&page=${page}`,
    );
    if (!response.ok) throw new Error("Failed to fetch World Bank population data");

    const [meta, rows] = (await response.json()) as [
      { pages: number },
      { countryiso3code?: string; value: number | null }[],
    ];
    pages = meta.pages;

    for (const row of rows ?? []) {
      const code3 = row.countryiso3code;
      if (code3?.length === 3 && row.value != null) {
        population.set(code3, row.value);
      }
    }

    page += 1;
  }

  for (const [code3, value] of Object.entries(POPULATION_OVERRIDES)) {
    population.set(code3, value);
  }

  return population;
}

async function downloadShape(code: string, code3: string): Promise<boolean> {
  const url = `https://raw.githubusercontent.com/djaiss/mapsicon/master/all/${code.toLowerCase()}/vector.svg`;
  const destination = join(PUBLIC_SHAPES, `${code3.toLowerCase()}.svg`);
  rmSync(destination, { force: true });

  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    const svg = await response.text();
    if (!svg.includes("<svg")) return false;
    writeFileSync(destination, svg);
    return true;
  } catch {
    return false;
  }
}

/** Tries mapsicon, then custom silhouettes, then @svg-maps/world fallbacks. */
async function resolveCountryShape(code: string, code3: string): Promise<boolean> {
  if (isCustomShapeCode(code)) {
    return writeCustomShape(code, code3, PUBLIC_SHAPES);
  }

  if (await downloadShape(code, code3)) return true;

  if (isSupplementalShapeCode(code)) {
    return writeSupplementalShape(code, code3, PUBLIC_SHAPES);
  }

  return false;
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(PUBLIC_FLAGS, { recursive: true });
  mkdirSync(PUBLIC_SHAPES, { recursive: true });

  const response = await fetch(
    "https://raw.githubusercontent.com/mledoze/countries/master/countries.json",
  );
  if (!response.ok) throw new Error("Failed to fetch countries.json");
  const rawCountries = (await response.json()) as RawCountry[];
  const populationByCode3 = await fetchPopulationByCode3();

  const countries = [];
  let flagCount = 0;
  let shapeCount = 0;

  for (const raw of rawCountries) {
    const code = raw.cca2.toUpperCase();
    const code3 = raw.cca3.toUpperCase();
    const capital = raw.capital?.[0] ?? "";
    const continent = mapContinent(raw.region, raw.subregion);
    const flagSrc = join(FLAG_ICONS_DIR, `${code.toLowerCase()}.svg`);
    const hasFlag = existsSync(flagSrc);

    if (hasFlag) {
      copyFileSync(flagSrc, join(PUBLIC_FLAGS, `${code.toLowerCase()}.svg`));
      flagCount += 1;
    }

    const hasShape = await resolveCountryShape(code, code3);
    if (hasShape) shapeCount += 1;

    const hasCapitalImage = existsSync(join(PUBLIC_CAPITALS, `${code.toLowerCase()}.jpg`));

    const shapeQuizEligible = hasShape;

    const area = raw.area ?? 0;

    const aliases = [
      raw.name.common.toLowerCase(),
      raw.name.official.toLowerCase(),
      ...(ALIAS_MAP[code] ?? []),
    ];

    const population = populationByCode3.get(code3) ?? 0;

    countries.push({
      code,
      code3,
      name: raw.name.common,
      officialName: raw.name.official,
      capital,
      continent,
      subregion: raw.subregion ?? "",
      population,
      area,
      borders: raw.borders ?? [],
      aliases: [...new Set(aliases)],
      shapeQuizEligible,
      hasFlag,
      hasShape,
      hasCapitalImage,
      isTerritory: raw.independent === false,
      fact: buildFact(code3, raw.name.common),
    });
  }

  countries.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(join(DATA_DIR, "countries.json"), JSON.stringify(countries, null, 2));

  console.log(`Generated ${countries.length} countries`);
  console.log(`Flags copied: ${flagCount}`);
  console.log(`Shapes downloaded: ${shapeCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
