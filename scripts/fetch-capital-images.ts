/**
 * Downloads capital city skyline photos from Wikimedia Commons into
 * public/capitals/{code}.jpg and updates hasCapitalImage in data JSON files.
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
const USER_AGENT = "AtlasAcademy/1.0 (educational geography app)";

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
};

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
];

const COMMONS_FILE_OVERRIDES: Record<string, string> = {
  RW: "Kigali_skyline.jpg",
  TC: "Cockburn Town, Grand Turk.jpg",
  RU: "Moscow Skyline.jpg",
  SD: "Sudsky.jpg",
  "US-WV": "Charleston, West Virginia (2023).jpg",
  "US-ND": "Bismarck, North Dakota (3824855267).jpg",
};

const PREFERRED_TITLE_PATTERNS = [
  /skyline/i,
  /cityscape/i,
  /panorama/i,
  /downtown/i,
  /aerial/i,
  /night/i,
  /view of/i,
  /city hall/i,
  /harbor/i,
  /harbour/i,
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
    return [`${capital} ${name} skyline`, `${capital} ${name} downtown`];
  }

  return [`${capital} ${name} skyline`, `${capital} ${name} cityscape`];
}

function scoreImage(image: WikiImage, place: Country): number {
  const title = image.title.toLowerCase();
  const sourcePage = image.sourcePage?.toLowerCase() ?? "";
  const combined = `${title} ${sourcePage}`;
  if (EXCLUDED_TITLE_PATTERNS.some((pattern) => pattern.test(combined))) return -1;

  const capital = place.capital.toLowerCase();
  const placeName = place.name.toLowerCase();
  const capitalWords = capital.split(/\s+/).filter((word) => word.length > 3);
  const placeWords = placeName.split(/\s+/).filter((word) => word.length > 3);

  let score = 0;

  for (const pattern of PREFERRED_TITLE_PATTERNS) {
    if (pattern.test(combined)) score += 15;
  }

  if (title.includes(capital) || sourcePage.includes(capital)) score += 25;
  else if (capitalWords.some((word) => combined.includes(word))) score += 10;
  else if (image.sourcePage) score -= 20;

  if (placeWords.some((word) => combined.includes(word))) score += 20;
  if (sourcePage === placeName) score -= 25;

  const minDim = Math.min(image.width, image.height);
  const maxDim = Math.max(image.width, image.height);
  if (minDim < 300 || maxDim < 500) return -1;
  if (image.width < image.height) score -= 8;

  score += Math.min(image.width / 120, 20);
  score += Math.min(image.height / 100, 15);

  return score;
}

async function wikimediaFetch(url: string, retries = 4): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (response.status !== 429) return response;
    await sleep(2500 * (attempt + 1));
  }
  return fetch(url, { headers: { "User-Agent": USER_AGENT } });
}

async function getWikipediaPageImage(pageTitle: string): Promise<WikiImage | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: pageTitle,
    prop: "pageimages",
    piprop: "thumbnail|original",
    pithumbsize: "1400",
    format: "json",
    origin: "*",
  });

  const response = await wikimediaFetch(`https://en.wikipedia.org/w/api.php?${params}`);
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  const data = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title?: string;
          missing?: string;
          thumbnail?: { source: string; width: number; height: number };
          original?: { source: string; width: number; height: number };
        }
      >;
    };
  };

  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page || page.missing) return null;

  const source = page.original ?? page.thumbnail;
  if (!source) return null;

  return {
    title: `File:${page.title ?? pageTitle}`,
    width: "width" in source ? source.width : 1200,
    height: "height" in source ? source.height : 800,
    url: source.source,
    thumbUrl: page.thumbnail?.source,
    mime: "image/jpeg",
    sourcePage: page.title,
  };
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
    gsrlimit: "6",
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

const MIN_ACCEPT_SCORE = 30;

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

async function findBestImage(place: Country): Promise<WikiImage | null> {
  const overrideFile = COMMONS_FILE_OVERRIDES[place.code];
  if (overrideFile) {
    const overrideImage = await getCommonsFileImage(overrideFile);
    if (overrideImage) return overrideImage;
  }

  let bestScore = -1;
  let bestImage: WikiImage | null = null;

  const recordCandidate = (image: WikiImage) => {
    const score = scoreImage(image, place);
    if (score < MIN_ACCEPT_SCORE) return;
    if (score > bestScore) {
      bestScore = score;
      bestImage = image;
    }
  };

  const takeStrongMatch = (): WikiImage | null => {
    if (bestImage !== null && bestScore >= 55) return bestImage;
    return null;
  };

  for (const query of buildCommonsQueries(place)) {
    const images = await searchCommonsImages(query);
    for (const image of images) recordCandidate(image);
    const strongMatch = takeStrongMatch();
    if (strongMatch) return strongMatch;
    await sleep(300);
  }

  const titleCandidates = [
    ...buildWikipediaTitles(place),
    ...(await searchWikipediaPages(`"${place.capital}" "${place.name}"`)),
    ...(await searchWikipediaPages(`${place.capital} ${place.name}`)),
  ];

  for (const title of [...new Set(titleCandidates)]) {
    const image = await getWikipediaPageImage(title);
    if (!image) continue;
    recordCandidate(image);
    const strongMatch = takeStrongMatch();
    if (strongMatch) return strongMatch;
    await sleep(200);
  }

  return bestImage;
}

async function downloadImage(image: WikiImage, destination: string): Promise<boolean> {
  const candidates = [image.thumbUrl, image.url].filter(Boolean) as string[];

  for (const url of candidates) {
    try {
      const response = await wikimediaFetch(url);
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 15_000) continue;
      writeFileSync(destination, buffer);
      return true;
    } catch {
      continue;
    }
  }

  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
const CONCURRENCY = 3;

async function fetchPlaceImage(
  place: Country,
  index: number,
  total: number,
): Promise<string | null> {
  const destination = join(CAPITALS_DIR, `${place.code.toLowerCase()}.jpg`);
  process.stdout.write(`[${index}/${total}] ${place.code} (${place.capital})... `);

  try {
    const image = await findBestImage(place);
    if (!image) {
      console.log("no match");
      return `${place.code} (${place.capital})`;
    }

    const ok = await downloadImage(image, destination);
    if (!ok) {
      console.log("download failed");
      return `${place.code} (${place.capital})`;
    }

    const source = image.sourcePage
      ? `via ${image.sourcePage}`
      : image.title.replace(/^File:/, "");
    console.log(`ok (${source})`);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.log(`error (${message})`);
    return `${place.code} (${place.capital})`;
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
      await sleep(1200);
    }
  }
  return results;
}

async function main() {
  mkdirSync(CAPITALS_DIR, { recursive: true });

  const places = [
    ...(JSON.parse(readFileSync(COUNTRIES_PATH, "utf8")) as Country[]),
    ...(JSON.parse(readFileSync(STATES_PATH, "utf8")) as Country[]),
  ].filter((place) => place.capital.length > 0);

  const missing = places.filter(
    (place) => !existsSync(join(CAPITALS_DIR, `${place.code.toLowerCase()}.jpg`)),
  );

  console.log(`Capital images: ${places.length - missing.length}/${places.length} present`);
  console.log(`Fetching ${missing.length} missing images (${CONCURRENCY} at a time)...`);

  const results = await runInBatches(missing, CONCURRENCY, (place, index) =>
    fetchPlaceImage(place, index + 1, missing.length),
  );
  const failures = results.filter((failure): failure is string => failure !== null);

  const countryCount = updateDataFile(COUNTRIES_PATH);
  const stateCount = updateDataFile(STATES_PATH);

  console.log(`\nUpdated data: ${countryCount} countries, ${stateCount} states with capital images`);

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
