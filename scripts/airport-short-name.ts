/**
 * Derive a short airport label for library chips (e.g. Dulles, Heathrow, O'Hare).
 * Used when generating data/airport-short-names.json from OurAirports.
 */

const SUFFIX_RE =
  /\s+(?:International|Intl\.?|Regional|Municipal|National|Domestic|City|Metropolitan)?\s*(?:Airport|Aerodrome|Airfield|Air Base|Airstrip|Jetport|Sunport|Terminal)(?:\s*\/.*)?$/i;

const MULTIWORD_START =
  /^(El|La|Le|Les|Los|Las|The|Saint|St\.?|San|Santa|Fort|Port|Cape|New|Salt|Sao|São|Abu|Kuala|Ho|Tel|Dar|Costa|Puerto|Mount|Grand|Hong|Sri|South|North|West|East|Des|Sioux|Jackson)$/i;

const PARTICLES = /^(de|da|do|del|van|von|of|di)$/i;

/** Hand-tuned chip labels where OurAirports names don't yield a good first word. */
export const AIRPORT_SHORT_NAME_OVERRIDES: Record<string, string> = {
  // US states
  ABQ: "Albuquerque",
  ANC: "Anchorage",
  ATL: "Hartsfield",
  BHM: "Birmingham",
  BOI: "Boise",
  BTV: "Burlington",
  BZN: "Yellowstone",
  CLE: "Hopkins",
  CLT: "Douglas",
  CVG: "Cincinnati",
  DFW: "Dallas",
  DSM: "Des Moines",
  DTW: "Detroit",
  EWR: "Liberty",
  FAR: "Hector",
  FSD: "Sioux Falls",
  HNL: "Inouye",
  IAD: "Dulles",
  ICT: "Eisenhower",
  IND: "Indianapolis",
  JAC: "Jackson Hole",
  JAN: "Jackson",
  JFK: "Kennedy",
  LAS: "Reid",
  LIT: "Clinton",
  MHT: "Manchester",
  MKE: "Mitchell",
  MSP: "Minneapolis",
  MSY: "Armstrong",
  OKC: "Will Rogers",
  ORD: "O'Hare",
  PHX: "Sky Harbor",
  PVD: "Green",
  PWM: "Portland",
  SEA: "Sea-Tac",
  STL: "Lambert",
  // Countries / territories
  AMS: "Schiphol",
  ARN: "Arlanda",
  ATH: "Athens",
  BKK: "Suvarnabhumi",
  BOG: "El Dorado",
  CAN: "Baiyun",
  CDG: "de Gaulle",
  CGK: "Soekarno-Hatta",
  CMN: "Mohammed V",
  DEL: "Gandhi",
  DOH: "Hamad",
  DXB: "Dubai",
  EZE: "Ezeiza",
  FCO: "Fiumicino",
  FRA: "Frankfurt",
  GRU: "Guarulhos",
  HEL: "Vantaa",
  HKG: "Hong Kong",
  HND: "Haneda",
  ICN: "Incheon",
  IST: "Istanbul",
  JNB: "Tambo",
  KEF: "Keflavik",
  KUL: "Kuala Lumpur",
  LHR: "Heathrow",
  LIM: "Chávez",
  LIS: "Lisbon",
  LOS: "Muhammed",
  MAD: "Barajas",
  MEX: "Juárez",
  MNL: "Aquino",
  NBO: "Kenyatta",
  OSL: "Gardermoen",
  PEK: "Capital",
  PRG: "Havel",
  SCL: "Santiago",
  SGN: "Tan Son Nhat",
  SIN: "Changi",
  SYD: "Kingsford Smith",
  WAW: "Chopin",
  YYZ: "Pearson",
  ZRH: "Zürich",
};

function normalizeWs(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function firstLabel(tokens: string[]): string {
  if (tokens.length === 0) return "";

  if (tokens.some((t) => /^[A-Z]\.?$/i.test(t))) {
    const significant = tokens.filter(
      (t) => !/^[A-Z]\.?$/i.test(t) && !PARTICLES.test(t),
    );
    if (significant.length > 0) {
      return significant[significant.length - 1].replace(/[.,]$/g, "");
    }
  }

  if (tokens.length >= 3 && PARTICLES.test(tokens[1])) {
    return `de ${tokens[tokens.length - 1]}`.replace(/[.,]$/g, "");
  }

  if (MULTIWORD_START.test(tokens[0]) && tokens[1]) {
    if (
      /^(Salt|Ho|Kuala|Abu|Tel|Dar|Costa|Puerto|Des|Sioux|Jackson|Tan)$/i.test(
        tokens[0],
      ) &&
      tokens[2] &&
      !/^(International|Airport)$/i.test(tokens[2])
    ) {
      return `${tokens[0]} ${tokens[1]} ${tokens[2]}`.replace(/[.,]/g, "");
    }
    return `${tokens[0]} ${tokens[1]}`.replace(/[.,]/g, "");
  }

  if (
    tokens.length >= 2 &&
    /^(Harbor|Harbour|Field|Smith|Liberty|Hole|Falls|Moines|Lake)$/i.test(tokens[1])
  ) {
    return `${tokens[0]} ${tokens[1]}`.replace(/[.,]/g, "");
  }

  return tokens[0].replace(/[.,]$/g, "");
}

/**
 * Distinctive short label from an OurAirports name + municipality.
 * Prefer overrides when present.
 */
export function deriveShortAirportName(
  iata: string,
  fullName: string,
  municipality = "",
): string {
  const override = AIRPORT_SHORT_NAME_OVERRIDES[iata];
  if (override) return override;

  let cleaned = normalizeWs(fullName).replace(SUFFIX_RE, "").trim();
  cleaned = cleaned.replace(/\s*\/\s*.*$/, "").trim();
  cleaned = cleaned.replace(/\s+(International|Intl\.?)$/i, "").trim();
  // "Amsterdam Airport Schiphol" → Schiphol
  cleaned = cleaned.replace(/^(.+?)\s+Airport\s+/i, "").trim() || cleaned;

  const city = normalizeWs(municipality).replace(/\s*\(.*\)\s*/g, "").trim();
  const cityCore = city.split(/\s*[·,;/]\s*|\s+-\s+/)[0]?.trim() ?? city;

  let main = cleaned;

  if (cityCore) {
    const escaped = cityCore.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const leadingCity = new RegExp(`^${escaped}\\s+`, "i");
    if (leadingCity.test(cleaned)) {
      const rest = cleaned.replace(leadingCity, "").trim();
      if (rest) main = rest;
    } else if (cleaned.toLowerCase().endsWith(` ${cityCore.toLowerCase()}`)) {
      const prefix = cleaned.slice(0, -(cityCore.length + 1)).trim();
      if (
        prefix &&
        !prefix.includes(" ") &&
        !cityCore.includes(" ") &&
        prefix.toLowerCase() !== cityCore.toLowerCase()
      ) {
        main = cityCore;
      } else if (prefix) {
        main = prefix;
      }
    }
  }

  main = main.split("/")[0]?.trim() ?? main;
  // Drop leading honorifics / given names before a clearer surname when not caught above
  main = main.replace(/^General\s+/i, "").trim();

  const tokens = main.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return firstLabel((cityCore || cleaned || fullName).split(/\s+/));
  }

  return firstLabel(tokens);
}

export function formatAirportChip(iata: string, shortName: string): string {
  return `${iata} - ${shortName}`;
}
