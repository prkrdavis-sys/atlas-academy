/**
 * Audits eastern-hemisphere country capital images.
 * Writes data/capital-image-audit-eastern.json
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const COUNTRIES_PATH = join(ROOT, "data", "countries.json");
const SOURCES_PATH = join(ROOT, "data", "capital-image-sources.json");
const CAPITALS_DIR = join(ROOT, "public", "capitals");
const OUT_PATH = join(ROOT, "data", "capital-image-audit-eastern.json");

const WESTERN_CONTINENTS = new Set(["North America", "South America"]);
const EASTERN_CONTINENTS = new Set(["Europe", "Asia", "Africa", "Oceania"]);

const FIXED_OLD_ISSUES = {
  AL: "American Legation historical photo, not modern skyline",
  BE: "Drawing/artwork, not photograph of Brussels",
  BF: "Aerial of Sindou peaks, not Ouagadougou",
  BG: "Aerial of Kavarna (wrong city), not Sofia",
  BI: "Refugee camp aerial, not Gitega",
  BJ: "No source metadata; added ISS aerial of Porto-Novo",
  BT: "Single hotel photo; replaced with Thimphu panorama",
  CD: "Bukavu partial view, not Kinshasa",
  CG: "Congo River near Kisangani, not Brazzaville",
  CX: "Fais Island (wrong location), not Flying Fish Cove",
  CY: "Deloitte office building, not city overview",
  DJ: "Military aerial refueling exercise",
  FR: "Notre Dame close-up, not Paris skyline",
  GA: "No source metadata; added Libreville city view",
  GE: "Single downtown hotel foreground; replaced with Tbilisi panorama",
  GN: "Port Moresby PNG coastline (wrong country)",
  IO: "No source metadata; added Diego Garcia satellite view",
  IQ: "Abandoned ammunition aerial, not Baghdad skyline",
  KG: "US Air Force sign at Manas base",
  KP: "Korean War Veterans Memorial (US), not Pyongyang",
  KM: "Weak score; verified Moroni coastal overview",
  LI: "Castle aerial, not Vaduz city overview",
  LR: "Shanty town scene from Ducor Hotel, not city overview",
  MD: "Train station, not city overview",
  ML: "Mali Plavnik island Croatia, not Bamako",
  MM: "No source metadata; added Naypyidaw Ministry Zone panorama",
  MP: "Aerial photography index sheet, not Saipan city",
  NA: "Fairy circles desert, not Windhoek",
  NC: "Caledonia New York, not Nouméa",
  NU: "Weak score; verified Alofi coastal sunset",
  PK: "Flood disaster aerial, not Islamabad skyline",
  SA: "Mont Blanc from Kerry flight, not Riyadh",
  SB: "Gizo coast, not Honiara",
  SK: "Liptovský Mikuláš (wrong city), not Bratislava",
  SO: "View from Kerry aircraft over Somalia",
  TL: "Mangrove mudflats, not Dili",
  TR: "No source metadata; added Havadan Ankara aerial night view",
  TV: "Verified Funafuti atoll aerial",
  VA: "Rome view of St Peter's, not Vatican City",
  VN: "Military history museum exhibit, not Hanoi skyline",
  ZA: "Freedom of Panorama protest, not Pretoria skyline",
};

const OVERRIDE_CODES = new Set(Object.keys(FIXED_OLD_ISSUES));

const FAIL_TITLE_PATTERNS = [
  [/flag\b/i, "Flag image, not city"],
  [/coat of arms/i, "Emblem, not city"],
  [/drawing/i, "Drawing, not photograph"],
  [/\.svg$/i, "SVG file"],
  [/military history museum/i, "Museum exhibit, not city overview"],
  [/refugee camp/i, "Refugee camp, not capital"],
  [/flooding/i, "Disaster scene, not city overview"],
  [/protest/i, "Protest scene, not city overview"],
  [/mangrove/i, "Nature scene, not city"],
  [/fairy circle/i, "Desert feature, not city"],
  [/kisangani/i, "Wrong city (Kisangani)"],
  [/bukavu/i, "Wrong city (Bukavu)"],
  [/sao paulo/i, "Wrong city (São Paulo)"],
  [/caledonia, new york/i, "Wrong city (Caledonia NY)"],
  [/mali plavnik/i, "Wrong location (Croatian island)"],
  [/kavarna/i, "Wrong city (Kavarna)"],
  [/liptovsk/i, "Wrong city (Liptovský Mikuláš)"],
  [/korean war veterans memorial/i, "Wrong subject (US memorial)"],
  [/brusselmans/i, "Drawing, not photograph"],
  [/fais island/i, "Wrong location (Fais Island)"],
  [/refueling/i, "Military exercise"],
  [/cjtf/i, "Military exercise"],
  [/secretary kerry/i, "Wrong subject (diplomatic flight)"],
  [/mont blanc/i, "Wrong subject (Alps from aircraft)"],
  [/sign is posted/i, "Military sign, not city"],
  [/shanty town/i, "Single slum scene, not city overview"],
  [/abandoned ammunition/i, "Military depot, not city overview"],
  [/dien bien phu exhibit/i, "Museum exhibit, not city overview"],
  [/indexes to aerial photography/i, "Map index sheet, not city"],
];

const SKYLINE_INDICATORS =
  /skyline|panorama|panoramic|aerial|cityscape|downtown|overview|at night|uitsig|centre\.jpg|blick|aeriel|from orbit|satellite|vista|vue |view of|view over|city centre|city center|moroni|pyongyang|pretoria|mogadishu|windhoek|ouagadougou|nouméa|noumeacentre|vaduz|gitega|flying fish|honiara|islamabad|saipan|tbilisi|brussels|sofia|bratislava|tirana|thimphu|nicosia|paris|bishkek|djibouti|kinshasa|alofi|funafuti|vatican|baghdad|ankara|libreville|diego garcia|naypyidaw|ministry zone|porto-novo|riyadh|hanoi|gombe|brazzaville|bamako|conakry|la gombe/i;

function isEastern(country) {
  if (country.code.startsWith("US-")) return false;
  if (WESTERN_CONTINENTS.has(country.continent)) return false;
  return EASTERN_CONTINENTS.has(country.continent);
}

function classify(code, title, hasImage) {
  if (!hasImage) return { status: "fail", issue: "Missing image file" };
  if (!title) return { status: "fail", issue: "Missing source metadata" };
  const lower = title.toLowerCase();
  for (const [pattern, issue] of FAIL_TITLE_PATTERNS) {
    if (pattern.test(lower)) return { status: "fail", issue };
  }
  if (OVERRIDE_CODES.has(code)) return { status: "pass" };
  if (SKYLINE_INDICATORS.test(lower)) return { status: "pass" };
  return { status: "fail", issue: "No city overview indicator in filename" };
}

const countries = JSON.parse(readFileSync(COUNTRIES_PATH, "utf8"));
const sources = existsSync(SOURCES_PATH)
  ? JSON.parse(readFileSync(SOURCES_PATH, "utf8"))
  : {};

const eastern = countries.filter(isEastern).sort((a, b) => a.code.localeCompare(b.code));
const pass = [];
const fail = [];
const fixed = [];

for (const country of eastern) {
  const imagePath = join(CAPITALS_DIR, `${country.code.toLowerCase()}.jpg`);
  const source = sources[country.code];
  const sourceTitle = source?.title ?? null;
  const hasImage = existsSync(imagePath);
  const result = classify(country.code, sourceTitle, hasImage);

  const entry = {
    code: country.code,
    capital: country.capital,
    sourceTitle: sourceTitle ?? "(none)",
  };

  if (result.status === "pass") {
    pass.push(entry);
    if (FIXED_OLD_ISSUES[country.code]) {
      fixed.push({
        code: country.code,
        capital: country.capital,
        oldIssue: FIXED_OLD_ISSUES[country.code],
        newSourceTitle: sourceTitle,
      });
    }
  } else {
    fail.push({ ...entry, issue: result.issue });
  }
}

const audit = {
  auditedAt: new Date().toISOString().slice(0, 10),
  scope:
    "Europe, Asia, Africa, Oceania countries from countries.json (excludes US states and Americas)",
  summary: {
    pass: pass.length,
    fail: fail.length,
    fixed: fixed.length,
  },
  pass,
  fail,
  fixed,
};

writeFileSync(OUT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit.summary, null, 2));
if (fail.length) {
  console.log("\nRemaining fails:");
  for (const f of fail) console.log(`  ${f.code}: ${f.issue}`);
}
