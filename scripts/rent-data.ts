/**
 * Median / typical monthly rent for library detail chips (USD equivalent).
 * Countries: Numbeo 1-bedroom apartment outside city centre (current USD / month).
 * US states: Census ACS median gross rent (B25064, current USD / month).
 * @see https://www.numbeo.com/cost-of-living/prices_by_country.jsp?displayCurrency=USD&itemId=26&itemId=27
 */

const NUMBEO_RENT_USD_URL =
  "https://www.numbeo.com/cost-of-living/prices_by_country.jsp?displayCurrency=USD&itemId=26&itemId=27";

/** Numbeo country display names → ISO 3166-1 alpha-2. */
const NUMBEO_NAME_TO_CODE: Record<string, string> = {
  turkey: "TR",
  "kosovo (disputed territory)": "XK",
  "czech republic": "CZ",
  "united states": "US",
  "united kingdom": "GB",
  "south korea": "KR",
  "north macedonia": "MK",
  "bosnia and herzegovina": "BA",
  "hong kong (china)": "HK",
  "hong kong": "HK",
  russia: "RU",
  syria: "SY",
  iran: "IR",
  vietnam: "VN",
  laos: "LA",
  moldova: "MD",
  tanzania: "TZ",
  venezuela: "VE",
  bolivia: "BO",
  taiwan: "TW",
  "ivory coast": "CI",
  "cape verde": "CV",
  "cabo verde": "CV",
  myanmar: "MM",
  "united arab emirates": "AE",
  "saudi arabia": "SA",
  "dominican republic": "DO",
  "trinidad and tobago": "TT",
  palestine: "PS",
  brunei: "BN",
  "republic of the congo": "CG",
  congo: "CG",
  "dr congo": "CD",
  "democratic republic of the congo": "CD",
};

/** Census ACS median gross rent (monthly USD) by USPS state code. */
export const STATE_MEDIAN_RENT_USD: Record<string, number> = {
  AK: 1444,
  AL: 1077,
  AR: 982,
  AZ: 1672,
  CA: 2104,
  CO: 1822,
  CT: 1550,
  DE: 1530,
  FL: 1812,
  GA: 1506,
  HI: 1942,
  IA: 981,
  ID: 1384,
  IL: 1322,
  IN: 1104,
  KS: 1079,
  KY: 998,
  LA: 1064,
  MA: 1848,
  MD: 1721,
  ME: 1210,
  MI: 1168,
  MN: 1291,
  MO: 1067,
  MS: 990,
  MT: 1177,
  NC: 1338,
  ND: 980,
  NE: 1102,
  NH: 1558,
  NJ: 1800,
  NM: 1117,
  NV: 1709,
  NY: 1634,
  OH: 1090,
  OK: 1044,
  OR: 1597,
  PA: 1252,
  RI: 1418,
  SC: 1272,
  SD: 999,
  TN: 1284,
  TX: 1475,
  UT: 1593,
  VA: 1646,
  VT: 1319,
  WA: 1824,
  WI: 1142,
  WV: 883,
  WY: 998,
};

export function getStateMedianRentUsd(postal: string): number | undefined {
  return STATE_MEDIAN_RENT_USD[postal.toUpperCase()];
}

type CountryNameLookup = {
  code: string;
  name: string;
};

/**
 * Latest typical monthly rent (USD) keyed by ISO 3166-1 alpha-2.
 * Uses Numbeo's 1-bedroom apartment outside the city centre.
 */
export async function fetchCountryMedianRentUsd(
  countries: CountryNameLookup[],
): Promise<Map<string, number>> {
  const response = await fetch(NUMBEO_RENT_USD_URL, {
    headers: { "User-Agent": "atlas-academy-data-refresh" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Numbeo rent data (${response.status})`);
  }

  const html = await response.text();
  const nameToCode = new Map<string, string>();
  for (const country of countries) {
    nameToCode.set(country.name.toLowerCase(), country.code);
  }
  for (const [name, code] of Object.entries(NUMBEO_NAME_TO_CODE)) {
    nameToCode.set(name, code);
  }

  const rentByCode = new Map<string, number>();
  const rowPattern =
    /country_result\.jsp\?country=[^"]+">([^<]+)<\/a><\/td><td[^>]*>\s*([\d.]+)<\/td><td[^>]*>\s*([\d.]+)<\/td>/g;

  for (const match of html.matchAll(rowPattern)) {
    const name = match[1].trim();
    const outsideCity = Number(match[3]);
    if (!Number.isFinite(outsideCity)) continue;
    const code = nameToCode.get(name.toLowerCase());
    if (!code) continue;
    rentByCode.set(code, Math.round(outsideCity));
  }

  return rentByCode;
}
