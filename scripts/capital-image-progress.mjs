#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const countries = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/countries.json"), "utf8"),
);
const sources = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/capital-image-sources.json"), "utf8"),
);

const eligible = countries.filter(
  (c) => c.hasCapitalImage !== false && !c.code.startsWith("US-"),
);

function isWestern(c) {
  return c.continent === "North America" || c.continent === "South America";
}

function isEastern(c) {
  return !isWestern(c) && c.continent !== "Antarctica";
}

const MANUAL_FAIL = {
  BR: "Wrong city: São Paulo not Brasília",
  NC: "Wrong place: Caledonia NY not Nouméa",
  GS: "Wrong city: Rome Georgia not King Edward Point",
  GN: "Wrong subject: PNG coastline not Conakry",
  CG: "Wrong city: Kisangani not Brazzaville",
  CD: "Wrong city: Bukavu not Kinshasa",
  ML: "Wrong place: Mali Plavnik island Croatia",
  BG: "Wrong city: Kavarna not Sofia",
  SK: "Wrong city: Liptovský Mikuláš not Bratislava",
  CK: "Wrong island: Manuae atoll not Avarua",
  FM: "Wrong place: Falalop airfield not Palikir",
  SA: "Wrong subject: Mont Blanc not Riyadh",
  BE: "Drawing not photo",
  AL: "Single building: US Legation",
  AW: "Single building: Archaeological Museum",
  BT: "Single building: Taj Tashi hotel",
  CY: "Office building focus",
  FR: "Landmark focus: Notre Dame spire",
  GE: "Hotel foreground dominates",
  JM: "Single building",
  MD: "Single building: railway station",
  LI: "Single building: Vaduz castle",
  VA: "Painting not photo",
  DJ: "Military exercise",
  KG: "Military sign/base",
  MP: "Aerial index sheet",
  PK: "Flood disaster aerial",
  NI: "Earthquake rubble",
  HT: "Earthquake damage",
  ZA: "Protest photo",
  TT: "Military maritime raid",
  TL: "Mangrove mudflats",
  NA: "Fairy circles landscape",
  BF: "Rock formations not Ouagadougou",
  BI: "Refugee camp aerial",
  CX: "Wrong island: Fais Island",
  SB: "Wrong city: Gizo not Honiara",
  SO: "Generic Somalia not Mogadishu",
  CV: "Wrong island: Fogo not Praia",
  GG: "Wrong place: St Martin Point cliffs",
  MW: "Lake Malawi from orbit not Lilongwe",
  PY: "Bridge at border not Asunción",
  EH: "Port photo not city skyline",
  NU: "Street-level small area",
  TC: "Coastal road no town overview",
  KM: "Small coastal village strip",
  DO: "Portrait/street scene not skyline",
  IN: "India Gate parade not Delhi skyline",
  EG: "Pyramids dominate",
  GH: "College of Physicians building",
  HK: "Star Ferry close-up",
  LR: "Shanty town small area",
  MV: "View from one hotel",
  MQ: "Fort Saint-Louis focus",
  PS: "Generic panorama not Ramallah",
  SJ: "Cable car not Longyearbyen",
  SC: "Nature aerial not Victoria",
  SL: "Single apartment building",
  UG: "Minibus taxi park",
  VN: "Museum exhibit not Hanoi skyline",
  BO: "Plaza with people not skyline",
  BZ: "Highway aerial not Belmopan",
  CI: "Aerial of Fresco small area",
  FO: "Single street at night",
  GW: "Whole country satellite not Bissau",
  WS: "Downed trees street not Apia",
  VI: "Harbor not city",
  BW: "Group photo not Gaborone",
};

