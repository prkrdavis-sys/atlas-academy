/**
 * Downloads capital city skyline photos from Wikimedia Commons into
 * public/capitals/{code}.jpg and updates hasCapitalImage in data JSON files.
 *
 * Usage:
 *   npm run fetch-capital-images              # fetch missing images only
 *   npm run fetch-capital-images -- --refresh # re-fetch all capital images
 *   npm run fetch-capital-images -- --refresh --countries-only
 *   npm run fetch-capital-images -- --audit   # preview selections without downloading
 *   npm run fetch-capital-images -- --scope=states --refresh  # US state capitals only
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Country = {
  code: string;
  capital: string;
  name: string;
  hasCapitalImage?: boolean;
};

type WikiImage = {
  title: string;
  width: number;
  height: number;
  url: string;
  thumbUrl?: string;
  mime: string;
  sourcePage?: string;
};

const ROOT = process.cwd();
const CAPITALS_DIR = join(ROOT, "public", "capitals");
const COUNTRIES_PATH = join(ROOT, "data", "countries.json");
const STATES_PATH = join(ROOT, "data", "states.json");
const SOURCES_PATH = join(ROOT, "data", "capital-image-sources.json");
const USER_AGENT = "AtlasAcademy/1.0 (https://github.com/atlas-academy; educational geography app)";

const args = process.argv.slice(2);
const REFRESH = args.includes("--refresh");
const AUDIT = args.includes("--audit");
const SCOPE = args.find((arg) => arg.startsWith("--scope="))?.slice("--scope=".length);
const COUNTRIES_ONLY = args.includes("--countries-only") || SCOPE === "countries";
const STATES_ONLY = SCOPE === "states";
const CODE_FILTER = new Set(
  args
    .filter((arg) => arg.startsWith("--code="))
    .flatMap((arg) => arg.slice("--code=".length).split(",")),
);

const WIKIPEDIA_TITLE_OVERRIDES: Record<string, string[]> = {
  "US-DC": ["Washington, D.C."],
  HK: ["Victoria, Hong Kong", "Hong Kong"],
  MO: ["Macau"],
  PS: ["Ramallah", "East Jerusalem"],
  VA: ["Vatican City"],
  AQ: ["McMurdo Station"],
  BV: ["Bouvet Island"],
  HM: ["Heard Island"],
  IO: ["Diego Garcia"],
  PN: ["Adamstown, Pitcairn Islands"],
  SH: ["Jamestown, Saint Helena"],
  GS: ["King Edward Point"],
  TF: ["Port-aux-Français"],
  UM: ["Wake Island"],
  AS: ["Pago Pago"],
  AI: ["The Valley, Anguilla"],
  CX: ["Flying Fish Cove"],
  CC: ["West Island, Cocos (Keeling) Islands"],
  FK: ["Stanley, Falkland Islands"],
  GF: ["Cayenne"],
  PF: ["Papeete"],
  GD: ["St. George's, Grenada"],
  GG: ["Saint Peter Port"],
  GY: ["Georgetown, Guyana"],
  KY: ["George Town, Cayman Islands"],
  LC: ["Castries"],
  SX: ["Philipsburg, Sint Maarten"],
  TC: ["Cockburn Town", "Grand Turk Island"],
  VG: ["Road Town"],
  VI: ["Charlotte Amalie, U.S. Virgin Islands"],
  WF: ["Mata-Utu"],
  YT: ["Mamoudzou"],
  RE: ["Saint-Denis, Réunion"],
  GP: ["Basse-Terre, Guadeloupe"],
  MQ: ["Fort-de-France"],
  NC: ["Nouméa"],
  BL: ["Gustavia, Saint Barthélemy"],
  MF: ["Marigot, Saint Martin"],
  PM: ["Saint-Pierre, Saint Pierre and Miquelon"],
  GI: ["Gibraltar"],
  XK: ["Pristina"],
  TW: ["Taipei"],
  BJ: ["Porto-Novo"],
  BO: ["Sucre, Bolivia", "La Paz"],
  GA: ["Libreville"],
  GW: ["Bissau"],
  GM: ["Banjul"],
  HT: ["Port-au-Prince"],
  JM: ["Kingston, Jamaica"],
  LB: ["Beirut"],
  LY: ["Tripoli, Libya"],
  LT: ["Vilnius"],
  MC: ["Monaco"],
  MG: ["Antananarivo"],
  MP: ["Saipan"],
  NI: ["Managua"],
  NL: ["Amsterdam"],
  NO: ["Oslo"],
  PA: ["Panama City, Panama"],
  PK: ["Islamabad"],
  RU: ["Moscow"],
  RW: ["Kigali"],
  SC: ["Victoria, Seychelles"],
  SD: ["Khartoum"],
  SE: ["Stockholm"],
  SG: ["Singapore"],
  SL: ["Freetown"],
  SM: ["San Marino"],
  VC: ["Kingstown, Saint Vincent and the Grenadines"],
  "US-NH": ["Concord, New Hampshire"],
  "US-NV": ["Carson City, Nevada"],
  "US-OH": ["Columbus, Ohio"],
  "US-ND": ["Bismarck, North Dakota"],
  "US-RI": ["Providence, Rhode Island"],
  "US-TN": ["Nashville, Tennessee"],
  "US-WI": ["Madison, Wisconsin"],
  "US-WV": ["Charleston, West Virginia"],
  FO: ["Tórshavn"],
  MA: ["Rabat"],
  PG: ["Port Moresby"],
  NU: ["Alofi, Niue", "Niue"],
};

const PLACE_NAME_ALIASES: Record<string, string[]> = {
  US: ["united states", "washington", "washington d.c", "washington dc", "usa", "u.s."],
  GB: ["united kingdom", "england", "scotland", "wales", "britain", " u.k.", " uk"],
  AF: ["afghanistan", "caubul", "kabul"],
  AI: ["anguilla"],
  TC: ["turks", "caicos", "grand turk"],
  VG: ["virgin islands", "bvi", "british virgin"],
  VI: ["u.s. virgin", "us virgin", "st. thomas", "st thomas"],
};

const GENERIC_CAPITALS = new Set([
  "the valley",
  "victoria",
  "george town",
  "saint john's",
  "st. john's",
  "san jose",
  "san juan",
  "richmond",
  "springfield",
  "portland",
  "birmingham",
  "manchester",
  "alexandria",
  "tripoli",
  "beirut",
  "kingston",
  "georgetown",
  "stanley",
  "hamilton",
  "douglas",
  "charleston",
  "saint george's",
  "st. george's",
]);

const EXCLUDED_TITLE_PATTERNS = [
  /map\b/i,
  /flag\b/i,
  /coat of arms/i,
  /emblem/i,
  /logo\b/i,
  /diagram/i,
  /chart/i,
  /icon\b/i,
  /seal\b/i,
  /locator/i,
  /location map/i,
  /\.svg$/i,
  /\.djvu/i,
  /porsche/i,
  /traffic cop/i,
  /tent city/i,
  /book scan/i,
  /airline/i,
  /airlines/i,
  /stadium/i,
  /university/i,
  /motor speedway/i,
  /columbus crew/i,
  /boltfelag/i,
  /jonestown/i,
  /yandex/i,
  /mccartney/i,
  /independence park/i,
  /matthew mcconaughey/i,
  /transport in/i,
  /gambia river/i,
  /nissan skyline/i,
  /battle of/i,
  /plaque/i,
  /northernpacificdepot/i,
  /depot\.jpg/i,
  /visitor (information )?cent(er|re)/i,
  /information centre/i,
  /government (house|office|building)/i,
  /embassy/i,
  /courthouse/i,
  /parliament building/i,
  /town hall$/i,
  /city hall$/i,
  /church\b/i,
  /cathedral/i,
  /mosque/i,
  /temple\b/i,
  /monument/i,
  /statue of/i,
  /memorial$/i,
  /in front of/i,
  /water tank/i,
  /market$/i,
  /airport terminal/i,
  /interior of/i,
  /inside\./i,
  /sign is displayed/i,
  /sign outside/i,
  /\.tiff$/i,
  /\.png$/i,
  /photo-/i,
  /adviser \(/i,
  /convoy\b/i,
  /liberty ship/i,
  /wartime/i,
  /during the war/i,
  /world war/i,
  /geograph\.org\.uk/i,
  /^flag of/i,
  /\bflag of\b/i,
  /\bnational flag\b/i,
  /\bcoat of arms of\b/i,
  /\bcollage\b/i,
  /\bairport\b/i,
  /\bphotochrom\b/i,
  /\bfortress\b/i,
  /\bferry terminal\b/i,
  /scenes around/i,
  /aerial scenes around/i,
  /tri-motor airplane/i,
  /spruce budworm/i,
  /maintenance crew making/i,
  /\bveterans memorial\b/i,
  /\bpentagon\b/i,
];

// Penalize single-building photos unless a strong skyline indicator is present.
const SINGLE_BUILDING_PATTERNS = [
  /\bbuilding\b/i,
  /\boffice\b/i,
  /\bpalace\b/i,
  /\bfort\b/i,
  /\bcastle\b/i,
  /\bmuseum\b/i,
  /\blibrary\b/i,
  /\bschool\b/i,
  /\bhospital\b/i,
  /\bhotel\b/i,
  /\bresidence\b/i,
  /\bhouse\b/i,
  /\bstation\b/i,
  /\bterminal\b/i,
  /\bfacade\b/i,
  /\bentrance\b/i,
  /\bportrait\b/i,
  /\bclose-?up\b/i,
  /\binterior\b/i,
  /\broof\b/i,
  /\bwindow\b/i,
  /\bdoor\b/i,
  /\bsteps\b/i,
  /\bstatue\b/i,
  /\bheadquarters\b/i,
  /\badministration\b/i,
  /\bministry\b/i,
  /\bpresidential\b/i,
  /\bnational (assembly|parliament)\b/i,
  /\bpost office\b/i,
  /\bpolice\b/i,
  /\bfire station\b/i,
  /\bbridge\b/i,
  /\blighthouse\b/i,
  /\bclock tower\b/i,
  /\bbell tower\b/i,
  /\bview of the\b/i,
  /\bexterior of\b/i,
  /\bsingle\b/i,
];

// Manually verified skyline/aerial images where automated search is unreliable.
const COMMONS_FILE_OVERRIDES: Record<string, string> = {
  RW: "Kigali_skyline.jpg",
  RU: "Moscow Skyline.jpg",
  SD: "Sudsky.jpg",
  DZ: "At night in Algiers, Algeria.jpg",
  KP: "Pyongyang Skyline.jpg",
  KM: "Moroni, Comoros.jpg",
  NU: "Alofi before sunset.jpg",
  TV: "Tuvalu Funafuti Atoll from the Airplane.jpg",
  TC: "Cockburn Town, Grand Turk.jpg",
  US: "An elevated view S.W., Washington, D.C., panorama showing the roof tops of row houses, tree line, and United States Capitol building in the distance LCCN2016647093.jpg",
  "US-WV": "Charleston, West Virginia (2023).jpg",
  "US-NV": "2015-11-01 11 41 46 View north along Carson Street (U.S. Route 395 Business) at Musser Street in downtown Carson City, Nevada.jpg",
};

// Required for automated selection — filenames must signal a city overview.
const STRONG_SKYLINE_INDICATOR_PATTERNS = [
  /skyline/i,
  /cityscape/i,
  /panorama/i,
  /downtown/i,
  /aerial/i,
  /bird.?s.?eye/i,
  /from above/i,
  /from the air/i,
  /city view/i,
  /urban view/i,
  /overlook/i,
  /overlooking/i,
  /\bat night\b/i,
  /night view/i,
  /looking (down|across|over|toward|towards)/i,
  /seen from/i,
  /wide.?angle/i,
];

const WEAK_SKYLINE_INDICATOR_PATTERNS = [
  /waterfront/i,
  /coastline/i,
  /harbor view/i,
  /harbour view/i,
  /harbor\b/i,
  /harbour\b/i,
  /satellite/i,
  /overview/i,
  /before sunset/i,
  /\bbay from\b/i,
];

function buildWikipediaTitles(place: Country): string[] {
  if (WIKIPEDIA_TITLE_OVERRIDES[place.code]) {
    return WIKIPEDIA_TITLE_OVERRIDES[place.code];
  }

  const { capital, name } = place;
  const isState = place.code.startsWith("US-");
  const postal = isState ? place.code.slice(3) : null;

  if (isState) {
    return [
      `${capital}, ${name}`,
      `${capital}, ${postal}`,
      capital,
    ];
  }

  return [
    capital,
    `${capital}, ${name}`,
    `Capital of ${name}`,
  ];
}

function buildCommonsQueries(place: Country): string[] {
  const { capital, name } = place;
  const isState = place.code.startsWith("US-");

  if (isState) {
    return [
      `${capital} ${name} skyline`,
      `${capital} ${name} downtown`,
      `${capital} ${name} aerial`,
      `${capital} ${name} panorama`,
      `${capital} ${name} cityscape`,
      `${capital} ${name} view`,
      `${capital} main street`,
    ];
  }

  return [
    `${capital} ${name} skyline`,
    `${capital} ${name} cityscape`,
    `${capital} ${name} aerial`,
    `${capital} ${name} panorama`,
    `${capital} ${name} downtown`,
    `${capital} ${name} view`,
    `${capital} main street`,
    `${capital} bay`,
    `${name} aerial`,
    `${name} satellite`,
    `${capital} coast`,
    `${capital} before sunset`,
    `${capital} capital`,
  ];
}

function hasStrongSkylineIndicator(text: string): boolean {
  return STRONG_SKYLINE_INDICATOR_PATTERNS.some((pattern) => pattern.test(text));
}

function hasWeakSkylineIndicator(text: string): boolean {
  return WEAK_SKYLINE_INDICATOR_PATTERNS.some((pattern) => pattern.test(text));
}

function isBareCapitalFilename(title: string, place: Country): boolean {
  const fileName = title.replace(/^File:/i, "").replace(/\.[^.]+$/, "").trim().toLowerCase();
  const capital = place.capital.toLowerCase();
  const placeName = place.name.toLowerCase();

  if (fileName === capital) return true;
  if (fileName === `${capital}, ${placeName}`) return true;
  if (fileName === `${capital} ${placeName}`) return true;
  return false;
}

function placeNameMatches(combined: string, place: Country): boolean {
  const combinedLower = combined.toLowerCase();
  const placeName = place.name.toLowerCase();
  if (combinedLower.includes(placeName)) return true;

  const aliases = PLACE_NAME_ALIASES[place.code] ?? [];
  if (aliases.some((alias) => combinedLower.includes(alias))) return true;

  const placeWords = placeName.split(/\s+/).filter((word) => word.length > 3);
  if (
    placeWords.some((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(combinedLower))
  ) {
    return true;
  }

  const capital = place.capital.toLowerCase();
  if (
    combinedLower.includes(`${capital}, ${placeName}`) ||
    combinedLower.includes(`${capital} ${placeName}`)
  ) {
    return true;
  }

  if (
    !GENERIC_CAPITALS.has(capital) &&
    combinedLower.includes(capital) &&
    (hasStrongSkylineIndicator(combinedLower) || hasWeakSkylineIndicator(combinedLower))
  ) {
    return true;
  }

  return false;
}

function scoreImage(image: WikiImage, place: Country): number {
  const title = image.title.toLowerCase();
  const sourcePage = image.sourcePage?.toLowerCase() ?? "";
  const combined = `${title} ${sourcePage}`;
  if (EXCLUDED_TITLE_PATTERNS.some((pattern) => pattern.test(combined))) return -1;

  const strongSkyline = hasStrongSkylineIndicator(combined);
  const bareCapitalFilename = isBareCapitalFilename(image.title, place);
  if (bareCapitalFilename && !strongSkyline) return -1;

  if (
    !strongSkyline &&
    SINGLE_BUILDING_PATTERNS.some((pattern) => pattern.test(combined))
  ) {
    return -1;
  }

  const capital = place.capital.toLowerCase();
  const placeName = place.name.toLowerCase();
  const capitalWords = capital.split(/\s+/).filter((word) => word.length > 3);
  const placeWords = placeName.split(/\s+/).filter((word) => word.length > 3);

  let score = 0;
  const weakSkyline = hasWeakSkylineIndicator(combined);

  for (const pattern of STRONG_SKYLINE_INDICATOR_PATTERNS) {
    if (pattern.test(combined)) score += 20;
  }
  for (const pattern of WEAK_SKYLINE_INDICATOR_PATTERNS) {
    if (pattern.test(combined)) score += 8;
  }

  if (title.includes(capital) || sourcePage.includes(capital)) score += 25;
  else if (capitalWords.some((word) => combined.includes(word))) score += 10;
  else if (image.sourcePage) score -= 20;

  if (placeWords.some((word) => combined.includes(word))) score += 20;
  else score -= 45;
  if (sourcePage === placeName) score -= 25;

  const minDim = Math.min(image.width, image.height);
  const maxDim = Math.max(image.width, image.height);
  if (minDim < 300 || maxDim < 500) return -1;
  if (image.width < image.height) score -= 8;

  score += Math.min(image.width / 120, 20);
  score += Math.min(image.height / 100, 15);

  if (!strongSkyline && !weakSkyline) score -= 40;
  if (image.sourcePage && !strongSkyline && !weakSkyline) score -= 35;

  // Penalize captions that only mention the city in passing (e.g. event photos).
  const titleOnly = image.title.replace(/^File:/i, "");
  if (!strongSkyline && !weakSkyline && !titleOnly.toLowerCase().includes(capital)) {
    score -= 30;
  }

  return score;
}

function isAcceptableImage(
  image: WikiImage,
  score: number,
  place: Country,
  options: { isOverride?: boolean } = {},
): boolean {
  if (options.isOverride) return true;
  if (score === -1) return false;

  if (score < MIN_ACCEPT_SCORE) return false;

  const combined = `${image.title} ${image.sourcePage ?? ""}`;
  const fileName = image.title.replace(/^File:/i, "").toLowerCase();
  const capital = place.capital.toLowerCase();

  // Match on filename only — Wikipedia country pages attach unrelated images.
  const placeMatched =
    placeNameMatches(fileName, place) ||
    (!GENERIC_CAPITALS.has(capital) && fileName.includes(capital));
  if (!placeMatched) return false;
  if (isBareCapitalFilename(image.title, place)) return false;
  return hasStrongSkylineIndicator(combined);
}

async function wikimediaFetch(url: string, retries = 6): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (response.status === 429) {
        await sleep(8000 * (attempt + 1));
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.startsWith("image/")) {
        return response;
      }
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        if (/too many requests/i.test(text)) {
          await sleep(8000 * (attempt + 1));
          continue;
        }
      }
      return response;
    } catch {
      await sleep(8000 * (attempt + 1));
    }
  }
  throw new Error("fetch failed");
}

async function searchWikipediaPages(query: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "5",
    format: "json",
    origin: "*",
  });

  const response = await wikimediaFetch(`https://en.wikipedia.org/w/api.php?${params}`);
  if (!response.ok) return [];
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return [];

  const data = (await response.json()) as {
    query?: { search?: { title: string }[] };
  };

  return (data.query?.search ?? []).map((result) => result.title);
}

async function searchCommonsImages(query: string): Promise<WikiImage[]> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url|size|mime",
    iiurlwidth: "1400",
    format: "json",
    origin: "*",
  });

  const response = await wikimediaFetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!response.ok) return [];
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return [];

  const data = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title: string;
          imageinfo?: {
            url: string;
            thumburl?: string;
            width: number;
            height: number;
            mime: string;
          }[];
        }
      >;
    };
  };

  const images: WikiImage[] = [];
  for (const page of Object.values(data.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    if (!info?.url || !info.mime.startsWith("image/")) continue;
    images.push({
      title: page.title,
      width: info.width,
      height: info.height,
      url: info.url,
      thumbUrl: info.thumburl,
      mime: info.mime,
    });
  }

  return images;
}

const MIN_ACCEPT_SCORE = 35;

type ScoredImage = {
  image: WikiImage;
  score: number;
};

async function getCommonsFileImage(fileName: string): Promise<WikiImage | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: `File:${fileName}`,
    prop: "imageinfo",
    iiprop: "url|size|mime",
    iiurlwidth: "1400",
    format: "json",
    origin: "*",
  });

  const response = await wikimediaFetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  const data = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title: string;
          missing?: string;
          imageinfo?: {
            url: string;
            thumburl?: string;
            width: number;
            height: number;
            mime: string;
          }[];
        }
      >;
    };
  };

  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!page || page.missing || !info?.url || !info.mime.startsWith("image/")) return null;

  return {
    title: page.title,
    width: info.width,
    height: info.height,
    url: info.url,
    thumbUrl: info.thumburl,
    mime: info.mime,
  };
}

async function getWikipediaPageFileImages(pageTitle: string): Promise<WikiImage[]> {
  const params = new URLSearchParams({
    action: "query",
    titles: pageTitle,
    prop: "images",
    imlimit: "20",
    format: "json",
    origin: "*",
  });

  const response = await wikimediaFetch(`https://en.wikipedia.org/w/api.php?${params}`);
  if (!response.ok) return [];
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return [];

  const data = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title?: string;
          missing?: string;
          images?: { title: string }[];
        }
      >;
    };
  };

  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page || page.missing || !page.images) return [];

  const fileTitles = page.images
    .map((image) => image.title)
    .filter((title) => title.startsWith("File:") && /\.(jpe?g|png)$/i.test(title));

  const images: WikiImage[] = [];
  for (const fileTitle of fileTitles) {
    const fileName = fileTitle.replace(/^File:/, "");
    const image = await getCommonsFileImage(fileName);
    if (!image) continue;
    images.push({ ...image, sourcePage: page.title ?? pageTitle });
    await sleep(100);
  }

  return images;
}

async function findBestImage(place: Country): Promise<ScoredImage | null> {
  const overrideFile = COMMONS_FILE_OVERRIDES[place.code];
  if (overrideFile) {
    const overrideImage = await getCommonsFileImage(overrideFile);
    if (overrideImage) {
      const score = scoreImage(overrideImage, place);
      if (isAcceptableImage(overrideImage, score, place, { isOverride: true })) {
        return { image: overrideImage, score: Math.max(score, MIN_ACCEPT_SCORE) };
      }
    }
  }

  let bestScore = -1;
  let bestImage: WikiImage | null = null;

  const recordCandidate = (image: WikiImage) => {
    const score = scoreImage(image, place);
    if (!isAcceptableImage(image, score, place)) return;
    if (score > bestScore) {
      bestScore = score;
      bestImage = image;
    }
  };

  const takeStrongMatch = (): ScoredImage | null => {
    if (bestImage !== null && bestScore >= 55) {
      return { image: bestImage, score: bestScore };
    }
    return null;
  };

  for (const query of buildCommonsQueries(place)) {
    const images = await searchCommonsImages(query);
    for (const image of images) recordCandidate(image);
    const strongMatch = takeStrongMatch();
    if (strongMatch) return strongMatch;
    await sleep(500);
  }

  const titleCandidates = [
    ...buildWikipediaTitles(place),
    ...(await searchWikipediaPages(`"${place.capital}" "${place.name}"`)),
    ...(await searchWikipediaPages(`${place.capital} ${place.name}`)),
  ];

  for (const title of [...new Set(titleCandidates)]) {
    const pageImages = await getWikipediaPageFileImages(title);
    for (const image of pageImages) recordCandidate(image);
    const strongMatch = takeStrongMatch();
    if (strongMatch) return strongMatch;
    await sleep(200);
  }

  if (bestImage === null) return null;
  return { image: bestImage, score: bestScore };
}

async function downloadImage(image: WikiImage, destination: string): Promise<boolean> {
  const candidates = [image.thumbUrl, image.url].filter(Boolean) as string[];

  for (const url of candidates) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const response = await wikimediaFetch(url);
        if (!response.ok) {
          await sleep(5000 * (attempt + 1));
          continue;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length < 15_000) {
          await sleep(2000);
          continue;
        }
        writeFileSync(destination, buffer);
        return true;
      } catch {
        await sleep(5000 * (attempt + 1));
      }
    }
  }

  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isStatePlace(place: Country): boolean {
  return place.code.startsWith("US-");
}

function updateDataFile(path: string) {
  const places = JSON.parse(readFileSync(path, "utf8")) as Country[];
  let count = 0;

  for (const place of places) {
    if (!place.capital) {
      place.hasCapitalImage = false;
      continue;
    }
    const imagePath = join(CAPITALS_DIR, `${place.code.toLowerCase()}.jpg`);
    place.hasCapitalImage = existsSync(imagePath);
    if (place.hasCapitalImage) count += 1;
  }

  writeFileSync(path, `${JSON.stringify(places, null, 2)}\n`);
  return count;
}
const CONCURRENCY = 1;

async function fetchPlaceImage(
  place: Country,
  index: number,
  total: number,
): Promise<{ failure: string | null; source: { code: string; title: string; score: number } | null }> {
  const destination = join(CAPITALS_DIR, `${place.code.toLowerCase()}.jpg`);
  process.stdout.write(`[${index}/${total}] ${place.code} (${place.capital})... `);

  try {
    const result = await findBestImage(place);
    if (!result) {
      console.log("no match");
      return { failure: `${place.code} (${place.capital})`, source: null };
    }

    const { image, score } = result;
    const sourceTitle = image.title.replace(/^File:/, "");

    if (AUDIT) {
      console.log(`would use ${sourceTitle} (score ${score})`);
      return {
        failure: null,
        source: { code: place.code, title: sourceTitle, score },
      };
    }

    const ok = await downloadImage(image, destination);
    if (!ok) {
      console.log("download failed");
      return { failure: `${place.code} (${place.capital})`, source: null };
    }

    const source = image.sourcePage
      ? `via ${image.sourcePage}`
      : sourceTitle;
    console.log(`ok (${source})`);
    return {
      failure: null,
      source: { code: place.code, title: sourceTitle, score },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.log(`error (${message})`);
    return { failure: `${place.code} (${place.capital})`, source: null };
  }
}

async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, offset) => worker(item, start + offset)),
    );
    results.push(...batchResults);
    if (start + batchSize < items.length) {
      await sleep(REFRESH || !AUDIT ? 8000 : 2000);
    }
  }
  return results;
}

async function main() {
  mkdirSync(CAPITALS_DIR, { recursive: true });

  const countries = STATES_ONLY
    ? []
    : (JSON.parse(readFileSync(COUNTRIES_PATH, "utf8")) as Country[]);
  const states = COUNTRIES_ONLY
    ? []
    : (JSON.parse(readFileSync(STATES_PATH, "utf8")) as Country[]);
  const places = [...countries, ...states].filter((place) => place.capital.length > 0);

  const filteredPlaces =
    CODE_FILTER.size > 0
      ? places.filter((place) => CODE_FILTER.has(place.code))
      : places;

  const targets = REFRESH || AUDIT
    ? filteredPlaces
    : filteredPlaces.filter(
        (place) => !existsSync(join(CAPITALS_DIR, `${place.code.toLowerCase()}.jpg`)),
      );

  const mode = AUDIT ? "Auditing" : REFRESH ? "Refreshing" : "Fetching";
  const scope = STATES_ONLY ? "states" : COUNTRIES_ONLY ? "countries" : "countries and states";
  console.log(`Capital images: ${places.length - targets.length}/${places.length} already present`);
  console.log(`${mode} ${targets.length} ${scope} (${CONCURRENCY} at a time)...`);

  const existingSources = existsSync(SOURCES_PATH)
    ? (JSON.parse(readFileSync(SOURCES_PATH, "utf8")) as Record<
        string,
        { title: string; score: number }
      >)
    : {};

  const results = await runInBatches(targets, CONCURRENCY, (place, index) =>
    fetchPlaceImage(place, index + 1, targets.length),
  );
  const failures = results
    .map((result) => result.failure)
    .filter((failure): failure is string => failure !== null);

  const sources = { ...existingSources };
  for (const result of results) {
    if (!result.source) continue;
    sources[result.source.code] = {
      title: result.source.title,
      score: result.source.score,
    };
  }

  if (!AUDIT) {
    writeFileSync(SOURCES_PATH, `${JSON.stringify(sources, null, 2)}\n`);
    if (STATES_ONLY) {
      const stateCount = updateDataFile(STATES_PATH);
      console.log(`\nUpdated data: ${stateCount} states with capital images`);
    } else if (COUNTRIES_ONLY) {
      const countryCount = updateDataFile(COUNTRIES_PATH);
      console.log(`\nUpdated data: ${countryCount} countries with capital images`);
    } else {
      const countryCount = updateDataFile(COUNTRIES_PATH);
      const stateCount = updateDataFile(STATES_PATH);
      console.log(`\nUpdated data: ${countryCount} countries, ${stateCount} states with capital images`);
    }
    console.log(`Saved image sources to ${SOURCES_PATH}`);
  }

  if (failures.length > 0) {
    console.log(`\nFailed to fetch ${failures.length} images:`);
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