const FAIL_PATTERNS = [
  /sao paulo/i,
  /caledonia, new york/i,
  /rome, georgia/i,
  /mali plavnik/i,
  /kavarna/i,
  /liptovsk/i,
  /kisangani/i,
  /bukavu/i,
  /fais island/i,
  /falalop|ulithi atoll/i,
  /manuae/i,
  /gizo/i,
  /mont blanc/i,
  /drawing by|sketch|lithograph/i,
  /legation at|archaeological museum|taj tashi|deloitte|notre dame.*spire|hotel iveria/i,
  /railway station|train station|vokzal/i,
  /schloss liechtenstein/i,
  /refueling exercise|indexes to aerial/i,
  /refugee camp|fairy circles|pics de sindou|mangrove|mudflats/i,
  /korean war veterans|tradewinds.*raid/i,
  /earthquake|rubble|flooding, pakistan|shanty town/i,
  /friendship bridge|downed pulu|painted building/i,
  /main street of alofi|cockburn town, grand turk/i,
  /moroni, comoros\.jpg/i,
  /port moresby.*papua/i,
  /fogo island.*cape verde/i,
  /lake malawi seen from orbit/i,
  /cable center of aerial tramway/i,
  /anne marine np/i,
  /apartment near fourah bay/i,
  /minibuses in taxi park/i,
  /young woman.*santo domingo/i,
  /college of physicians/i,
  /star ferry/i,
  /fort saint-louis/i,
  /laayoune port/i,
  /view of somalia.*secretary kerry/i,
  /whwy|belize whwy/i,
  /aerial view of fresco/i,
  /bryggjubakki street at night/i,
  /satellite image of guinea-bissau/i,
  /pair of men in downtown plaza.*sucre/i,
  /photograph of the harbor at charlotte amalie/i,
  /aerial group photo botswana/i,
];

const PASS_STRONG =
  /\b(skyline|cityscape|panorama|downtown|aerial view|aerial photo|bird.?s.?eye|from above|from the air|city view|urban view|skyline of|city skyline|downtown.*skyline|aerial.*capital|aerial.*city|view of downtown|panorama of.*city|panorama de|atoll from the airplane|funafuti atoll|kigali skyline|moscow skyline|harare skyline|pyongyang skyline|panorama.*washington|elevated view.*washington|canberra.*aerial|stockholm.*skyline|seoul.*skyline|tokyo skyline|berlin skyline|madrid.*skyline|london.*aerial|ottawa.*skyline|mexico city skyline|buenos aires.*skyline|singapore skyline|bangkok skyline|kuala lumpur.*skyline|manila skyline|jakarta skyline|dubai|doha.*skyline|abu dhabi.*panorama|tehran skyline|warsaw cityscape|prague|vienna.*skyline|budapest.*panorama|bucharest.*panorama|oslo|helsinki|copenhagen.*cityscape|dublin.*cityscape|amsterdam.*skyline|brussels.*panorama|bern skyline|zurich|geneva|rome.*skyline|milan|naples|barcelona|lisbon.*skyline|ankara|tel aviv|jerusalem|amman skyline|beirut skyline|baghdad|muscat|nairobi|dar es salaam|kampala|kigali|addis|accra.*skyline|lagos|cairo.*skyline|casablanca|rabat.*panorama|tunis|algiers.*night|pretoria|johannesburg|cape town|sydney|melbourne|auckland|wellington cityscape|suva.*aerial|honiara|nouméa|papeete|apia|nuku.*alofa|palikir|majuro.*atoll|tarawa|funafuti|male.*skyline|colombo.*skyline|dhaka.*skyline|kathmandu.*panorama|thimphu|ulaanbaatar|astana.*aerial|tashkent.*aerial|bishkek|dushanbe|ashgabat|yerevan.*skyline|baku.*skyline|tbilisi.*downtown|kyiv|minsk|vilnius|riga.*panorama|tallinn.*skyline|reykjavik.*aerial|london.*cityscape|montevideo skyline|caracas skyline|asunción skyline|managua skyline|kingston, jamaica|port of spain|santo domingo skyline|nassau.*aerial|oranjestad|marigot|philipsburg|basse-terre|fort-de-france|brasília panorama|skyline de sucre|port-au-prince.*black mountains|george town.*panoramio|little bay from above|saint-pierre harbor)\b/i;

const SUSPICIOUS =
  /moroni|alofi before|cockburn town|central station|schloss|view of st peter|archaeological museum|legation|drawing|sketch|main street|street at night|harbor at|port \(|single|building|museum|hotel|church|cathedral|fort\b|castle|memorial|monument|flag|airport|terminal|runway|airfield|military|exercise|flood|earthquake|rubble|protest|refugee|index|highway|parade|sign is|minibus|apartment near|college of physicians|star ferry|pyramids of giza|notre dame|deloitte|taj tashi|painted|shanty|mangrove|fairy circle|friendship bridge|downed|spruce|tri-motor|mont blanc|korean war|freedom of panorama|tradewinds|gizo|kisangani|bukavu|plavnik|kavarna|caledonia, new york|rome, georgia|sao paulo|fogo island|fais island|falalop|manuae|lake malawi|port moresby.*guinea|fresco|whwy|botswana bootcamp|anne marine|fourah bay|dien bien phu|secretary kerry|young woman.*santo|workers dig|flooding, pakistan|cable center|group photo botswana/i;

function loadAudit(file) {
  const p = path.join(ROOT, "data", file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function mergeAudits() {
  const pass = new Map();
  const fail = new Map();
  for (const file of [
    "capital-image-audit.json",
    "capital-image-audit-eastern.json",
    "capital-image-audit-western.json",
  ]) {
    const audit = loadAudit(file);
    if (!audit) continue;
    for (const item of audit.pass ?? []) {
      const code = typeof item === "string" ? item : item.code;
      if (eligible.some((c) => c.code === code)) {
        pass.set(code, typeof item === "string" ? { code } : item);
        fail.delete(code);
      }
    }
    for (const item of audit.fail ?? []) {
      const code = typeof item === "string" ? item : item.code;
      if (eligible.some((c) => c.code === code)) {
        fail.set(code, typeof item === "string" ? { code } : item);
        pass.delete(code);
      }
    }
    for (const item of audit.fixed ?? []) {
      if (!eligible.some((c) => c.code === item.code)) continue;
      pass.set(item.code, item);
      fail.delete(item.code);
    }
  }
  return { pass, fail };
}

function baselineClassify() {
  const pass = new Map();
  const fail = new Map();
  for (const p of eligible) {
    const src = sources[p.code]?.title || "";
    if (MANUAL_FAIL[p.code]) {
      fail.set(p.code, {
        code: p.code,
        reason: MANUAL_FAIL[p.code],
        sourceTitle: src,
      });
      continue;
    }
    let matched = false;
    for (const pat of FAIL_PATTERNS) {
      if (pat.test(src)) {
        fail.set(p.code, {
          code: p.code,
          reason: "Filename indicates poor subject",
          sourceTitle: src,
        });
        matched = true;
        break;
      }
    }
    if (matched) continue;
    if (
      PASS_STRONG.test(src) ||
      /skyline|panorama|aerial|downtown|cityscape|from the airplane|atoll from|seen from a drone|before sunset.*alofi|panorama de st denis|mata-utu seen from/i.test(
        src,
      )
    ) {
      pass.set(p.code, {
        code: p.code,
        reason: "Skyline/aerial indicator in source",
        sourceTitle: src,
      });
    } else if (SUSPICIOUS.test(src)) {
      fail.set(p.code, {
        code: p.code,
        reason: "Suspicious filename",
        sourceTitle: src,
      });
    } else {
      pass.set(p.code, {
        code: p.code,
        reason: "No strong fail indicators",
        sourceTitle: src,
      });
    }
  }
  return { pass, fail };
}

function getOverrides() {
  const fetchScript = fs.readFileSync(
    path.join(ROOT, "scripts/fetch-capital-images.ts"),
    "utf8",
  );
  const overrideMatch = fetchScript.match(
    /const COMMONS_FILE_OVERRIDES: Record<string, string> = \{([\s\S]*?)\};/,
  );
  const overrides = new Set();
  if (overrideMatch) {
    for (const m of overrideMatch[1].matchAll(/^\s+([A-Z]{2}):\s+/gm)) {
      overrides.add(m[1]);
    }
  }
  return overrides;
}

function getGitModified() {
  try {
    return execSync("git status --porcelain public/capitals/", {
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean)
      .map((l) =>
        l
          .slice(3)
          .trim()
          .replace("public/capitals/", "")
          .replace(".jpg", "")
          .toUpperCase(),
      )
      .filter((code) => !code.startsWith("US-"));
  } catch {
    return [];
  }
}

export function computeProgress() {
  const merged = mergeAudits();
  let pass = merged.pass;
  let fail = merged.fail;
  const hasEastern = fs.existsSync(
    path.join(ROOT, "data/capital-image-audit-eastern.json"),
  );
  const hasWestern = fs.existsSync(
    path.join(ROOT, "data/capital-image-audit-western.json"),
  );
  const hasHemisphereAudits = hasEastern && hasWestern;
  const hasAnyAudit = pass.size + fail.size > 0;

  if (!hasAnyAudit) {
    ({ pass, fail } = baselineClassify());
  } else if (!hasHemisphereAudits) {
    const baseline = baselineClassify();
    for (const p of eligible) {
      if (!pass.has(p.code) && !fail.has(p.code)) {
        if (baseline.pass.has(p.code)) pass.set(p.code, baseline.pass.get(p.code));
        else if (baseline.fail.has(p.code))
          fail.set(p.code, baseline.fail.get(p.code));
      }
    }
  }

  const overrides = getOverrides();
  const gitModified = getGitModified();
  const recentlyFixed = new Set([...overrides, ...gitModified]);

  for (const code of recentlyFixed) {
    if (fail.has(code)) {
      fail.delete(code);
      pass.set(code, {
        code,
        reason: "recently_fixed_via_override",
        sourceTitle: sources[code]?.title ?? "",
      });
    }
  }

  const unreviewed = eligible
    .filter((c) => !pass.has(c.code) && !fail.has(c.code))
    .map((c) => c.code);
  const passCount = pass.size;
  const failCount = fail.size;
  const total = eligible.length;

  function regionStats(filterFn) {
    const region = eligible.filter(filterFn);
    const rPass = region.filter((c) => pass.has(c.code)).length;
    const rFail = region.filter((c) => fail.has(c.code)).length;
    const rTotal = region.length;
    const rReviewed = rPass + rFail;
    return {
      total: rTotal,
      pass: rPass,
      fail: rFail,
      unreviewed: rTotal - rReviewed,
      pctReviewed:
        rReviewed > 0 ? Math.round((rPass / rReviewed) * 1000) / 10 : null,
      pctTotal: Math.round((rPass / rTotal) * 1000) / 10,
    };
  }

  let dataSource = "baseline_metadata_heuristic";
  if (hasHemisphereAudits) dataSource = "hemisphere_visual_audits";
  else if (hasAnyAudit) dataSource = "partial_audits_plus_baseline";

  return {
    timestamp: new Date().toISOString(),
    scope: "countries_only",
    excludedNoImage: ["AQ", "BV", "HM", "MO", "UM"],
    totalWithImages: total,
    pass: passCount,
    fail: failCount,
    unreviewed: unreviewed.length,
    percentages: {
      passOfReviewed:
        Math.round((passCount / (passCount + failCount)) * 1000) / 10,
      passOfTotal: Math.round((passCount / total) * 1000) / 10,
    },
    byRegion: {
      eastern: regionStats(isEastern),
      western: regionStats(isWestern),
    },
    auditFilesPresent: {
      main: fs.existsSync(path.join(ROOT, "data/capital-image-audit.json")),
      eastern: hasEastern,
      western: hasWestern,
    },
    recentlyFixedViaOverride: [...overrides].sort(),
    gitModifiedCountryImages: gitModified.sort(),
    agentsStillRunning: !hasHemisphereAudits,
    dataSource,
    notes: hasHemisphereAudits
      ? "Hemisphere visual audits complete."
      : "Awaiting eastern/western visual audit files from running agents.",
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const progress = computeProgress();
  fs.writeFileSync(
    path.join(ROOT, "data/capital-image-progress.json"),
    `${JSON.stringify(progress, null, 2)}\n`,
  );
  console.log(JSON.stringify(progress, null, 2));
}
